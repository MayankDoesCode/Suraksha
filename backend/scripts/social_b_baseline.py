"""
Dataset B (automated / fake-like social accounts) audit and baseline.

Reads the InstaFake files already in the repo (never modifies them), audits duplicates and label conflicts, and compares
the production recipe (StandardScaler + balanced LogisticRegression) with gradient-boosted trees under three protocols:

  random    one stratified 80/20 split, duplicates left in (what the shipped manifest reports)
  grouped   StratifiedGroupKFold, identical feature vectors kept in the same fold (duplicates can't straddle a split)
  dedup     exact duplicate rows removed, label-conflicting rows set aside, repeated stratified 5-fold

The two InstaFake subsets are separate tasks with different labels and features, so they are evaluated separately.
A cross-subset probe on the shared profile fields is reported as a concept-shift check only.

Writes data/reports/social_b_baseline.json and .md (data/ is git-ignored). Run from the repo root:
    python -m backend.scripts.social_b_baseline
"""
import hashlib
import json
import os
import platform
from datetime import datetime, timezone

import numpy as np
import pandas as pd
import sklearn
from sklearn.base import clone
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (average_precision_score, brier_score_loss, confusion_matrix, f1_score, precision_score,
                             recall_score, roc_auc_score)
from sklearn.model_selection import RepeatedStratifiedKFold, StratifiedGroupKFold, train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer

try:
    from xgboost import XGBClassifier
except Exception:  # optional
    XGBClassifier = None

SEED = 42
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RAW = os.path.join(ROOT, "backend", "app", "ml", "data", "instafake")
OUT = os.path.join(ROOT, "data", "reports")


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def load(name):
    path = os.path.join(RAW, name)
    with open(path, encoding="utf-8") as fh:
        rows = json.load(fh)
    return rows, {"file": f"backend/app/ml/data/instafake/{name}", "sha256": sha256(path), "rows": len(rows)}


# ------------------------------------------------------------------ features -------------------------------------

def fake_features(df):
    """Same 10 features as backend/app/ml/social_pipeline.py, so the baseline is the shipped recipe."""
    f = df[["userFollowerCount", "userFollowingCount", "userBiographyLength", "userMediaCount", "userHasProfilPic",
            "userIsPrivate", "usernameDigitCount", "usernameLength"]].astype(float).copy()
    f["follower_following_ratio"] = f["userFollowerCount"] / (f["userFollowingCount"] + 1.0)
    f["digit_ratio"] = f["usernameDigitCount"] / (f["usernameLength"] + 1.0)
    return f


def _stats(values, prefix):
    a = np.asarray(values, dtype=float) if len(values) else np.array([np.nan])
    return {f"{prefix}_mean": np.nanmean(a), f"{prefix}_median": np.nanmedian(a), f"{prefix}_std": np.nanstd(a)}


def automated_features(rows):
    out = []
    for r in rows:
        f = {k: float(r[k]) for k in ("userMediaCount", "userFollowerCount", "userFollowingCount", "userHasHighlighReels",
                                       "userHasExternalUrl", "userTagsCount", "userBiographyLength", "usernameLength",
                                       "usernameDigitCount")}
        f["follower_following_ratio"] = f["userFollowerCount"] / (f["userFollowingCount"] + 1.0)
        f["n_media_sampled"] = float(len(r["mediaLikeNumbers"]))
        f.update(_stats(r["mediaLikeNumbers"], "likes"))
        f.update(_stats(r["mediaCommentNumbers"], "comments"))
        f.update(_stats(r["mediaHashtagNumbers"], "hashtags"))
        f["comments_disabled_rate"] = float(np.mean(r["mediaCommentsAreDisabled"])) if r["mediaCommentsAreDisabled"] else np.nan
        f["location_rate"] = float(np.mean(r["mediaHasLocationInfo"])) if r["mediaHasLocationInfo"] else np.nan
        t = sorted(r["mediaUploadTimes"])
        gaps = np.diff(t) / 3600.0 if len(t) > 1 else np.array([np.nan])
        f["upload_gap_h_median"] = float(np.nanmedian(gaps))
        f["upload_gap_h_cv"] = float(np.nanstd(gaps) / (np.nanmean(gaps) + 1e-9)) if len(t) > 2 else np.nan
        out.append(f)
    return pd.DataFrame(out)


