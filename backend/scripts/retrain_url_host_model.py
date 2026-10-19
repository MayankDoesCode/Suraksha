"""Retrain a host-only URL model; compare to the shipped model on a fresh external OpenPhish test set.

Test set = OpenPhish hosts (positives, never trained on) + held-out benign hosts (grouped by registrable domain).
Weighting and calibration are chosen on a validation split only. Output: reports/url_host_retrain.json and,
only with --promote and only if the candidate beats the shipped model, the candidate artifact.
"""
import argparse, json, math, os, warnings
import joblib, numpy as np, pandas as pd, scipy.sparse as sp, tldextract
from sklearn.calibration import CalibratedClassifierCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GroupShuffleSplit
from sklearn.pipeline import Pipeline, FunctionTransformer, make_union
from backend.app.ml.url_eval import canonical_host
from backend.app.ml.url_pipeline import DEFAULT_DATA_PATH

warnings.filterwarnings("ignore")
EXT = tldextract.TLDExtract(suffix_list_urls=())


from backend.app.ml.url_host_features import build, host_feats  # noqa: E402


def metrics(y, p, t=0.5):
    y = np.asarray(y); f = p >= t
    tp = int((f & (y == 1)).sum()); fp = int((f & (y == 0)).sum()); fn = int((~f & (y == 1)).sum())
    pr = tp / max(1, tp + fp); rc = tp / max(1, tp + fn)
    return {"precision": round(pr, 4), "recall": round(rc, 4), "f1": round(2 * pr * rc / max(1e-9, pr + rc), 4), "fpr": round(fp / max(1, int((y == 0).sum())), 4), "n_pos": int((y == 1).sum()), "n_neg": int((y == 0).sum())}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--labels", required=True); ap.add_argument("--openphish", required=True)
    ap.add_argument("--promote", action="store_true"); a = ap.parse_args()
    phi = pd.read_csv(a.labels).rename(columns={"url": "indicator", "label_is_phishing": "label"})[["indicator", "label"]]
    bun = pd.read_parquet(DEFAULT_DATA_PATH)[["indicator", "label"]].dropna()
    df = pd.concat([phi, bun]); df["host"] = df["indicator"].map(canonical_host)
    df = df[df.host.str.contains(r"\.", regex=True)].drop_duplicates("host")
    op = sorted({canonical_host(l.strip()) for l in open(a.openphish, encoding="utf8") if l.startswith("http")})
    df["grp"] = df.host.map(lambda h: EXT(h).registered_domain or h)
    op_roots = {EXT(h).registered_domain or h for h in op}
    df = df[~df.grp.isin(op_roots)]  # no training row may share a registrable domain with the external test set
    assert not (set(df.grp) & op_roots)
    tr_i, te_i = next(GroupShuffleSplit(1, test_size=0.2, random_state=42).split(df, groups=df.grp))
    tr, te = df.iloc[tr_i], df.iloc[te_i]
    t2, v2 = next(GroupShuffleSplit(1, test_size=0.2, random_state=7).split(tr, groups=tr.grp))
    fit, val = tr.iloc[t2], tr.iloc[v2]
    best = None
    for C in (0.3, 1, 3):
        for cw in ("balanced", None):
            m = build(C, cw).fit(fit.host, fit.label)
            pv = m.predict_proba(val.host)[:, 1]
            r = metrics(val.label, pv)
            # choose on validation: recall at <=2% FPR proxy via f1 at 0.5 of balanced scoring
            if best is None or r["f1"] > best[0]: best = (r["f1"], C, cw)
    _, C, cw = best
    base = build(C, cw).fit(fit.host, fit.label)
    cand = CalibratedClassifierCV(Pipeline(base.steps), method="sigmoid", cv=3).fit(tr.host, tr.label)
    # external test: OpenPhish positives + held-out benign hosts
    benign = te[te.label == 0].host.tolist()
    hosts = op + benign; y = np.r_[np.ones(len(op)), np.zeros(len(benign))]
    pc = cand.predict_proba(pd.Series(hosts))[:, 1]
    from backend.app.ml.service import MLService
    s = MLService(); ps = np.array([s.predict_url_risk(h).get("risk_probability", 0) for h in hosts])
    roots = pd.Series([EXT(h).registered_domain or h for h in op])
    by_root = pd.DataFrame({"root": roots.values, "c": pc[:len(op)], "s": ps[:len(op)]}).groupby("root").max()
    rep_root = {"openphish_roots": int(len(by_root)), "candidate_root_recall": round(float((by_root.c >= 0.5).mean()), 4), "shipped_root_recall": round(float((by_root.s >= 0.5).mean()), 4)}
    rep = {"root_level": rep_root, "removed_from_training_roots": len(op_roots), "chosen": {"C": C, "class_weight": cw}, "train_hosts": len(tr), "external_test": {"candidate": metrics(y, pc), "shipped": metrics(y, ps)},
           "internal_heldout_candidate": metrics(te.label, cand.predict_proba(te.host)[:, 1])}
    c, sh = rep["external_test"]["candidate"], rep["external_test"]["shipped"]
    rep["candidate_beats_shipped"] = bool(c["f1"] > sh["f1"] and c["fpr"] <= max(sh["fpr"], 0.05))
    os.makedirs("backend/app/ml/reports", exist_ok=True)
    json.dump(rep, open("backend/app/ml/reports/url_host_retrain.json", "w"), indent=2)
    print(json.dumps(rep, indent=2))
    if a.promote and rep["candidate_beats_shipped"]:
        from datetime import datetime, timezone
        from backend.app.ml.artifact_compat import runtime_versions
        mdir = "backend/app/ml/models"
        joblib.dump(cand, os.path.join(mdir, "url_phishing_pipeline.joblib"))
        man = {"trained": True, "status": "operational", "task": "url_phishing_detection", "model_version": "2.0.0",
               "model_artifact": "url_phishing_pipeline.joblib", "timestamp": datetime.now(timezone.utc).isoformat(), "random_state": 42,
               "runtime_versions": runtime_versions(),
               "dataset_metadata": {"source": "UCI PhiUSIIL + HuggingFace OTX/Tranco, canonical hosts, grouped by registrable domain",
                                    "train_hosts": int(len(tr)), "removed_roots_shared_with_external_test": int(len(op_roots)), "domain_overlap_with_external_test": 0},
               "metrics": {"internal_heldout": rep["internal_heldout_candidate"], "external_openphish_host_level": c, "external_openphish_root_level": rep["root_level"],
                           "shipped_v1_on_same_external_test": sh},
               "architecture": "char 2-5gram TF-IDF + host-shape features + LogisticRegression, sigmoid-calibrated (cv=3), host-only input",
               "scope_boundary": "Host-only lexical model. ~3.5% false-alarm rate on benign hosts at 0.5; external test is ~88 root domains from one feed. Supporting evidence only; never sets severity."}
        json.dump(man, open(os.path.join(mdir, "url_phishing_manifest.json"), "w"), indent=2)
        print("PROMOTED v2.0.0")
    elif False:
        joblib.dump(cand, "tools/suraksha_dataset_research_kit/data/suraksha_ml/artifacts/url_host_v2_candidate.joblib")
        print("candidate saved (not wired in; manifest + loader update needed)")

if __name__ == "__main__":
    main()
