"""Falcon DLP — detection config.

Custom RIA recognizers the stock Presidio model MISSES (SSN with RIA-style
formatting, financial account numbers, ABA routing numbers), plus the block
threshold and the list of AI domains the extension polices.

Account/routing patterns are intentionally low base-score and rely on
*context words* to boost — this is what keeps a random 9-digit number from
being flagged unless "routing"/"account"/"wire" is nearby. Tune thresholds
during testing. Add an ABA checksum validator later to cut false positives
further. Presidio also catches names/emails/phones/credit-cards out of the box.
"""

from presidio_analyzer import Pattern, PatternRecognizer

# Findings scoring at or below this are treated as noise and ignored (keeps a
# stray 9-digit number from firing unless context boosts it above the floor).
MIN_SCORE = 0.4

# Legacy single threshold, kept for the /scan verdict fallback. Prefer the
# per-entity ENTITY_POLICY below, which is the real enforcement knob.
BLOCK_THRESHOLD = 0.6

# --- Per-entity policy (the enforcement knob for you / Rachel) ---------------
# Action for each detected entity type once it clears MIN_SCORE:
#   "block"   -> hard stop. Browser: cancel the paste. Clipboard: clear it.
#   "redact"  -> allow a de-identified version. Browser: offer sanitized paste.
#               Clipboard: replace clipboard contents with the redacted text.
#   "monitor" -> log only, don't interrupt.
# The overall action taken is the most severe among the findings present
# (block > redact > monitor). Change these without touching code.
ENTITY_POLICY = {
    "US_SSN": "block",
    "FIN_ACCOUNT": "block",
    "ABA_ROUTING": "block",
    "CREDIT_CARD": "block",
    "US_BANK_NUMBER": "redact",
    "US_ITIN": "block",
    "US_PASSPORT": "redact",
    "US_DRIVER_LICENSE": "redact",
    "PERSON": "monitor",
    "EMAIL_ADDRESS": "monitor",
    "PHONE_NUMBER": "monitor",
    "LOCATION": "monitor",
    "URL": "monitor",
}
# Fallback action for any entity type not listed above.
DEFAULT_ACTION = "monitor"

# AI sites the extension is allowed to police (paste interception).
# Sites you flat-out prohibit belong in Chrome URLBlocklist / rules.json,
# not here. Kept in config so the backend can annotate logs consistently.
AI_DOMAINS = [
    "chatgpt.com",
    "chat.openai.com",
    "claude.ai",
    "gemini.google.com",
    "copilot.microsoft.com",
]

# US SSN: 123-45-6789, 123 45 6789, or 9 digits (sane exclusions via regex).
SSN = PatternRecognizer(
    supported_entity="US_SSN",
    patterns=[
        Pattern("ssn-dashed", r"\b(?!000|666|9\d{2})\d{3}[-\s](?!00)\d{2}[-\s](?!0000)\d{4}\b", 0.85),
        Pattern("ssn-plain", r"\b(?!000|666|9\d{2})\d{3}(?!00)\d{2}(?!0000)\d{4}\b", 0.6),
    ],
    context=["ssn", "social", "social security", "taxpayer", "tin"],
)

# Financial account numbers: typically 8-17 digits; context-boosted to cut
# false positives.
ACCOUNT = PatternRecognizer(
    supported_entity="FIN_ACCOUNT",
    patterns=[Pattern("acct", r"\b\d{8,17}\b", 0.35)],
    context=["account", "acct", "acct#", "account number", "account no",
             "schwab", "fidelity", "custodian", "brokerage"],
)

# ABA routing number: exactly 9 digits, context-boosted, AND checksum-validated.
# The ABA checksum (3-7-1 weighting mod 10) eliminates the vast majority of
# random 9-digit false positives: a valid routing number's digits satisfy
#   (3*(d1+d4+d7) + 7*(d2+d5+d8) + 1*(d3+d6+d9)) % 10 == 0
class AbaRoutingRecognizer(PatternRecognizer):
    def validate_result(self, pattern_text):
        digits = [int(c) for c in pattern_text if c.isdigit()]
        if len(digits) != 9:
            return False
        checksum = (
            3 * (digits[0] + digits[3] + digits[6])
            + 7 * (digits[1] + digits[4] + digits[7])
            + 1 * (digits[2] + digits[5] + digits[8])
        )
        # True  -> valid checksum, Presidio promotes the score (real routing #)
        # False -> fails checksum, result discarded (was a random 9-digit run)
        return checksum % 10 == 0


ROUTING = AbaRoutingRecognizer(
    supported_entity="ABA_ROUTING",
    patterns=[Pattern("aba", r"\b\d{9}\b", 0.3)],
    context=["routing", "aba", "rtn", "wire", "ach", "bank"],
)


def register_custom_recognizers(registry):
    """Register the custom RIA recognizers on an AnalyzerEngine registry."""
    for r in (SSN, ACCOUNT, ROUTING):
        registry.add_recognizer(r)
