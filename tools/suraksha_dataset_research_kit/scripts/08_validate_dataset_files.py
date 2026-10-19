"""Lightweight validation and manifest summary for extracted dataset outputs."""
from __future__ import annotations
import argparse
from pathlib import Path
import json
import pandas as pd
from common import ensure_root, sha256_file, utc_now, write_json


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-root", default="data/suraksha_ml")
    args = parser.parse_args()
    root = ensure_root(args.output_root)
    checks = []
    for path in sorted((root / "processed").rglob("*.csv")):
        try:
            frame = pd.read_csv(path)
            checks.append({
                "file": str(path), "status": "ok", "rows": int(len(frame)),
                "columns": list(frame.columns), "duplicate_rows": int(frame.duplicated().sum()),
                "sha256": sha256_file(path),
            })
        except Exception as exc:
            checks.append({"file": str(path), "status": "error", "error": str(exc)})
    report = {"created_at_utc": utc_now(), "files_checked": len(checks), "checks": checks}
    write_json(root / "reports" / "dataset_validation_report.json", report)
    print(json.dumps(report, indent=2))
    if any(item["status"] != "ok" for item in checks):
        raise SystemExit(1)

if __name__ == "__main__":
    main()
