"""Validate manually annotated social/app brand-impersonation CSVs before training."""
from __future__ import annotations
import argparse
from pathlib import Path
import pandas as pd
from common import ensure_root, utc_now, write_json

ALLOWED_LABELS = {"confirmed_impersonator", "official_verified", "benign_unrelated", "suspicious_unverified", "unknown"}
TRAINABLE_LABELS = {"confirmed_impersonator", "official_verified", "benign_unrelated"}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("csv_path")
    parser.add_argument("--kind", choices=["social", "app"], required=True)
    parser.add_argument("--output-root", default="data/suraksha_ml")
    args = parser.parse_args()
    path = Path(args.csv_path)
    frame = pd.read_csv(path, dtype=str).fillna("")
    required = {"candidate_id", "brand_name", "label", "label_confidence", "reviewer_id", "reviewed_at_utc", "evidence_summary", "source_url"}
    missing = required - set(frame.columns)
    if missing:
        raise SystemExit(f"Missing required columns: {sorted(missing)}")
    bad_labels = sorted(set(frame["label"]) - ALLOWED_LABELS - {""})
    errors = []
    if bad_labels:
        errors.append(f"Unknown labels: {bad_labels}")
    duplicates = frame[frame["candidate_id"].duplicated(keep=False)]
    if len(duplicates):
        errors.append(f"Duplicate candidate_id rows: {len(duplicates)}")
    confirmed = frame[frame["label"].isin(TRAINABLE_LABELS)]
    required_evidence = ["source_url", "evidence_summary", "reviewer_id", "reviewed_at_utc"]
    missing_evidence = int((confirmed[required_evidence] == "").any(axis=1).sum()) if len(confirmed) else 0
    if missing_evidence:
        errors.append(f"{missing_evidence} trainable-label rows missing source/evidence/reviewer/timestamp")
    unknown_rows = int(frame["label"].isin(["", "unknown", "suspicious_unverified"]).sum())
    report = {
        "input": str(path.resolve()), "kind": args.kind, "rows": int(len(frame)),
        "label_counts": {str(k): int(v) for k, v in frame["label"].value_counts(dropna=False).items()},
        "trainable_label_count": int(len(confirmed)), "not_trainable_or_unlabelled_count": unknown_rows,
        "duplicate_candidate_id_rows": int(len(duplicates)), "missing_evidence_on_trainable_rows": missing_evidence,
        "errors": errors, "created_at_utc": utc_now(),
        "note": "This checks annotation completeness; it does not validate whether labels are factually correct. Independent review/adjudication is still required.",
    }
    root = ensure_root(args.output_root)
    out = root / "reports" / f"annotation_validation_{args.kind}.json"
    write_json(out, report)
    print(report)
    print(f"Report: {out}")
    if errors:
        raise SystemExit(1)

if __name__ == "__main__":
    main()
