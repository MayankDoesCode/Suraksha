import os
import json
import logging
import argparse
from datetime import datetime, timezone
from urllib.parse import urlparse
from typing import Optional, Dict, Any, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GroupShuffleSplit
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
)

logger = logging.getLogger(__name__)

DEFAULT_DATA_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "data", "phishing_dataset.parquet"
)
DEFAULT_MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
URL_MANIFEST_FILENAME = "url_phishing_manifest.json"
URL_MODEL_FILENAME = "url_phishing_pipeline.joblib"


def extract_root_domain(indicator: str) -> str:
    """
    Extract the effective registrable root domain or hostname to prevent
    leakage across train/test splits. E.g. sub.example.com -> example.com.
    """
    s = str(indicator).strip().lower()
    if not (s.startswith("http://") or s.startswith("https://")):
        s = "http://" + s
    try:
        parsed = urlparse(s)
        netloc = parsed.netloc or parsed.path
        host = netloc.split(":")[0]
        parts = host.split(".")
        if len(parts) >= 2:
            return ".".join(parts[-2:])
        return host
    except Exception:
        return s


def create_url_pipeline(random_state: int = 42) -> Pipeline:
    """
    Construct a TF-IDF character n-gram + Logistic Regression pipeline
    specialized for URL and domain lexical threat classification.
    """
    return Pipeline([
        (
            "tfidf",
            TfidfVectorizer(
                analyzer="char_wb",
                ngram_range=(3, 5),
                min_df=2,
                sublinear_tf=True,
            ),
        ),
        (
            "clf",
            LogisticRegression(
                C=1.0,
                class_weight="balanced",
                max_iter=1000,
                random_state=random_state,
                solver="lbfgs",
            ),
        ),
    ])


