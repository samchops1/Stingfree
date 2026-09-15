"""Falcon DLP — SQLite event log (Rule 204-2 recordkeeping).

Every scan verdict is written here. We store the URL, the verdict, and the
finding *types + scores* — never the scanned text itself, since the whole
point is that client PII never leaves the machine (and we don't want to
recreate the exposure in our own log).
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
# uvicorn serves requests on a thread pool, so guard writes with a lock and
# open short-lived connections.
_lock = threading.Lock()


def _connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create the events table if it doesn't exist. Safe to call repeatedly."""
    with _lock, _connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS events (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                ts        TEXT    NOT NULL,
                url       TEXT    NOT NULL,
                verdict   TEXT    NOT NULL,
                findings  TEXT    NOT NULL
            )
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts)")


def log_event(url, findings, verdict):
    """Append one scan event. Never raises to the caller — a logging failure
    must not take the scan endpoint down, but we surface it on stderr so a
    dropped line is at least visible in the service log."""
    row = (
        datetime.now(timezone.utc).isoformat(),
        url or "",
        verdict,
        json.dumps(findings),
    )
    try:
        with _lock, _connect() as conn:
            conn.execute(
                "INSERT INTO events (ts, url, verdict, findings) VALUES (?, ?, ?, ?)",
                row,
            )
    except sqlite3.Error as exc:  # pragma: no cover - defensive
        import sys
        print(f"[falcon-dlp] FAILED to log event: {exc}", file=sys.stderr)


def _parse(row):
    return {
        "id": row["id"],
        "ts": row["ts"],
        "url": row["url"],
        "verdict": row["verdict"],
        "findings": json.loads(row["findings"]),
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

    A 'redaction' is any scan that found PII but was allowed through (i.e.
    the sanitized version was offered); a 'block' is a block verdict.
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
        if r["verdict"] == "block":
            blocks += 1
        elif findings:  # allowed, but PII was present -> a redaction opportunity
            redactions += 1
    return {"redactions": redactions, "blocks": blocks}