# ------------------------------------------------------------------ audit ----------------------------------------

def audit(X, y):
    key = pd.util.hash_pandas_object(X.round(9), index=False)
    groups = key.values
    dup_rows = int(key.duplicated().sum())
    conflict_keys = pd.DataFrame({"k": key, "y": y}).groupby("k")["y"].nunique()
    conflicting = set(conflict_keys[conflict_keys > 1].index)
    missing = {c: int(n) for c, n in X.isna().sum().items() if n}
    return groups, {
        "rows": int(len(X)),
        "label_counts": {str(k): int(v) for k, v in pd.Series(y).value_counts().sort_index().items()},
        "exact_duplicate_rows": dup_rows,
        "unique_feature_vectors": int(key.nunique()),
        "label_conflicting_vectors": len(conflicting),
        "rows_in_conflicting_vectors": int(key.isin(conflicting).sum()),
        "missing_values": missing,
    }, conflicting, key


# ------------------------------------------------------------------ models / metrics -----------------------------

def models():
    m = {
        "logreg_production_recipe": make_pipeline(SimpleImputer(strategy="median", add_indicator=True), StandardScaler(), LogisticRegression(class_weight="balanced", max_iter=2000, random_state=SEED)),
        "hist_gradient_boosting": HistGradientBoostingClassifier(max_iter=300, learning_rate=0.05, class_weight="balanced", random_state=SEED),
    }
    if XGBClassifier is not None:
        m["xgboost"] = XGBClassifier(n_estimators=300, max_depth=4, learning_rate=0.05, subsample=0.9, colsample_bytree=0.9,
                                     eval_metric="logloss", random_state=SEED, n_jobs=1)
    return m


def ece(y, p, bins=10):
    edges = np.linspace(0, 1, bins + 1)
    idx = np.clip(np.digitize(p, edges) - 1, 0, bins - 1)
    return float(sum(abs(p[idx == b].mean() - y[idx == b].mean()) * (idx == b).mean() for b in range(bins) if (idx == b).any()))


def score(y, p):
    pred = (p >= 0.5).astype(int)
    tn, fp, fn, tp = confusion_matrix(y, pred, labels=[0, 1]).ravel()
    return {
        "precision": precision_score(y, pred, zero_division=0), "recall": recall_score(y, pred, zero_division=0),
        "macro_f1": f1_score(y, pred, average="macro"), "f1_positive": f1_score(y, pred, zero_division=0),
        "pr_auc": average_precision_score(y, p), "roc_auc": roc_auc_score(y, p),
        "false_positive_rate": fp / (fp + tn) if (fp + tn) else 0.0, "brier": brier_score_loss(y, p), "ece": ece(y, p),
        "confusion": [int(tn), int(fp), int(fn), int(tp)],
    }


def summarize(folds):
    keys = [k for k in folds[0] if k != "confusion"]
    out = {k: {"mean": round(float(np.mean([f[k] for f in folds])), 4), "std": round(float(np.std([f[k] for f in folds])), 4)} for k in keys}
    out["confusion_tn_fp_fn_tp_summed"] = [int(sum(f["confusion"][i] for f in folds)) for i in range(4)]
    out["n_folds"] = len(folds)
    return out


def run_cv(model, X, y, splits):
    folds = []
    for tr, te in splits:
        m = clone(model).fit(X.iloc[tr], y[tr])
        folds.append(score(y[te], m.predict_proba(X.iloc[te])[:, 1]))
    return summarize(folds)


