"""
Leakage-aware evaluation harness for the URL phishing model.

Why this exists: in the bundled dataset, every benign row is a bare domain
("kraken.com") while about half of the phishing rows are full URLs with a scheme and
path. A model can then score well just by learning "full URL = phishing", which is
useless when the app scores bare lookalike domains. This harness makes that
visible by always reporting:

  1. A format-only "shortcut" baseline (length, slashes, dots, hyphens).
     If it comes close to the real model, the headline metric is mostly format.
  2. Each model on the raw test inputs AND on host-only inputs (scheme/path
     stripped), which matches how DetectionService scores domain candidates.

The split is the same root-domain-grouped split that url_pipeline.py trains on
(same grouping, test_size, seed). The shipped artifact is therefore evaluated
only on rows it never saw. The test-row fingerprint is written to the report so
later models can be compared on the identical frozen set.

Usage:
    python -m backend.app.ml.url_eval [--data-path ...] [--output ...]
"""

import argparse
import hashlib
import json
import os
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, confusion_matrix, f1_score, roc_auc_score
from sklearn.model_selection import GroupShuffleSplit

from backend.app.ml.url_pipeline import (
    DEFAULT_DATA_PATH,
    DEFAULT_MODEL_DIR,
    URL_MODEL_FILENAME,
    create_url_pipeline,
    extract_root_domain,
)

DEFAULT_REPORT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "reports", "url_eval_report.json")

# If the format-only baseline gets within this F1 margin of a model, flag it.
SHORTCUT_F1_MARGIN = 0.05


def to_host(indicator: str) -> str:
    """Strip scheme, credentials, port, path and query: keep the lowercase hostname."""
    s = str(indicator).strip().lower()
    s = s.split("://", 1)[-1]
    s = s.split("/", 1)[0].split("?", 1)[0].split("#", 1)[0]
    s = s.rsplit("@", 1)[-1]
    return s.split(":", 1)[0]


def canonical_host(indicator: str) -> str:
    """Hostname without trailing dot or leading 'www.': the form the URL model is scored on."""
    h = to_host(indicator).rstrip(".")
    return h[4:] if h.startswith("www.") else h


def format_features(indicators: pd.Series) -> np.ndarray:
    """Content-free surface features. Deliberately weak: a leakage detector, not a model."""
    s = indicators.astype(str)
    return np.c_[
        s.str.len(),
        s.str.count("/"),
        s.str.count(r"\."),
        s.str.contains("-").astype(int),
        s.str.contains("://").astype(int),
    ].astype(float)


def format_profile(df: pd.DataFrame) -> Dict[str, Dict[str, float]]:
    out = {}
    for label, grp in df.groupby("label"):
        s = grp["indicator"].astype(str)
        out[str(int(label))] = {
            "rows": int(len(s)),
            "has_scheme_rate": round(float(s.str.contains("://").mean()), 4),
            "has_path_rate": round(float(s.map(lambda x: "/" in x.split("://", 1)[-1]).mean()), 4),
            "mean_length": round(float(s.str.len().mean()), 1),
        }
    return out


def binary_metrics(
    y_true: np.ndarray,
    scores: np.ndarray,
    threshold: float = 0.5,
    n_boot: int = 1000,
    seed: int = 0,
) -> Dict[str, Any]:
    """Precision/recall/F1/FPR at threshold, PR-AUC, ROC-AUC, bootstrap 95% CIs for F1 and PR-AUC."""
    y_true = np.asarray(y_true).astype(int)
    scores = np.asarray(scores, dtype=float)
    pred = (scores >= threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_true, pred, labels=[0, 1]).ravel()

    def safe_div(a, b):
        return float(a) / float(b) if b else 0.0

    rng = np.random.default_rng(seed)
    f1s, aps = [], []
    n = len(y_true)
    for _ in range(n_boot):
        idx = rng.integers(0, n, n)
        yt = y_true[idx]
        if yt.min() == yt.max():
            continue
        f1s.append(f1_score(yt, pred[idx], zero_division=0))
        aps.append(average_precision_score(yt, scores[idx]))

    def ci(vals):
        return [round(float(np.percentile(vals, 2.5)), 4), round(float(np.percentile(vals, 97.5)), 4)] if vals else None

    return {
        "threshold": threshold,
        "n": int(n),
        "positives": int(y_true.sum()),
        "precision": round(safe_div(tp, tp + fp), 4),
        "recall": round(safe_div(tp, tp + fn), 4),
        "f1": round(float(f1_score(y_true, pred, zero_division=0)), 4),
        "f1_ci95": ci(f1s),
        "false_positive_rate": round(safe_div(fp, fp + tn), 4),
        "pr_auc": round(float(average_precision_score(y_true, scores)), 4),
        "pr_auc_ci95": ci(aps),
        "roc_auc": round(float(roc_auc_score(y_true, scores)), 4),
        "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
    }


def frozen_split(df: pd.DataFrame, test_size: float = 0.20, random_state: int = 42):
    """Identical to url_pipeline.train_and_evaluate_url_model's split."""
    groups = df["indicator"].apply(extract_root_domain)
    gss = GroupShuffleSplit(n_splits=1, test_size=test_size, random_state=random_state)
    train_idx, test_idx = next(gss.split(df, df["label"], groups=groups))
    train, test = df.iloc[train_idx], df.iloc[test_idx]
    overlap = set(groups.iloc[train_idx]) & set(groups.iloc[test_idx])
    assert not overlap, f"Root-domain leakage across split: {len(overlap)} groups"
    return train, test


def fingerprint(indicators: pd.Series) -> str:
    h = hashlib.sha256()
    for x in sorted(indicators.astype(str)):
        h.update(x.encode("utf-8") + b"\n")
    return h.hexdigest()


