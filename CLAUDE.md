# Falcon DLP
Local endpoint DLP prototype. Two parts: a FastAPI+Presidio backend on
127.0.0.1:8765 that scans text for PII, and a Chrome MV3 extension that
intercepts pastes into AI sites and calls the backend.

Hard constraints:
- Scanned text NEVER leaves the machine. Backend binds to 127.0.0.1 only.
- Every scan (allow, redact, block, override) is logged to SQLite for
  Rule 204-2 recordkeeping. Never drop a log line.
- Target: Windows + macOS. No kernel/system extensions.
- Scope is the BROWSER paste/type vector only. Desktop-app blocking is
  handled by non-admin lockdown + policy, NOT by this tool.

Stack: Python 3.11, FastAPI, presidio-analyzer, presidio-anonymizer,
spaCy en_core_web_lg, SQLite. Extension: vanilla JS, MV3.
