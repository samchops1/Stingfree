<#
  Falcon DLP — Windows uninstaller (run as admin).
  Removes the logon task and the Chrome extension force-install policy.
#>

param(
  [string]$TaskName = "FalconDLPAgent",
  [string]$ExtensionId = ""
)

$ErrorActionPreference = "SilentlyContinue"

Write-Host "== Removing Falcon DLP agent task =="
Stop-ScheduledTask -TaskName $TaskName
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
Write-Host "  Task '$TaskName' removed."

if ($ExtensionId) {
  Write-Host "== Removing extension force-install policy =="
  $key = "HKLM:\SOFTWARE\Policies\Google\Chrome\ExtensionInstallForcelist"
  if (Test-Path $key) {
    foreach ($name in (Get-Item $key).Property) {
      $val = (Get-ItemProperty -Path $key -Name $name).$name
      if ($val -like "$ExtensionId;*") {
        Remove-ItemProperty -Path $key -Name $name
        Write-Host "  Removed policy entry $name."
      }
    }
  }
}

Write-Host "Done."
