"""Download UCI PhiUSIIL and export URL-only labels for a lexical baseline.

The full UCI dataset has many page/source-derived features. They are preserved
for audit only; the URL-only model output deliberately uses ONLY the URL string
so training-time feature availability matches SURAKSHA's lexical inference path.
"""
from __future__ import annotations
import argparse
from pathlib import Path
import pandas as pd
from ucimlrepo import fetch_ucirepo
from common import ensure_root, sha256_file, utc_now, write_json

SOURCE = "https://archive.ics.uci.edu/dataset/967/phiusiil+phishing+url+dataset"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-root", default="data/suraksha_ml")
    args = parser.parse_args()
    root = ensure_root(args.output_root)
    raw_dir = root / "raw" / "phiusiil"
    processed_dir = root / "processed"
    raw_dir.mkdir(parents=True, exist_ok=True)
    processed_dir.mkdir(parents=True, exist_ok=True)

    ds = fetch_ucirepo(id=967)
    x = ds.data.features.copy()
    y = ds.data.targets.copy()
    url_cols = [c for c in x.columns if str(c).strip().casefold() == "url"]
    if not url_cols:
        raise RuntimeError(f"Cannot find URL column in UCI feature fields: {list(x.columns)}")
    if y.shape[1] != 1:
        raise RuntimeError(f"Expected one target column; got {list(y.columns)}")

    raw = x.copy()
    raw[y.columns[0]] = y.iloc[:, 0].values
    raw_path = raw_dir / "phiusiil_full_features.csv"
    raw.to_csv(raw_path, index=False)

    raw_label = pd.to_numeric(y.iloc[:, 0], errors="coerce")
    unique_labels = set(raw_label.dropna().unique().tolist())
    if not unique_labels.issubset({0, 1}) or unique_labels != {0, 1}:
        raise RuntimeError(f"Unexpected UCI labels {sorted(unique_labels)}; inspect source before mapping.")
    # UCI documentation: 1=legitimate, 0=phishing. Normalize so 1=phishing.
    out = pd.DataFrame({
        "url": x[url_cols[0]].astype("string").str.strip(),
        "label_is_phishing": (raw_label == 0).astype("int8"),
        "source_dataset": "UCI PhiUSIIL Phishing URL (Website)",
        "source_url": SOURCE,
        "retrieved_at_utc": utc_now(),
    })
    out = out[out["url"].notna() & out["url"].ne("")].copy()
    out_path = processed_dir / "url_phishing_labels.csv"
    out.to_csv(out_path, index=False)
    label_counts = out["label_is_phishing"].value_counts().sort_index().to_dict()
    manifest = {
        "dataset": "PhiUSIIL Phishing URL (Website)",
        "source_url": SOURCE,
        "source_id": "UCI ML Repository 967",
        "citation": "Prasad, A. & Chandra, S. (2024). PhiUSIIL Phishing URL (Website) [Dataset]. UCI Machine Learning Repository. https://doi.org/10.1016/j.cose.2023.103545",
        "license": "Creative Commons Attribution 4.0 International (CC BY 4.0)",
        "label_mapping": {"source_label_0": "phishing", "source_label_1": "legitimate", "normalized_label_is_phishing_1": "phishing"},
        "rows_exported": int(len(out)),
        "normalized_class_counts": {str(k): int(v) for k, v in label_counts.items()},
        "full_features_sha256": sha256_file(raw_path),
        "url_only_labels_sha256": sha256_file(out_path),
        "retrieved_at_utc": utc_now(),
        "important_note": "The full dataset includes webpage/source-derived features. The exported URL-only corpus is for a lexical model and does not include those precomputed features.",
    }
    write_json(root / "manifests" / "phiusiil_manifest.json", manifest)
    print(f"Saved full source features: {raw_path} ({len(raw):,} rows)")
    print(f"Saved URL-only labelled corpus: {out_path} ({len(out):,} rows)")
    print(f"Normalized labels (1=phishing): {manifest['normalized_class_counts']}")
    print("Do not report model metrics until train/validation/test splitting and evaluation have run.")

if __name__ == "__main__":
    main()
