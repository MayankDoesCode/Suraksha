"""
Evaluation harness for brand-impersonation detection on reviewer-annotated data.

Scores SURAKSHA's deterministic social / app detectors (or any injected predictor)
against adjudicated labels, so improvements can be measured instead of asserted.

Honesty rules enforced here:
  * Only adjudicated labels count: confirmed_impersonator is the positive class;
    official_verified and benign_unrelated are negatives. suspicious_unverified and
    unknown are reported but never scored.
  * The annotation file must pass validation (provenance, consistency, no split leakage).
  * Official and unrelated negatives are reported as separate subgroups, because an
    easy official-vs-fake task would hide false positives on ordinary accounts.
  * Too few examples => status "insufficient_data" and claims_allowed=false.
  * Default evaluation set is the frozen test split. Nothing here tunes on it.
  * Generic fake/bot probability is NOT a brand-impersonation score and is not used.

Usage:
    python -m backend.app.ml.impersonation_eval --kind social --annotations a.csv --registry r.csv
"""

import argparse
import json
import os
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional

import numpy as np
import pandas as pd

from backend.app.detection.app_detector import AppDetector
from backend.app.detection.social_detector import SocialDetector
from backend.app.ml.annotations import (
    NEGATIVE_LABELS,
    POSITIVE_LABEL,
    BrandRegistryEntry,
    assign_split,
    load_annotations,
    parse_registry,
    validate_annotations,
)
from backend.app.ml.url_eval import binary_metrics

MIN_PER_CLASS = 20
DEFAULT_THRESHOLD = 25.0  # rule-score "MEDIUM" boundary used by DetectionService; not tuned on any data
REPORT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "reports")

# predictor(record, brand_profile) -> {"score": float 0-100, "is_official": bool, "signals": [str]}
Predictor = Callable[[Dict[str, str], Dict[str, Any]], Dict[str, Any]]


def social_candidate(row: Dict[str, str]) -> Dict[str, Any]:
    urls = [u.strip() for u in (row.get("external_urls") or "").replace("|", ";").split(";") if u.strip()]
    return {
        "asset_type": "social",
        "candidate_name": (row.get("username") or "").strip(),
        "display_name": row.get("display_name", ""),
        "description": row.get("bio_text", ""),
        "source_url": row.get("profile_url", ""),
        "website_url": urls[0] if urls else "",
        "platform": row.get("platform", ""),
    }


def app_candidate(row: Dict[str, str]) -> Dict[str, Any]:
    return {
        "asset_type": "mobile_app",
        "candidate_name": row.get("app_title", ""),
        "package_id": row.get("package_or_bundle_id", ""),
        "publisher_name": row.get("publisher_or_seller", ""),
        "description": row.get("app_description", ""),
        "source_url": row.get("listing_url", ""),
        "platform": {"google play": "android", "play": "android", "app store": "ios"}.get(
            (row.get("store_name") or "").strip().lower(), (row.get("store_name") or "").strip().lower()),
    }


def rule_predictor(kind: str) -> Predictor:
    """The shipped deterministic detectors, used exactly as DetectionService uses them."""
    detector = SocialDetector() if kind == "social" else AppDetector()
    build = social_candidate if kind == "social" else app_candidate

    def predict(row: Dict[str, str], brand_profile: Dict[str, Any]) -> Dict[str, Any]:
        outcome = detector.evaluate_full(build(row), brand_profile)
        return {
            "score": float(outcome.risk_evaluation.total_score),
            "is_official": bool(outcome.is_official),
            "signals": [s.signal_type for s in outcome.risk_evaluation.signals],
        }

    return predict


