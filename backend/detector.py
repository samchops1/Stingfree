"""Falcon DLP — shared detection engine.

Loads Presidio (analyzer + anonymizer + the custom RIA recognizers) exactly
once, so both the HTTP /scan endpoint (browser vector) and the clipboard
watcher (machine-wide vector) share a single model in memory.

scan(text) returns everything a caller needs to enforce policy:
  {
    "findings":  [{"type", "score"} ...]     # all findings above MIN_SCORE
    "redacted":  "<de-identified text>",
    "action":    "block" | "redact" | "monitor" | "allow",
    "entities":  ["US_SSN", ...]              # distinct actionable types
  }
"""

from presidio_analyzer import AnalyzerEngine
from presidio_anonymizer import AnonymizerEngine

from config import register_custom_recognizers, MIN_SCORE
from policy import decide

_analyzer = None
_anonymizer = None


def _engines():
    """Lazy-init so importing this module (e.g. on non-Windows, or in tests
    that don't scan) doesn't force the spaCy model to load."""
    global _analyzer, _anonymizer
    if _analyzer is None:
        _analyzer = AnalyzerEngine()
        register_custom_recognizers(_analyzer.registry)  # SSN / account / routing
        _anonymizer = AnonymizerEngine()
    return _analyzer, _anonymizer


def warm_up():
    """Force the model to load now (used at agent startup so the first real
    scan isn't slow)."""
    _engines()


def scan(text):
    analyzer, anonymizer = _engines()
    results = analyzer.analyze(text=text, language="en")

    # Keep only findings above the noise floor.
    kept = [r for r in results if r.score > MIN_SCORE]
    findings = [{"type": r.entity_type, "score": round(r.score, 2)} for r in kept]

    # Anonymize using the kept results so the redacted text matches the
    # findings we actually acted on.
    redacted = anonymizer.anonymize(text=text, analyzer_results=kept).text if kept else text

    action = decide(findings)
    entities = sorted({f["type"] for f in findings})
    return {"findings": findings, "redacted": redacted, "action": action, "entities": entities}
