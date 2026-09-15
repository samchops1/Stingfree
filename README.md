# Falcon DLP

A local, endpoint-based DLP prototype that stops client PII/NPI from leaving
the machine, and logs every event for SEC Rule 204-2 recordkeeping.

One **local agent** with **two capture vectors**, sharing one detection engine
and one per-entity policy:

1. **Clipboard watcher** (`clipboard_agent.py`) — **machine-wide.** Watches the
   Windows clipboard and scans anything copied. On a policy hit it redacts or
   clears the clipboard *before it can be pasted into any app* (Outlook, Word,
   Slack, any website). This is the endpoint-DLP core.
2. **Browser `/scan` API + Chrome MV3 extension** (`app.py`, `extension/`) —
   intercepts pastes into allowed AI sites and blocks them *before the site
   sees the text*, which the clipboard vector can't do for that specific case.

Both call the same **detector** (`detector.py`) and obey the same **per-entity
policy** (`policy.py` + `config.py`): each entity type is set to `block`,
`redact`, or `monitor`.

> **What it covers:** copy→paste of PII into any app (clipboard), and paste into
> AI sites (browser).
> **What it does NOT cover (by design):** PII *typed directly* (no clipboard),
> and data *uploaded/sent over the network* by an app — those need OS hooks or a
> network filter driver, deliberately out of scope. See `CLAUDE.md`.

## Compliance framing

- **Reg S-P** (safeguard NPI): the redact/block is the safeguard — scanned text
  never leaves the machine (the API binds to loopback only; the clipboard
  watcher runs locally).
- **Rule 204-2** (recordkeeping): the SQLite event log is a books-and-records
  asset. Every event — monitor, redact, block/clear, override — is logged, tagged
  with its source (`browser` | `clipboard`).

## Repo layout

```
CLAUDE.md
README.md
backend/
  run.py            agent entry point: clipboard watcher + /scan API (PyInstaller)
  app.py            FastAPI + Presidio /scan, /override, /logs, /health
  detector.py       shared Presidio engine (loads the model once)
  policy.py         per-entity block/redact/monitor decision (pure logic)
  clipboard_agent.py machine-wide Windows clipboard watcher + enforcement
  notify.py         best-effort Windows toast on clipboard action
  logstore.py       SQLite writes/reads (source-tagged)
  config.py         recognizers, MIN_SCORE, ENTITY_POLICY, AI domains
  test_scan.py      posts sample PII to /scan (needs the server running)
  test_policy.py    policy + clipboard-enforcement unit tests (no Presidio)
  requirements.txt
extension/
  manifest.json
  content.js        paste/input hook (capture phase) + banner
  background.js     domain tracking + agent health
  popup.html
  popup.js          reads /logs, shows today's counts
  rules.json        declarativeNetRequest block/redirect rules
service/
  windows/install.ps1          logon-task agent install + extension force-install
  windows/uninstall.ps1        removes the task + policy
  windows/README-deploy.md     full Windows deployment guide
  macos/com.falcon.dlp.plist   launchd LaunchAgent (API only; no clipboard yet)
```

## Test today (skip the service + signing)

Run the **full agent** (clipboard watcher + `/scan` API) — this is what the
compiled exe runs:

```bash
cd backend
python -m venv venv && source venv/bin/activate   # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python -m spacy download en_core_web_lg
python run.py            # clipboard watcher (Windows) + API on 127.0.0.1:8765
```

> On Windows, copy a **fake** SSN (e.g. `123-45-6789`) from anywhere and try to
> paste — the clipboard watcher clears/redacts it and pops a toast. On
> macOS/Linux the clipboard watcher no-ops (Windows-only) and only the API runs.
> To test just the API, run `uvicorn app:app --host 127.0.0.1 --port 8765`.

Then load the extension unpacked: open `chrome://extensions`, enable **Developer
mode**, click **Load unpacked**, and select the `extension/` folder. Open
`claude.ai` and paste a **fake** SSN — the red banner fires.

**Deploying to real machines** (agent as a logon task + force-installed
extension): see `service/windows/README-deploy.md`.

## Enforcement policy

Set per-entity actions in `backend/config.py` → `ENTITY_POLICY`
(`block` / `redact` / `monitor`). This is the knob for the "hard-block SSN vs.
warn on names" decision. `MIN_SCORE` is the confidence floor below which
findings are ignored as noise.

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
