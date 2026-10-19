import os
import json
import logging
import argparse
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Tuple

import joblib
from backend.app.ml.artifact_compat import runtime_versions
import numpy as np
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
)

logger = logging.getLogger(__name__)

# Default model directory
DEFAULT_MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
MANIFEST_FILENAME = "manifest.json"
MODEL_FILENAME = "pipeline.joblib"


def build_feature_text(item: Dict[str, Any]) -> str:
    """
    Construct standardized text representation from candidate metadata
    for character and subword n-gram TF-IDF feature extraction.
    """
    brand = str(item.get("target_brand") or item.get("brand_name") or "").strip().lower()
    name = str(item.get("candidate_name") or item.get("name") or item.get("text") or "").strip()
    publisher = str(item.get("publisher_name") or item.get("publisher") or item.get("seller_name") or "").strip()
    item_type = str(item.get("candidate_type") or item.get("type") or "unknown").strip().lower()
    description = str(item.get("description") or "").strip()

    parts = [
        f"brand:{brand}",
        f"name:{name}",
        f"publisher:{publisher}",
        f"type:{item_type}",
    ]
    if description:
        # Include first 150 chars of description to capture authority keywords
        parts.append(f"desc:{description[:150]}")

    return " ".join(parts)


def create_model_pipeline(random_state: int = 42) -> Pipeline:
    """
    Build scikit-learn TF-IDF + LogisticRegression classification pipeline.
    Uses character n-grams within word boundaries (char_wb) to effectively
    capture brand spoofing, typosquatting, and subword lookalikes.
    """
    vectorizer = TfidfVectorizer(
        analyzer="char_wb",
        ngram_range=(2, 5),
        min_df=1,
        sublinear_tf=True,
    )
    classifier = LogisticRegression(
        C=1.0,
        class_weight="balanced",
        max_iter=1000,
        random_state=random_state,
        solver="lbfgs",
    )
    return Pipeline([
        ("tfidf", vectorizer),
        ("clf", classifier),
    ])