def evaluate_task(name, X, y):
    groups, aud, conflicting, key = audit(X, y)
    res = {"audit": aud, "protocols": {}}
    # random: one split, duplicates kept (mirrors the shipped manifest)
    tr, te = train_test_split(np.arange(len(y)), test_size=0.2, stratify=y, random_state=SEED)
    res["protocols"]["random_single_split"] = {n: run_cv(m, X, y, [(tr, te)]) for n, m in models().items()}
    # grouped: identical vectors share a fold
    sgk = StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=SEED)
    res["protocols"]["grouped_5fold"] = {n: run_cv(m, X, y, list(sgk.split(X, y, groups))) for n, m in models().items()}
    # dedup: drop duplicate rows and conflicting vectors, repeated CV
    keep = (~key.duplicated()) & (~key.isin(conflicting))
    Xd, yd = X[keep.values].reset_index(drop=True), y[keep.values]
    rskf = RepeatedStratifiedKFold(n_splits=5, n_repeats=5, random_state=SEED)
    res["protocols"]["dedup_repeated_5x5"] = {n: run_cv(m, Xd, yd, list(rskf.split(Xd, yd))) for n, m in models().items()}
    res["dedup_rows_used"] = int(len(yd))
    res["dedup_label_counts"] = {str(k): int(v) for k, v in pd.Series(yd).value_counts().sort_index().items()}
    return res


def main():
    fake, m1 = load("fakeAccountData.json")
    real, m2 = load("realAccountData.json")
    auto, m3 = load("automatedAccountData.json")
    nonauto, m4 = load("nonautomatedAccountData.json")

    d1 = pd.DataFrame(fake + real)
    X1, y1 = fake_features(d1), d1["isFake"].astype(int).values
    d2 = auto + nonauto
    X2, y2 = automated_features(d2), np.array([int(r["automatedBehaviour"]) for r in d2])

    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "seed": SEED,
        "environment": {"python": platform.python_version(), "sklearn": sklearn.__version__, "xgboost_available": XGBClassifier is not None,
                        "lightgbm_available": False, "catboost_available": False},
        "sources": [m1, m2, m3, m4],
        "licence": "InstaFake (fcakyon/instafake-dataset): CC BY-NC 4.0. Non-commercial research use only.",
        "tasks": {
            "B1_fake_vs_real": evaluate_task("B1", X1, y1),
            "B2_automated_vs_nonautomated": evaluate_task("B2", X2, y2),
        },
    }

    # concept-shift probe on the five fields both subsets share: train on B2 (bot-like), test on B1 (fake)
    shared = ["userFollowerCount", "userFollowingCount", "userBiographyLength", "userMediaCount", "usernameLength"]
    a, b = X2[shared], X1[shared]
    probe = {}
    for n, m in models().items():
        fit = clone(m).fit(a, y2)
        probe[n] = {k: (round(float(v), 4) if not isinstance(v, list) else v) for k, v in score(y1, fit.predict_proba(b)[:, 1]).items()}
    report["cross_subset_probe_train_B2_test_B1_shared_fields"] = probe

    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, "social_b_baseline.json"), "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=2)

    lines = [f"# Dataset B baseline ({report['generated_at']})", "", "Metrics are mean ± std across folds; positive class = fake/automated.", ""]
    for t, r in report["tasks"].items():
        lines += [f"## {t}", "", f"Audit: `{json.dumps(r['audit'])}`", f"Dedup rows used: {r['dedup_rows_used']} {r['dedup_label_counts']}", "",
                  "| protocol | model | precision | recall | macro-F1 | PR-AUC | FPR | Brier | ECE |", "|---|---|---|---|---|---|---|---|---|"]
        for p, ms in r["protocols"].items():
            for n, s in ms.items():
                f = lambda k: f"{s[k]['mean']:.3f}±{s[k]['std']:.3f}"
                lines.append(f"| {p} | {n} | {f('precision')} | {f('recall')} | {f('macro_f1')} | {f('pr_auc')} | {f('false_positive_rate')} | {f('brier')} | {f('ece')} |")
        lines.append("")
    lines += ["## Cross-subset probe (train B2 bot-like, test B1 fake; shared fields only; concept-shift check, not a target metric)", ""]
    for n, s in probe.items():
        lines.append(f"- {n}: macro-F1 {s['macro_f1']}, PR-AUC {s['pr_auc']}, recall {s['recall']}, FPR {s['false_positive_rate']}")
    with open(os.path.join(OUT, "social_b_baseline.md"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
