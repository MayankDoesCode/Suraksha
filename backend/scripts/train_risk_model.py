#!/usr/bin/env python3
"""
SURAKSHA — ML Risk Classification Model Training Script
Trains a genuine scikit-learn Random Forest classifier with TF-IDF text features
and dense digital-risk indicators for hybrid cyber-threat detection.
"""

import os
import sys
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List

# Ensure repository root is on sys.path
current_dir = Path(__file__).resolve().parent
backend_dir = current_dir.parent
repo_root = backend_dir.parent
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

import joblib
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report,
)
from sklearn.dummy import DummyClassifier

from backend.app.ai.pipeline import build_risk_classification_pipeline
from backend.app.ai.feature_extractor import ThreatFeatureExtractor

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("train_risk_model")

MODEL_VERSION = "1.0.0"
DATASET_VERSION = "bootstrap-v1.0"


def load_dataset(dataset_path: Path) -> List[Dict[str, Any]]:
    """Load and validate labeled threat dataset."""
    if not dataset_path.exists():
        raise FileNotFoundError(f"Dataset file not found at: {dataset_path}")

    with open(dataset_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, list) or len(data) == 0:
        raise ValueError("Dataset must be a non-empty JSON array of records.")

    logger.info("Loaded %d dataset records from %s", len(data), dataset_path)
    return data


def train_and_evaluate(
    dataset_path: Path,
    output_model_dir: Path,
    random_state: int = 42,
    test_size: float = 0.25
) -> Dict[str, Any]:
    """
    Execute full stratified training, evaluation, and artifact serialization.
    """
    raw_data = load_dataset(dataset_path)

    # 1. Prepare Features and Labels
    X = raw_data
    y = [str(record.get("label", "SUSPICIOUS")).upper() for record in raw_data]

    classes = sorted(list(set(y)))
    label_distribution = {cls_name: y.count(cls_name) for cls_name in classes}
    logger.info("Class distribution: %s", label_distribution)

    # 2. Stratified Train/Test Split
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=test_size,
        stratify=y,
        random_state=random_state,
    )
    logger.info(
        "Train set: %d samples, Test set: %d samples (test_size=%.2f)",
        len(X_train), len(X_test), test_size
    )

    # 3. Build & Fit Unified Pipeline
    pipeline = build_risk_classification_pipeline(random_state=random_state)
    logger.info("Fitting unified feature and classification pipeline...")
    pipeline.fit(X_train, y_train)

    # 4. Model Predictions
    y_pred = pipeline.predict(X_test)
    y_pred_proba = pipeline.predict_proba(X_test)

    # 5. Model Evaluation Metrics
    acc = float(accuracy_score(y_test, y_pred))
    prec = float(precision_score(y_test, y_pred, pos_label="SUSPICIOUS", zero_division=0))
    rec = float(recall_score(y_test, y_pred, pos_label="SUSPICIOUS", zero_division=0))
    f1 = float(f1_score(y_test, y_pred, pos_label="SUSPICIOUS", zero_division=0))
    conf_matrix = confusion_matrix(y_test, y_pred, labels=classes).tolist()
    class_report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)

    # Baseline Comparison: Majority Class Predictor
    dummy = DummyClassifier(strategy="most_frequent")
    dummy.fit(X_train, y_train)
    y_dummy_pred = dummy.predict(X_test)
    dummy_acc = float(accuracy_score(y_test, y_dummy_pred))
    dummy_f1 = float(f1_score(y_test, y_dummy_pred, pos_label="SUSPICIOUS", zero_division=0))

    logger.info(
        "Evaluation Results (Test Set): Accuracy=%.4f | Precision=%.4f | Recall=%.4f | F1=%.4f",
        acc, prec, rec, f1
    )
    logger.info("Baseline Majority Classifier: Accuracy=%.4f | F1=%.4f", dummy_acc, dummy_f1)
    logger.info("Confusion Matrix (labels=%s):\n%s", classes, np.array(conf_matrix))

    # 6. Save Artifacts
    output_model_dir.mkdir(parents=True, exist_ok=True)
    model_artifact_path = output_model_dir / "risk_classifier_v1.joblib"
    metadata_path = output_model_dir / "model_metadata_v1.json"
    report_path = output_model_dir / "evaluation_report.json"

    # Serialize fitted pipeline
    joblib.dump(pipeline, model_artifact_path)
    logger.info("Saved fitted model artifact to: %s", model_artifact_path)

    metadata = {
        "model_version": MODEL_VERSION,
        "model_name": "suraksha_rf_risk_classifier",
        "algorithm": "RandomForestClassifier + FeatureUnion (TF-IDF & Dense Scaler)",
        "training_timestamp": datetime.now(timezone.utc).isoformat(),
        "dataset_version": DATASET_VERSION,
        "dataset_path": str(dataset_path.relative_to(repo_root)),
        "dataset_records_count": len(raw_data),
        "train_samples_count": len(X_train),
        "test_samples_count": len(X_test),
        "classes": classes,
        "class_distribution": label_distribution,
        "feature_schema": ThreatFeatureExtractor.get_feature_names(),
        "random_state": random_state,
        "evaluation_metrics": {
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
            "confusion_matrix": conf_matrix,
            "classes_order": classes,
            "per_class_metrics": class_report,
            "baseline_majority_accuracy": round(dummy_acc, 4),
            "baseline_majority_f1": round(dummy_f1, 4),
        },
        "dataset_limitations": (
            "The initial development model was trained on a version-controlled, "
            "curated bootstrap dataset representing key digital-risk scenarios (official "
            "brand assets, copycat mobile applications, typo-squatting domains, unauthorized "
            "publishers, and social-support impersonations). While structurally diverse and "
            "rigorously split, bootstrap data is not a substitute for continuous real-world "
            "incident observations. Production deployments should periodically incorporate "
            "human-triaged findings using the documented dataset update procedure."
        )
    }

    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    logger.info("Saved model metadata to: %s", metadata_path)

    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(metadata["evaluation_metrics"], f, indent=2)
    logger.info("Saved evaluation report to: %s", report_path)

    return metadata


def main():
    default_dataset = repo_root / "backend" / "app" / "ai" / "data" / "threat_bootstrap_dataset.json"
    default_output_dir = repo_root / "backend" / "app" / "ai" / "models"

    print("=" * 70)
    print("SURAKSHA ML RISK CLASSIFIER — TRAINING PIPELINE")
    print("=" * 70)
    print(f"[*] Dataset: {default_dataset}")
    print(f"[*] Artifact Destination: {default_output_dir}")

    metadata = train_and_evaluate(default_dataset, default_output_dir)

    print("\n[OK] Model Training & Serialization Complete!")
    print(f"    -> Version: {metadata['model_version']}")
    print(f"    -> Test Accuracy: {metadata['evaluation_metrics']['accuracy'] * 100:.1f}%")
    print(f"    -> Test Precision: {metadata['evaluation_metrics']['precision'] * 100:.1f}%")
    print(f"    -> Test Recall: {metadata['evaluation_metrics']['recall'] * 100:.1f}%")
    print(f"    -> Test F1 Score: {metadata['evaluation_metrics']['f1_score'] * 100:.1f}%")
    print(f"    -> Artifact: {default_output_dir / 'risk_classifier_v1.joblib'}")


if __name__ == "__main__":
    main()
