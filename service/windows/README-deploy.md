# Falcon DLP — Windows deployment

Two things get deployed to each machine:

1. **The agent** — `falcon-dlp-agent.exe` (built by the GitHub Actions
   workflow, or PyInstaller locally). It runs the PII engine, the machine-wide
   **clipboard watcher**, and the `127.0.0.1:8765` `/scan` API.
2. **The Chrome extension** — force-installed so the user can't remove it.

## 1. Deploy the agent

Copy the `falcon-dlp-agent` folder somewhere fixed (e.g. `C:\falcon-dlp\`), then:

```powershell
.\install.ps1 -AgentExe "C:\falcon-dlp\falcon-dlp-agent\falcon-dlp-agent.exe"
```

This registers a **logon scheduled task** that runs the agent in the user's
interactive session (required — a session-0 service can't read the user's
clipboard) and restarts it if it dies.

> **Sign the exe first for a real rollout.** An unsigned clipboard-reader trips
> Defender/CrowdStrike. See build-spec §8 (self-signed cert → Trusted
> Publishers via RMM/GPO is fine for a managed fleet).

## 2. Deploy the extension

### Option A — Google Workspace Admin (simplest; Falcon is on Workspace)
Admin console → **Devices → Chrome → Apps & extensions → Users & browsers** →
add the extension → set **Force install**. Nothing else needed; skip the
`-ExtensionId` params in `install.ps1`.

### Option B — self-host the CRX (registry policy)
1. In Chrome, `chrome://extensions` → **Pack extension** → select `extension/`.
   This produces `extension.crx` and a `.pem` key. **Keep the `.pem`** — it
   fixes the extension ID across rebuilds. Note the 32-char ID Chrome shows.
2. Host the `.crx` and an `update.xml` (template below) on an internal URL.
3. Run the installer with the ID + update URL:
   ```powershell
   .\install.ps1 -AgentExe "C:\falcon-dlp\...\falcon-dlp-agent.exe" `
                 -ExtensionId "<32-char-id>" `
                 -ExtensionUpdateUrl "https://falcon.internal/dlp/update.xml"
   ```

`update.xml` template (replace ID, URL, version):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<gupdate xmlns="http://www.google.com/update2/response" protocol="2.0">
  <app appid="PASTE_32_CHAR_ID_HERE">
    <updatecheck codebase="https://falcon.internal/dlp/falcon-dlp.crx" version="0.2"/>
  </app>
</gupdate>
```

> Chrome **cannot** silently install a local *unpacked* folder — that's blocked
> by design. Force-install requires either the Web Store or a hosted CRX +
> policy (above). This is a Chrome security rule, not a limitation of this tool.

## Uninstall
```powershell
.\uninstall.ps1 -ExtensionId "<32-char-id>"   # ID optional; omit to leave policy
```

## What each vector covers (be clear with stakeholders)
- **Clipboard watcher (agent):** anything *copied* on the machine, pasted into
  **any app** — Outlook, Word, Slack, any site. Logs / redacts / clears.
- **Browser extension:** paste into the allowlisted **AI sites**, blocked
  *before* the site sees it (stronger than clipboard for that one vector).
- **Not covered:** PII typed directly (no clipboard), or uploaded/sent over the
  network by an app. Those need OS hooks / a network driver, deliberately out
  of scope.
