"""Falcon DLP backend — FastAPI + Presidio.

Binds to 127.0.0.1 only (enforced by run.py / the service definition).
Scanned text never leaves the machine and is never written to the log.

Endpoints:
  POST /scan      scan text, return verdict/findings/redacted, log the event
  POST /override  record that a user chose "Override and log" (204-2 trail)
  GET  /logs      recent events + today's counts (the popup reads this)
  GET  /health    liveness for the service wrapper
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from presidio_analyzer import AnalyzerEngine
from presidio_anonymizer import AnonymizerEngine

from logstore import log_event, recent_events, today_counts, init_db
from config import register_custom_recognizers, BLOCK_THRESHOLD

app = FastAPI(title="Falcon DLP", version="0.1")

# The extension is a different origin (chrome-extension://...) so it needs
# CORS. This is safe: the server only listens on loopback, so "allow all
# origins" still can't be reached from another machine.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

analyzer = AnalyzerEngine()
register_custom_recognizers(analyzer.registry)  # SSN / account / routing
anonymizer = AnonymizerEngine()


@app.on_event("startup")
def _startup():
    init_db()


class ScanReq(BaseModel):
    text: str
    url: str = ""


class OverrideReq(BaseModel):
    url: str = ""
    findings: list = []


@app.post("/scan")
def scan(r: ScanReq):
    res = analyzer.analyze(text=r.text, language="en")
    redacted = anonymizer.anonymize(text=r.text, analyzer_results=res).text
    findings = [{"type": x.entity_type, "score": round(x.score, 2)} for x in res]
    verdict = "block" if any(f["score"] > BLOCK_THRESHOLD for f in findings) else "allow"
    log_event(r.url, findings, verdict)
    return {"verdict": verdict, "findings": findings, "redacted": redacted}


@app.post("/override")
def override(r: OverrideReq):
    """User clicked 'Override and log' — record it as its own verdict so the
    204-2 log measures how often people bypass the control."""
    log_event(r.url, r.findings, "override")
    return {"ok": True}


@app.get("/logs")
def logs(limit: int = 50):
    return {"counts": today_counts(), "recent": recent_events(limit)}


@app.get("/health")
def health():
    return {"status": "ok"}
