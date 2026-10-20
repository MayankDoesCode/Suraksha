import re
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field

from backend.app.detection.base import DetectionSignal, RiskEvaluation, RiskScoreEngine, BaseDetector
from backend.app.detection.similarity import NameSimilarityService
from backend.app.detection import visual
from backend.app.detection.text_similarity import cosine_similarity
from backend.app.detection.social_detector import DetectionOutcome

_GENERIC_BRAND_WORDS = {
    "bank", "banking", "pay", "payments", "payment", "app", "group", "official", "india", "limited",
    "ltd", "technologies", "technology", "finance", "financial", "mobile", "wallet", "online", "digital",
    "services", "service", "global", "international", "company", "corp", "corporation", "inc", "store",
    "shop", "money", "card", "cards", "insurance", "capital", "holdings",
}


def _distinctive_brand_tokens(brand_name: str) -> List[str]:
    """Brand words specific enough to be a signal on their own ('acme' yes, 'bank' no)."""
    words = NameSimilarityService.normalize_text(brand_name).split()
    return [w for w in words if len(w) >= 4 and w not in _GENERIC_BRAND_WORDS]


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

        # Verified publisher family: same publisher AND package inside an official namespace
        # (e.g. official com.acme.bank -> com.acme.wallet by the same publisher). Package
        # namespace alone is not trusted because package names are first-come on stores.
        cand_pub_norm = candidate_publisher.strip().lower()
        if candidate_package and cand_pub_norm and cand_pub_norm in official_publishers:
            for off_app in official_apps:
                parts = (off_app.get("identifier") or "").strip().lower().split(".")
                if len(parts) >= 3:
                    namespace = ".".join(parts[:2])
                    if candidate_package.startswith(namespace + "."):
                        return DetectionOutcome(
                            is_official=True,
                            exclusion_reason=(
                                f"Package '{candidate_package}' is in verified namespace '{namespace}' "
                                f"and published by registered publisher '{candidate_publisher}'."
                            ),
                            risk_evaluation=RiskEvaluation(total_score=0.0, severity="LOW", signals=[])
                        )

        icon_ref = candidate.get("icon_url") or candidate.get("icon") or candidate.get("image_url")
        icon_result = visual.compare_to_brand_logo(icon_ref, brand_profile)
        icon_sim = icon_result.similarity if icon_result.available else 0.0
        icon_match = icon_result.available and icon_sim >= visual.MATCH_LIKELY

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

        brand_tokens = _distinctive_brand_tokens(brand_name)
        title_tokens = set(NameSimilarityService.normalize_text(app_title).split())
        title_has_token = any(t in title_tokens for t in brand_tokens)

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
        package_has_brand = bool(brand_compact and brand_compact in candidate_package.replace(".", "").replace("_", "")) or any(
            seg.startswith(t) for t in brand_tokens for seg in re.split(r"[._]", candidate_package) if seg
        )

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
            has_brand_association = (best_title_sim.similarity_score >= 0.65 or package_has_brand or icon_match or title_has_token)
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

        # Signal D2: Brand's distinctive word reused in the title with extra words ("Acme Rewards")
        pub_verified = bool(candidate_publisher) and candidate_publisher.strip().lower() in official_publishers
        if title_has_token and best_title_sim.similarity_score < 0.70 and not pub_verified:
            signals.append(
                DetectionSignal(
                    signal_type="BRAND_WORD_IN_TITLE",
                    severity_score=30.0,
                    confidence=0.80,
                    explanation=(
                        f"App title '{app_title}' reuses the brand's distinctive word(s) "
                        f"{sorted(t for t in brand_tokens if t in title_tokens)} but the developer is not an authorized publisher."
                    ),
                    evidence_fields=["app_title", "brand_tokens"]
                )
            )

        # Signal E: App icon similarity to the official logo
        if icon_match:
            strong = icon_sim >= visual.MATCH_STRONG
            signals.append(
                DetectionSignal(
                    signal_type="ICON_SIMILARITY",
                    severity_score=45.0 if strong else 30.0,
                    confidence=0.90 if strong else 0.80,
                    explanation=(
                        f"App icon is {'nearly identical' if strong else 'visually very similar'} to the "
                        f"brand's official logo (visual similarity {icon_sim:.0%})."
                    ),
                    evidence_fields=["icon_url", "icon_similarity"]
                )
            )
            evidence.append({
                "evidence_type": "icon_similarity",
                "description": f"App icon matches official logo at {icon_sim:.0%} perceptual similarity.",
                "source_reference": candidate_url or None,
            })
        elif icon_ref and not icon_result.available:
            evidence.append({
                "evidence_type": "visual_check_unavailable",
                "description": f"Icon comparison skipped: {icon_result.reason}",
                "source_reference": candidate_url or None,
            })

        # Signal F: Listing description resembles the brand's own description / claims the brand
        if candidate_desc:
            reference_text = " ".join(
                [brand_profile.get("description") or "", brand_name]
                + [a.get("app_name") or "" for a in official_apps]
            )
            desc_sim = cosine_similarity(candidate_desc, reference_text)
            brand_compact = NameSimilarityService.normalize_compact(brand_name)
            names_brand = len(brand_compact) >= 4 and brand_compact in NameSimilarityService.normalize_compact(candidate_desc)
            publisher_ok = bool(candidate_publisher) and candidate_publisher.strip().lower() in official_publishers
            if not publisher_ok and (desc_sim >= 0.45 or (names_brand and (best_title_sim.similarity_score >= 0.5 or icon_match))):
                signals.append(
                    DetectionSignal(
                        signal_type="DESCRIPTION_SIMILARITY",
                        severity_score=30.0 if desc_sim >= 0.60 else 20.0,
                        confidence=0.75,
                        explanation=(
                            f"Listing description resembles the brand's own wording (text similarity {desc_sim:.0%})"
                            + (" and names the brand while the developer is not an authorized publisher." if names_brand else ".")
                        ),
                        evidence_fields=["description", "description_similarity"]
                    )
                )
                evidence.append({
                    "evidence_type": "description_similarity",
                    "description": f"Description text similarity to brand profile: {desc_sim:.0%}.",
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
