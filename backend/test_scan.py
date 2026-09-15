"""Falcon DLP — sanity test.

Posts sample (FAKE) PII to a running /scan endpoint and prints the verdict,
findings, and redacted output for each case. Also exercises /logs.

Usage (with the backend running on 127.0.0.1:8765):
    python test_scan.py
"""

import json
import sys
import urllib.request

BASE = "http://127.0.0.1:8765"

# All fake / test values.
CASES = [
    ("Client SSN is 123-45-6789 acct 12345678", "expect: block (SSN)"),
    ("Please wire to routing 021000021 account 000123456789", "expect: block"),
    ("The invoice total is 15 and the meeting is at 9", "expect: allow (no PII)"),
    ("Contact John Smith at john@example.com about the plan", "expect: name/email"),
]


def post(path, payload):
    req = urllib.request.Request(
        f"{BASE}{path}",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def get(path):
    with urllib.request.urlopen(f"{BASE}{path}", timeout=30) as r:
        return json.load(r)


def main():
    try:
        get("/health")
    except Exception as exc:
        print(f"Backend not reachable at {BASE} — is uvicorn running? ({exc})")
        sys.exit(1)

    for text, note in CASES:
        res = post("/scan", {"text": text, "url": "test"})
        print(f"\n>>> {note}")
        print(f"    text     : {text}")
        print(f"    verdict  : {res['verdict']}")
        print(f"    findings : {res['findings']}")
        print(f"    redacted : {res['redacted']}")

    print("\n--- /logs ---")
    print(json.dumps(get("/logs")["counts"], indent=2))


if __name__ == "__main__":
    main()
