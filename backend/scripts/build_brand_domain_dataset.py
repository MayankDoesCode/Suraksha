"""
Real-label dataset for DOMAIN brand impersonation, built from PhishTank (verified phish with a named target brand) and
Tranco (popular legitimate domains), plus a first model and an honest evaluation.

Raw inputs are read, never modified (newest snapshot of each):
  data/raw/phishtank/<ts>/online-valid.json.bz2     PhishTank verified + online feed (Cisco Talos). Attribution required.
  data/raw/tranco/<ts>/top-1m.csv.zip               Tranco top-1M list (cite the list id stored beside it)

Labels
  positive (1)   PhishTank verified phish whose `target` names a brand, keyed by the attacker-controlled host
  negative (0)   Tranco top-200k domain paired with a brand whose name it does not contain ("unrelated legitimate")
  uncertain      kept in a separate file, never trained on:
                 - PhishTank target "Other" (phishing, but brand unknown)
                 - phish hosted on a popular registrable domain (likely compromised or shared hosting: the NAME does not
                   impersonate anything)
                 - Tranco domains that contain the brand's name (could be official or a reseller: unverifiable here)
Splits: brands are held out (test brands never seen in training) and no registrable domain appears in both splits.

Outputs: data/processed/brand_domain_{train,test,uncertain}.csv, data/manifests/brand_domain_dataset.json,
         backend/app/ml/models/domain_impersonation_phishtank{.joblib,_manifest.json}
Run:  python -m backend.scripts.build_brand_domain_dataset
"""
import bz2
import glob
import hashlib
import html
import io
import json
import os
import random
import re
import zipfile
from collections import Counter
from datetime import datetime, timezone
from urllib.parse import urlparse

import joblib
import numpy as np
import pandas as pd
import sklearn
import tldextract
from sklearn.compose import ColumnTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import FunctionTransformer, make_pipeline
from sklearn.preprocessing import StandardScaler

from backend.scripts.train_lookalike_model import features as name_features
from backend.scripts.train_social_profile_model import score

SEED = 21
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.path.join(ROOT, "data")
MODELS = os.path.join(ROOT, "backend", "app", "ml", "models")
EXTRACT = tldextract.TLDExtract(suffix_list_urls=(), include_psl_private_domains=True)  # bundled PSL, no network
ICANN = tldextract.TLDExtract(suffix_list_urls=())
TOP_LEGIT = 200_000  # Tranco ranks used for negatives and for the "popular host" check

# Short brand keys used for name matching. Explicit where the brand name is not what attackers type.
ALIASES = {"Internal Revenue Service": "irs", "Amazon.com": "amazon", "Bank of America Corporation": "bankofamerica",
           "JPMorgan Chase and Co.": "chase", "eBay, Inc.": "ebay", "AT&T": "att", "Sumitomo Mitsui Banking Corporation": "smbc",
           "HSBC Group": "hsbc", "British Telecom": "bt", "Banco Santander, S.A.": "santander", "La Banque Postale": "labanquepostale",
           "Société Générale": "societegenerale", "American Express": "americanexpress", "Hotmail": "hotmail"}


def newest(pattern):
    hits = sorted(glob.glob(os.path.join(DATA, "raw", pattern)))
    if not hits:
        raise SystemExit(f"Missing raw input: data/raw/{pattern}")
    return hits[-1]


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def brand_key(name):
    return ALIASES.get(name) or re.sub(r"[^a-z0-9]", "", name.lower().split()[0].split(".")[0])


def host_of(url):
    try:
        h = (urlparse(url if "://" in url else "http://" + url).hostname or "").lower().strip(".")
    except ValueError:
        return ""
    return h[4:] if h.startswith("www.") else h


# ------------------------------------------------------------------ features (module level: pickled by path) ------

def domain_numeric(df):
    rows = []
    for r in df.itertuples():
        labels = [p for p in r.host.split(".")[:-1] if p] or [r.host]
        best = max((name_features(p, r.brand_key) for p in labels + ["".join(labels)]), key=lambda f: f[1])
        rows.append(best + [len(r.host), r.host.count("."), r.host.count("-"), sum(c.isdigit() for c in r.host)])
    return np.array(rows, dtype=float)


