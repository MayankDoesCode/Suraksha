"""
Train the Dataset B1 (InstaFake fake vs real) XGBoost candidate and save it ALONGSIDE the shipped logistic model.

The shipped files (social_fake_pipeline.joblib / social_fake_manifest.json) are not touched, and MLService does not load
the candidate files. Promotion would be a separate, explicit step.

Protocol (no tuning against the test set):
  1. drop exact duplicate feature rows (no label conflicts exist in this data; the audit re-checks)
  2. hold out a stratified 20% test set once
  3. 5x5 repeated stratified CV on the remaining 80% for both the candidate and the production recipe
  4. evaluate both once on the held-out set
  5. fit the candidate on all deduplicated rows and save it

Run from the repo root:  python -m backend.scripts.train_social_xgb_candidate
"""
import json
import os
from datetime import datetime, timezone

import joblib
import numpy as np
import pandas as pd
import sklearn
import xgboost
from sklearn.base import clone
from sklearn.model_selection import RepeatedStratifiedKFold, train_test_split

from backend.app.ml.social_pipeline import FEATURE_COLS
from backend.scripts.social_b_baseline import ROOT, SEED, audit, fake_features, load, models, run_cv, score

MODEL_DIR = os.path.join(ROOT, "backend", "app", "ml", "models")
ARTIFACT = "social_fake_xgb_candidate.joblib"
MANIFEST = "social_fake_xgb_candidate_manifest.json"


def rounded(d):
    return {k: (round(float(v), 4) if isinstance(v, (float, np.floating)) else v) for k, v in d.items()}


def main():
    fake, m1 = load("fakeAccountData.json")
    real, m2 = load("realAccountData.json")
    df = pd.DataFrame(fake + real)
    X, y = fake_features(df)[FEATURE_COLS], df["isFake"].astype(int).values

    _, aud, conflicting, key = audit(X, y)
    keep = ((~key.duplicated()) & (~key.isin(conflicting))).values
    X, y = X[keep].reset_index(drop=True), y[keep]

    idx_tr, idx_te = train_test_split(np.arange(len(y)), test_size=0.2, stratify=y, random_state=SEED)
    Xtr, ytr, Xte, yte = X.iloc[idx_tr], y[idx_tr], X.iloc[idx_te], y[idx_te]

    cands = models()
    candidate, baseline = cands["xgboost"], cands["logreg_production_recipe"]
    cv = list(RepeatedStratifiedKFold(n_splits=5, n_repeats=5, random_state=SEED).split(Xtr, ytr))
    cv_cand, cv_base = run_cv(candidate, Xtr, ytr, cv), run_cv(baseline, Xtr, ytr, cv)

    hold_cand = rounded(score(yte, clone(candidate).fit(Xtr, ytr).predict_proba(Xte)[:, 1]))
    hold_base = rounded(score(yte, clone(baseline).fit(Xtr, ytr).predict_proba(Xte)[:, 1]))

    final = clone(candidate).fit(X, y)
    path = os.path.join(MODEL_DIR, ARTIFACT)
    joblib.dump(final, path)

    manifest = {
        "trained": True,
        "status": "candidate_not_deployed",
        "task": "social_fake_account_detection (Dataset B1: generic fake/spam-like profiles, NOT brand impersonation)",
        "model_version": "2.0.0-candidate",
        "model_artifact": ARTIFACT,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "random_state": SEED,
        "library_versions": {"scikit-learn": sklearn.__version__, "xgboost": xgboost.__version__},
        "architecture": "XGBClassifier(n_estimators=300, max_depth=4, learning_rate=0.05, subsample=0.9, colsample_bytree=0.9)",
        "feature_schema": FEATURE_COLS,
        "dataset_metadata": {
            "source": "InstaFake (fcakyon/instafake-dataset, fake-v1.0) fakeAccountData.json + realAccountData.json",
            "license": "CC BY-NC 4.0: non-commercial research use only",
            "files": [m1, m2],
            "audit_before_dedup": aud,
            "rows_after_dedup": int(len(y)),
            "label_counts_after_dedup": {"real": int((y == 0).sum()), "fake": int((y == 1).sum())},
            "train_rows": int(len(ytr)),
            "holdout_rows": int(len(yte)),
            "holdout_label_counts": {"real": int((yte == 0).sum()), "fake": int((yte == 1).sum())},
            "grouping_note": "No account IDs exist in the data; leakage control is exact-duplicate removal only.",
        },
        "evaluation": {
            "cv_5x5_on_train_split": {"candidate_xgboost": cv_cand, "baseline_logreg_production_recipe": cv_base},
            "holdout_once": {"candidate_xgboost": hold_cand, "baseline_logreg_production_recipe": hold_base},
            "threshold": 0.5,
        },
        "final_fit": "Refit on all deduplicated rows after evaluation.",
        "limitations": [
            "Single source: Instagram accounts collected for the InstaFake paper (circa 2018-2019); no out-of-time or cross-platform test.",
            "Detects generic fake/spam-like profiles from 10 numeric fields. Says nothing about brand impersonation.",
            "Low follower count or digits in a username are not proof an account is fake; use only as supporting evidence.",
            "Non-commercial licence: do not ship in a commercial product.",
        ],
        "shipped_model_untouched": "social_fake_pipeline.joblib / social_fake_manifest.json",
    }
    with open(os.path.join(MODEL_DIR, MANIFEST), "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=2)

    print(json.dumps({"artifact": path, "rows": int(len(y)), "cv": {"candidate": {k: cv_cand[k] for k in ("precision", "recall", "macro_f1", "pr_auc", "false_positive_rate", "ece")},
                      "baseline": {k: cv_base[k] for k in ("precision", "recall", "macro_f1", "pr_auc", "false_positive_rate", "ece")}},
                      "holdout": {"candidate": hold_cand, "baseline": hold_base}}, indent=1))


if __name__ == "__main__":
    main()
