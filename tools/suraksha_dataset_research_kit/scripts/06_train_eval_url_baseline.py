"""Train/evaluate a URL-only character TF-IDF baseline with domain-disjoint splits.

This is a benchmark artifact, not a production model replacement. Do not fetch
or open any URLs in the dataset. The model sees only URL strings.
"""
from __future__ import annotations
import argparse
import ipaddress
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit
import json
import numpy as np
import pandas as pd
import tldextract
import sklearn
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (average_precision_score, balanced_accuracy_score, brier_score_loss,
                             confusion_matrix, f1_score, precision_score, recall_score, roc_auc_score)
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.pipeline import Pipeline
import joblib
from common import ensure_root, sha256_file, utc_now, write_json


def normalize_for_dedupe(value: str) -> str:
    value = str(value).strip()
    if not value:
        return ""
    try:
        parsed = urlsplit(value if "://" in value else "http://" + value)
        host = (parsed.hostname or "").lower().rstrip(".")
    except ValueError:
        return value
    if not host:
        return value
    try:
        host = host.encode("idna").decode("ascii").lower()
    except UnicodeError:
        host = host.lower()
    netloc = host
    try:
        port = parsed.port
    except ValueError:
        port = None
    if port:
        netloc += f":{port}"
    return urlunsplit((parsed.scheme.lower(), netloc, parsed.path or "/", parsed.query, ""))


