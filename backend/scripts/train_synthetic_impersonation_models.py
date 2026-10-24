"""
Train advisory brand-impersonation models for DOMAINS and MOBILE APPS on data generated in this repo (no third-party data).

Same method as train_social_profile_model.py:
  * names are drawn from a pool shared by impersonators and legitimate unofficial sites/apps, so the page/listing text and
    the developer identity have to decide, not name similarity alone
  * test = held-out brands x held-out template family (unseen brands and unseen phrasing)
  * a names-only baseline is reported on the same split
SYNTHETIC: scores measure fit to patterns written here, NOT real-world accuracy. The models are advisory, never fused into
a risk score, and callers exclude official assets before scoring. The labelled-data manifests (manifest.json,
mobile_app_manifest.json) are left untouched: they still describe the missing real labels.

Run:  python -m backend.scripts.train_synthetic_impersonation_models
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
from sklearn.pipeline import FunctionTransformer, make_pipeline
from sklearn.preprocessing import StandardScaler

from backend.scripts.train_lookalike_model import BENIGN, BRANDS, features as name_features, hard_negative, make_attack
from backend.scripts.train_social_profile_model import score, title

SEED = 13
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "app", "ml", "models")

# ---------------------------------------------------------------- domains ----------------------------------------
D_SUFFIX = ["-help", "-tips", "-deals", "-support", "-news", "-login", "-care", "-offers", "-guide", "-verify"]
D_TLD = [".com", ".in", ".net", ".org", ".co", ".info", ".online", ".site", ".top", ".xyz"]
D_IMP = {"A": ["Sign in to your {B} account to continue. Enter your password and OTP.",
               "Your {B} account is suspended. Verify your KYC within 24 hours.",
               "Claim your {B} refund: enter card details to receive the amount."],
         "B": ["{B} secure portal. Re-enter your login details to unlock your wallet.",
               "Last notice from {B}: update PAN and bank details or your account will be closed.",
               "Congratulations, {B} selected you for a cashback. Pay the processing fee to claim."]}
D_LEGIT = {"A": ["Independent tips and guides for {B} users. We are not affiliated with {B}.",
                 "Deals blog comparing {B} offers with other apps. Never enter passwords here.",
                 "Tech news covering {B} and its competitors."],
           "B": ["Unofficial community wiki about {B} features. For account help, use the official app.",
                 "Price tracker for products sold on many sites including {B}.",
                 "Our review of {B}: pros, cons and alternatives."]}
D_OFFICIAL = {"A": ["Welcome to {B}. Download the app or sign in."], "B": ["{B} | Official website"]}
D_OTHER = {"A": ["Home bakery in Pune. Fresh cakes daily.", "Portfolio of a freelance photographer."],
           "B": ["Yoga classes and meditation retreats.", "Local cricket club fixtures and results."]}

# ---------------------------------------------------------------- apps -------------------------------------------
A_TITLE = ["{B} Pay", "{B} Rewards", "{B} Wallet Lite", "{B} Helper", "{B} Guide", "{B} Points Calculator", "{B} Offers", "{B} Lite"]
A_PKG = ["com.{b}.pay", "com.{b}.rewards", "com.{b}lite.app", "com.{b}.helper", "app.{b}guide", "com.{b}offers.android"]
A_DEV = ["Rewards Labs", "Smart Apps Studio", "QuickTools", "Digital Hub", "Pixel Apps", "AppMakers India"]
A_IMP = {"A": ["Official {B} rewards app. Log in with your {B} password and UPI PIN to claim cashback.",
               "Get {B} premium free. Enter your card details to activate.",
               "{B} account verification app. Complete KYC to avoid account block."],
         "B": ["The real {B} wallet, faster. Sign in with your registered mobile and OTP.",
               "{B} refund centre. Provide bank details to receive pending refunds.",
               "Win daily {B} prizes. Pay a small entry fee via UPI."]}
A_LEGIT = {"A": ["Unofficial guide to {B} features. Not affiliated with {B}; we never ask for logins.",
                 "Track your {B} reward points offline. This is an independent app.",
                 "Compare {B} offers with other apps. No account needed."],
           "B": ["Fan-made tips for {B} users. Not an official {B} product.",
                 "Expense tracker that can import {B} statements you export yourself.",
                 "Calculator for {B} cashback. Works without signing in."]}
A_OTHER = {"A": ["Offline notes and to-do lists.", "Simple step counter and water reminder."],
           "B": ["Recipes from Indian home kitchens.", "Learn guitar chords with easy lessons."]}


def domain_rows(brand, fam, rng):
    B, rows = title(brand), []
    dom = lambda: rng.choice([make_attack(brand, rng), brand + rng.choice(D_SUFFIX)]).replace(" ", "") + rng.choice(D_TLD)
    for _ in range(8):
        rows.append((dom(), rng.choice(D_IMP[fam]).format(B=B), 1, "impersonator"))
    for _ in range(6):
        rows.append((dom(), rng.choice(D_LEGIT[fam]).format(B=B), 0, "unofficial_disclosed"))
    rows.append((brand + rng.choice([".com", ".in"]), rng.choice(D_OFFICIAL[fam]).format(B=B), 0, "official"))
    for _ in range(2):
        rows.append((hard_negative(brand, rng) + rng.choice(D_TLD), rng.choice(D_OTHER[fam]), 0, "unrelated_lookalike"))
    return rows


def app_rows(brand, fam, rng):
    B, rows = title(brand), []
    t = lambda: rng.choice(A_TITLE).format(B=B)
    p = lambda: rng.choice(A_PKG).format(b=brand)
    for _ in range(8):
        rows.append((t(), p(), rng.choice(A_DEV), rng.choice(A_IMP[fam]).format(B=B), 1, "impersonator"))
    for _ in range(6):
        rows.append((t(), p(), rng.choice(A_DEV), rng.choice(A_LEGIT[fam]).format(B=B), 0, "unofficial_disclosed"))
    rows.append((B, f"com.{brand}.android", f"{B} Ltd", f"The official {B} app.", 0, "official"))
    for _ in range(2):
        rows.append((hard_negative(brand, rng).title(), "com." + rng.choice(BENIGN) + ".app", rng.choice(A_DEV), rng.choice(A_OTHER[fam]), 0, "unrelated_lookalike"))
    return rows


def domain_numeric(df):
    return np.array([name_features(r.domain.split(".")[0], r.brand) for r in df.itertuples()])


def app_numeric(df):
    t = np.array([name_features(r.title, r.brand) for r in df.itertuples()])
    p = np.array([name_features(r.package.replace(".", " "), r.brand) for r in df.itertuples()])
    d = np.array([name_features(r.developer, r.brand)[:4] for r in df.itertuples()])
    return np.hstack([t, p, d])


SPECS = {
    "domain": {"cols": ["domain", "text", "label", "kind"], "rows": domain_rows, "numeric": "domain_numeric", "text": "text",
               "name_cols": ["brand", "domain"], "artifact": "domain_impersonation_synthetic",
               "task": "domain brand impersonation from domain name + page text, relative to one brand"},
    "app": {"cols": ["title", "package", "developer", "text", "label", "kind"], "rows": app_rows, "numeric": "app_numeric", "text": "text",
            "name_cols": ["brand", "title", "package", "developer"], "artifact": "app_impersonation_synthetic",
            "task": "mobile app brand impersonation from title + package + developer + description, relative to one brand"},
}


def _fn(name):
    # pickle must reference an importable module path, not __main__
    import backend.scripts.train_synthetic_impersonation_models as m
    return getattr(m, name)


def make_model(spec, with_text=True):
    parts = [("names", make_pipeline(FunctionTransformer(_fn(spec["numeric"])), StandardScaler()), spec["name_cols"])]
    if with_text:
        parts += [("words", TfidfVectorizer(ngram_range=(1, 2), min_df=2, sublinear_tf=True), spec["text"]),
                  ("chars", TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), min_df=3, sublinear_tf=True), spec["text"])]
    return make_pipeline(ColumnTransformer(parts), LogisticRegression(class_weight="balanced", max_iter=3000, random_state=SEED))


def train(kind):
    spec, rng = SPECS[kind], random.Random(SEED)
    rows = [(b, fam, *r) for b in BRANDS for fam in ("A", "B") for r in spec["rows"](b, fam, rng)]
    df = pd.DataFrame(rows, columns=["brand", "family", *spec["cols"]]).drop_duplicates().reset_index(drop=True)
    brands = sorted(set(df.brand)); rng.shuffle(brands)
    test_brands = set(brands[: len(brands) // 4])
    tr, te = df[(~df.brand.isin(test_brands)) & (df.family == "A")], df[(df.brand.isin(test_brands)) & (df.family == "B")]
    res = score(te.label.values, make_model(spec).fit(tr, tr.label).predict_proba(te)[:, 1], te.kind.values)
    base = score(te.label.values, make_model(spec, with_text=False).fit(tr, tr.label).predict_proba(te)[:, 1], te.kind.values)
    final = make_model(spec).fit(df, df.label)
    joblib.dump(final, os.path.join(OUT, spec["artifact"] + ".joblib"))
    manifest = {
        "trained": True, "status": "synthetic_trained_not_validated", "task": spec["task"], "model_version": "0.1.0-synthetic",
        "model_artifact": spec["artifact"] + ".joblib", "input_columns": ["brand", *spec["cols"][:-2]],
        "timestamp": datetime.now(timezone.utc).isoformat(), "random_state": SEED, "sklearn_version": sklearn.__version__,
        "data": {"origin": "Generated in this repo by backend/scripts/train_synthetic_impersonation_models.py. No third-party data, no real assets.",
                 "rows": int(len(df)), "label_counts": {str(k): int(v) for k, v in df.label.value_counts().items()},
                 "kinds": {k: int(v) for k, v in df.kind.value_counts().items()}, "train_rows": int(len(tr)), "test_rows": int(len(te))},
        "split": "Test = held-out brands (25%) x held-out template family B.",
        "evaluation_synthetic_holdout": {"model": res, "baseline_names_only": base},
        "caveat": "Synthetic data written from chosen patterns: NOT real-world accuracy. Advisory only; never a verdict. Validate on reviewed real assets before relying on it.",
        "not_loaded_by_service": False, "advisory_only": True,
    }
    with open(os.path.join(OUT, spec["artifact"] + "_manifest.json"), "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=2)
    return {"rows": len(df), "model": {k: res[k] for k in ("precision", "recall", "macro_f1", "pr_auc", "false_positive_rate")}, "flag_by_kind": res["flag_rate_by_negative_kind"],
            "names_only": {k: base[k] for k in ("precision", "recall", "macro_f1", "pr_auc", "false_positive_rate")}}


if __name__ == "__main__":
    print(json.dumps({k: train(k) for k in SPECS}, indent=1))
