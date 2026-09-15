# Falcon DLP
Local endpoint DLP prototype. One agent, two capture vectors:
- a machine-wide CLIPBOARD watcher (clipboard_agent.py) that scans anything
  copied and redacts/clears it before it can be pasted into ANY app, and
- a FastAPI+Presidio /scan API on 127.0.0.1:8765 (app.py) that the Chrome MV3
  extension calls to block pastes into AI sites before the site sees them.
Both share one detection engine (detector.py) and one per-entity policy
(policy.py + config.py). A third tool, a file/folder PII DISCOVERY scanner
(scanner.py + scan_files.py, also `falcon-dlp-agent scan PATH`), points the
same engine at documents at rest (pdf/docx/xlsx/text) — detection/reporting
only, it does NOT block or modify files.

Hard constraints:
- Scanned text NEVER leaves the machine. API binds to 127.0.0.1 only.
- Every event (monitor, redact, block/clear, override) is logged to SQLite for
  Rule 204-2 recordkeeping, tagged with its source (browser|clipboard).
  Never drop a log line.
- Target: Windows (clipboard vector) + macOS/Linux (API only). NO kernel/system
  extensions, NO network filter driver, NO keystroke hooking.
- Deliberately OUT of scope: PII typed directly (no clipboard), and data
  uploaded/sent over the network by an app — those need OS hooks / a network
  driver we don't build.
- Enforcement policy is per-entity in config.py (block/redact/monitor); it is
  the enforcement knob, not hardcoded.

Stack: Python 3.11, FastAPI, presidio-analyzer, presidio-anonymizer,
spaCy en_core_web_lg, SQLite, pywin32 (Windows clipboard). Extension: vanilla
JS, MV3. Windows exe via PyInstaller (built in CI on a windows runner).
