"""Falcon DLP — best-effort user notification.

Shows a Windows toast when the agent acts on the clipboard, so the user knows
why their paste changed. Implemented via PowerShell (WinRT toast) to avoid
bundling a fragile notification dependency into the PyInstaller build. Always
falls back to a stderr line, and never raises — a failed toast must not affect
enforcement.
"""

import subprocess
import sys

IS_WINDOWS = sys.platform == "win32"

# PowerShell one-shot that raises a WinRT toast. Kept dependency-free (no
# BurntToast module required).
_PS_TOAST = r"""
$ErrorActionPreference = 'Stop'
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null
$template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
$texts = $template.GetElementsByTagName('text')
$texts.Item(0).AppendChild($template.CreateTextNode($env:FALCON_TITLE)) > $null
$texts.Item(1).AppendChild($template.CreateTextNode($env:FALCON_BODY)) > $null
$toast = [Windows.UI.Notifications.ToastNotification]::new($template)
$notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Falcon DLP')
$notifier.Show($toast)
"""


def notify(title, body):
    """Show a toast (Windows) and always echo to stderr. Never raises."""
    print(f"[falcon-dlp] ALERT: {title} — {body}", file=sys.stderr)
    if not IS_WINDOWS:
        return
    try:  # pragma: no cover - Windows-only
        subprocess.Popen(
            ["powershell", "-NoProfile", "-NonInteractive", "-Command", _PS_TOAST],
            env={"FALCON_TITLE": title, "FALCON_BODY": body, **_os_environ()},
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=0x08000000,  # CREATE_NO_WINDOW
        )
    except Exception as exc:
        print(f"[falcon-dlp] toast failed (non-fatal): {exc}", file=sys.stderr)


def _os_environ():
    import os
    return dict(os.environ)
