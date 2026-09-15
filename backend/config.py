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

# Any finding scoring strictly above this becomes a "block" verdict.
BLOCK_THRESHOLD = 0.6

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

# ABA routing number: exactly 9 digits, context-boosted (checksum could be
# added later).
ROUTING = PatternRecognizer(
    supported_entity="ABA_ROUTING",
    patterns=[Pattern("aba", r"\b\d{9}\b", 0.3)],
    context=["routing", "aba", "rtn", "wire", "ach", "bank"],
)


def register_custom_recognizers(registry):
    """Register the custom RIA recognizers on an AnalyzerEngine registry."""
    for r in (SSN, ACCOUNT, ROUTING):
        registry.add_recognizer(r)
