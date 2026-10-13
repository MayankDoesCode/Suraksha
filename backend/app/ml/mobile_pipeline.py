import os
import json
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List, Tuple
from urllib.parse import urlparse

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

DEFAULT_DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
DEFAULT_MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
LABELLING_QUEUE_PATH = os.path.join(DEFAULT_DATA_DIR, "mobile_app_labelling_queue.json")
MOBILE_MANIFEST_FILENAME = "mobile_app_manifest.json"
MOBILE_MODEL_FILENAME = "mobile_app_pipeline.joblib"

MINIMUM_TRAINING_SAMPLES_PER_CLASS = 25


def build_mobile_feature_text(app_data: Dict[str, Any], brand_name: Optional[str] = None) -> str:
    """
    Concatenate and normalize listing text and metadata for TF-IDF feature extraction.
    """
    title = str(app_data.get("candidate_name") or app_data.get("name") or app_data.get("app_title") or "").strip()
    developer = str(app_data.get("developer") or app_data.get("developer_name") or app_data.get("publisher") or "").strip()
    package_id = str(app_data.get("package_id") or app_data.get("app_id") or app_data.get("bundle_id") or "").strip()
    store = str(app_data.get("platform") or app_data.get("store") or "").strip()
    description = str(app_data.get("description") or "").strip()
    brand = str(brand_name or app_data.get("target_brand") or "").strip()

    parts = [
        f"title:{title.lower()}",
        f"dev:{developer.lower()}",
        f"pkg:{package_id.lower()}",
        f"store:{store.lower()}",
        f"brand:{brand.lower()}",
        f"desc:{description[:500].lower()}",
    ]
    return " ".join(parts)