def run_url_evaluation(
    data_path: Optional[str] = None,
    model_path: Optional[str] = None,
    output_path: Optional[str] = None,
    test_size: float = 0.20,
    random_state: int = 42,
    n_boot: int = 1000,
) -> Dict[str, Any]:
    data_path = data_path or DEFAULT_DATA_PATH
    model_path = model_path or os.path.join(DEFAULT_MODEL_DIR, URL_MODEL_FILENAME)

    df = pd.read_parquet(data_path) if data_path.endswith(".parquet") else pd.read_csv(data_path)
    df = df.dropna(subset=["indicator", "label"]).copy()
    df["label"] = df["label"].astype(int)

    # Data-quality summary (reported, not silently "fixed").
    quality = {
        "rows": int(len(df)),
        "exact_duplicate_indicators": int(df["indicator"].duplicated().sum()),
        "conflicting_label_indicators": int((df.groupby("indicator")["label"].nunique() > 1).sum()),
        "host_collisions_across_labels": int((df.assign(h=df["indicator"].map(to_host)).groupby("h")["label"].nunique() > 1).sum()),
        "format_profile_by_label": format_profile(df),
    }

    train, test = frozen_split(df, test_size, random_state)
    y = test["label"].to_numpy()
    raw_x, host_x = test["indicator"].astype(str), test["indicator"].map(to_host)

    results: Dict[str, Any] = {}

    # 1. Format-only shortcut baseline
    shortcut = LogisticRegression(max_iter=2000).fit(format_features(train["indicator"]), train["label"])
    results["format_shortcut_baseline__raw"] = binary_metrics(
        y, shortcut.predict_proba(format_features(raw_x))[:, 1], n_boot=n_boot
    )

    # 2. Shipped artifact, raw and host-only inputs
    shipped_status = "not_found"
    if os.path.exists(model_path):
        shipped = joblib.load(model_path)
        shipped_status = "evaluated"
        results["shipped_model__raw"] = binary_metrics(y, shipped.predict_proba(raw_x)[:, 1], n_boot=n_boot)
        results["shipped_model__host_only"] = binary_metrics(y, shipped.predict_proba(host_x)[:, 1], n_boot=n_boot)

    # 3. Candidate: same architecture retrained on host-only inputs (matches app usage)
    host_model = create_url_pipeline(random_state=random_state).fit(train["indicator"].map(to_host), train["label"])
    results["host_only_retrained__host_only"] = binary_metrics(y, host_model.predict_proba(host_x)[:, 1], n_boot=n_boot)

    warnings = []
    sc_f1 = results["format_shortcut_baseline__raw"]["f1"]
    if "shipped_model__raw" in results and results["shipped_model__raw"]["f1"] - sc_f1 < SHORTCUT_F1_MARGIN:
        warnings.append(
            f"FORMAT LEAKAGE: a content-free format baseline reaches F1 {sc_f1} vs shipped model "
            f"{results['shipped_model__raw']['f1']} on raw inputs. The raw-input metric mostly measures URL format, not phishing."
        )
    profile = quality["format_profile_by_label"]
    if "0" in profile and "1" in profile and abs(profile["0"]["has_scheme_rate"] - profile["1"]["has_scheme_rate"]) > 0.2:
        warnings.append(
            "Class-dependent input format: scheme rate differs by label "
            f"(benign {profile['0']['has_scheme_rate']}, phishing {profile['1']['has_scheme_rate']})."
        )

    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "dataset_path": os.path.relpath(data_path),
        "sklearn_version": sklearn.__version__,
        "split": {
            "method": "GroupShuffleSplit by naive root domain (last two labels), same as url_pipeline.py",
            "test_size": test_size,
            "random_state": random_state,
            "train_rows": int(len(train)),
            "test_rows": int(len(test)),
            "test_set_sha256": fingerprint(test["indicator"]),
        },
        "data_quality": quality,
        "shipped_model": {"path": os.path.relpath(model_path), "status": shipped_status},
        "results": results,
        "warnings": warnings,
        "notes": [
            "Scores are uncalibrated predict_proba values; threshold 0.5.",
            "CIs are percentile bootstrap over test rows (rows are not fully independent within a root domain).",
            "Naive root-domain grouping mis-groups multi-part suffixes (e.g. co.uk) and shared hosts; treat as approximate.",
        ],
    }

    if output_path is not False:
        out = output_path or DEFAULT_REPORT_PATH
        os.makedirs(os.path.dirname(out), exist_ok=True)
        with open(out, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)
    return report


def _print_summary(report: Dict[str, Any]) -> None:
    print(f"Test rows: {report['split']['test_rows']}  sha256={report['split']['test_set_sha256'][:12]}")
    print(f"{'evaluation':42} {'prec':>6} {'rec':>6} {'F1':>6} {'F1 95% CI':>16} {'FPR':>6} {'PR-AUC':>7}")
    for name, m in report["results"].items():
        print(f"{name:42} {m['precision']:6.3f} {m['recall']:6.3f} {m['f1']:6.3f} {str(m['f1_ci95']):>16} "
              f"{m['false_positive_rate']:6.3f} {m['pr_auc']:7.3f}")
    for w in report["warnings"]:
        print("WARNING:", w)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SURAKSHA URL model leakage-aware evaluation")
    parser.add_argument("--data-path", default=DEFAULT_DATA_PATH)
    parser.add_argument("--model-path", default=None)
    parser.add_argument("--output", default=DEFAULT_REPORT_PATH)
    parser.add_argument("--n-boot", type=int, default=1000)
    args = parser.parse_args()
    _print_summary(run_url_evaluation(args.data_path, args.model_path, args.output, n_boot=args.n_boot))
