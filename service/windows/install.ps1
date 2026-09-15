# service/windows/install.ps1  (run as admin)
#
# Installs the Falcon DLP backend as an auto-start Windows service via NSSM.
# For the prototype this points NSSM at python.exe in the backend venv. Once
# detection behaves, PyInstaller the backend into one exe and point NSSM at
# that instead.

$ErrorActionPreference = "Stop"

$BackendDir = "C:\falcon-dlp\backend"
$Python     = "$BackendDir\venv\Scripts\python.exe"

if (-not (Test-Path $Python)) {
    throw "Python venv not found at $Python. Create it first: python -m venv venv"
}

# NSSM makes this a real service that auto-starts and restarts on crash, so a
# non-admin user can't just close it.
choco install nssm -y

nssm install FalconDLP $Python "-m uvicorn app:app --host 127.0.0.1 --port 8765"
nssm set FalconDLP AppDirectory $BackendDir
nssm set FalconDLP Start SERVICE_AUTO_START
nssm start FalconDLP

Write-Host "FalconDLP service installed and started on 127.0.0.1:8765"
