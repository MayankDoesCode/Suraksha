"""
Compare the shipped URL model against a host-normalized candidate trained on UCI PhiUSIIL.

Both models are scored on canonical hosts (scheme, path, port and leading "www."
removed), because DetectionService scores bare domains and because both datasets
carry class-dependent URL formatting:
  * PhiUSIIL: every legitimate row is "https://www.<domain>" with no path.
  * Bundled OTX/Tranco: every benign row is a bare domain.

Frozen evaluation sets:
  A. PhiUSIIL test split: unique canonical hosts, grouped by registrable domain
     (tldextract with its bundled public-suffix snapshot, no network), seed 42.
  B. Bundled OTX/Tranco test split: the split from url_eval.frozen_split, which
     the shipped model never trained on. Hosts in the PhiUSIIL training set are
     removed from this set so the candidate is not scored on hosts it has seen.

Each model is out-of-distribution on the other's dataset, so cross-dataset rows
are the main robustness signal. No hyperparameters are tuned on either test set.

Usage (PhiUSIIL must first be downloaded with the dataset kit):
    python -m backend.scripts.compare_url_models --phiusiil <url_phishing_labels.csv>
"""

import argparse
import json
import os
from datetime import datetime, timezone

import joblib
import numpy as np
import pandas as pd
import sklearn
import tldextract
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GroupShuffleSplit

from backend.app.ml.url_eval import binary_metrics, canonical_host, fingerprint, format_features, frozen_split
from backend.app.ml.url_pipeline import DEFAULT_DATA_PATH, DEFAULT_MODEL_DIR, URL_MODEL_FILENAME, create_url_pipeline

REPORT_PATH = os.path.join(DEFAULT_MODEL_DIR, "..", "reports", "url_model_comparison.json")
_extract = tldextract.TLDExtract(suffix_list_urls=())  # bundled snapshot only; never fetches


def registrable_domain(host: str) -> str:
    r = _extract(host)
    return r.top_domain_under_public_suffix or host if hasattr(r, "top_domain_under_public_suffix") else (r.registered_domain or host)


def load_phiusiil_hosts(path: str):
    df = pd.read_csv(path, usecols=["url", "label_is_phishing"])
    df = df.dropna()
    df["host"] = df["url"].map(canonical_host)
    df = df[df["host"].str.len() > 0]
    by_host = df.groupby("host")["label_is_phishing"].agg(["nunique", "max"])
    conflicting = by_host[by_host["nunique"] > 1].index
    hosts = by_host[by_host["nunique"] == 1]["max"].rename("label").reset_index().rename(columns={"host": "indicator"})
    quality = {
        "source_rows": int(len(df)),
        "unique_canonical_hosts": int(len(by_host)),
        "conflicting_label_hosts_quarantined": int(len(conflicting)),
        "conflicting_examples": sorted(conflicting)[:10],
        "host_rows_used": int(len(hosts)),
        "class_counts": {str(k): int(v) for k, v in hosts["label"].value_counts().sort_index().items()},
    }
    return hosts, quality


