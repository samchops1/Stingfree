<#
  Falcon DLP — Windows installer (run as admin, e.g. pushed via RMM/Action1).

  Installs BOTH parts of the endpoint DLP:
    1. The local agent (PII engine + clipboard watcher + /scan API), as a
       LOGON SCHEDULED TASK running in the user's interactive session.
    2. The Chrome extension, force-installed via enterprise policy (registry).

  WHY A LOGON TASK, NOT AN NSSM SERVICE:
    The clipboard is per-session. A Windows *service* runs in session 0 and
    CANNOT read the interactive user's clipboard — so the machine-wide
    clipboard watcher would silently see nothing. Running the agent as a
    scheduled task at logon puts it in the user's session where the clipboard
    lives. (If you only want the browser-vector /scan API and no clipboard
    watching, an NSSM session-0 service is fine — see the commented block at
    the bottom.)

  USAGE:
    .\install.ps1 -AgentExe "C:\falcon-dlp\falcon-dlp-agent\falcon-dlp-agent.exe" `
                  -ExtensionId "aaaabbbbccccddddeeeeffffgggghhhh" `
                  -ExtensionUpdateUrl "https://falcon.internal/dlp/update.xml"

  On Google Workspace (Falcon is), the SIMPLEST way to deploy the extension is
  Workspace Admin > Chrome > Apps & extensions > Force install — then you can
  skip -ExtensionId/-ExtensionUpdateUrl and this script only installs the agent.
#>

param(
  [Parameter(Mandatory = $true)]
  [string]$AgentExe,

  # Chrome extension ID (32 chars). Get it by packing the extension
  # (chrome://extensions > Pack extension) or from the Web Store listing.
  [string]$ExtensionId = "",

  # URL of the extension's update manifest (update.xml) if self-hosting the CRX.
  # For the Web Store, use: https://clients2.google.com/service/update2/crx
  [string]$ExtensionUpdateUrl = "",

  [string]$TaskName = "FalconDLPAgent"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $AgentExe)) {
  throw "Agent exe not found at '$AgentExe'. Build it (PyInstaller) and pass -AgentExe."
}

Write-Host "== Installing Falcon DLP agent as a logon task =="

# Run in the interactive user's session (needed for clipboard access), restart
# on failure, and keep running. -RunLevel Limited so it runs as the user, not
# elevated.
$action   = New-ScheduledTaskAction -Execute $AgentExe
$trigger  = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries `
              -DontStopIfGoingOnBatteries -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) `
              -ExecutionTimeLimit ([TimeSpan]::Zero)   # no time limit (long-running)
$principal = New-ScheduledTaskPrincipal -GroupId "S-1-5-32-545" -RunLevel Limited  # BUILTIN\Users

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
  -Settings $settings -Principal $principal -Force | Out-Null

# Start it now for the current session too.
Start-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
Write-Host "  Agent task '$TaskName' registered and started."

# --- Force-install the Chrome extension via enterprise policy ---------------
if ($ExtensionId -and $ExtensionUpdateUrl) {
  Write-Host "== Force-installing Chrome extension via policy =="
  $key = "HKLM:\SOFTWARE\Policies\Google\Chrome\ExtensionInstallForcelist"
  if (-not (Test-Path $key)) { New-Item -Path $key -Force | Out-Null }
  # Next free numeric index.
  $existing = (Get-Item $key).Property | ForEach-Object { [int]$_ } | Sort-Object
  $idx = 1; while ($existing -contains $idx) { $idx++ }
  Set-ItemProperty -Path $key -Name "$idx" -Value "$ExtensionId;$ExtensionUpdateUrl"
  Write-Host "  Policy set: $ExtensionId;$ExtensionUpdateUrl (Chrome applies on next launch)."
} else {
  Write-Host "== Skipping extension policy (no -ExtensionId/-ExtensionUpdateUrl) =="
  Write-Host "  Deploy the extension via Google Workspace Admin instead, or re-run"
  Write-Host "  with those params to self-host. See service/windows/README-deploy.md."
}

Write-Host "`nDone. Agent listens on 127.0.0.1:8765; clipboard watcher active in the user session."

# --- ALTERNATIVE: API-only, no clipboard (session-0 NSSM service) -----------
# Use this instead of the logon task ONLY if you don't need clipboard watching:
#   choco install nssm -y
#   nssm install FalconDLP "$AgentExe"
#   nssm set FalconDLP Start SERVICE_AUTO_START
#   nssm start FalconDLP
# (Session-0 services cannot read the interactive clipboard — the watcher will
#  no-op there; only the /scan API for the browser extension will function.)
