import os
import json
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Tuple

import joblib
from backend.app.ml.artifact_compat import runtime_versions
import numpy as np
import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
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

DEFAULT_DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "instafake")
DEFAULT_MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
SOCIAL_MANIFEST_FILENAME = "social_fake_manifest.json"
SOCIAL_MODEL_FILENAME = "social_fake_pipeline.joblib"

FEATURE_COLS = [
    "userFollowerCount",
    "userFollowingCount",
    "userBiographyLength",
    "userMediaCount",
    "userHasProfilPic",
    "userIsPrivate",
    "usernameDigitCount",
    "usernameLength",
    "follower_following_ratio",
    "digit_ratio",
]
FEATURE_COLUMNS = FEATURE_COLS



def extract_social_features(profile_data: Dict[str, Any]) -> pd.DataFrame:
    """
    Extract normalized feature vector for social profile risk classification.
    Accepts raw analyst inputs and extracts numerical & ratio signals.
    """
    raw_followers = profile_data.get("follower_count")
    if raw_followers is None:
        raw_followers = profile_data.get("followers_count")
    if raw_followers is None:
        raw_followers = profile_data.get("userFollowerCount")
    try:
        followers = float(raw_followers) if raw_followers is not None and str(raw_followers).strip() != "" else 0.0
    except (ValueError, TypeError):
        followers = 0.0

    raw_following = profile_data.get("following_count")
    if raw_following is None:
        raw_following = profile_data.get("followings_count")
    if raw_following is None:
        raw_following = profile_data.get("userFollowingCount")
    try:
        following = float(raw_following) if raw_following is not None and str(raw_following).strip() != "" else 0.0
    except (ValueError, TypeError):
        following = 0.0
    bio = str(profile_data.get("bio") or profile_data.get("biography") or "")
    bio_len = float(profile_data.get("userBiographyLength") or len(bio))
    media_count = float(
        profile_data.get("media_count")
        or profile_data.get("posts_count")
        or profile_data.get("userMediaCount")
        or 0
    )
    has_pic = 1.0 if profile_data.get("has_profile_pic", profile_data.get("userHasProfilPic", True)) else 0.0
    is_priv = 1.0 if profile_data.get("is_private", profile_data.get("userIsPrivate", False)) else 0.0

    username = str(profile_data.get("username") or profile_data.get("handle") or "").replace("@", "")
    username_len = float(profile_data.get("usernameLength") or len(username))
    digits = float(profile_data.get("usernameDigitCount") or sum(c.isdigit() for c in username))

    row = {
        "userFollowerCount": followers,
        "userFollowingCount": following,
        "userBiographyLength": bio_len,
        "userMediaCount": media_count,
        "userHasProfilPic": has_pic,
        "userIsPrivate": is_priv,
        "usernameDigitCount": digits,
        "usernameLength": username_len,
        "follower_following_ratio": followers / (following + 1.0),
        "digit_ratio": digits / (username_len + 1e-5),
    }
    return pd.DataFrame([row])


# Core count metadata the InstaFake model depends on. InstaFake has no missing
# values, so the model never learned what "unknown" looks like: imputing 0 makes
# an unobserved account look like an empty bot account.
CORE_METADATA_ALIASES = {
    "follower_count": ("follower_count", "followers_count", "userFollowerCount"),
    "following_count": ("following_count", "followings_count", "userFollowingCount"),
    "media_count": ("media_count", "posts_count", "userMediaCount"),
}


def get_missing_social_metadata(profile_data: Dict[str, Any]) -> list:
    """Return the core metadata fields that were not supplied (or are not numeric)."""
    missing = []
    for field, aliases in CORE_METADATA_ALIASES.items():
        value = next((profile_data.get(a) for a in aliases if profile_data.get(a) is not None), None)
        try:
            if value is None or str(value).strip() == "":
                raise ValueError
            float(value)
        except (ValueError, TypeError):
            missing.append(field)
    return missing


