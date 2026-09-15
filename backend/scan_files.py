"""Falcon DLP — PII discovery CLI.

Scan a file or a whole folder for client PII and print a report. Detection
only: it tells you WHERE PII lives, it does not block or modify anything.

Examples:
    python scan_files.py "C:\\ClientDocs"
    python scan_files.py report.pdf --json findings.json
    python scan_files.py "\\\\fileserver\\share" --log     # also write to the 204-2 log

Nothing leaves the machine; large document text is never written to the log,
only finding types + counts.
"""

import argparse
import json
import os
import sys

import scanner
from logstore import init_db, log_event

_LABELS = {
    "US_SSN": "SSN",
    "FIN_ACCOUNT": "Account #",
    "ABA_ROUTING": "Routing #",
    "CREDIT_CARD": "Credit card",
    "US_ITIN": "ITIN",
    "US_PASSPORT": "Passport",
    "US_DRIVER_LICENSE": "Driver lic.",
    "PERSON": "Name",
    "EMAIL_ADDRESS": "Email",
    "PHONE_NUMBER": "Phone",
}


def _fmt_types(by_type):
    parts = []
    for t, v in sorted(by_type.items(), key=lambda kv: -kv[1]["count"]):
        parts.append(f"{_LABELS.get(t, t)}×{v['count']}")
    return ", ".join(parts)


def _human_size(n):
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024:
            return f"{n:.0f}{unit}"
        n /= 1024
    return f"{n:.0f}TB"


def main(argv=None):
    ap = argparse.ArgumentParser(description="Falcon DLP file/folder PII discovery scanner")
    ap.add_argument("path", help="file or folder to scan")
    ap.add_argument("--json", metavar="OUT", help="write the full report to this JSON file")
    ap.add_argument("--log", action="store_true", help="also record files-with-PII to the SQLite 204-2 log (source=file)")
    ap.add_argument("--quiet", action="store_true", help="suppress per-file progress")
    args = ap.parse_args(argv)

    if not os.path.exists(args.path):
        print(f"Path not found: {args.path}", file=sys.stderr)
        return 2

    def progress(i, total, path):
        if not args.quiet:
            print(f"  [{i}/{total}] {path}", file=sys.stderr)

    print(f"Scanning {args.path} ...", file=sys.stderr)
    reports, summary = scanner.scan_path(args.path, progress=progress)

    # Report table: only files that had PII (the actionable ones).
    hits = [r for r in reports if r["by_type"]]
    print("\n=== Files containing PII ===")
    if not hits:
        print("  (none found)")
    for r in sorted(hits, key=lambda r: -sum(v["count"] for v in r["by_type"].values())):
        units = f"  [{', '.join(r['hit_units'])}]" if r["hit_units"] else ""
        print(f"  {r['action'].upper():7} {_human_size(r['size']):>7}  {r['path']}")
        print(f"          {_fmt_types(r['by_type'])}{units}")

    # Errors / skips worth surfacing.
    errs = [r for r in reports if r["status"] == "error"]
    if errs:
        print("\n=== Errors ===")
        for r in errs:
            print(f"  {r['path']}: {r['error']}")

    # Summary.
    print("\n=== Summary ===")
    print(f"  files scanned : {summary['files_scanned']}  (skipped {summary['files_skipped']}, errors {summary['files_error']})")
    print(f"  files with PII: {summary['files_with_pii']}")
    if summary["entity_totals"]:
        tot = ", ".join(f"{_LABELS.get(t, t)}×{n}" for t, n in summary["entity_totals"].items())
        print(f"  entity totals : {tot}")

    if args.log:
        init_db()
        for r in hits:
            findings = [{"type": t, "score": v["max_score"]} for t, v in r["by_type"].items()]
            log_event(r["path"], findings, r["action"], source="file")
        print(f"\n  logged {len(hits)} file(s) to the 204-2 log.", file=sys.stderr)

    if args.json:
        with open(args.json, "w", encoding="utf-8") as f:
            json.dump({"summary": summary, "reports": reports}, f, indent=2)
        print(f"  full report written to {args.json}", file=sys.stderr)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
