"""
Derive a smaller copy of the URL phishing model that gives IDENTICAL predictions, for the separate free Render
URL service (deploy/url_service). The original artifact and its manifest are never modified.

What changes (memory only, not behaviour):
  * the top-level `estimator` of CalibratedClassifierCV is a fitted template that predict_proba never uses: reset to
    an unfitted clone
  * each calibrated fold's TF-IDF vocabulary keeps its own n-gram strings: rebuilt so all folds share one string object
    per n-gram (same keys, same indices)
  * written with joblib compression
Verification: predict_proba on every canonical host from the local PhishTank + Tranco raw snapshots (plus fixed
examples) must match the original EXACTLY (array_equal). Otherwise nothing is written.

    python -m backend.scripts.build_slim_url_model
Outputs: backend/app/ml/models/url_phishing_pipeline_slim.joblib + url_phishing_slim_manifest.json
"""
import bz2
import glob
import io
import json
import os
import zipfile
from datetime import datetime, timezone

import joblib
import numpy as np
from sklearn.base import clone

from backend.app.ml.artifact_compat import file_sha256
from backend.app.ml.url_eval import canonical_host

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODELS = os.path.join(ROOT, "backend", "app", "ml", "models")
SRC, SRC_MANIFEST = "url_phishing_pipeline.joblib", "url_phishing_manifest.json"
DST, DST_MANIFEST = "url_phishing_pipeline_slim.joblib", "url_phishing_slim_manifest.json"
FIXED = ["http://paypal-secure-login.xyz/verify", "https://www.google.com", "http://amaz0n-refund.top/claim?id=1",
         "https://github.com/user/repo", "http://sbi-kyc-update.in/login", "https://en.wikipedia.org/wiki/Phishing", "", "x"]


def verification_inputs():
    hosts = list(FIXED)
    for path in sorted(glob.glob(os.path.join(ROOT, "data", "raw", "phishtank", "*", "online-valid.json.bz2")))[-1:]:
        hosts += [e.get("url", "") for e in json.loads(bz2.open(path).read())]
    for path in sorted(glob.glob(os.path.join(ROOT, "data", "raw", "tranco", "*", "top-1m.csv.zip")))[-1:]:
        with zipfile.ZipFile(path) as z:
            hosts += [ln.split(",", 1)[1].strip() for ln in list(io.TextIOWrapper(z.open(z.namelist()[0]), encoding="utf-8"))[:200_000]]
    # score exactly what production scores: the canonical host (see MLService.predict_url_risk)
    return sorted({canonical_host(h) or h for h in hosts})


def slim(model):
    model.estimator = clone(model.estimator)
    shared = {}
    for fold in model.calibrated_classifiers_:
        for _, step in fold.estimator.named_steps["u"].transformer_list:
            if hasattr(step, "vocabulary_"):
                step.vocabulary_ = {shared.setdefault(k, k): i for k, i in step.vocabulary_.items()}
    return model


def main():
    src = os.path.join(MODELS, SRC)
    original = joblib.load(src)
    inputs = verification_inputs()
    reference = original.predict_proba(inputs)
    slimmed = slim(joblib.load(src))
    out = os.path.join(MODELS, DST)
    tmp = out + ".tmp"
    joblib.dump(slimmed, tmp, compress=3)
    check = joblib.load(tmp).predict_proba(inputs)  # verify the file as written, not the in-memory object
    if not np.array_equal(reference, check):
        os.remove(tmp)
        raise SystemExit(f"Predictions differ (max abs diff {np.abs(reference - check).max()}); slim model NOT written.")
    os.replace(tmp, out)

    with open(os.path.join(MODELS, SRC_MANIFEST), encoding="utf-8") as fh:
        manifest = json.load(fh)
    manifest.update({
        "model_artifact": DST,
        "artifact_sha256": file_sha256(out),
        "derived_from": {"artifact": SRC, "sha256": file_sha256(src), "model_version": manifest.get("model_version")},
        "derivation": "Unused fitted top-level estimator reset; fold vocabularies share n-gram strings; joblib compress=3. "
                      "Same features, coefficients and calibration.",
        "identical_predictions_verified": {"inputs": len(inputs), "max_abs_diff": 0.0, "check": "numpy.array_equal on predict_proba",
                                           "sources": "fixed examples + local PhishTank and Tranco snapshots (canonical hosts)",
                                           "verified_at": datetime.now(timezone.utc).isoformat()},
    })
    with open(os.path.join(MODELS, DST_MANIFEST), "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=2)
    print(f"OK: {DST} {os.path.getsize(out) / 1e6:.1f} MB (original {os.path.getsize(src) / 1e6:.1f} MB); identical on {len(inputs)} inputs")


if __name__ == "__main__":
    main()
