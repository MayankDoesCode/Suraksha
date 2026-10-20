from urllib.parse import urlparse
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field

from backend.app.detection.base import DetectionSignal, RiskEvaluation, RiskScoreEngine, BaseDetector
from backend.app.detection.similarity import NameSimilarityService
from backend.app.detection import visual

@dataclass
class DetectionOutcome:
    """Consolidated outcome of evaluating a candidate asset."""
    is_official: bool
    exclusion_reason: Optional[str]
    risk_evaluation: RiskEvaluation
    evidence_records: List[Dict[str, Any]] = field(default_factory=list)

_SCAM_CUE_PATTERNS = [
    ("OTP request", r"\botp\b"),
    ("refund/claim lure", r"\b(refund|claim|reward|cashback|lottery|giveaway|prize)\b"),
    ("KYC/verification lure", r"\b(kyc|verify your|update your|account (blocked|suspended))\b"),
    ("off-platform contact", r"(wa\.me|t\.me|whatsapp|telegram|dm (us|me)|inbox us)"),
    ("shortened link", r"(bit\.ly|tinyurl|cutt\.ly|rb\.gy|shorturl)"),
    ("phone number", r"(\+?\d[\d\s-]{8,}\d)"),
    ("urgency", r"\b(urgent|immediately|limited time|act now)\b"),
]


def _find_scam_cues(text: str) -> List[str]:
    import re
    low = (text or "").lower()
    return [name for name, pat in _SCAM_CUE_PATTERNS if re.search(pat, low)]


