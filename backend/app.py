"""Falcon DLP backend — FastAPI + Presidio (browser vector API).

Binds to 127.0.0.1 only (enforced by run.py / the service definition).
Scanned text never leaves the machine and is never written to the log.

This is the API the Chrome extension calls. The machine-wide clipboard vector
lives in clipboard_agent.py and shares the same detector.

Endpoints:
  POST /scan      scan text, return verdict/findings/redacted, log the event
  POST /override  record that a user chose "Override and log" (204-2 trail)
  GET  /logs      recent events + today's counts (the popup reads this)
  GET  /health    liveness for the service wrapper
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import detector
from logstore import log_event, recent_events, today_counts, init_db

app = FastAPI(title="Falcon DLP", version="0.2")

# The extension is a different origin (chrome-extension://...) so it needs
# CORS. This is safe: the server only listens on loopback, so "allow all
# origins" still can't be reached from another machine.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup():
    init_db()
    detector.warm_up()  # load the model now so the first scan isn't slow


class ScanReq(BaseModel):
    text: str
    url: str = ""


class OverrideReq(BaseModel):
    url: str = ""
    findings: list = []
    reason: str = ""


@app.post("/scan")
def scan(r: ScanReq):
    result = detector.scan(r.text)
    # The extension blocks on "block"; "redact"/"monitor"/"allow" pass through
    # (the banner offers the sanitized version for redact). Map to a verdict
    # the extension understands while keeping the richer action available.
    verdict = "block" if result["action"] == "block" else "allow"
    log_event(r.url, result["findings"], result["action"], source="browser")
    return {
        "verdict": verdict,
        "action": result["action"],
        "findings": result["findings"],
        "redacted": result["redacted"],
    }


@app.post("/override")
def override(r: OverrideReq):
    """User clicked 'Override and log' — record it as its own verdict, with the
    user's justification, so the 204-2 log measures who bypassed the control
    and why."""
    log_event(r.url, r.findings, "override", source="browser", note=r.reason)
    return {"ok": True}


@app.get("/logs")
def logs(limit: int = 50):
    return {"counts": today_counts(), "recent": recent_events(limit)}


@app.get("/health")
def health():
    return {"status": "ok"}