def extract_mobile_entity_signals(app_data: Dict[str, Any], brand_profile: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Extract structured entity cross-referencing features against official brand profile.
    """
    title = str(app_data.get("candidate_name") or app_data.get("name") or "").strip().lower()
    developer = str(app_data.get("developer") or "").strip().lower()
    package_id = str(app_data.get("package_id") or app_data.get("app_id") or "").strip().lower()

    official_publishers: List[str] = []
    official_packages: List[str] = []
    brand_keywords: List[str] = []

    if brand_profile:
        raw_pubs = brand_profile.get("publishers") or brand_profile.get("official_publishers") or []
        official_publishers = [
            str(p.get("publisher_name") if isinstance(p, dict) else p).strip().lower()
            for p in raw_pubs
        ]
        raw_pkgs = brand_profile.get("app_identifiers") or brand_profile.get("official_packages") or []
        official_packages = [
            str(a.get("identifier") if isinstance(a, dict) else a).strip().lower()
            for a in raw_pkgs
        ]
        brand_name = str(brand_profile.get("name") or "").strip().lower()
        if brand_name:
            brand_keywords.append(brand_name)

    publisher_verified = any(pub in developer or developer in pub for pub in official_publishers) if official_publishers else False
    package_verified = package_id in official_packages if official_packages else False
    brand_mentioned = any(kw in title for kw in brand_keywords) if brand_keywords else False

    # Check suspicious lure terms
    lure_keywords = ["free", "instant", "cash", "loan", "support", "official", "wallet", "rewards", "unregistered"]
    lure_count = sum(kw in title or kw in developer for kw in lure_keywords)

    return {
        "publisher_verified": publisher_verified,
        "package_verified": package_verified,
        "developer_mismatch": not publisher_verified if official_publishers else None,
        "brand_mentioned": brand_mentioned,
        "lure_count": lure_count,
    }


def record_analyst_app_label(
    app_data: Dict[str, Any],
    brand_name: str,
    label: int,
    analyst_name: str,
    notes: Optional[str] = None,
    queue_file: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Transparent Analyst-Labelling Workflow:
    Persist analyst-curated triage verdicts into the ground-truth queue.
    """
    path = queue_file or LABELLING_QUEUE_PATH
    os.makedirs(os.path.dirname(path), exist_ok=True)

    records = []
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                records = json.load(f)
        except Exception as e:
            logger.warning("Could not load existing labeling queue: %s", e)
            records = []

    record = {
        "id": f"app-label-{len(records) + 1:04d}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "app_title": app_data.get("candidate_name") or app_data.get("name") or "",
        "developer": app_data.get("developer") or "",
        "package_id": app_data.get("package_id") or app_data.get("app_id") or "",
        "store": app_data.get("platform") or app_data.get("store") or "Google Play Store",
        "description": app_data.get("description") or "",
        "target_brand": brand_name,
        "label": int(label),  # 1 = Confirmed Impersonator, 0 = Verified Legitimate/Partner
        "analyst": analyst_name,
        "notes": notes or "Curated analyst triage decision",
    }
    records.append(record)

    with open(path, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2)

    logger.info("Recorded analyst label %s for app '%s'", record["id"], record["app_title"])
    return record


record_app_for_analyst_review = record_analyst_app_label



def create_mobile_pipeline(random_state: int = 42) -> Pipeline:
    """
    Construct TF-IDF (char 3-5 + word 1-2) + LogisticRegression pipeline
    for mobile app listing impersonation classification.
    """
    return Pipeline([
        (
            "tfidf",
            TfidfVectorizer(
                analyzer="char_wb",
                ngram_range=(3, 5),
                min_df=1,
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


def train_and_evaluate_mobile_model(
    data_path: Optional[str] = None,
    output_dir: Optional[str] = None,
    random_state: int = 42,
) -> Dict[str, Any]:
    """
    Train and evaluate Mobile App Impersonation classifier with entity leakage prevention.
    
    Safety & Integrity Guarantees:
    - If valid labelled dataset is absent or below threshold, transparently reports
      status='pending_ground_truth_labels'. Does NOT fabricate training labels.
    - Cites Drebin dataset audit: Drebin is restricted to binary Android malware/exploits
      and does NOT provide mobile app store brand-impersonation labels.
    """
    path = data_path or LABELLING_QUEUE_PATH
    out_dir = output_dir or DEFAULT_MODEL_DIR
    os.makedirs(out_dir, exist_ok=True)
    manifest_path = os.path.join(out_dir, MOBILE_MANIFEST_FILENAME)

    records = []
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                records = json.load(f)
        except Exception:
            records = []

    pos_count = sum(1 for r in records if r.get("label") == 1)
    neg_count = sum(1 for r in records if r.get("label") == 0)

    # Check whether sufficient ground truth exists
    queue_display_path = "backend/app/ml/data/mobile_app_labelling_queue.json"
    if pos_count < MINIMUM_TRAINING_SAMPLES_PER_CLASS or neg_count < MINIMUM_TRAINING_SAMPLES_PER_CLASS:
        manifest = {
            "trained": False,
            "status": "pending_ground_truth_labels",
            "task": "mobile_app_brand_impersonation",
            "model_version": None,
            "model_artifact": None,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "reason": (
                f"Insufficient analyst-curated training samples in '{queue_display_path}' "
                f"(current: {pos_count} impersonators, {neg_count} benign; required: {MINIMUM_TRAINING_SAMPLES_PER_CLASS} each). "
                "Drebin dataset was evaluated and found ineligible (it measures device malware binaries, not app store trademark impersonation). "
                "Supervised training paused to prevent label fabrication."
            ),
            "dataset_audit": {
                "drebin_evaluation": {
                    "source": "drebin.mlsec.org",
                    "status": "ineligible_task_mismatch",
                    "reason": "Classifies low-level Android APK malware/exploits, not app store listing trademark impersonation.",
                },
                "labelling_queue_path": queue_display_path,
                "current_samples": len(records),
                "impersonator_samples": pos_count,
                "benign_samples": neg_count,
            },
            "architecture": "TfidfVectorizer(char_wb, (3,5)) + LogisticRegression(balanced)",
            "fallback_engine": "SURAKSHA Deterministic Rule & Publisher Whitelist Engine",
        }
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)
        return manifest

    # If threshold met, train with GroupShuffleSplit by developer/publisher
    df = pd.DataFrame(records)
    df["feature_text"] = df.apply(lambda r: build_mobile_feature_text(r, r.get("target_brand")), axis=1)
    df["developer_group"] = df["developer"].fillna("unknown")

    gss = GroupShuffleSplit(n_splits=1, test_size=0.25, random_state=random_state)
    train_idx, test_idx = next(gss.split(df, df["label"], groups=df["developer_group"]))

    train_df = df.iloc[train_idx]
    test_df = df.iloc[test_idx]

    pipeline = create_mobile_pipeline(random_state=random_state)
    pipeline.fit(train_df["feature_text"], train_df["label"])

    y_test = test_df["label"].values
    y_pred = pipeline.predict(test_df["feature_text"])
    y_prob = pipeline.predict_proba(test_df["feature_text"])[:, 1]

    acc = float(accuracy_score(y_test, y_pred))
    prec = float(precision_score(y_test, y_pred, zero_division=0))
    rec = float(recall_score(y_test, y_pred, zero_division=0))
    f1 = float(f1_score(y_test, y_pred, zero_division=0))
    auc = float(roc_auc_score(y_test, y_prob)) if len(np.unique(y_test)) > 1 else None
    cm = confusion_matrix(y_test, y_pred).tolist()

    model_path = os.path.join(out_dir, MOBILE_MODEL_FILENAME)
    joblib.dump(pipeline, model_path)

    manifest = {
        "trained": True,
        "status": "operational",
        "task": "mobile_app_brand_impersonation",
        "model_version": "1.0.0",
        "model_artifact": MOBILE_MODEL_FILENAME,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "random_state": random_state,
        "dataset_metadata": {
            "source": "SURAKSHA Analyst-Curated App Store Impersonation Corpus",
            "total_samples": len(df),
            "train_samples": len(train_df),
            "test_samples": len(test_df),
            "developer_entity_groups": df["developer_group"].nunique(),
        },
        "metrics": {
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1": round(f1, 4),
            "roc_auc": round(auc, 4) if auc else None,
            "confusion_matrix": cm,
        },
        "architecture": "TfidfVectorizer(char_wb, (3,5)) + LogisticRegression(balanced)",
        "scope_boundary": "Model evaluates mobile app listing metadata. Requires analyst verification before takedown.",
    }

    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    return manifest


if __name__ == "__main__":
    res = train_and_evaluate_mobile_model()
    print(json.dumps(res, indent=2))
