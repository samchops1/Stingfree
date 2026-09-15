"""Falcon DLP — SQLite event log (Rule 204-2 recordkeeping).

Every scan verdict is written here. We store the source vector (browser vs
clipboard), the URL/app context, the verdict, and the finding *types + scores*
— never the scanned text itself, since the whole point is that client PII
never leaves the machine (and we don't want to recreate the exposure in our
own log).
"""

import json
import os
import sqlite3
import threading
from datetime import datetime, timezone

# Log lives next to this file so it travels with the agent install.
DB_PATH = os.environ.get(
    "FALCON_DLP_DB",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "falcon_dlp.db"),
)

# SQLite connections aren't safe to share across threads without care;
# uvicorn serves requests on a thread pool and the clipboard watcher writes
# from its own thread, so guard writes with a lock and open short-lived
# connections.
_lock = threading.Lock()


def _connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create the events table if it doesn't exist, and add any columns a
    pre-existing DB is missing. Safe to call repeatedly."""
    with _lock, _connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS events (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                ts        TEXT    NOT NULL,
                source    TEXT    NOT NULL DEFAULT 'browser',
                url       TEXT    NOT NULL,
                verdict   TEXT    NOT NULL,
                findings  TEXT    NOT NULL,
                note      TEXT    NOT NULL DEFAULT ''
            )
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts)")
        # Migrate older DBs that predate newer columns.
        cols = {row["name"] for row in conn.execute("PRAGMA table_info(events)")}
        if "source" not in cols:
            conn.execute("ALTER TABLE events ADD COLUMN source TEXT NOT NULL DEFAULT 'browser'")
        if "note" not in cols:
            conn.execute("ALTER TABLE events ADD COLUMN note TEXT NOT NULL DEFAULT ''")


def log_event(url, findings, verdict, source="browser", note=""):
    """Append one scan event. Never raises to the caller — a logging failure
    must not take a scan down, but we surface it on stderr so a dropped line is
    at least visible in the service log.

    source: 'browser' (extension paste) or 'clipboard' (machine-wide watcher).
    url:    the site URL for the browser vector, or the app/window name for the
            clipboard vector (best-effort; may be empty).
    note:   free-text context, e.g. the user's justification on an override.
    """
    row = (
        datetime.now(timezone.utc).isoformat(),
        source,
        url or "",
        verdict,
        json.dumps(findings),
        note or "",
    )
    try:
        with _lock, _connect() as conn:
            conn.execute(
                "INSERT INTO events (ts, source, url, verdict, findings, note) VALUES (?, ?, ?, ?, ?, ?)",
                row,
            )
    except sqlite3.Error as exc:  # pragma: no cover - defensive
        import sys
        print(f"[falcon-dlp] FAILED to log event: {exc}", file=sys.stderr)


def _parse(row):
    return {
        "id": row["id"],
        "ts": row["ts"],
        "source": row["source"],
        "url": row["url"],
        "verdict": row["verdict"],
        "findings": json.loads(row["findings"]),
        "note": row["note"] if "note" in row.keys() else "",
    }


def recent_events(limit=50):
    """Return the most recent events, newest first (for the popup 'Recent' list)."""
    with _lock, _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM events ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()
    return [_parse(r) for r in rows]


def today_counts():
    """Return today's redaction and block counts for the popup stat tiles.

    A 'block' is any block/clear verdict; a 'redaction' is any event where PII
    was found and de-identified or offered sanitized (verdict 'redact', or a
    finding present on an allowed event).
    """
    start = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    with _lock, _connect() as conn:
        rows = conn.execute(
            "SELECT verdict, findings FROM events WHERE ts >= ?", (start,)
        ).fetchall()
    blocks = 0
    redactions = 0
    for r in rows:
        findings = json.loads(r["findings"])
        if r["verdict"] in ("block", "clear"):
            blocks += 1
        elif r["verdict"] == "redact" or (findings and r["verdict"] != "monitor"):
            redactions += 1
    return {"redactions": redactions, "blocks": blocks}
