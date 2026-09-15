# Falcon DLP

A local, endpoint-based DLP prototype that stops client PII/NPI from reaching
AI websites, and logs every event for SEC Rule 204-2 recordkeeping.

There are **two runtimes**:

1. **Local backend agent** (`backend/`) — a FastAPI + Presidio service bound to
   `127.0.0.1:8765`. It scans text for PII, returns a verdict + a redacted
   version, and logs every event to a local SQLite database. **This is the real
   product.**
2. **Chrome MV3 extension** (`extension/`) — intercepts paste/type on allowed AI
   sites, calls the backend, and shows a banner offering a sanitized paste or a
   logged override. The extension does nothing without the backend running.

> **Scope:** the browser paste/type vector only. Desktop-app blocking is handled
> by non-admin lockdown + policy (AppLocker/firewall), **not** by this tool. See
> `CLAUDE.md` for the hard constraints and the build spec for the full rationale.

## Compliance framing

- **Reg S-P** (safeguard NPI): the redact/block is the safeguard — scanned text
  never leaves the machine (the backend binds to loopback only).
- **Rule 204-2** (recordkeeping): the SQLite event log is a books-and-records
  asset. Every scan — allow, redact, block, override — is logged.

## Repo layout

```
CLAUDE.md
README.md
backend/
  app.py            FastAPI + Presidio /scan, /override, /logs, /health
  run.py            uvicorn in-process launcher (for PyInstaller)
  logstore.py       SQLite writes/reads
  config.py         AI domain list, entity thresholds, custom recognizers
  test_scan.py      posts sample PII to /scan
  requirements.txt
extension/
  manifest.json
  content.js        paste/input hook (capture phase) + banner
  background.js     domain tracking + agent health
  popup.html
  popup.js          reads /logs, shows today's counts
  rules.json        declarativeNetRequest block/redirect rules
service/
  windows/install.ps1          NSSM service install
  macos/com.falcon.dlp.plist   launchd LaunchAgent
```

## Test today (skip the service + signing)

```bash
cd backend
python -m venv venv && source venv/bin/activate   # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python -m spacy download en_core_web_lg
uvicorn app:app --host 127.0.0.1 --port 8765
```

Then load the extension unpacked: open `chrome://extensions`, enable **Developer
mode**, click **Load unpacked**, and select the `extension/` folder. Open
`claude.ai` and paste a **fake** SSN (e.g. `123-45-6789`) — the red banner fires.

### Quick backend sanity check

```bash
curl -s -X POST http://127.0.0.1:8765/scan -H "Content-Type: application/json" \
  -d '{"text":"Client SSN is 123-45-6789 acct 12345678","url":"test"}'
```

Or run the bundled test harness (backend must be running):

```bash
cd backend && python test_scan.py
```

## API

| Method | Path        | Purpose                                                        |
|--------|-------------|----------------------------------------------------------------|
| POST   | `/scan`     | Scan text → `{verdict, findings, redacted}`; logs the event    |
| POST   | `/override` | Record a user's "Override and log" choice                      |
| GET    | `/logs`     | Today's counts + recent events (the popup reads this)          |
| GET    | `/health`   | Liveness for the service wrapper / extension connection dot    |

`verdict` is `block` when any finding scores above `BLOCK_THRESHOLD`
(`config.py`), otherwise `allow`. Tune thresholds and the custom recognizers in
`backend/config.py` during testing.

## Packaging & deployment

Once detection behaves, build a signed executable and run it as a service:

- **Build:** PyInstaller `--onedir` with `--collect-all` for `presidio_analyzer`,
  `presidio_anonymizer`, `spacy`, and `en_core_web_lg` (the model is the one
  people forget). Build on each OS separately — PyInstaller can't cross-compile.
- **Sign:** Windows `signtool` (self-signed cert pushed to Trusted Publishers via
  RMM/GPO is fine for a managed fleet); macOS `codesign --options runtime` +
  `notarytool`.
- **Service:** Windows via NSSM (`service/windows/install.ps1`); macOS via the
  launchd LaunchAgent (`service/macos/com.falcon.dlp.plist`).

See the build spec sections 7–9 for the exact flags.

## Status

Prototype / internal visibility layer. A homegrown DLP tool handling client PII
moves liability in-house — treat this as the requirements doc for a future
build-vs-buy decision, and revisit vs. a vendor with SOC 2 once it's proven out.
