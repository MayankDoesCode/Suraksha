from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field

from backend.app.detection.base import DetectionSignal, RiskEvaluation, RiskScoreEngine, BaseDetector
from backend.app.detection.similarity import NameSimilarityService
from backend.app.detection.social_detector import DetectionOutcome

class AppDetector(BaseDetector):
    """
    Evaluates suspicious candidate mobile applications against verified brand assets.
    Detects copycat apps, package ID mimicry, and unauthorized developer uploads.
    """

    def evaluate(self, candidate: Dict[str, Any], brand_profile: Dict[str, Any]) -> List[DetectionSignal]:
        """BaseDetector interface implementation."""
        outcome = self.evaluate_full(candidate, brand_profile)
        return outcome.risk_evaluation.signals

    def evaluate_full(self, candidate: Dict[str, Any], brand_profile: Dict[str, Any]) -> DetectionOutcome:
        """
        Comprehensive mobile app evaluation checking official exclusions,
        package signatures, and publisher authentication.
        """
        brand_name = brand_profile.get("name", "")
        official_apps = brand_profile.get("app_identifiers", [])
        official_publishers = [p.get("publisher_name", "").strip().lower() for p in brand_profile.get("publishers", []) if p.get("publisher_name")]

        app_title = candidate.get("candidate_name") or candidate.get("app_name") or ""
        candidate_package = (candidate.get("package_id") or candidate.get("identifier") or "").strip().lower()
        candidate_publisher = (candidate.get("publisher_name") or candidate.get("developer") or "").strip()
        candidate_desc = candidate.get("description") or ""
        candidate_platform = (candidate.get("platform") or "").lower()
        candidate_url = candidate.get("source_url") or ""

        # -------------------------------------------------------------
        # 1. Official App Exclusion Check
        # -------------------------------------------------------------
        for off_app in official_apps:
            off_identifier = (off_app.get("identifier") or "").strip().lower()
            off_platform = (off_app.get("platform") or "").lower()

            same_platform = not candidate_platform or not off_platform or (candidate_platform == off_platform)

            if off_identifier and candidate_package and off_identifier == candidate_package and same_platform:
                return DetectionOutcome(
                    is_official=True,
                    exclusion_reason=(
                        f"Exact match against verified official mobile app package ID '{off_app.get('identifier')}' "
                        f"({off_app.get('platform') or 'global'})."
                    ),
                    risk_evaluation=RiskEvaluation(total_score=0.0, severity="LOW", signals=[])
                )

        # -------------------------------------------------------------
        # 2. Signal Generation (Candidate is not official)
        # -------------------------------------------------------------
        signals: List[DetectionSignal] = []
        evidence: List[Dict[str, Any]] = []

        # Signal A: App Title Similarity
        best_title_sim = NameSimilarityService.compare(app_title, brand_name)
        for off_app in official_apps:
            if off_app.get("app_name"):
                app_sim = NameSimilarityService.compare(app_title, off_app.get("app_name"))
                if app_sim.similarity_score > best_title_sim.similarity_score:
                    best_title_sim = app_sim

        if best_title_sim.similarity_score >= 0.70:
            score_impact = min(50.0, round(best_title_sim.similarity_score * 45.0, 1))
            signals.append(
                DetectionSignal(
                    signal_type="APP_TITLE_SIMILARITY",
                    severity_score=score_impact,
                    confidence=0.90,
                    explanation=best_title_sim.explanation,
                    evidence_fields=["app_title", "similarity_score"]
                )
            )
            evidence.append({
                "evidence_type": "app_title_similarity",
                "description": (
                    f"Application title '{app_title}' closely resembles verified brand '{brand_name}' "
                    f"({best_title_sim.similarity_score:.2f} score)."
                ),
                "source_reference": candidate_url or None,
            })

        # Signal B: Package ID Mimicry / Mismatch
        brand_compact = NameSimilarityService.normalize_compact(brand_name)
        package_has_brand = brand_compact and brand_compact in candidate_package.replace(".", "").replace("_", "")

        if candidate_package and official_apps and package_has_brand:
            # Package ID clearly embeds brand name but failed exact official match
            official_ids_str = ", ".join(a.get("identifier", "") for a in official_apps)
            signals.append(
                DetectionSignal(
                    signal_type="PACKAGE_ID_MISMATCH",
                    severity_score=40.0,
                    confidence=0.95,
                    explanation=(
                        f"Candidate package ID '{candidate_package}' mimics brand identity '{brand_name}' "
                        f"but does not match verified official package ID(s): [{official_ids_str}]."
                    ),
                    evidence_fields=["candidate_package", "verified_packages"]
                )
            )
            evidence.append({
                "evidence_type": "package_identifier_audit",
                "description": f"Unverified package identifier observed: {candidate_package}",
                "source_reference": candidate_package,
            })

        # Signal C: Developer / Publisher Mismatch
        # Rule: A publisher mismatch alone is not proof of impersonation.
        # Missing information must NOT be treated as a confirmed mismatch.
        if candidate_publisher and official_publishers:
            cand_pub_norm = candidate_publisher.lower()
            is_pub_verified = any(
                cand_pub_norm == off_pub or cand_pub_norm in off_pub or off_pub in cand_pub_norm
                for off_pub in official_publishers
            )

            # Only flag publisher mismatch if there is also title similarity OR package mimicry
            has_brand_association = (best_title_sim.similarity_score >= 0.65 or package_has_brand)
            if not is_pub_verified and has_brand_association:
                signals.append(
                    DetectionSignal(
                        signal_type="PUBLISHER_MISMATCH",
                        severity_score=35.0,
                        confidence=0.85,
                        explanation=(
                            f"Developer/Publisher '{candidate_publisher}' does not match registered "
                            f"authorized publisher signature(s): [{', '.join(official_publishers)}]."
                        ),
                        evidence_fields=["candidate_publisher", "official_publishers"]
                    )
                )
                evidence.append({
                    "evidence_type": "publisher_verification",
                    "description": f"Unauthorized developer account publishing brand-related software: {candidate_publisher}",
                    "source_reference": candidate_publisher,
                })

        # Signal D: App Description Impersonation
        if candidate_desc and best_title_sim.similarity_score >= 0.60:
            desc_keywords = NameSimilarityService.extract_suspicious_keywords(candidate_desc)
            if desc_keywords:
                signals.append(
                    DetectionSignal(
                        signal_type="DESCRIPTION_IMPERSONATION",
                        severity_score=20.0,
                        confidence=0.80,
                        explanation=(
                            f"Listing description asserts brand authority using keyword(s): {desc_keywords}."
                        ),
                        evidence_fields=["description_keywords"]
                    )
                )
                evidence.append({
                    "evidence_type": "app_listing_description",
                    "description": f"Description contains authority keywords: {', '.join(desc_keywords)}",
                    "source_reference": candidate_url or None,
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
