from urllib.parse import urlparse
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field

from backend.app.detection.base import DetectionSignal, RiskEvaluation, RiskScoreEngine, BaseDetector
from backend.app.detection.similarity import NameSimilarityService

@dataclass
class DetectionOutcome:
    """Consolidated outcome of evaluating a candidate asset."""
    is_official: bool
    exclusion_reason: Optional[str]
    risk_evaluation: RiskEvaluation
    evidence_records: List[Dict[str, Any]] = field(default_factory=list)

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
            if off_handle and norm_candidate_handle == off_handle and same_platform:
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
