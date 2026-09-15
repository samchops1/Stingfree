"""Falcon DLP — policy + clipboard-enforcement unit tests.

These run anywhere (no Presidio, no Windows) because the detection call is
stubbed. They verify the decision logic and that the clipboard watcher takes
the right action (clear / scrub / leave alone) for each policy outcome.

Run: python test_policy.py
"""

import policy
import clipboard_agent
import detector


def check(name, cond):
    print(f"{'PASS' if cond else 'FAIL'}  {name}")
    if not cond:
        raise SystemExit(f"FAILED: {name}")


def test_decide():
    check("no findings -> allow", policy.decide([]) == "allow")
    check("SSN -> block", policy.decide([{"type": "US_SSN", "score": 0.9}]) == "block")
    check("name only -> monitor", policy.decide([{"type": "PERSON", "score": 0.9}]) == "monitor")
    check("passport -> redact", policy.decide([{"type": "US_PASSPORT", "score": 0.9}]) == "redact")
    # Most severe wins across a mix.
    mixed = [{"type": "PERSON", "score": 0.9}, {"type": "US_SSN", "score": 0.9}]
    check("mix name+SSN -> block", policy.decide(mixed) == "block")
    mixed2 = [{"type": "PERSON", "score": 0.9}, {"type": "US_PASSPORT", "score": 0.9}]
    check("mix name+passport -> redact", policy.decide(mixed2) == "redact")
    # Unknown entity falls back to DEFAULT_ACTION (monitor).
    check("unknown -> default", policy.decide([{"type": "MADE_UP", "score": 0.9}]) == "monitor")


def test_clipboard_enforcement():
    calls = []

    def fake_set(text):
        calls.append(text)
        return True

    # Stub the detector so we don't need Presidio here.
    def stub(action, redacted, entities):
        return lambda text: {
            "findings": [{"type": entities[0], "score": 0.9}],
            "redacted": redacted,
            "action": action,
            "entities": entities,
        }

    # block -> clipboard cleared to empty string
    calls.clear()
    detector.scan = stub("block", "Client SSN is <US_SSN>", ["US_SSN"])
    v = clipboard_agent.handle_text("Client SSN is 123-45-6789", fake_set)
    check("block verdict is 'clear'", v == "clear")
    check("block clears clipboard", calls == [""])

    # redact -> clipboard replaced with redacted text
    calls.clear()
    detector.scan = stub("redact", "passport <US_PASSPORT>", ["US_PASSPORT"])
    v = clipboard_agent.handle_text("passport 123456789", fake_set)
    check("redact verdict is 'redact'", v == "redact")
    check("redact scrubs to redacted", calls == ["passport <US_PASSPORT>"])

    # monitor -> clipboard untouched
    calls.clear()
    detector.scan = stub("monitor", "call John", ["PERSON"])
    v = clipboard_agent.handle_text("call John Smith", fake_set)
    check("monitor verdict is 'monitor'", v == "monitor")
    check("monitor leaves clipboard alone", calls == [])

    # short text -> ignored, no scan
    calls.clear()
    detector.scan = lambda text: (_ for _ in ()).throw(AssertionError("should not scan short text"))
    v = clipboard_agent.handle_text("hi", fake_set)
    check("short text ignored", v is None and calls == [])


if __name__ == "__main__":
    test_decide()
    test_clipboard_enforcement()
    print("\nAll policy/clipboard tests passed.")