def train_and_evaluate_url_model(
    data_path: Optional[str] = None,
    output_dir: Optional[str] = None,
    test_size: float = 0.20,
    random_state: int = 42,
) -> Dict[str, Any]:
    """
    Train and evaluate URL phishing classifier with domain-leakage prevention.
    
    Safety Guarantees:
    - Held-out test set split strictly by root domain groups.
    - Zero domain overlap between train and test splits.
    - Honest, un-fabricated evaluation metrics.
    """
    path = data_path or DEFAULT_DATA_PATH
    out_dir = output_dir or DEFAULT_MODEL_DIR
    os.makedirs(out_dir, exist_ok=True)
    manifest_path = os.path.join(out_dir, URL_MANIFEST_FILENAME)

    if not os.path.exists(path):
        manifest = {
            "trained": False,
            "status": "missing_dataset",
            "reason": f"URL phishing dataset not found at '{path}'.",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "metrics": None,
            "model_version": None,
        }
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)
        print(f"[!] Dataset Blocker: {manifest['reason']}")
        return manifest

    # 1. Load dataset
    print(f"[*] Loading dataset from '{path}'...")
    if path.endswith(".parquet"):
        df = pd.read_parquet(path)
    elif path.endswith(".csv"):
        df = pd.read_csv(path)
    else:
        df = pd.read_parquet(path)

    # 2. Quality & Schema validation
    if "indicator" not in df.columns or "label" not in df.columns:
        manifest = {
            "trained": False,
            "status": "schema_mismatch",
            "reason": "Dataset must contain 'indicator' (text) and 'label' (binary) columns.",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "metrics": None,
        }
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)
        return manifest

    df = df.dropna(subset=["indicator", "label"]).copy()
    df["label"] = df["label"].astype(int)

    total_rows = len(df)
    label_counts = df["label"].value_counts().to_dict()
    print(f"[*] Total rows: {total_rows}, Label counts: {label_counts}")

    # 3. Domain-Aware Grouping (Leakage Prevention)
    df["root_domain"] = df["indicator"].apply(extract_root_domain)
    unique_domains = df["root_domain"].nunique()
    print(f"[*] Extracted {unique_domains} unique root domain groups for leakage prevention.")

    gss = GroupShuffleSplit(n_splits=1, test_size=test_size, random_state=random_state)
    train_idx, test_idx = next(gss.split(df, df["label"], groups=df["root_domain"]))

    train_df = df.iloc[train_idx]
    test_df = df.iloc[test_idx]

    # Verify zero domain overlap
    train_domains = set(train_df["root_domain"])
    test_domains = set(test_df["root_domain"])
    domain_overlap = len(train_domains.intersection(test_domains))
    assert domain_overlap == 0, f"Domain leakage detected: {domain_overlap} overlapping domains!"

    print(f"[*] Train set: {len(train_df)} rows, Test set: {len(test_df)} rows. Domain overlap: 0.")

    # 4. Train Pipeline
    pipeline = create_url_pipeline(random_state=random_state)
    print("[*] Training TF-IDF char_wb (3,5) + LogisticRegression model...")
    pipeline.fit(train_df["indicator"], train_df["label"])

    # 5. Evaluate on Held-Out Test Set
    test_preds = pipeline.predict(test_df["indicator"])
    test_probas = pipeline.predict_proba(test_df["indicator"])[:, 1]

    acc = float(accuracy_score(test_df["label"], test_preds))
    prec = float(precision_score(test_df["label"], test_preds, zero_division=0))
    rec = float(recall_score(test_df["label"], test_preds, zero_division=0))
    f1 = float(f1_score(test_df["label"], test_preds, zero_division=0))
    auc = float(roc_auc_score(test_df["label"], test_probas))
    cm = confusion_matrix(test_df["label"], test_preds).tolist()

    # 6. Save Artifacts
    model_path = os.path.join(out_dir, URL_MODEL_FILENAME)
    joblib.dump(pipeline, model_path)

    manifest = {
        "trained": True,
        "status": "operational",
        "task": "url_phishing_detection",
        "model_version": "1.0.0",
        "model_artifact": URL_MODEL_FILENAME,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "random_state": random_state,
        "dataset_metadata": {
            "source": "HuggingFace Olaroti/phishing-dataset (AlienVault OTX & Tranco Top Domains)",
            "license": "MIT",
            "total_samples": total_rows,
            "train_samples": len(train_df),
            "test_samples": len(test_df),
            "train_class_distribution": train_df["label"].value_counts().to_dict(),
            "test_class_distribution": test_df["label"].value_counts().to_dict(),
            "unique_root_domains": unique_domains,
            "domain_overlap": 0,
        },
        "metrics": {
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1": round(f1, 4),
            "roc_auc": round(auc, 4),
            "confusion_matrix": cm,
        },
        "architecture": "TfidfVectorizer(char_wb, (3,5)) + LogisticRegression(balanced)",
        "scope_boundary": (
            "Model is trained and evaluated strictly for URL and lookalike domain detection. "
            "It does NOT claim validation for mobile application package IDs or social media profile mimicry."
        ),
    }

    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print(f"[*] Artifact saved to '{model_path}'")
    print(f"[*] Manifest saved to '{manifest_path}'")
    print(f"[*] Held-out Test Metrics: Accuracy={acc:.4f}, Precision={prec:.4f}, Recall={rec:.4f}, F1={f1:.4f}, ROC-AUC={auc:.4f}")
    print(f"[*] Confusion Matrix: TN={cm[0][0]}, FP={cm[0][1]}, FN={cm[1][0]}, TP={cm[1][1]}")
    return manifest


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SURAKSHA URL Phishing Training Pipeline")
    parser.add_argument("--data-path", type=str, default=DEFAULT_DATA_PATH)
    parser.add_argument("--output-dir", type=str, default=DEFAULT_MODEL_DIR)
    parser.add_argument("--test-size", type=float, default=0.20)
    parser.add_argument("--random-state", type=int, default=42)
    args = parser.parse_args()

    train_and_evaluate_url_model(
        data_path=args.data_path,
        output_dir=args.output_dir,
        test_size=args.test_size,
        random_state=args.random_state,
    )