def evaluate(
    frame: pd.DataFrame,
    kind: str,
    registry: Dict[str, BrandRegistryEntry],
    predictor: Optional[Predictor] = None,
    split: str = "test",
    threshold: float = DEFAULT_THRESHOLD,
    min_per_class: int = MIN_PER_CLASS,
    test_fraction: float = 0.3,
    n_boot: int = 1000,
) -> Dict[str, Any]:
    """Validate, select adjudicated rows from the requested split, predict and score."""
    validation = validate_annotations(frame, kind, registry=registry, test_fraction=test_fraction)
    report: Dict[str, Any] = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "kind": kind, "split": split, "threshold": threshold,
        "predictor": "rule_detectors" if predictor is None else getattr(predictor, "__name__", "custom"),
        "validation": {k: v for k, v in validation.to_dict().items() if k != "issues"},
        "validation_errors": [i.__dict__ for i in validation.errors][:50],
        "notes": [
            "Scores are uncalibrated rule-engine totals (0-100); threshold is fixed, not tuned.",
            "Negatives are split into official_verified and benign_unrelated subgroups.",
            "Labels are only as good as the review process; see docs/LABELING_PROTOCOL.md.",
        ],
    }
    if not validation.ok:
        report.update(status="invalid_annotations", claims_allowed=False,
                      message="Annotation file failed validation; no metrics computed.")
        return report

    frame = frame.fillna("").astype(str)
    skipped = frame[~frame["label"].isin({POSITIVE_LABEL, *NEGATIVE_LABELS})]
    report["not_scored"] = {str(k): int(v) for k, v in skipped["label"].replace("", "(unlabelled)").value_counts().items()}

    scored = frame[frame["label"].isin({POSITIVE_LABEL, *NEGATIVE_LABELS})].copy()
    scored["_split"] = scored["split_group"].map(lambda g: assign_split(g, test_fraction))
    report["split_sizes"] = {s: int((scored["_split"] == s).sum()) for s in ("train", "test")}
    if split != "all":
        scored = scored[scored["_split"] == split]

    if scored.empty:
        report.update(status="no_labelled_data", claims_allowed=False,
                      message=f"No adjudicated rows in split '{split}'. Annotate more candidates before evaluating.")
        return report

    predictor = predictor or rule_predictor(kind)
    rows: List[Dict[str, Any]] = []
    for _, r in scored.iterrows():
        row = {k: str(v).strip() for k, v in r.items()}
        entry = registry[row["brand_name"].lower()]
        pred = predictor(row, entry.to_brand_profile())
        flagged = (not pred["is_official"]) and pred["score"] >= threshold
        rows.append({"candidate_id": row["candidate_id"], "brand": row["brand_name"], "label": row["label"],
                     "score": pred["score"], "is_official_match": pred["is_official"], "flagged": flagged,
                     "signals": pred.get("signals", [])})
    res = pd.DataFrame(rows)

    pos = res[res["label"] == POSITIVE_LABEL]
    report["counts"] = {"positives": int(len(pos)), **{lab: int((res["label"] == lab).sum()) for lab in NEGATIVE_LABELS}}
    report["positives"] = {
        "n": int(len(pos)), "detected": int(pos["flagged"].sum()),
        "recall": round(float(pos["flagged"].mean()), 4) if len(pos) else None,
        "missed_candidate_ids": pos[~pos["flagged"]]["candidate_id"].tolist()[:25],
    }
    report["negative_subgroups"] = {}
    for lab in NEGATIVE_LABELS:
        grp = res[res["label"] == lab]
        report["negative_subgroups"][lab] = {
            "n": int(len(grp)), "false_positives": int(grp["flagged"].sum()),
            "false_positive_rate": round(float(grp["flagged"].mean()), 4) if len(grp) else None,
            "false_positive_candidate_ids": grp[grp["flagged"]]["candidate_id"].tolist()[:25],
            "excluded_by_official_match": int(grp["is_official_match"].sum()),
        }
    report["by_brand"] = {
        b: {"positives": int((g["label"] == POSITIVE_LABEL).sum()), "negatives": int((g["label"] != POSITIVE_LABEL).sum())}
        for b, g in res.groupby("brand")
    }

    negatives = res[res["label"].isin(NEGATIVE_LABELS)]
    enough = len(pos) >= min_per_class and len(negatives) >= min_per_class
    if len(pos) and len(negatives):
        y = np.r_[np.ones(len(pos)), np.zeros(len(negatives))]
        s = np.r_[pos["score"].to_numpy(), negatives["score"].to_numpy()]
        report["overall"] = binary_metrics(y, s, threshold=threshold, n_boot=n_boot)
    else:
        report["overall"] = None

    if enough:
        report.update(status="ok", claims_allowed=True)
    else:
        report.update(
            status="insufficient_data", claims_allowed=False,
            message=(f"Need at least {min_per_class} positives and {min_per_class} negatives in the '{split}' split "
                     f"(have {len(pos)} / {len(negatives)}). Figures below are for debugging only, not for claims."),
        )
    return report


def run(kind: str, annotations_path: str, registry_path: str, output: Optional[str] = None, **kwargs) -> Dict[str, Any]:
    registry = parse_registry(pd.read_csv(registry_path, dtype=str, keep_default_na=False))
    report = evaluate(load_annotations(annotations_path), kind, registry, **kwargs)
    report["annotations_path"] = os.path.relpath(annotations_path)
    out = output or os.path.join(REPORT_DIR, f"impersonation_eval_{kind}.json")
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    return report


if __name__ == "__main__":
    p = argparse.ArgumentParser(description="Evaluate brand-impersonation detection on annotated data")
    p.add_argument("--kind", choices=["social", "app"], required=True)
    p.add_argument("--annotations", required=True)
    p.add_argument("--registry", required=True)
    p.add_argument("--split", choices=["test", "train", "all"], default="test")
    p.add_argument("--threshold", type=float, default=DEFAULT_THRESHOLD)
    p.add_argument("--output")
    a = p.parse_args()
    rep = run(a.kind, a.annotations, a.registry, a.output, split=a.split, threshold=a.threshold)
    print(json.dumps({k: rep.get(k) for k in ("status", "claims_allowed", "message", "counts", "positives",
                                              "negative_subgroups", "overall")}, indent=2))
    if rep["status"] == "invalid_annotations":
        for issue in rep["validation_errors"][:20]:
            print(f"  [{issue['row']}] {issue['field']}: {issue['message']}")
        raise SystemExit(1)