def main(phiusiil_path: str, otx_path: str, model_path: str, output: str, artifact_out: str, n_boot: int):
    # ---- A. PhiUSIIL frozen split
    phi, phi_quality = load_phiusiil_hosts(phiusiil_path)
    groups = phi["indicator"].map(registrable_domain)
    tr_idx, te_idx = next(GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42).split(phi, phi["label"], groups))
    phi_train, phi_test = phi.iloc[tr_idx], phi.iloc[te_idx]
    assert not (set(groups.iloc[tr_idx]) & set(groups.iloc[te_idx])), "registrable-domain leakage"

    # ---- B. OTX frozen split, canonical hosts, decontaminated
    otx = pd.read_parquet(otx_path).dropna(subset=["indicator", "label"])
    otx["label"] = otx["label"].astype(int)
    otx_train, otx_test = frozen_split(otx)
    otx_test = otx_test.assign(indicator=otx_test["indicator"].map(canonical_host))
    seen = set(phi_train["indicator"])
    contaminated = otx_test["indicator"].isin(seen)
    otx_test_clean = otx_test[~contaminated]

    # ---- Union training set: both training splits as canonical hosts. Any host in
    # either frozen test set is dropped, as are hosts whose labels disagree.
    otx_train_hosts = otx_train.assign(indicator=otx_train["indicator"].map(canonical_host))[["indicator", "label"]]
    union = pd.concat([phi_train[["indicator", "label"]], otx_train_hosts], ignore_index=True)
    test_hosts = set(phi_test["indicator"]) | set(otx_test_clean["indicator"])
    in_test = union["indicator"].isin(test_hosts)
    union = union[~in_test]
    lab = union.groupby("indicator")["label"].nunique()
    union_conflicts = set(lab[lab > 1].index)
    union = union[~union["indicator"].isin(union_conflicts)].drop_duplicates("indicator")

    # ---- Models
    shipped = joblib.load(model_path)
    candidate = create_url_pipeline(random_state=42).fit(phi_train["indicator"], phi_train["label"])
    os.makedirs(os.path.dirname(artifact_out), exist_ok=True)
    joblib.dump(candidate, artifact_out)
    union_model = create_url_pipeline(random_state=42).fit(union["indicator"], union["label"])
    union_artifact = artifact_out.replace(".joblib", "_union.joblib")
    joblib.dump(union_model, union_artifact)

    # Format-only shortcut on canonical hosts (length/dots/hyphens remain usable cues)
    shortcut = LogisticRegression(max_iter=2000).fit(format_features(phi_train["indicator"]), phi_train["label"])

    def score(model, df):
        return binary_metrics(df["label"].to_numpy(), model.predict_proba(df["indicator"])[:, 1], n_boot=n_boot)

    results = {
        "phiusiil_test": {
            "format_shortcut_baseline": binary_metrics(
                phi_test["label"].to_numpy(), shortcut.predict_proba(format_features(phi_test["indicator"]))[:, 1], n_boot=n_boot),
            "shipped_model": score(shipped, phi_test),
            "candidate_phiusiil_host": score(candidate, phi_test),
            "candidate_union_host": score(union_model, phi_test),
        },
        "otx_tranco_test": {
            "format_shortcut_baseline": binary_metrics(
                otx_test_clean["label"].to_numpy(), shortcut.predict_proba(format_features(otx_test_clean["indicator"]))[:, 1], n_boot=n_boot),
            "shipped_model": score(shipped, otx_test_clean),
            "candidate_phiusiil_host": score(candidate, otx_test_clean),
            "candidate_union_host": score(union_model, otx_test_clean),
        },
    }

    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "sklearn_version": sklearn.__version__,
        "input_normalization": "canonical host: lowercase, no scheme/credentials/port/path/query, leading 'www.' removed",
        "phiusiil": {
            "path": os.path.relpath(phiusiil_path),
            "license": "CC BY 4.0 (UCI ML Repository id 967)",
            "data_quality": phi_quality,
            "split": "GroupShuffleSplit by registrable domain (tldextract bundled PSL), test_size=0.2, seed=42",
            "train_hosts": int(len(phi_train)),
            "test_hosts": int(len(phi_test)),
            "test_set_sha256": fingerprint(phi_test["indicator"]),
        },
        "otx_tranco": {
            "path": os.path.relpath(otx_path),
            "test_rows_before_decontamination": int(len(otx_test)),
            "removed_hosts_seen_in_phiusiil_train": int(contaminated.sum()),
            "test_rows": int(len(otx_test_clean)),
            "test_set_sha256": fingerprint(otx_test_clean["indicator"]),
        },
        "candidate_artifact": os.path.relpath(artifact_out),
        "union_training": {
            "artifact": os.path.relpath(union_artifact),
            "phiusiil_train_hosts": int(len(phi_train)),
            "otx_train_rows": int(len(otx_train_hosts)),
            "dropped_hosts_in_a_test_set": int(in_test.sum()),
            "dropped_conflicting_label_hosts": int(len(union_conflicts)),
            "train_hosts": int(len(union)),
            "class_counts": {str(k): int(v) for k, v in union["label"].value_counts().sort_index().items()},
            "otx_share_of_train": round(float(len(otx_train_hosts)) / max(1, len(union)), 4),
        },
        "results": results,
        "notes": [
            "Uncalibrated predict_proba, threshold 0.5; PR-AUC is threshold-free.",
            "Each model is out-of-distribution on the other dataset's test set.",
            "Candidate artifact is NOT installed into the app; it is stored in the git-ignored kit data folder.",
        ],
    }
    os.makedirs(os.path.dirname(os.path.abspath(output)), exist_ok=True)
    with open(output, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print(json.dumps(phi_quality, indent=1))
    print("Union training:", json.dumps(report["union_training"]))
    print(f"PhiUSIIL train/test hosts: {len(phi_train)}/{len(phi_test)}; OTX test {len(otx_test_clean)} "
          f"(removed {int(contaminated.sum())} seen hosts)")
    print(f"{'test set':18} {'model':26} {'prec':>6} {'rec':>6} {'F1':>6} {'F1 95% CI':>16} {'FPR':>6} {'PR-AUC':>7}")
    for ts, models in results.items():
        for name, m in models.items():
            print(f"{ts:18} {name:26} {m['precision']:6.3f} {m['recall']:6.3f} {m['f1']:6.3f} "
                  f"{str(m['f1_ci95']):>16} {m['false_positive_rate']:6.3f} {m['pr_auc']:7.3f}")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--phiusiil", required=True)
    p.add_argument("--otx", default=DEFAULT_DATA_PATH)
    p.add_argument("--model-path", default=os.path.join(DEFAULT_MODEL_DIR, URL_MODEL_FILENAME))
    p.add_argument("--output", default=os.path.normpath(REPORT_PATH))
    p.add_argument("--artifact-out", required=True)
    p.add_argument("--n-boot", type=int, default=500)
    a = p.parse_args()
    main(a.phiusiil, a.otx, a.model_path, a.output, a.artifact_out, a.n_boot)
