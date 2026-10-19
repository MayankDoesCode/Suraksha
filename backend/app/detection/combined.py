"""
Advisory combined score with per-signal contributions.

This does NOT replace final_risk_score (which stays rule-based). It shows an analyst how a rule score plus
weak supporting observations add up, and exactly how much each input contributed, so nothing is a black box.
Inputs that were not collected contribute 0 and are listed as unavailable rather than guessed.
"""
from typing import Any, Dict, List, Optional

MAX_URL_MODEL_POINTS = 8.0   # supporting evidence only: capped well below any rule signal
DOMAIN_AGE_POINTS = ((7, 12.0), (30, 7.0), (90, 3.0))
TLS_POINTS = {"self_signed": 4.0, "fresh": 2.0}
MAX_PAGE_POINTS = 12.0
PAGE_MIN_SIMILARITY = 0.84  # perceptual-hash distance <= 10/64


def combine(rule_score: float, url_model_probability: Optional[float] = None, domain_age_days: Optional[int] = None,
            tls: Optional[Dict[str, Any]] = None, page_similarity: Optional[float] = None) -> Dict[str, Any]:
    contributions: List[Dict[str, Any]] = [{"source": "rules", "points": round(float(rule_score), 2), "basis": "deterministic rule engine"}]
    unavailable: List[str] = []

    if url_model_probability is None:
        unavailable.append("lexical URL model")
    else:
        pts = round(MAX_URL_MODEL_POINTS * max(0.0, min(1.0, (url_model_probability - 0.5) * 2)), 2)
        contributions.append({"source": "url_model", "points": pts, "basis": f"probability {url_model_probability:.2f}; scaled above 0.5 and capped at {MAX_URL_MODEL_POINTS:g}"})

    if domain_age_days is None:
        unavailable.append("domain age (RDAP)")
    else:
        pts = next((p for limit, p in DOMAIN_AGE_POINTS if domain_age_days <= limit), 0.0)
        contributions.append({"source": "domain_age", "points": pts, "basis": f"registered {domain_age_days} days ago"})

    if not tls:
        unavailable.append("TLS certificate")
    else:
        pts = TLS_POINTS["self_signed"] if tls.get("self_signed") else (TLS_POINTS["fresh"] if (tls.get("age_days") is not None and tls["age_days"] <= 3) else 0.0)
        contributions.append({"source": "tls", "points": pts, "basis": "self-signed" if tls.get("self_signed") else f"certificate age {tls.get('age_days')} days"})

    if page_similarity is None:
        unavailable.append("page visual similarity")
    else:
        pts = round(MAX_PAGE_POINTS * max(0.0, (page_similarity - PAGE_MIN_SIMILARITY) / (1 - PAGE_MIN_SIMILARITY)), 2) if page_similarity >= PAGE_MIN_SIMILARITY else 0.0
        contributions.append({"source": "page_similarity", "points": pts, "basis": f"visual similarity {page_similarity:.2f}"})

    total = round(min(100.0, sum(c["points"] for c in contributions)), 2)
    return {"combined_score": total, "contributions": contributions, "unavailable_inputs": unavailable,
            "note": "Advisory. final_risk_score and severity remain rule-based; supporting inputs add at most "
                    f"{MAX_URL_MODEL_POINTS + 12.0 + 4.0 + MAX_PAGE_POINTS:g} points."}