def make_model(with_brand=True, with_lexical=True):
    import backend.scripts.build_brand_domain_dataset as me  # importable reference for pickling
    parts = []
    if with_brand:
        parts.append(("brand", make_pipeline(FunctionTransformer(me.domain_numeric), StandardScaler()), ["host", "brand_key"]))
    if with_lexical:
        parts.append(("host_chars", TfidfVectorizer(analyzer="char", ngram_range=(3, 5), min_df=3, sublinear_tf=True), "host"))
    return make_pipeline(ColumnTransformer(parts), LogisticRegression(class_weight="balanced", max_iter=4000, C=1.0, random_state=SEED))


def main():
    rng = random.Random(SEED)
    pt_path, tr_path = newest("phishtank/*/online-valid.json.bz2"), newest("tranco/*/top-1m.csv.zip")
    tranco_id_path = os.path.join(os.path.dirname(tr_path), "list_id.txt")
    tranco_id = open(tranco_id_path).read().strip() if os.path.exists(tranco_id_path) else None

    with zipfile.ZipFile(tr_path) as z:
        tranco = [line.split(",", 1)[1].strip().lower() for line in io.TextIOWrapper(z.open(z.namelist()[0]), encoding="utf-8")][:TOP_LEGIT]
    popular_regs = {EXTRACT(d).top_domain_under_public_suffix or d for d in tranco}

    feed = json.loads(bz2.open(pt_path).read())
    rejected = Counter()
    pos, unc = [], []
    for e in feed:
        if e.get("verified") != "yes":
            rejected["not_verified"] += 1; continue
        host = host_of(e.get("url", ""))
        if not host or re.fullmatch(r"[\d.:]+", host):
            rejected["no_host_or_ip_literal"] += 1; continue
        reg = EXTRACT(host).top_domain_under_public_suffix or host
        target = html.unescape(e.get("target") or "").strip()
        try:  # the feed double-encodes some names ("SociÃ©tÃ©" -> "Société")
            target = target.encode("latin-1").decode("utf-8")
        except (UnicodeEncodeError, UnicodeDecodeError):
            pass
        rec = {"host": host, "registrable": reg, "icann_registrable": ICANN(host).top_domain_under_public_suffix or host,
               "brand": target, "brand_key": brand_key(target) if target and target != "Other" else "",
               "source": "phishtank", "source_id": e.get("phish_id"), "observed_at_utc": e.get("verification_time")}
        if not target or target == "Other":
            unc.append({**rec, "label": "", "reason": "phish_brand_unknown"})
        elif reg in popular_regs:
            unc.append({**rec, "label": "", "reason": "phish_on_popular_registrable_domain"})
        else:
            pos.append({**rec, "label": 1, "kind": "phishtank_named_target"})

    pos = pd.DataFrame(pos).drop_duplicates(["brand", "host"])
    brands = sorted(pos.brand.unique())
    keys = {b: brand_key(b) for b in brands}

    # negatives: popular legitimate domains paired with a brand they do not mention
    neg = []
    n_target = 3 * len(pos)
    while len(neg) < n_target:
        d = rng.choice(tranco)
        b = rng.choice(brands)
        reg = EXTRACT(d).top_domain_under_public_suffix or d
        rec = {"host": d, "registrable": reg, "icann_registrable": ICANN(d).top_domain_under_public_suffix or d, "brand": b,
               "brand_key": keys[b], "source": "tranco", "source_id": tranco_id, "observed_at_utc": None}
        if keys[b] and keys[b] in d.replace("-", "").replace(".", ""):
            unc.append({**rec, "label": "", "reason": "legit_domain_contains_brand_name_unverified_ownership"})
            continue
        neg.append({**rec, "label": 0, "kind": "tranco_unrelated_legitimate"})
    neg = pd.DataFrame(neg).drop_duplicates(["brand", "host"])
    df = pd.concat([pos, neg], ignore_index=True)
    unc = pd.DataFrame(unc)

    # split: hold out brands; then drop any test row whose registrable domain also occurs in train
    shuffled = brands[:]; rng.shuffle(shuffled)
    cut, test_brands, count = 0.25 * len(pos), set(), 0
    for b in shuffled:  # hold out ~25% of positives, never the single dominant brand alone
        n = int((pos.brand == b).sum())
        if count + n <= cut * 1.3:
            test_brands.add(b); count += n
        if count >= cut:
            break
    train = df[~df.brand.isin(test_brands)]
    test = df[df.brand.isin(test_brands)]
    leaked = test.registrable.isin(set(train.registrable))
    test = test[~leaked]

    out = os.path.join(DATA, "processed"); os.makedirs(out, exist_ok=True)
    train.to_csv(os.path.join(out, "brand_domain_train.csv"), index=False)
    test.to_csv(os.path.join(out, "brand_domain_test.csv"), index=False)
    unc.to_csv(os.path.join(out, "brand_domain_uncertain.csv"), index=False)

    # models: brand-relative only, lexical only, both; plus the synthetic domain model on this REAL test set
    results = {}
    for name, (wb, wl) in {"brand_relative_only": (True, False), "host_lexical_only": (False, True), "combined": (True, True)}.items():
        m = make_model(wb, wl).fit(train, train.label.astype(int))
        results[name] = score(test.label.astype(int).values, m.predict_proba(test)[:, 1], test.kind.values)
    try:
        from backend.app.ml.profile_impersonation_service import _load
        syn, _ = _load("domain")
        if syn is not None:
            X = pd.DataFrame({"brand": test.brand_key, "domain": test.host, "text": ""})
            results["synthetic_domain_model_names_only_transfer"] = score(test.label.astype(int).values, syn.predict_proba(X)[:, 1], test.kind.values)
    except Exception as exc:
        results["synthetic_domain_model_names_only_transfer"] = {"error": str(exc)}

    final = make_model(True, True).fit(df, df.label.astype(int))
    joblib.dump(final, os.path.join(MODELS, "domain_impersonation_phishtank.joblib"))

    manifest = {
        "built_at": datetime.now(timezone.utc).isoformat(), "seed": SEED,
        "sources": [
            {"name": "PhishTank online-valid feed (Cisco Talos)", "file": os.path.relpath(pt_path, ROOT), "sha256": sha256(pt_path),
             "records": len(feed), "terms": "Free download; attribution to PhishTank required. Confirm current terms at phishtank.org before redistribution or commercial use."},
            {"name": "Tranco top-1M", "list_id": tranco_id, "file": os.path.relpath(tr_path, ROOT), "sha256": sha256(tr_path),
             "used_ranks": TOP_LEGIT, "terms": "Free for research; cite the Tranco list id."},
        ],
        "counts": {"positives": int(len(pos)), "negatives": int(len(neg)), "uncertain": int(len(unc)),
                   "uncertain_reasons": {k: int(v) for k, v in unc.reason.value_counts().items()} if len(unc) else {},
                   "rejected": dict(rejected), "brands": len(brands),
                   "train": {"rows": int(len(train)), "pos": int(train.label.astype(int).sum())},
                   "test": {"rows": int(len(test)), "pos": int(test.label.astype(int).sum()), "brands": sorted(test_brands),
                            "dropped_for_registrable_overlap": int(leaked.sum())},
                   "top_brands": {k: int(v) for k, v in pos.brand.value_counts().head(15).items()}},
        "evaluation_held_out_brands": results,
        "known_confounds": [
            "Negatives are POPULAR legitimate sites, positives are fresh phishing hosts: host-lexical features partly learn 'popular vs throwaway', not brand impersonation. Compare brand_relative_only to see the brand signal alone.",
            "PhishTank labels phishing pages that use a brand; look-alike domains that never hosted phishing are not covered.",
            "Brand mix is skewed (Allegro, IRS, Amazon dominate).",
        ],
    }
    os.makedirs(os.path.join(DATA, "manifests"), exist_ok=True)
    with open(os.path.join(DATA, "manifests", "brand_domain_dataset.json"), "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=2, default=str)
    with open(os.path.join(MODELS, "domain_impersonation_phishtank_manifest.json"), "w", encoding="utf-8") as fh:
        json.dump({"trained": True, "status": "trained_real_labels_not_deployed", "model_version": "0.1.0",
                   "model_artifact": "domain_impersonation_phishtank.joblib", "input_columns": ["host", "brand_key"],
                   "sklearn_version": sklearn.__version__, "trained_at": manifest["built_at"],
                   "data": {k: manifest[k] for k in ("sources", "counts")}, "evaluation_held_out_brands": results,
                   "known_confounds": manifest["known_confounds"], "advisory_only": True}, fh, indent=2, default=str)

    summary = {k: {m: r[m] for m in ("precision", "recall", "macro_f1", "pr_auc", "false_positive_rate")} if "precision" in r else r for k, r in results.items()}
    print(json.dumps({"counts": manifest["counts"], "results": summary}, indent=1, default=str))


if __name__ == "__main__":
    main()
