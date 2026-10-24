"""
Train a social-profile brand-impersonation model on data generated entirely in this repo (no third-party dataset).

Why: every public bot/fake-account dataset has licence or access conditions. This model needs none: profiles are built
here from brand names and hand-written profile patterns. It is SYNTHETIC, so its scores show the pipeline learns the
patterns we encoded, not real-world accuracy. Validate on reviewed live accounts (docs/SOCIAL_RESEARCH.md) before use.

Each example is (handle, display name, bio) against one protected brand.
  positive  impersonator: look-alike or brand+word handle, official-sounding name, bio that claims to be the brand's
            support/official account, asks for DMs/OTP/payment, or links off-site
  negative  official account; fan/parody/reseller accounts that disclose they are unofficial; news/reviewer accounts
            that mention the brand; unrelated accounts, including hard look-alike names
Leakage control: brands are split (test brands never seen in training) AND bio template families are split (test bios
come from phrasings never seen in training), so the model cannot pass by memorising wording.

Run:  python -m backend.scripts.train_social_profile_model
"""
import json
import os
import random
from datetime import datetime, timezone

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.compose import ColumnTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (average_precision_score, brier_score_loss, confusion_matrix, f1_score, precision_score,
                             recall_score)
from sklearn.pipeline import FunctionTransformer, make_pipeline
from sklearn.preprocessing import StandardScaler

from backend.scripts.train_lookalike_model import BENIGN, BRANDS, features as name_features, hard_negative, make_attack

SEED = 11
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "app", "ml", "models")
ARTIFACT, MANIFEST = "social_impersonation_synthetic.joblib", "social_impersonation_synthetic_manifest.json"

# Two independent phrasings per class ("A" for training, "B" held out for testing). {b} = brand, {d} = off-site domain.
IMP = {
    "A": ["Official {b} customer support. DM us your registered number to resolve issues fast.",
          "{b} Help Desk | 24x7 | Share your OTP in DM to verify your account",
          "Verified {b} care team. Refunds processed via {d}",
          "Official {b} rewards page. Claim your cashback now at {d}"],
    "B": ["We are the {b} service team. Message us privately with your account details for immediate help.",
          "{b} official assistance. Send your login code here and we will unlock your account",
          "Real {b} support handle. Complete KYC today at {d} or your account will be blocked",
          "{b} giveaway is live! Pay a small fee at {d} to receive your prize"],
}
NEG_DISCLOSED = {
    "A": ["Fan account for {b} news and memes. Not affiliated with {b}.", "Parody account. Not the real {b}.",
          "Unofficial {b} community updates, run by fans."],
    "B": ["Independent page sharing {b} deals. We are not {b} and never ask for payments.",
          "Satire. Nothing here is from {b}.", "Community forum for {b} users; not an official channel."],
}
NEG_MENTION = {
    "A": ["Tech journalist. I review apps including {b}, Paytm and others.", "Consumer rights tips. Report fraud to the official {b} site."],
    "B": ["Writing about fintech and startups, sometimes {b}.", "Product reviews, unboxings and comparisons. Opinions are my own."],
}
NEG_OFFICIAL = {
    "A": ["The official {b} account. We will never ask for your OTP or password.", "News and updates from {b}."],
    "B": ["Welcome to {b}. Support only via our app and website.", "Official handle of {b}."],
}
NEG_OTHER = {
    "A": ["Photographer. Mumbai. Coffee and long walks.", "Software engineer. Opinions my own.", "Daily recipes and kitchen tips"],
    "B": ["Cricket fan, travel lover, dog parent.", "Student. Learning design and music.", "Small bakery in Pune. Orders open."],
}
SHARED_SUFFIX = ["_support", "care", "_help", "_in", "_rewards", "_fans", "updates", "_memes", "community", "_deals"]
SHARED_DISPLAY = ["Support", "Care", "Help", "Updates", "Community", "Fans", "Deals", "India"]
OFFSITE = ["{b}-support-help.com", "{b}-refund.in", "bit.ly/{b}care", "{b}kyc-update.top"]


def title(b):
    return b[:1].upper() + b[1:]


def make(brand, fam, rng):
    """Return (handle, display, bio, label, kind) rows for one brand from one template family."""
    B, rows = title(brand), []
    d = lambda: rng.choice(OFFSITE).format(b=brand)
    # Impersonators and openly unofficial pages draw handles and display names from the SAME pool, as they do in
    # practice ("brand_updates" can be either), so only the bio and its claims can separate them.
    handle = lambda: rng.choice([make_attack(brand, rng), brand + rng.choice(SHARED_SUFFIX)])
    display = lambda: rng.choice([f"{B} {w}" for w in SHARED_DISPLAY])
    for _ in range(8):
        rows.append((handle(), display(), rng.choice(IMP[fam]).format(b=B, d=d()), 1, "impersonator"))
    rows.append((brand, B, rng.choice(NEG_OFFICIAL[fam]).format(b=B), 0, "official"))
    for _ in range(6):
        rows.append((handle(), display(), rng.choice(NEG_DISCLOSED[fam]).format(b=B), 0, "disclosed_unofficial"))
    for _ in range(2):
        rows.append((rng.choice(BENIGN) + rng.choice(["_writes", "reviews", "_tech"]), rng.choice(["Asha", "Ravi", "Meera", "Tech Daily"]),
                     rng.choice(NEG_MENTION[fam]).format(b=B), 0, "mentions_brand"))
    for _ in range(2):
        rows.append((hard_negative(brand, rng), rng.choice(["Studio", "Kitchen", "Lens", "Pixel"]), rng.choice(NEG_OTHER[fam]), 0, "unrelated_lookalike"))
    return rows


