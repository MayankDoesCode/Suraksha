"""Evaluate a generic Instagram fake-account baseline on research-only InstaFake data.

This does NOT evaluate brand impersonation. Requires previously normalized
research_only/instafake_fake_accounts.csv and CC BY-NC 4.0 permission compliance.
"""
from __future__ import annotations
import argparse
from pathlib import Path
import json
import pandas as pd
import sklearn
from sklearn.dummy import DummyClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (balanced_accuracy_score, f1_score, precision_score, recall_score,
                             roc_auc_score)
from sklearn.model_selection import RepeatedStratifiedKFold, cross_validate
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from common import ensure_root, utc_now, write_json


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-root", default="data/suraksha_ml")
    parser.add_argument("--research-only", action="store_true")
    args = parser.parse_args()
    if not args.research_only:
        parser.error("InstaFake is CC BY-NC 4.0; specify --research-only and do not ship results/artifacts commercially without permission.")
    root = ensure_root(args.output_root)
    source = root / "processed" / "research_only" / "instafake_fake_accounts.csv"
    if not source.exists():
        raise SystemExit(f"Missing {source}. Run 02_download_instafake_noncommercial.py and 03_prepare_instafake.py first.")
    frame = pd.read_csv(source)
    label_col = "label_is_fake"
    if label_col not in frame:
        raise SystemExit(f"Missing {label_col} in {source}")
    feature_cols = [c for c in frame.columns if c not in {label_col, "source_dataset"}]
    frame[feature_cols] = frame[feature_cols].apply(pd.to_numeric, errors="coerce")
    frame = frame.dropna(subset=[label_col]).copy()
    frame[label_col] = frame[label_col].astype(int)
    # Drop exact feature duplicates to reduce repeated-record leakage. Contradictory duplicate groups are excluded.
    frame["_row_key"] = pd.util.hash_pandas_object(frame[feature_cols].fillna(-999999), index=False).astype(str)
    conflicts = frame.groupby("_row_key")[label_col].nunique()
    bad_keys = set(conflicts[conflicts > 1].index)
    conflict_rows = int(frame["_row_key"].isin(bad_keys).sum())
    frame = frame[~frame["_row_key"].isin(bad_keys)].drop_duplicates("_row_key").drop(columns="_row_key")
    X, y = frame[feature_cols], frame[label_col]
    counts = y.value_counts()
    n_splits = min(5, int(counts.min()))
    if n_splits < 2:
        raise SystemExit("Not enough examples in the minority class for cross-validation.")
    cv = RepeatedStratifiedKFold(n_splits=n_splits, n_repeats=5, random_state=2026)
    scoring = {"precision": "precision", "recall": "recall", "f1": "f1", "balanced_accuracy": "balanced_accuracy", "roc_auc": "roc_auc"}
    models = {
        "dummy_prior": DummyClassifier(strategy="prior"),
        "logistic_regression": Pipeline([
            ("imputer", SimpleImputer(strategy="median", add_indicator=True)),
            ("scaler", StandardScaler()),
            ("classifier", LogisticRegression(max_iter=3000, class_weight="balanced", random_state=2026)),
        ]),
    }
    results = {}
    for name, model in models.items():
        cv_result = cross_validate(model, X, y, cv=cv, scoring=scoring, error_score="raise")
        results[name] = {
            metric: {"mean": float(cv_result[f"test_{metric}"].mean()), "std": float(cv_result[f"test_{metric}"].std(ddof=1))}
            for metric in scoring
        }
    report = {
        "task": "Generic Instagram fake-account classification (NOT brand impersonation)",
        "dataset": "InstaFake fake-v1.0 (anonymized profile feature records reported collected in 2018)",
        "license": "CC BY-NC 4.0; research-only",
        "rows_after_deduplication": int(len(frame)),
        "class_counts": {str(k): int(v) for k, v in y.value_counts().sort_index().items()},
        "conflicting_duplicate_rows_excluded": conflict_rows,
        "folds": n_splits,
        "repeats": 5,
        "metrics": results,
        "sklearn_version": sklearn.__version__,
        "created_at_utc": utc_now(),
        "limitations": [
            "No stable account identifiers are available for group-based splitting.",
            "Dataset is old and small; repeated CV metrics are not a guarantee of current performance.",
            "Labels refer to generic fake-account behavior, not brand-specific impersonation.",
            "Non-commercial license: do not ship these data or dependent model artifacts in a commercial product without permission/legal review.",
        ],
    }
    write_json(root / "reports" / "instafake_generic_fake_account_cv.json", report)
    print(json.dumps(report, indent=2))

if __name__ == "__main__":
    main()
