"""Falcon DLP agent entry point (also the PyInstaller entry point).

Starts BOTH runtimes of the local agent in one process:
  1. the clipboard watcher (machine-wide vector) on a daemon thread, and
  2. the FastAPI /scan API (browser vector) via uvicorn on the main thread,
     bound to loopback only.

On non-Windows the clipboard watcher no-ops (logs and returns), so the API
still runs for development on macOS/Linux.
"""

import sys
import threading

import uvicorn

import clipboard_agent
import detector
from app import app


def _start_clipboard_watcher():
    # Warm the model once up front so the first clipboard/scan hit is fast.
    detector.warm_up()
    clipboard_agent.watch()


def _run_agent():
    watcher = threading.Thread(target=_start_clipboard_watcher, daemon=True)
    watcher.start()
    uvicorn.run(app, host="127.0.0.1", port=8765)


if __name__ == "__main__":
    # One binary, two modes:
    #   falcon-dlp-agent            -> run the live agent (clipboard + API)
    #   falcon-dlp-agent scan PATH  -> run the file/folder PII discovery scanner
    if len(sys.argv) > 1 and sys.argv[1] == "scan":
        import scan_files
        raise SystemExit(scan_files.main(sys.argv[2:]))
    _run_agent()
