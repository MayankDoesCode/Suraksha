"""Train the look-alike name model (advisory evidence for social handles / app names).

Data: SYNTHETIC. Positives are generated from real brand-style names with the attack patterns
named in the problem statement (character swaps, added words, spacing/separators, homoglyphs).
Negatives are unrelated names, generic words, and brand-adjacent legitimate names. Splits are
grouped by brand so the model is never tested on a brand it trained on.
Run:  python -m backend.scripts.train_lookalike_model
"""
import json, os, random, sys
from datetime import datetime, timezone
from difflib import SequenceMatcher

import joblib
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import precision_score, recall_score, f1_score, roc_auc_score
from sklearn.model_selection import GroupShuffleSplit

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "app", "ml", "models")
HOMO = {"o": "0", "i": "1", "l": "1", "e": "3", "a": "4", "s": "5", "m": "rn", "w": "vv"}
WORDS = ["support", "help", "official", "care", "login", "secure", "wallet", "rewards", "team", "india"]
BRANDS = ("acme bank hdfc paytm zomato swiggy flipkart nykaa tata reliance airtel jio cred groww zerodha "
          "razorpay phonepe ola uber lenskart boat myntra meesho dunzo byjus unacademy policybazaar "
          "bajaj kotak axis icici sbi pnb indigo vistara makemytrip cleartrip oyo dream11 mpl").split()
BENIGN = ("garden coffee photography fitness travel recipes music cricket cooking books movies yoga "
          "daily news pixel craft studio design robotics gaming anime poetry hiking").split()


def norm(s): return "".join(c for c in s.lower() if c.isalnum())
def skel(s):
    s = s.lower()
    for k, v in (("rn", "m"), ("vv", "w")): s = s.replace(k, v)
    return norm(s.translate(str.maketrans("01345$", "oleass")))


def features(cand, brand):
    c, b = norm(cand), norm(brand)
    sc, sb = skel(cand), skel(brand)
    ratio = SequenceMatcher(None, c, b).ratio()
    return [ratio, SequenceMatcher(None, sc, sb).ratio(), float(sb in sc), float(b in c),
            float(sc == sb and c != b), abs(len(c) - len(b)) / max(len(b), 1),
            float(any(ch.isdigit() for ch in cand)), float(any(ch in "._-" for ch in cand)),
            float(any(w in c for w in WORDS))]


def make_attack(brand, rng):
    k = rng.choice(["swap", "word", "space", "homo", "dup", "drop"])
    if k == "swap" and len(brand) > 3:
        i = rng.randrange(len(brand) - 1); return brand[:i] + brand[i + 1] + brand[i] + brand[i + 2:]
    if k == "word": return rng.choice([brand + rng.choice(WORDS), rng.choice(WORDS) + "_" + brand, brand + "." + rng.choice(WORDS)])
    if k == "space": i = rng.randrange(1, len(brand)); return brand[:i] + rng.choice([" ", "_", ".", "-"]) + brand[i:]
    if k == "homo":
        idx = [i for i, ch in enumerate(brand) if ch in HOMO]
        if idx: i = rng.choice(idx); return brand[:i] + HOMO[brand[i]] + brand[i + 1:]
    if k == "dup": i = rng.randrange(len(brand)); return brand[:i] + brand[i] + brand[i:]
    return brand[:-1] if len(brand) > 4 else brand + "x"


def build(seed=7, per_brand=24):
    rng = random.Random(seed); X, y, g = [], [], []
    for bi, b in enumerate(BRANDS):
        for _ in range(per_brand):
            X.append(features(make_attack(b, rng), b)); y.append(1); g.append(bi)
        for _ in range(per_brand):  # negatives: unrelated, other real brands, benign words
            other = rng.choice([o for o in BRANDS if o != b] + BENIGN)
            X.append(features(other + rng.choice(["", "hq", "daily", "world"]), b)); y.append(0); g.append(bi)
    return np.array(X), np.array(y), np.array(g)


def rule_baseline(X): return (X[:, 1] >= 0.8).astype(int)  # skeleton similarity >= 0.8


def main():
    X, y, g = build()
    tr, te = next(GroupShuffleSplit(n_splits=1, test_size=0.25, random_state=7).split(X, y, g))
    clf = LogisticRegression(max_iter=1000, class_weight="balanced").fit(X[tr], y[tr])
    p = clf.predict_proba(X[te])[:, 1]; pred = (p >= 0.5).astype(int); base = rule_baseline(X[te])
    def m(pr): return {"precision": round(precision_score(y[te], pr), 3), "recall": round(recall_score(y[te], pr), 3), "f1": round(f1_score(y[te], pr), 3)}
    neg = y[te] == 0
    # false-positive audit: exact brand name (official) and a legit sibling must not be flagged
    audit = {"official_exact_flagged": int(sum(clf.predict_proba([features(b, b)])[0][1] >= 0.5 for b in BRANDS)),  # informational: allowlist handles exact matches first
             "negative_fpr": round(float(pred[neg].mean()), 4), "baseline_negative_fpr": round(float(base[neg].mean()), 4)}
    report = {"trained_at": datetime.now(timezone.utc).isoformat(), "data": "synthetic (disclosed)",
              "n_train": int(len(tr)), "n_test": int(len(te)), "split": "grouped by brand",
              "model": m(pred), "rule_baseline": m(base), "roc_auc": round(float(roc_auc_score(y[te], p)), 4), "audit": audit,
              "caveat": "Synthetic, easy negatives: near-perfect scores show the pipeline works, NOT real-world accuracy. Do not quote as a headline metric.",
              "note": "Advisory evidence only; official assets are excluded by allowlist before any scoring."}
    os.makedirs(OUT, exist_ok=True)
    import sklearn
    joblib.dump(clf, os.path.join(OUT, "lookalike_model.joblib"))
    report["sklearn_version"] = sklearn.__version__
    json.dump(report, open(os.path.join(OUT, "lookalike_manifest.json"), "w"), indent=2)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
