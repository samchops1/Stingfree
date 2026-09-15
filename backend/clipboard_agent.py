"""Falcon DLP — machine-wide clipboard watcher (the endpoint DLP vector).

Watches the Windows clipboard for changes and scans any copied text with the
same Presidio engine the browser extension uses. On a policy hit it logs the
event and, depending on the per-entity policy, scrubs the clipboard to a
redacted version or clears it — so the copied PII can't be pasted into ANY app
(Outlook, Word, Slack, a browser, anywhere), not just the AI sites.

Honest limits (documented, not hidden):
  - This is the CLIPBOARD vector. It does not see PII typed directly into an
    app, or data uploaded/sent over the network by an app. Those need OS
    hooks / a network driver, which this tool deliberately avoids.
  - Enforcement is best-effort and racy: a paste that happens in the sub-second
    window before the scan completes can beat the scrub. The poll interval is
    kept short to minimize that window. True pre-paste interception needs
    kernel-level hooks.
  - Windows only. On other platforms this module no-ops with a log line, so
    the rest of the agent (the /scan API) still runs for development.
"""

import sys
import time

import detector
from config import ENTITY_POLICY
from logstore import log_event
from notify import notify

IS_WINDOWS = sys.platform == "win32"

if IS_WINDOWS:  # pragma: no cover - Windows-only
    import ctypes

    import win32clipboard
    import win32con

# Poll interval in seconds. Short enough to shrink the paste-before-scan race,
# long enough not to spin the CPU.
POLL_SECONDS = 0.6


# --- Clipboard I/O (Windows) -------------------------------------------------

def _get_clipboard_text():  # pragma: no cover - Windows-only
    """Read unicode text from the clipboard, or None if it holds no text."""
    for _ in range(5):  # the clipboard can be briefly locked by another app
        try:
            win32clipboard.OpenClipboard()
            try:
                if win32clipboard.IsClipboardFormatAvailable(win32con.CF_UNICODETEXT):
                    return win32clipboard.GetClipboardData(win32con.CF_UNICODETEXT)
                return None
            finally:
                win32clipboard.CloseClipboard()
        except Exception:
            time.sleep(0.05)
    return None


def _set_clipboard_text(text):  # pragma: no cover - Windows-only
    """Replace the clipboard contents with `text` (used to scrub/clear)."""
    for _ in range(5):
        try:
            win32clipboard.OpenClipboard()
            try:
                win32clipboard.EmptyClipboard()
                win32clipboard.SetClipboardData(win32con.CF_UNICODETEXT, text)
                return True
            finally:
                win32clipboard.CloseClipboard()
        except Exception:
            time.sleep(0.05)
    return False


def _clipboard_sequence():  # pragma: no cover - Windows-only
    """A cheap monotonically-increasing number that changes on every clipboard
    update — lets us detect changes without re-reading the text each poll."""
    try:
        return ctypes.windll.user32.GetClipboardSequenceNumber()
    except Exception:
        return None


# --- Policy application ------------------------------------------------------

def handle_text(text, set_clipboard):
    """Scan text and enforce policy. `set_clipboard(new_text)` is injected so
    this is unit-testable off-Windows. Returns the verdict string, or None if
    there was nothing to do."""
    if not text or len(text) < 8:
        return None

    result = detector.scan(text)
    action = result["action"]
    if action == "allow":
        return None

    entities = ", ".join(result["entities"]) or "PII"

    if action == "block":
        # Hard stop: clear the clipboard so nothing can be pasted.
        set_clipboard("")
        log_event("clipboard", result["findings"], "clear", source="clipboard")
        notify("Falcon DLP — copy blocked",
               f"Client PII ({entities}) was removed from your clipboard.")
        return "clear"

    if action == "redact":
        # Replace the clipboard with the de-identified version.
        set_clipboard(result["redacted"])
        log_event("clipboard", result["findings"], "redact", source="clipboard")
        notify("Falcon DLP — clipboard sanitized",
               f"Client PII ({entities}) was redacted from your clipboard.")
        return "redact"

    # monitor: log only, leave the clipboard alone.
    log_event("clipboard", result["findings"], "monitor", source="clipboard")
    return "monitor"


# --- Watch loop --------------------------------------------------------------

def watch(poll_seconds=POLL_SECONDS):  # pragma: no cover - Windows-only loop
    """Blocking clipboard watch loop. Runs until the process exits."""
    if not IS_WINDOWS:
        print("[falcon-dlp] clipboard watcher is Windows-only; not started on "
              f"{sys.platform}. The /scan API still runs.", file=sys.stderr)
        return

    print("[falcon-dlp] clipboard watcher started.", file=sys.stderr)
    last_seq = _clipboard_sequence()
    while True:
        try:
            seq = _clipboard_sequence()
            if seq != last_seq:
                last_seq = seq
                text = _get_clipboard_text()
                if text:
                    # Don't re-scan our own scrubbed output.
                    verdict = handle_text(text, _set_clipboard_text)
                    if verdict in ("clear", "redact"):
                        # our SetClipboard bumped the sequence; resync so we
                        # don't immediately re-process our replacement.
                        last_seq = _clipboard_sequence()
        except Exception as exc:  # never let the watcher die silently
            print(f"[falcon-dlp] clipboard watcher error: {exc}", file=sys.stderr)
        time.sleep(poll_seconds)