def build():
    rng = random.Random(SEED)
    rows = []
    for b in BRANDS:
        for fam in ("A", "B"):
            rows += [(b, fam, *r) for r in make(b, fam, rng)]
    df = pd.DataFrame(rows, columns=["brand", "family", "handle", "display", "bio", "label", "kind"]).drop_duplicates(["brand", "handle", "display", "bio"])
    return df.reset_index(drop=True)


def numeric(df):
    h = np.array([name_features(r.handle, r.brand) for r in df.itertuples()])
    d = np.array([name_features(r.display, r.brand) for r in df.itertuples()])
    return np.hstack([h, d[:, :4]])


def _numeric_ref():
    # pickle must reference an importable module path, not __main__, or the artifact cannot be loaded by the app
    from backend.scripts.train_social_profile_model import numeric as fn
    return fn


def pipeline():
    num = make_pipeline(FunctionTransformer(_numeric_ref()), StandardScaler())
    pre = ColumnTransformer([
        ("names", num, ["brand", "handle", "display"]),
        ("bio_words", TfidfVectorizer(ngram_range=(1, 2), min_df=2, sublinear_tf=True), "bio"),
        ("bio_chars", TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), min_df=3, sublinear_tf=True), "bio"),
    ])
    return make_pipeline(pre, LogisticRegression(C=1.0, class_weight="balanced", max_iter=3000, random_state=SEED))


def score(y, p, kinds):
    pred = (p >= 0.5).astype(int)
    tn, fp, fn, tp = confusion_matrix(y, pred, labels=[0, 1]).ravel()
    fpr_by_kind = {k: round(float(pred[(kinds == k)].mean()), 4) for k in sorted(set(kinds)) if k != "impersonator"}
    return {"precision": round(precision_score(y, pred), 4), "recall": round(recall_score(y, pred), 4),
            "macro_f1": round(f1_score(y, pred, average="macro"), 4), "pr_auc": round(average_precision_score(y, p), 4),
            "false_positive_rate": round(fp / (fp + tn), 4), "brier": round(brier_score_loss(y, p), 4),
            "confusion_tn_fp_fn_tp": [int(tn), int(fp), int(fn), int(tp)], "flag_rate_by_negative_kind": fpr_by_kind}


def main():
    df = build()
    rng = random.Random(SEED)
    brands = sorted(set(df.brand)); rng.shuffle(brands)
    test_brands = set(brands[: len(brands) // 4])
    tr = df[(~df.brand.isin(test_brands)) & (df.family == "A")]
    te = df[(df.brand.isin(test_brands)) & (df.family == "B")]  # unseen brands AND unseen phrasings

    model = pipeline().fit(tr, tr.label)
    p = model.predict_proba(te)[:, 1]
    res_model = score(te.label.values, p, te.kind.values)

    # baseline: handle look-alike only (what a name-similarity rule sees), same split
    base = make_pipeline(ColumnTransformer([("names", make_pipeline(FunctionTransformer(_numeric_ref()), StandardScaler()), ["brand", "handle", "display"])]),
                         LogisticRegression(class_weight="balanced", max_iter=2000, random_state=SEED)).fit(tr, tr.label)
    res_base = score(te.label.values, base.predict_proba(te)[:, 1], te.kind.values)

    final = pipeline().fit(df, df.label)
    joblib.dump(final, os.path.join(OUT, ARTIFACT))
    manifest = {
        "trained": True, "status": "synthetic_trained_not_validated",
        "task": "social_brand_impersonation (Dataset A) from handle + display name + bio, relative to one brand",
        "model_version": "0.1.0-synthetic", "model_artifact": ARTIFACT,
        "timestamp": datetime.now(timezone.utc).isoformat(), "random_state": SEED, "sklearn_version": sklearn.__version__,
        "data": {"origin": "Generated in this repo by backend/scripts/train_social_profile_model.py. No third-party data, no real accounts.",
                 "rows": int(len(df)), "brands": len(brands), "label_counts": {str(k): int(v) for k, v in df.label.value_counts().items()},
                 "kinds": {k: int(v) for k, v in df.kind.value_counts().items()},
                 "train_rows": int(len(tr)), "test_rows": int(len(te)), "test_brands": sorted(test_brands)},
        "split": "Test = held-out brands (25%) x held-out bio template family B. Train = remaining brands x family A.",
        "evaluation_synthetic_holdout": {"model": res_model, "baseline_names_only": res_base},
        "architecture": "LogisticRegression over [look-alike features of handle + display name] + word(1-2) and char(3-5) TF-IDF of bio",
        "caveat": "Synthetic profiles written from patterns we chose: scores measure fit to those patterns, NOT real-world accuracy. "
                  "Do not use as a verdict. Validate on reviewed live accounts before enabling.",
        "not_loaded_by_service": True,
    }
    with open(os.path.join(OUT, MANIFEST), "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=2)
    print(json.dumps({"rows": len(df), "train": len(tr), "test": len(te), "model": res_model, "baseline_names_only": res_base}, indent=1))


if __name__ == "__main__":
    main()
