"""Falcon DLP — policy decision (pure logic, unit-testable without Presidio).

Given a list of findings, decide the overall action using the per-entity
ENTITY_POLICY in config.py. Severity order: block > redact > monitor. If there
are no findings at all, the action is "allow".
"""

from config import ENTITY_POLICY, DEFAULT_ACTION

_SEVERITY = {"allow": 0, "monitor": 1, "redact": 2, "block": 3}


def action_for(entity_type):
    """The configured action for a single entity type."""
    return ENTITY_POLICY.get(entity_type, DEFAULT_ACTION)


def decide(findings):
    """Overall action across all findings (most severe wins)."""
    if not findings:
        return "allow"
    worst = "monitor"
    for f in findings:
        act = action_for(f["type"])
        if _SEVERITY[act] > _SEVERITY[worst]:
            worst = act
    return worst