def train_and_evaluate(
    data_path: Optional[str] = None,
    output_dir: Optional[str] = None,
    test_size: float = 0.20,
    val_size: float = 0.15,
    random_state: int = 42,
    min_samples_per_class: int = 10,
) -> Dict[str, Any]:
    """
    Reproducible ML training and validation pipeline.

    Safety Guarantee:
    If data_path is missing, invalid, or lacks genuinely labelled examples
    with sufficient multi-class support, training is cleanly skipped and
    a 'missing_labelled_data' manifest is written. No fake labels or metrics
    are ever invented.
    """
    out_dir = output_dir or DEFAULT_MODEL_DIR
    os.makedirs(out_dir, exist_ok=True)
    manifest_path = os.path.join(out_dir, MANIFEST_FILENAME)

    # 1. Missing Data Check
    if not data_path or not os.path.exists(data_path):
        manifest = {
            "trained": False,
            "status": "missing_labelled_data",
            "reason": (
                f"No labelled training dataset found at '{data_path or 'unspecified'}'. "
                "Supervised training skipped to prevent fabricating labels."
            ),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "metrics": None,
            "model_version": None,
            "model_artifact": None,
            "architecture": "TfidfVectorizer(char_wb, (2,5)) + LogisticRegression(balanced)",
        }
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)
        print(f"[!] Missing Data Blocker: {manifest['reason']}")
        return manifest

    # 2. Ingest Dataset
    import pandas as pd

    try:
        if data_path.endswith(".csv"):
            df = pd.read_csv(data_path)
        elif data_path.endswith(".json") or data_path.endswith(".jsonl"):
            df = pd.read_json(data_path)
        elif data_path.endswith(".parquet"):
            df = pd.read_parquet(data_path)
        else:
            df = pd.read_csv(data_path)
    except Exception as exc:
        manifest = {
            "trained": False,
            "status": "dataset_read_error",
            "reason": f"Failed to parse dataset file: {str(exc)}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "metrics": None,
            "model_version": None,
            "model_artifact": None,
        }
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)
        return manifest

    # 3. Label and Column Validation
    label_col = next((c for c in ["label", "is_threat", "is_impersonation", "threat"] if c in df.columns), None)
    if not label_col:
        manifest = {
            "trained": False,
            "status": "missing_label_column",
            "reason": "Dataset does not contain a recognized target label column (e.g. 'label', 'is_threat').",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "metrics": None,
            "model_version": None,
            "model_artifact": None,
        }
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)
        print(f"[!] Missing Label Column: {manifest['reason']}")
        return manifest

    y_raw = df[label_col].dropna()
    df_valid = df.loc[y_raw.index]
    unique_labels = sorted(list(y_raw.unique()))

    if len(unique_labels) < 2:
        manifest = {
            "trained": False,
            "status": "insufficient_classes",
            "reason": f"Dataset contains only {len(unique_labels)} class ({unique_labels}). Multi-class supervised classification requires at least 2 distinct classes.",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "metrics": None,
            "model_version": None,
            "model_artifact": None,
        }
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)
        print(f"[!] Insufficient Classes: {manifest['reason']}")
        return manifest

    class_counts = y_raw.value_counts().to_dict()
    min_count = min(class_counts.values())
    if min_count < min_samples_per_class:
        manifest = {
            "trained": False,
            "status": "insufficient_samples_per_class",
            "reason": f"Smallest class has {min_count} examples (minimum required: {min_samples_per_class}). Class distribution: {class_counts}.",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "metrics": None,
            "model_version": None,
            "model_artifact": None,
        }
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)
        print(f"[!] Insufficient Samples: {manifest['reason']}")
        return manifest

    # 4. Feature Extraction
    features = [build_feature_text(row.to_dict()) for _, row in df_valid.iterrows()]
    labels = df_valid[label_col].astype(int).values

    # 5. Proper Train / Validation / Test Splitting
    # First split off the test set
    X_train_val, X_test, y_train_val, y_test = train_test_split(
        features,
        labels,
        test_size=test_size,
        random_state=random_state,
        stratify=labels,
    )

    # Then split train and validation
    effective_val_size = val_size / (1.0 - test_size)
    X_train, X_val, y_train, y_val = train_test_split(
        X_train_val,
        y_train_val,
        test_size=effective_val_size,
        random_state=random_state,
        stratify=y_train_val,
    )

    # 6. Fit Pipeline
    pipeline = create_model_pipeline(random_state=random_state)
    pipeline.fit(X_train, y_train)

    # 7. Evaluate on Validation Set
    y_val_pred = pipeline.predict(X_val)
    val_f1 = float(f1_score(y_val, y_val_pred, zero_division=0))

    # 8. Unbiased Evaluation on Held-Out Test Set
    y_test_pred = pipeline.predict(X_test)
    y_test_proba = pipeline.predict_proba(X_test)[:, 1] if hasattr(pipeline, "predict_proba") else None

    test_acc = float(accuracy_score(y_test, y_test_pred))
    test_prec = float(precision_score(y_test, y_test_pred, zero_division=0))
    test_rec = float(recall_score(y_test, y_test_pred, zero_division=0))
    test_f1 = float(f1_score(y_test, y_test_pred, zero_division=0))
    test_auc = float(roc_auc_score(y_test, y_test_proba)) if y_test_proba is not None and len(np.unique(y_test)) > 1 else None
    cm = confusion_matrix(y_test, y_test_pred).tolist()

    # 9. Save Artifacts
    model_path = os.path.join(out_dir, MODEL_FILENAME)
    joblib.dump(pipeline, model_path)

    metrics_manifest = {
        "accuracy": test_acc,
        "precision": test_prec,
        "recall": test_rec,
        "f1": test_f1,
        "roc_auc": test_auc,
        "val_f1": val_f1,
        "confusion_matrix": cm,
    }

    manifest = {
        "trained": True,
        "status": "operational",
        "model_version": "1.0.0",
        "model_artifact": MODEL_FILENAME,
        "runtime_versions": runtime_versions(),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "random_state": random_state,
        "dataset": {
            "source": data_path,
            "total_samples": len(df_valid),
            "train_samples": len(X_train),
            "val_samples": len(X_val),
            "test_samples": len(X_test),
            "class_distribution": class_counts,
        },
        "metrics": metrics_manifest,
        "architecture": "TfidfVectorizer(char_wb, (2,5)) + LogisticRegression(balanced)",
    }

    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print(f"[*] Training successful! Model saved to '{model_path}'")
    print(f"[*] Test Metrics: Precision={test_prec:.4f}, Recall={test_rec:.4f}, F1={test_f1:.4f}, ROC-AUC={test_auc if test_auc is not None else 'N/A'}")
    return manifest


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SURAKSHA ML Training Pipeline")
    parser.add_argument("--data-path", type=str, default=None, help="Path to labelled dataset (CSV, JSON, Parquet)")
    parser.add_argument("--output-dir", type=str, default=DEFAULT_MODEL_DIR, help="Output directory for model artifacts")
    parser.add_argument("--test-size", type=float, default=0.20, help="Test set fraction")
    parser.add_argument("--val-size", type=float, default=0.15, help="Validation set fraction")
    parser.add_argument("--random-state", type=int, default=42, help="Random seed for reproducibility")
    args = parser.parse_args()

    train_and_evaluate(
        data_path=args.data_path,
        output_dir=args.output_dir,
        test_size=args.test_size,
        val_size=args.val_size,
        random_state=args.random_state,
    )