def create_social_pipeline(random_state: int = 42) -> Pipeline:
    """
    StandardScaler + LogisticRegression classifier for social fake account detection.
    """
    return Pipeline([
        ("scaler", StandardScaler()),
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


def train_and_evaluate_social_model(
    data_dir: Optional[str] = None,
    output_dir: Optional[str] = None,
    test_size: float = 0.20,
    random_state: int = 42,
) -> Dict[str, Any]:
    """
    Train and evaluate Social Fake Account classifier on the InstaFake benchmark dataset.
    
    Safety & Integrity Guarantees:
    - Held-out test set split strictly with stratification.
    - True evaluation metrics; zero fabrication.
    - Baseline rule comparison on the identical test split.
    - Explicit scope separation: labels generic fake/bot accounts, not brand impersonation.
    """
    in_dir = data_dir or DEFAULT_DATA_DIR
    out_dir = output_dir or DEFAULT_MODEL_DIR
    os.makedirs(out_dir, exist_ok=True)
    manifest_path = os.path.join(out_dir, SOCIAL_MANIFEST_FILENAME)

    fake_file = os.path.join(in_dir, "fakeAccountData.json")
    real_file = os.path.join(in_dir, "realAccountData.json")

    if not os.path.exists(fake_file) or not os.path.exists(real_file):
        manifest = {
            "trained": False,
            "status": "missing_dataset",
            "reason": f"InstaFake dataset files not found at '{in_dir}'.",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "metrics": None,
            "model_version": None,
        }
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)
        return manifest

    # 1. Load dataset
    with open(fake_file, "r", encoding="utf-8") as f:
        fake_data = json.load(f)
    with open(real_file, "r", encoding="utf-8") as f:
        real_data = json.load(f)

    df_fake = pd.DataFrame(fake_data)
    df_real = pd.DataFrame(real_data)
    df_fake["label"] = 1
    df_real["label"] = 0
    df = pd.concat([df_fake, df_real], ignore_index=True)

    # 2. Features and engineering
    df["follower_following_ratio"] = df["userFollowerCount"] / (df["userFollowingCount"] + 1.0)
    df["digit_ratio"] = df["usernameDigitCount"] / (df["usernameLength"] + 1e-5)
    X = df[FEATURE_COLS].copy()
    y = df["label"].values

    total_rows = len(df)
    total_fake = int((y == 1).sum())
    total_real = int((y == 0).sum())

    # 3. Train/Test Stratified Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state, stratify=y
    )

    # 4. Train Pipeline
    pipeline = create_social_pipeline(random_state=random_state)
    pipeline.fit(X_train, y_train)

    # 5. Evaluate on Held-Out Test Set
    y_pred = pipeline.predict(X_test)
    y_prob = pipeline.predict_proba(X_test)[:, 1]

    acc = float(accuracy_score(y_test, y_pred))
    prec = float(precision_score(y_test, y_pred, zero_division=0))
    rec = float(recall_score(y_test, y_pred, zero_division=0))
    f1 = float(f1_score(y_test, y_pred, zero_division=0))
    auc = float(roc_auc_score(y_test, y_prob))
    cm = confusion_matrix(y_test, y_pred).tolist()

    # 6. Baseline comparison (Rule-based heuristics on identical test set)
    heuristic_pred = (
        (X_test["userFollowingCount"] > 1500) |
        ((X_test["userFollowerCount"] < 30) & (X_test["userMediaCount"] == 0)) |
        (X_test["usernameDigitCount"] >= 3)
    ).astype(int)

    base_acc = float(accuracy_score(y_test, heuristic_pred))
    base_prec = float(precision_score(y_test, heuristic_pred, zero_division=0))
    base_rec = float(recall_score(y_test, heuristic_pred, zero_division=0))
    base_f1 = float(f1_score(y_test, heuristic_pred, zero_division=0))

    # 7. Save Model & Manifest
    model_path = os.path.join(out_dir, SOCIAL_MODEL_FILENAME)
    joblib.dump(pipeline, model_path)

    manifest = {
        "trained": True,
        "status": "operational",
        "task": "social_fake_account_detection",
        "model_version": "1.0.0",
        "model_artifact": SOCIAL_MODEL_FILENAME,
        "runtime_versions": runtime_versions(),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "random_state": random_state,
        "dataset_metadata": {
            "source": "InstaFake Dataset (fcakyon/instafake-dataset fake-v1.0)",
            "license": "Creative Commons Attribution-NonCommercial 4.0 (CC BY-NC 4.0)",
            "total_samples": total_rows,
            "real_samples": total_real,
            "fake_samples": total_fake,
            "train_samples": len(X_train),
            "test_samples": len(X_test),
            "test_class_distribution": {
                "legitimate": int((y_test == 0).sum()),
                "fake_spam": int((y_test == 1).sum()),
            },
        },
        "metrics": {
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1": round(f1, 4),
            "roc_auc": round(auc, 4),
            "confusion_matrix": cm,
            "false_positives": cm[0][1],
            "false_negatives": cm[1][0],
        },
        "baseline_comparison": {
            "heuristic_rule_accuracy": round(base_acc, 4),
            "heuristic_rule_precision": round(base_prec, 4),
            "heuristic_rule_recall": round(base_rec, 4),
            "heuristic_rule_f1": round(base_f1, 4),
            "f1_improvement_pct": round((f1 - base_f1) * 100, 2),
        },
        "architecture": "StandardScaler + LogisticRegression(class_weight='balanced')",
        "feature_schema": list(X.columns),
        "scope_boundary": (
            "Model is trained strictly for generic fake/automated social profile detection. "
            "Brand impersonation risk requires separate brand allowlist cross-referencing and "
            "lexical trademark similarity, which are evaluated assistively by SURAKSHA's threat engine."
        ),
    }

    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    logger.info("Social fake account model trained successfully: F1=%.4f, AUC=%.4f", f1, auc)
    return manifest


if __name__ == "__main__":
    res = train_and_evaluate_social_model()
    print(json.dumps(res, indent=2))