class SocialDetector(BaseDetector):
    """
    Evaluates suspicious candidate social profiles and pages against verified brand assets.
    Excludes registered official assets and flags impersonation patterns.
    """

    def evaluate(self, candidate: Dict[str, Any], brand_profile: Dict[str, Any]) -> List[DetectionSignal]:
        """BaseDetector interface implementation."""
        outcome = self.evaluate_full(candidate, brand_profile)
        return outcome.risk_evaluation.signals

    def evaluate_full(self, candidate: Dict[str, Any], brand_profile: Dict[str, Any]) -> DetectionOutcome:
        """
        Comprehensive evaluation checking for official exclusions, signal calculation,
        and evidence compilation.
        """
        brand_name = brand_profile.get("name", "")
        official_handles = brand_profile.get("social_handles", [])
        official_domains = [d.get("domain", "").lower() for d in brand_profile.get("domains", [])]

        candidate_name = candidate.get("candidate_name") or candidate.get("handle") or ""
        display_name = candidate.get("display_name") or ""
        candidate_url = candidate.get("source_url") or candidate.get("profile_url") or ""
        candidate_platform = (candidate.get("platform") or "").lower()
        bio_website = candidate.get("website_url") or candidate.get("website") or ""

        norm_candidate_handle = NameSimilarityService.normalize_compact(candidate_name)

        # -------------------------------------------------------------
        # 1. Official Asset Exclusion Check
        # -------------------------------------------------------------
        for handle_obj in official_handles:
            off_handle = NameSimilarityService.normalize_compact(handle_obj.get("handle", ""))
            off_platform = (handle_obj.get("platform") or "").lower()
            off_url = (handle_obj.get("url") or "").rstrip("/").lower()
            cand_url_norm = candidate_url.rstrip("/").lower()

            # Exact handle match (on same platform or platform unspecified)
            same_platform = not candidate_platform or not off_platform or (candidate_platform == off_platform)
            # Exact handle only: "acme_bank" / "acme.bank" / "acme bank" collapse to the same compact
            # form as the official "acmebank" but are DIFFERENT accounts (classic spacing lookalikes).
            raw_cand = candidate_name.strip().lstrip("@").lower()
            raw_off = (handle_obj.get("handle") or "").strip().lstrip("@").lower()
            if off_handle and raw_cand == raw_off and same_platform:
                return DetectionOutcome(
                    is_official=True,
                    exclusion_reason=(
                        f"Exact match against verified official social handle '@{handle_obj.get('handle')}' "
                        f"({handle_obj.get('platform') or 'global'})."
                    ),
                    risk_evaluation=RiskEvaluation(total_score=0.0, severity="LOW", signals=[])
                )

            # Exact URL match
            if off_url and cand_url_norm and off_url == cand_url_norm:
                return DetectionOutcome(
                    is_official=True,
                    exclusion_reason=(
                        f"Exact match against verified official profile URL: {handle_obj.get('url')}."
                    ),
                    risk_evaluation=RiskEvaluation(total_score=0.0, severity="LOW", signals=[])
                )

        # -------------------------------------------------------------
        # 2. Signal Generation (Candidate is not an official asset)
        # -------------------------------------------------------------
        signals: List[DetectionSignal] = []
        evidence: List[Dict[str, Any]] = []

        # Signal A: Name & Handle Similarity
        # Compare against brand name and official handles to find strongest similarity
        best_sim = NameSimilarityService.compare(candidate_name, brand_name)
        if display_name:
            disp_sim = NameSimilarityService.compare(display_name, brand_name)
            if disp_sim.similarity_score > best_sim.similarity_score:
                best_sim = disp_sim

        for handle_obj in official_handles:
            h_sim = NameSimilarityService.compare(candidate_name, handle_obj.get("handle", ""))
            if h_sim.similarity_score > best_sim.similarity_score:
                best_sim = h_sim

        # Evaluate similarity threshold
        if best_sim.similarity_score >= 0.70:
            # Score proportional to similarity (scaled 30.0 - 55.0)
            score_impact = min(55.0, round(best_sim.similarity_score * 50.0, 1))
            signals.append(
                DetectionSignal(
                    signal_type="NAME_SIMILARITY",
                    severity_score=score_impact,
                    confidence=0.90,
                    explanation=best_sim.explanation,
                    evidence_fields=["candidate_name", "similarity_score", "match_type"]
                )
            )
            evidence.append({
                "evidence_type": "name_similarity_analysis",
                "description": (
                    f"Candidate '{candidate_name}' matched brand '{brand_name}' with score "
                    f"{best_sim.similarity_score:.2f} ({best_sim.match_type}). {best_sim.explanation}"
                ),
                "source_reference": candidate_url or None,
            })

        # Signal B: Impersonation / Trust Keyword Appending
        # e.g., 'support', 'help', 'official', 'care'
        all_text = f"{candidate_name} {display_name}"
        detected_keywords = NameSimilarityService.extract_suspicious_keywords(all_text)
        if detected_keywords and best_sim.similarity_score >= 0.50:
            signals.append(
                DetectionSignal(
                    signal_type="IMPERSONATION_KEYWORDS",
                    severity_score=35.0,
                    confidence=0.95,
                    explanation=(
                        f"Candidate incorporates high-risk trust-inducing keyword(s): "
                        f"{detected_keywords} to simulate authorized customer support."
                    ),
                    evidence_fields=["detected_keywords"]
                )
            )
            evidence.append({
                "evidence_type": "keyword_impersonation",
                "description": f"Detected trust mimicry keywords: {', '.join(detected_keywords)}",
                "source_reference": candidate_url or None,
            })

        # Signal C: External Website / Domain Mismatch
        if bio_website:
            parsed = urlparse(bio_website if "://" in bio_website else f"http://{bio_website}")
            bio_domain = (parsed.netloc or parsed.path).lower().split(":")[0]
            if bio_domain.startswith("www."):
                bio_domain = bio_domain[4:]

            # Check if domain matches any verified brand domain
            is_domain_verified = any(
                bio_domain == v_domain or bio_domain.endswith(f".{v_domain}")
                for v_domain in official_domains
            )

            if not is_domain_verified and official_domains and best_sim.similarity_score >= 0.50:
                signals.append(
                    DetectionSignal(
                        signal_type="DOMAIN_MISMATCH",
                        severity_score=35.0,
                        confidence=0.85,
                        explanation=(
                            f"Profile links to unverified external domain '{bio_domain}' which does not "
                            f"match registered official domains ({', '.join(official_domains)})."
                        ),
                        evidence_fields=["bio_website", "unverified_domain"]
                    )
                )
                evidence.append({
                    "evidence_type": "external_destination_link",
                    "description": f"External link redirects to unverified destination: {bio_website}",
                    "source_reference": bio_website,
                })

        # Signal D: Avatar / logo similarity to the official brand logo
        avatar_ref = (
            candidate.get("avatar_url") or candidate.get("avatar")
            or candidate.get("profile_image_url") or candidate.get("image_url")
        )
        visual_result = visual.compare_to_brand_logo(avatar_ref, brand_profile)
        logo_sim = visual_result.similarity if visual_result.available else 0.0
        if visual_result.available and logo_sim >= visual.MATCH_LIKELY:
            strong = logo_sim >= visual.MATCH_STRONG
            signals.append(
                DetectionSignal(
                    signal_type="LOGO_SIMILARITY",
                    severity_score=45.0 if strong else 30.0,
                    confidence=0.90 if strong else 0.80,
                    explanation=(
                        f"Profile image is {'nearly identical' if strong else 'visually very similar'} "
                        f"to the brand's official logo (visual similarity {logo_sim:.0%})."
                    ),
                    evidence_fields=["avatar_url", "logo_similarity"]
                )
            )
            evidence.append({
                "evidence_type": "logo_similarity",
                "description": f"Avatar matches official logo at {logo_sim:.0%} perceptual similarity.",
                "source_reference": candidate_url or None,
            })
        elif avatar_ref and not visual_result.available:
            evidence.append({
                "evidence_type": "visual_check_unavailable",
                "description": f"Logo comparison skipped: {visual_result.reason}",
                "source_reference": candidate_url or None,
            })

        bio_text = " ".join(str(candidate.get(k) or "") for k in ("bio", "description", "about"))
        brand_compact = NameSimilarityService.normalize_compact(brand_name)
        brand_in_text = len(brand_compact) >= 4 and brand_compact in NameSimilarityService.normalize_compact(
            f"{bio_text} {display_name}"
        )
        associated = best_sim.similarity_score >= 0.50 or logo_sim >= visual.MATCH_LIKELY or brand_in_text

        # Signal E: Scam cues in the bio (only when the profile is brand-associated)
        scam_cues = _find_scam_cues(f"{bio_text} {display_name}")
        if scam_cues and associated:
            signals.append(
                DetectionSignal(
                    signal_type="SCAM_CUES",
                    severity_score=min(40.0, 15.0 * len(scam_cues)),
                    confidence=0.85,
                    explanation=(
                        "Brand-associated profile uses scam-style wording / contact channels: "
                        + ", ".join(scam_cues) + "."
                    ),
                    evidence_fields=["bio", "scam_cues"]
                )
            )
            evidence.append({
                "evidence_type": "scam_language",
                "description": f"Scam cues in profile text: {', '.join(scam_cues)}",
                "source_reference": candidate_url or None,
            })

        # Signal F: Brand-associated but brand-new, unverified account
        age_days = candidate.get("account_age_days")
        if (associated and candidate.get("is_verified") is not True
                and isinstance(age_days, (int, float)) and age_days < 90):
            signals.append(
                DetectionSignal(
                    signal_type="NEW_UNVERIFIED_ACCOUNT",
                    severity_score=15.0,
                    confidence=0.80,
                    explanation=f"Account is only {int(age_days)} days old and not verified, yet uses brand identity.",
                    evidence_fields=["account_age_days", "is_verified"]
                )
            )

        # -------------------------------------------------------------
        # 3. Explainable Risk Score Aggregation
        # -------------------------------------------------------------
        risk_evaluation = RiskScoreEngine.calculate_risk(signals)

        return DetectionOutcome(
            is_official=False,
            exclusion_reason=None,
            risk_evaluation=risk_evaluation,
            evidence_records=evidence
        )
