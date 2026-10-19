import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from backend.app.repositories.brand_repository import BrandRepository
from backend.app.repositories.threat_repository import ThreatRepository
from backend.app.services.detection_service import DetectionService
from backend.app.detection.similarity import (
    NameSimilarityService,
    levenshtein_distance,
    SUSPICIOUS_KEYWORDS,
    LEET_MAP,
)
from backend.app.detection.domain_detector import (
    extract_domain_components,
    HIGH_RISK_TLDS,
    PHISHING_INTENT_KEYWORDS,
)
from backend.app.utils.errors import NotFoundError, ValidationError

logger = logging.getLogger(__name__)


class WatchtowerService:
    """
    Brand Impersonation Watchtower and Explainable AI Service.
    
    Guarantees:
    1. Compares candidate entities directly against registered official brand assets.
    2. Generates explainable, deterministic similarity signals and risk indicators.
    3. Clearly distinguishes interactive on-demand scans from scheduled batch collection.
    4. Provides 3-tier epistemic separation: Observed Facts vs Model Inferences vs Unverified Claims.
    5. Recommends evidence-based next investigative steps with zero auto-confirmation.
    6. Reuses existing database models and repositories without schema disruption.
    """

    def __init__(
        self,
        brand_repo: Optional[BrandRepository] = None,
        threat_repo: Optional[ThreatRepository] = None,
        detection_service: Optional[DetectionService] = None,
    ):
        self.brand_repo = brand_repo or BrandRepository()
        self.threat_repo = threat_repo or ThreatRepository()
        self.detection_service = detection_service or DetectionService(
            brand_repo=self.brand_repo,
            threat_repo=self.threat_repo,
        )

    def evaluate_watchtower(
        self,
        brand_id: str,
        candidate_data: Dict[str, Any],
        scan_mode: str = "scan_on_demand",
        persist_to_investigation: bool = False,
    ) -> Dict[str, Any]:
        """
        Evaluate candidate domain, social profile, or app against registered brand assets.
        Returns comprehensive watchtower comparison, explainable similarity signals,
        epistemic breakdown, and optional routed finding ID.
        """
        brand = self.brand_repo.get_by_id(brand_id)
        if not brand:
            raise NotFoundError(f"Brand with ID '{brand_id}' not found.")

        brand_dict = brand.to_dict(include_relations=True)
        brand_name = brand.name
        candidate_name = (
            candidate_data.get("candidate_name")
            or candidate_data.get("candidate_identifier")
            or candidate_data.get("identifier")
            or candidate_data.get("handle")
            or candidate_data.get("domain")
            or candidate_data.get("app_name")
            or ""
        ).strip()

        if not candidate_name:
            raise ValidationError("Candidate identifier or domain name is required.")

        asset_type = (
            candidate_data.get("asset_type")
            or candidate_data.get("candidate_type")
            or candidate_data.get("type")
            or "domain"
        ).lower().strip()
        source_url = candidate_data.get("source_url") or candidate_data.get("url") or candidate_data.get("profile_url")
        now_iso = datetime.now(timezone.utc).isoformat()

        # 1. Registered Assets Inventory Extraction
        official_domains = [d.get("domain", "").lower() for d in brand_dict.get("domains", []) if d.get("domain")]
        official_socials = [
            f"@{s.get('handle', '').lstrip('@').lower()}"
            for s in brand_dict.get("social_handles", [])
            if s.get("handle")
        ]
        official_apps = [
            a.get("identifier", "").lower()
            for a in brand_dict.get("app_identifiers", [])
            if a.get("identifier")
        ]
        official_publishers = [
            p.get("publisher_name", "").lower()
            for p in brand_dict.get("publishers", [])
            if p.get("publisher_name")
        ]

        # 2. Detailed Similarity & Asset Comparison Calculation
        comparison_breakdown = self._compare_with_registered_assets(
            candidate_name=candidate_name,
            asset_type=asset_type,
            brand_name=brand_name,
            official_domains=official_domains,
            official_socials=official_socials,
            official_apps=official_apps,
            official_publishers=official_publishers,
        )

        # 3. Standard Detection Pipeline Execution (Hybrid Rules + ML)
        eval_payload = {
            "candidate_name": candidate_name,
            "asset_type": asset_type,
            "source_url": source_url,
            "detection_source": candidate_data.get("detection_source", "brand_watchtower"),
            "is_sample": candidate_data.get("is_sample", False),
            **candidate_data,
        }

        detection_result = self.detection_service.evaluate_candidate(
            brand_id=brand_id,
            candidate_data=eval_payload,
            persist=persist_to_investigation,
        )

        is_official = detection_result.get("is_official", False)
        risk_score = float(detection_result.get("risk_score", 0.0))
        severity = detection_result.get("severity", "LOW")
        signals = detection_result.get("signals", [])
        evidence = detection_result.get("evidence", [])

        # 4. Determine Detection Method & Provenance
        ml_version = detection_result.get("ml_model_version")
        ml_fallback = detection_result.get("ml_fallback_used", False)
        ml_score = detection_result.get("ml_risk_score")
        ml_confidence = detection_result.get("ml_confidence")

        if is_official:
            detection_method = "Verified Brand Allowlist Rule"
            verification_status = "Allowlisted Official Asset"
        elif ml_version and not ml_fallback and ml_score is not None:
            detection_method = f"Hybrid Fusion (ML v{ml_version} + Heuristics)"
            verification_status = "Candidate Threat (Pending Verification)"
        else:
            detection_method = "Deterministic Heuristic Engine"
            verification_status = "Candidate Threat (Pending Verification)"

        # 5. Three-Tier Epistemic Separation (Facts vs Inferences vs Unverified)
        epistemic_breakdown = self._build_epistemic_breakdown(
            candidate_name=candidate_name,
            asset_type=asset_type,
            brand_name=brand_name,
            source_url=source_url,
            comparison=comparison_breakdown,
            detection_result=detection_result,
        )

        # 6. Evidence-Based Next Investigative Steps
        recommended_steps = self._generate_investigative_steps(
            asset_type=asset_type,
            is_official=is_official,
            risk_score=risk_score,
            comparison=comparison_breakdown,
        )

        # 7. Explicit Scan Mode Clarification (Requirement 7)
        mode_normalized = "scheduled_continuous_monitoring" if scan_mode == "continuous" or scan_mode == "scheduled" else "scan_on_demand"
        mode_clarification = (
            "Scan on Demand: Real-time on-demand evaluation executed via analyst request. Does not simulate streaming."
            if mode_normalized == "scan_on_demand"
            else "Continuous Monitoring: Periodic scheduled collection cycle executed on configured batch intervals."
        )

        routed_finding_id = None
        if persist_to_investigation and detection_result.get("finding"):
            routed_finding_id = detection_result["finding"].get("id")

        # Aliases for frontend compatibility
        homoglyphs_detected = comparison_breakdown.get("homoglyphs_detected", False)
        canonical_name = comparison_breakdown.get("canonical_name", candidate_name)
        reasons = [s.get("explanation") for s in signals if s.get("explanation")]
        if not reasons:
            reasons = [comparison_breakdown.get("notes") or "Perimeter similarity evaluation complete."]

        similarity_metrics = {
            "exact_match": comparison_breakdown.get("is_exact_match", False),
            "levenshtein_distance": comparison_breakdown.get("levenshtein_distance", 0),
            "normalized_similarity": comparison_breakdown.get("normalized_similarity", 0.0),
            "homoglyph_detected": homoglyphs_detected,
            "homoglyph_details": {
                "canonical": canonical_name,
                "original": candidate_name,
                "substitutions_detected": 1 if homoglyphs_detected else 0,
            },
            "brand_contained": comparison_breakdown.get("brand_contained", False),
            "suspicious_tld": comparison_breakdown.get("suspicious_tld", False),
            "tld": comparison_breakdown.get("tld", ""),
        }

        risk_indicators = {
            "risk_level": severity,
            "risk_score": risk_score,
            "reasons": reasons,
        }

        explanation = {
            "observed_facts": epistemic_breakdown.get("observed_facts", []),
            "model_inferences": epistemic_breakdown.get("model_inferences", []),
            "unverified_claims": epistemic_breakdown.get("unverified_claims", []),
            "recommended_next_steps": recommended_steps,
        }

        return {
            "success": True,
            "brand_id": brand_id,
            "brand_name": brand_name,
            "candidate_name": candidate_name,
            "candidate_identifier": candidate_name,
            "asset_type": asset_type,
            "candidate_type": asset_type,
            "matched_asset": comparison_breakdown.get("matched_official_asset") or brand_name,
            "source_url": source_url,
            "source": candidate_data.get("source") or candidate_data.get("detection_source") or "similarity_engine",
            "observation_time": now_iso,
            "observation_timestamp": now_iso,
            "is_official": is_official,
            "is_official_asset": is_official,
            "exclusion_reason": detection_result.get("exclusion_reason"),
            "risk_score": risk_score,
            "severity": severity,
            "detection_method": detection_method,
            "verification_status": verification_status,
            "scan_mode": mode_normalized,
            "scan_mode_clarification": mode_clarification,
            "registered_assets_scope": {
                "domains_count": len(official_domains),
                "domains": official_domains,
                "social_handles_count": len(official_socials),
                "social_handles": official_socials,
                "apps_count": len(official_apps),
                "apps": official_apps,
            },
            "comparison": comparison_breakdown,
            "similarity_metrics": similarity_metrics,
            "risk_indicators": risk_indicators,
            "signals": signals,
            "evidence": evidence,
            "epistemic_breakdown": epistemic_breakdown,
            "explanation": explanation,
            "recommended_steps": recommended_steps,
            "routed_to_investigation": persist_to_investigation,
            "finding_id": routed_finding_id,
            "auto_confirmed": False,
        }

    def explain_finding_by_id(self, finding_id: str) -> Dict[str, Any]:
        """
        Build full explainability dossier for an existing persisted finding in the database.
        """
        finding = self.threat_repo.get_by_id(finding_id)
        if not finding:
            raise NotFoundError(f"Finding with ID '{finding_id}' not found.")

        brand = finding.brand
        brand_name = brand.name if brand else "Monitored Brand"
        brand_id = finding.brand_id

        brand_dict = brand.to_dict(include_relations=True) if brand else {}
        official_domains = [d.get("domain", "").lower() for d in brand_dict.get("domains", []) if d.get("domain")]
        official_socials = [
            f"@{s.get('handle', '').lstrip('@').lower()}"
            for s in brand_dict.get("social_handles", [])
            if s.get("handle")
        ]
        official_apps = [
            a.get("identifier", "").lower()
            for a in brand_dict.get("app_identifiers", [])
            if a.get("identifier")
        ]
        official_publishers = [
            p.get("publisher_name", "").lower()
            for p in brand_dict.get("publishers", [])
            if p.get("publisher_name")
        ]

        comparison = self._compare_with_registered_assets(
            candidate_name=finding.candidate_name,
            asset_type=finding.asset_type,
            brand_name=brand_name,
            official_domains=official_domains,
            official_socials=official_socials,
            official_apps=official_apps,
            official_publishers=official_publishers,
        )

        signals_dict = [s.to_dict() for s in finding.signals]
        evidence_dict = [e.to_dict() for e in finding.evidence]

        epistemic = {
            "observed_facts": [
                f"Candidate entity: '{finding.candidate_name}' ({finding.asset_type})",
                f"Observation timestamp: {finding.observed_at.isoformat() if finding.observed_at else 'Active'}",
                f"Detection source connector: {finding.detection_source}",
                f"Target protected brand profile: '{brand_name}' ({len(official_domains)} domains, {len(official_socials)} handles)",
            ],
            "model_inferences": [],
            "unverified_claims": [
                "Server operator identity and command-and-control ownership remain unverified.",
                "Registrar abuse resolution is pending external hosting provider response.",
                "Automated classification is strictly advisory; human analyst confirmation required.",
            ],
        }

        if finding.source_url:
            epistemic["observed_facts"].append(f"Recorded resource URL: {finding.source_url}")

        if finding.rule_based_score is not None:
            epistemic["model_inferences"].append(
                f"Deterministic heuristic score: {finding.rule_based_score}/100 based on trademark token patterns."
            )

        if finding.ml_risk_score is not None and not finding.ml_fallback_used:
            conf_str = f" with {int(finding.ml_confidence * 100)}% confidence" if finding.ml_confidence is not None else ""
            epistemic["model_inferences"].append(
                f"Machine Learning model (v{finding.ml_model_version or '1.0'}) predicted {finding.ml_predicted_class or 'SUSPICIOUS'}{conf_str} (ML score: {finding.ml_risk_score}/100)."
            )

        for sig in signals_dict:
            epistemic["model_inferences"].append(f"Signal [{sig.get('signal_type')}]: {sig.get('explanation')}")

        for ev in evidence_dict:
            epistemic["observed_facts"].append(f"Observed evidence: {ev.get('description')}")

        # Confidence Documentation
        valid_confidence = False
        confidence_doc = "No valid statistical confidence score available."
        confidence_value = None

        if finding.ml_confidence is not None and not finding.ml_fallback_used:
            valid_confidence = True
            confidence_value = round(float(finding.ml_confidence), 2)
            confidence_doc = (
                f"Valid statistical confidence {int(confidence_value * 100)}%: Represents model posterior class probability "
                f"P(threat | features) output by calibrated classifier."
            )
        elif signals_dict:
            avg_sig_conf = sum(s.get("confidence", 1.0) for s in signals_dict) / len(signals_dict)
            valid_confidence = True
            confidence_value = round(avg_sig_conf, 2)
            confidence_doc = (
                f"Rule confidence {int(confidence_value * 100)}%: Represents signal heuristic reliability weight across "
                f"{len(signals_dict)} matched detection rules."
            )

        recommended_steps = self._generate_investigative_steps(
            asset_type=finding.asset_type,
            is_official=False,
            risk_score=float(finding.risk_score),
            comparison=comparison,
        )

        return {
            "success": True,
            "finding_id": finding.id,
            "brand_id": brand_id,
            "brand_name": brand_name,
            "candidate_name": finding.candidate_name,
            "asset_type": finding.asset_type,
            "source_url": finding.source_url,
            "risk_score": float(finding.risk_score),
            "severity": finding.severity,
            "review_status": finding.review_status,
            "is_sample": bool(finding.is_sample),
            "detection_method": (
                f"ML Model Inference (v{finding.ml_model_version})"
                if (finding.ml_model_version and not finding.ml_fallback_used)
                else "Deterministic Rule-Based Detection"
            ),
            "confidence": {
                "score": confidence_value,
                "is_valid": valid_confidence,
                "documented_meaning": confidence_doc,
            },
            "comparison": comparison,
            "epistemic_breakdown": epistemic,
            "recommended_steps": recommended_steps,
            "signals": signals_dict,
            "evidence": evidence_dict,
            "auto_confirmed": False,
            "analyst_action_required": True,
        }

    # -------------------------------------------------------------------------
    # Internal Helpers
    # -------------------------------------------------------------------------

    def _compare_with_registered_assets(
        self,
        candidate_name: str,
        asset_type: str,
        brand_name: str,
        official_domains: List[str],
        official_socials: List[str],
        official_apps: List[str],
        official_publishers: List[str],
    ) -> Dict[str, Any]:
        """Compute granular similarity metrics against verified brand inventory."""
        norm_cand = NameSimilarityService.normalize_compact(candidate_name)
        norm_brand = NameSimilarityService.normalize_compact(brand_name)

        # Baseline similarity to brand name
        dist_to_brand = levenshtein_distance(norm_cand, norm_brand)
        max_len = max(len(norm_cand), len(norm_brand), 1)
        similarity_to_brand_pct = round(max(0.0, (1.0 - (dist_to_brand / max_len))) * 100.0, 1)

        brand_contained = norm_brand in norm_cand if norm_brand else False
        detected_keywords = [kw for kw in SUSPICIOUS_KEYWORDS if kw in norm_cand]

        # Domain specifics
        is_tld_high_risk = False
        domain_sld = ""
        domain_tld = ""
        homoglyph_detected = False
        homoglyph_chars: List[str] = []

        if asset_type in ("domain", "url", "dns"):
            components = extract_domain_components(candidate_name)
            domain_sld = components.get("sld", "")
            domain_tld = components.get("tld", "")
            is_tld_high_risk = domain_tld in HIGH_RISK_TLDS

            # Homoglyph detection: check for non-ASCII characters in decoded Unicode or raw hostname
            target_host = components.get("unicode_hostname") or components.get("hostname", "")
            for char in target_host:
                if ord(char) > 127:
                    homoglyph_detected = True
                    homoglyph_chars.append(f"U+{ord(char):04X} ('{char}')")

        # Closest match across official assets
        closest_asset = None
        closest_distance = 999
        closest_similarity_pct = 0.0

        target_pool = official_domains if asset_type == "domain" else official_socials if asset_type == "social" else official_apps

        for asset in target_pool:
            norm_asset = NameSimilarityService.normalize_compact(asset)
            d = levenshtein_distance(norm_cand, norm_asset)
            if d < closest_distance:
                closest_distance = d
                closest_asset = asset
                denom = max(len(norm_cand), len(norm_asset), 1)
                closest_similarity_pct = round(max(0.0, (1.0 - (d / denom))) * 100.0, 1)

        return {
            "target_brand_name": brand_name,
            "normalized_candidate": norm_cand,
            "normalized_brand": norm_brand,
            "levenshtein_distance_to_brand": dist_to_brand,
            "similarity_to_brand_pct": similarity_to_brand_pct,
            "brand_token_contained": brand_contained,
            "detected_keywords": detected_keywords,
            "closest_registered_asset": closest_asset,
            "distance_to_closest_asset": closest_distance if closest_asset else None,
            "similarity_to_closest_asset_pct": closest_similarity_pct if closest_asset else None,
            "homoglyph_detected": homoglyph_detected,
            "homoglyph_characters": homoglyph_chars,
            "domain_tld": domain_tld,
            "is_tld_high_risk": is_tld_high_risk,
        }

    def _build_epistemic_breakdown(
        self,
        candidate_name: str,
        asset_type: str,
        brand_name: str,
        source_url: Optional[str],
        comparison: Dict[str, Any],
        detection_result: Dict[str, Any],
    ) -> Dict[str, List[str]]:
        """Separate observed facts, model inferences, and unverified claims."""
        observed_facts = [
            f"Candidate identifier: '{candidate_name}' ({asset_type})",
            f"Target protected brand profile: '{brand_name}'",
            f"String comparison: {comparison['similarity_to_brand_pct']}% lexical similarity (Levenshtein distance: {comparison['levenshtein_distance_to_brand']})",
        ]

        if source_url:
            observed_facts.append(f"Source URL: {source_url}")

        if comparison.get("closest_registered_asset"):
            observed_facts.append(f"Closest registered brand asset: '{comparison['closest_registered_asset']}'")

        if comparison.get("homoglyph_detected"):
            observed_facts.append(f"Non-ASCII homoglyphs observed: {', '.join(comparison['homoglyph_characters'])}")

        if comparison.get("is_tld_high_risk"):
            observed_facts.append(f"High-abuse TLD observed: '.{comparison['domain_tld']}'")

        model_inferences = []
        ml_score = detection_result.get("ml_risk_score")
        rule_score = detection_result.get("rule_based_score")

        if rule_score is not None:
            model_inferences.append(f"Deterministic Rule Engine score: {rule_score}/100")

        if ml_score is not None and not detection_result.get("ml_fallback_used"):
            conf_pct = int(detection_result.get("ml_confidence", 0.0) * 100)
            model_inferences.append(
                f"Machine Learning Classifier inferred {detection_result.get('ml_predicted_class', 'SUSPICIOUS')} with {conf_pct}% statistical confidence."
            )

        for sig in detection_result.get("signals", []):
            model_inferences.append(f"Signal [{sig.get('signal_type')}]: {sig.get('explanation')}")

        unverified_claims = [
            "Registrant / Operator true identity has not been confirmed via legal disclosure.",
            "Malicious hosting infrastructure attribution is inferred and requires ISP abuse verification.",
            "Brand authorization cannot be ruled out without partner agreement cross-check.",
            "Automated detection output is strictly advisory; never label as confirmed threat without evidence audit.",
        ]

        return {
            "observed_facts": observed_facts,
            "model_inferences": model_inferences,
            "unverified_claims": unverified_claims,
        }

    def _generate_investigative_steps(
        self,
        asset_type: str,
        is_official: bool,
        risk_score: float,
        comparison: Dict[str, Any],
    ) -> List[str]:
        """Formulate evidence-based next investigative steps."""
        if is_official:
            return [
                "Verify asset record remains active in corporate brand profile directory.",
                "Maintain asset in allowlist to prevent repeat triage noise.",
            ]

        steps = []
        if asset_type in ("domain", "url", "dns"):
            steps.append("Query WHOIS registration and registrar abuse contact for destination domain.")
            steps.append("Check DNS MX and TXT records for active email spoofing configuration.")
            if comparison.get("homoglyph_detected"):
                steps.append("Inspect Punycode representation (xn--) for homoglyph deception.")
            steps.append("Verify destination page in isolated sandbox for credential harvesting forms.")

        elif asset_type == "social":
            steps.append("Check account creation timestamp and engagement metrics against official channels.")
            steps.append("Verify external URLs in account bio to confirm whether they link to official domains.")
            steps.append("Check internal partner CRM for authorized co-marketing agreements.")

        elif asset_type in ("mobile_app", "app"):
            steps.append("Inspect publisher developer name against registered corporate entities.")
            steps.append("Review APK package permissions for invasive capabilities (READ_SMS, accessibility).")
            steps.append("Verify package signing certificate SHA-256 fingerprint against official store listing.")

        if risk_score >= 70.0:
            steps.append("If confirmed malicious, assemble evidentiary dossier and dispatch takedown request.")
        else:
            steps.append("Retain under observation; do not issue takedown without corroborating proof of harm.")

        return steps


# Global watchtower singleton
watchtower_service = WatchtowerService()