def root_domain(value: str, extractor) -> str:
    parsed = urlsplit(str(value) if "://" in str(value) else "http://" + str(value))
    host = (parsed.hostname or "").lower().rstrip(".")
    try:
        host = host.encode("idna").decode("ascii").lower()
    except UnicodeError:
        pass
    if not host:
        return "invalid:" + normalize_for_dedupe(value)[:150]
    try:
        ipaddress.ip_address(host)
        return "ip:" + host
    except ValueError:
        pass
    try:
        ext = extractor(host)
        root = ext.top_domain_under_public_suffix
        if root:
            return root.lower()
    except Exception:
        pass
    labels = host.split(".")
    return ".".join(labels[-2:]) if len(labels) > 1 else host


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-root", default="data/suraksha_ml")
    parser.add_argument("--input", default=None)
    args = parser.parse_args()
    root = ensure_root(args.output_root)
    input_path = Path(args.input) if args.input else root / "processed" / "url_phishing_labels.csv"
    if not input_path.exists():
        raise SystemExit(f"Missing {input_path}. Run scripts/01_download_phiusiil.py first.")
    frame = pd.read_csv(input_path)
    required = {"url", "label_is_phishing"}
    if not required.issubset(frame.columns):
        raise SystemExit(f"Input must contain {sorted(required)}")
    frame = frame[["url", "label_is_phishing"]].dropna().copy()
    frame["url"] = frame["url"].astype(str).str.strip()
    frame = frame[frame["url"].ne("")]
    frame["label_is_phishing"] = pd.to_numeric(frame["label_is_phishing"], errors="coerce")
    frame = frame[frame["label_is_phishing"].isin([0, 1])].copy()
    frame["label_is_phishing"] = frame["label_is_phishing"].astype(int)
    rows_after_basic_filter = int(len(frame))
    frame["_norm"] = frame["url"].map(normalize_for_dedupe)
    conflict_keys = frame.groupby("_norm")["label_is_phishing"].nunique()
    conflicts = set(conflict_keys[conflict_keys > 1].index)
    conflict_count = int(frame["_norm"].isin(conflicts).sum())
    without_conflicts = frame[~frame["_norm"].isin(conflicts)].copy()
    rows_before_exact_dedup = int(len(without_conflicts))
    frame = without_conflicts.drop_duplicates("_norm").copy()
    exact_duplicates_removed = rows_before_exact_dedup - int(len(frame))
    extractor = tldextract.TLDExtract(suffix_list_urls=())
    frame["group_domain"] = frame["url"].map(lambda u: root_domain(u, extractor))
    if frame["label_is_phishing"].nunique() != 2:
        raise SystemExit("Need both phishing and legitimate labels after cleaning.")
    if frame["group_domain"].nunique() < 5:
        raise SystemExit("Not enough unique domain groups for a meaningful grouped split.")

    # Fold 1 of 5 = held-out test; fold 1 of 4 on the remaining groups = validation.
    sgkf_test = StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=2026)
    trainval_idx, test_idx = next(sgkf_test.split(frame["url"], frame["label_is_phishing"], frame["group_domain"]))
    trainval = frame.iloc[trainval_idx].reset_index(drop=True)
    test = frame.iloc[test_idx].reset_index(drop=True)
    sgkf_val = StratifiedGroupKFold(n_splits=4, shuffle=True, random_state=2027)
    train_idx, val_idx = next(sgkf_val.split(trainval["url"], trainval["label_is_phishing"], trainval["group_domain"]))
    train = trainval.iloc[train_idx].reset_index(drop=True)
    val = trainval.iloc[val_idx].reset_index(drop=True)

    # Persist the exact split artifacts for reproducibility (kept locally under ignored data/).
    split_dir = root / "processed" / "splits"
    split_dir.mkdir(parents=True, exist_ok=True)
    split_hashes = {}
    for split_name, split_frame in (("train", train), ("validation", val), ("test", test)):
        split_path = split_dir / f"url_{split_name}.csv"
        split_frame[["url", "label_is_phishing", "group_domain"]].to_csv(split_path, index=False)
        split_hashes[split_name] = sha256_file(split_path)

    # Fail closed if any root-domain group crosses splits.
    group_sets = [set(x["group_domain"]) for x in (train, val, test)]
    if group_sets[0] & group_sets[1] or group_sets[0] & group_sets[2] or group_sets[1] & group_sets[2]:
        raise RuntimeError("Root-domain leakage detected between splits.")

    pipe = Pipeline([
        ("tfidf", TfidfVectorizer(analyzer="char", ngram_range=(3, 6), min_df=2, max_features=400_000, sublinear_tf=True, lowercase=True)),
        ("classifier", LogisticRegression(C=4.0, max_iter=2000, class_weight="balanced", solver="liblinear", random_state=2026)),
    ])
    pipe.fit(train["url"], train["label_is_phishing"])
    # Validation metrics are diagnostics only. Final held-out test is evaluated once at threshold 0.5.
    val_prob = pipe.predict_proba(val["url"])[:, list(pipe.named_steps["classifier"].classes_).index(1)]
    test_prob = pipe.predict_proba(test["url"])[:, list(pipe.named_steps["classifier"].classes_).index(1)]

    def metric_pack(y, p):
        pred = (p >= 0.5).astype(int)
        tn, fp, fn, tp = confusion_matrix(y, pred, labels=[0, 1]).ravel()
        result = {
            "rows": int(len(y)),
            "precision": float(precision_score(y, pred, zero_division=0)),
            "recall": float(recall_score(y, pred, zero_division=0)),
            "f1": float(f1_score(y, pred, zero_division=0)),
            "balanced_accuracy": float(balanced_accuracy_score(y, pred)),
            "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
            "brier_score": float(brier_score_loss(y, p)),
        }
        result["roc_auc"] = float(roc_auc_score(y, p)) if len(set(y)) > 1 else None
        result["average_precision"] = float(average_precision_score(y, p)) if len(set(y)) > 1 else None
        return result

    predictions = test[["url", "label_is_phishing", "group_domain"]].copy()
    predictions["predicted_probability_phishing"] = test_prob
    predictions["predicted_label_is_phishing"] = (test_prob >= 0.5).astype(int)
    pred_path = root / "reports" / "url_test_predictions.csv"
    predictions.to_csv(pred_path, index=False)
    model_path = root / "artifacts" / "research_only" / "url_char_tfidf_logreg.joblib"
    model_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipe, model_path)
    metrics = {
        "task": "URL-only phishing classification",
        "dataset": "UCI PhiUSIIL URL column only; source labels normalized to 1=phishing",
        "evaluation_design": "StratifiedGroupKFold domain-disjoint train/validation/test split; 0.5 threshold, no test-set threshold tuning",
        "cleaning": {"rows_after_basic_filter": rows_after_basic_filter, "rows_removed_due_to_conflicting_duplicate_labels": conflict_count, "exact_duplicate_rows_removed": exact_duplicates_removed, "rows_after_exact_normalized_deduplication": int(len(frame)), "unique_root_domains": int(frame["group_domain"].nunique())},
        "split_counts": {"train": int(len(train)), "validation": int(len(val)), "test": int(len(test))},
        "unique_root_domains_per_split": {"train": int(train["group_domain"].nunique()), "validation": int(val["group_domain"].nunique()), "test": int(test["group_domain"].nunique())},
        "persisted_split_sha256": split_hashes,
        "validation_metrics": metric_pack(val["label_is_phishing"].to_numpy(), val_prob),
        "held_out_test_metrics": metric_pack(test["label_is_phishing"].to_numpy(), test_prob),
        "sklearn_version": sklearn.__version__,
        "model_sha256": sha256_file(model_path),
        "test_predictions_sha256": sha256_file(pred_path),
        "created_at_utc": utc_now(),
        "limitations": ["Old or source-specific distribution may differ from current threats.", "URL string only; no live DOM, certificate, DNS, hosting, or page screenshot features.", "A model output is not proof that a live site is malicious.", "This research model must be compared with the existing SURAKSHA model on a frozen common benchmark before any replacement."],
    }
    write_json(root / "reports" / "url_baseline_metrics.json", metrics)
    print(json.dumps(metrics["held_out_test_metrics"], indent=2))
    print(f"Metrics: {root / 'reports' / 'url_baseline_metrics.json'}")
    print(f"Research-only model: {model_path}")

if __name__ == "__main__":
    main()
