import logging
from typing import Dict, Any, Optional, List

from backend.app.repositories.brand_repository import BrandRepository
from backend.app.repositories.threat_repository import ThreatRepository
from backend.app.detection.social_detector import SocialDetector
from backend.app.detection.app_detector import AppDetector
from backend.app.detection.domain_detector import DomainDetector
from backend.app.ai.risk_classifier import risk_classifier as default_risk_classifier, RiskClassifier
from backend.app.ml import get_ml_service
from backend.app.utils.errors import NotFoundError, ValidationError

logger = logging.getLogger(__name__)


# Accepted asset_type values and the detector each routes to. Anything else is
# rejected rather than silently scored by the wrong detector.
ASSET_TYPE_ALIASES = {
    "domain": "domain", "url": "domain", "dns": "domain", "web": "domain", "website": "domain",
    "mobile_app": "mobile_app", "app": "mobile_app", "android": "mobile_app", "ios": "mobile_app",
    "social": "social", "social_profile": "social", "social_media": "social", "social_account": "social",
    "twitter": "social", "x": "social", "instagram": "social", "facebook": "social",
    "linkedin": "social", "tiktok": "social", "youtube": "social", "telegram": "social",
}
DEFAULT_ASSET_TYPE = "social"


class DetectionService:
    """
    Hybrid cybersecurity detection and risk scoring engine.
    Combines deterministic rules (brand exclusions, publisher mismatch, package mimicry, domain typosquatting)
    with specialized Machine Learning classifiers (URL phishing lexical model, social fake profile model)
    to generate explainable, calibrated threat scores with transparent fallback provenance.
    """

    def __init__(
        self,
        brand_repo: Optional[BrandRepository] = None,
        threat_repo: Optional[ThreatRepository] = None,
        risk_classifier: Optional[RiskClassifier] = None,
        ml_service: Optional[Any] = None,
        rule_weight: float = 0.60,
        ml_weight: float = 0.40,
    ):
        self.brand_repo = brand_repo or BrandRepository()
        self.threat_repo = threat_repo or ThreatRepository()
        self.social_detector = SocialDetector()
        self.app_detector = AppDetector()
        self.domain_detector = DomainDetector()
        self._custom_risk_classifier_passed = (risk_classifier is not None)
        self.risk_classifier = risk_classifier or default_risk_classifier
        self.ml_service = ml_service or get_ml_service()
        self.rule_weight = rule_weight
        self.ml_weight = ml_weight


    def evaluate_candidate(
        self,
        brand_id: str,
        candidate_data: Dict[str, Any],
        persist: bool = True
    ) -> Dict[str, Any]:
        """
        Evaluate candidate external asset against brand verified profile.
        1. Official assets are strictly excluded (risk score 0, not persisted as threats).
        2. Rule-based signals are evaluated deterministically.
        3. Completely unrelated candidates with 0 detector signals receive 0.0 risk.
        4. ML risk classifier predicts threat class and continuous probability.
        5. Hybrid composite risk score and severity are computed.
        6. Finding and explainable signals are persisted with deduplication.
        """
        brand = self.brand_repo.get_by_id(brand_id)
        if not brand:
            raise NotFoundError(f"Brand with ID '{brand_id}' not found.")

        brand_dict = brand.to_dict(include_relations=True)
        raw_asset_type = str(candidate_data.get("asset_type") or "").strip().lower()
        asset_type_defaulted = not raw_asset_type
        asset_type = raw_asset_type or DEFAULT_ASSET_TYPE
        if asset_type not in ASSET_TYPE_ALIASES:
            raise ValidationError(
                f"Unsupported asset_type '{raw_asset_type}'.",
                details=[{
                    "field": "asset_type",
                    "message": "Must be one of: " + ", ".join(sorted(ASSET_TYPE_ALIASES)),
                }],
            )
        candidate_name = (
            candidate_data.get("candidate_name") or
            candidate_data.get("candidate_identifier") or
            candidate_data.get("identifier") or
            candidate_data.get("domain") or
            candidate_data.get("handle") or
            candidate_data.get("app_name") or ""
        ).strip()
        source_url = candidate_data.get("source_url") or candidate_data.get("profile_url")
        detection_source = candidate_data.get("detection_source", "similarity_engine")
        is_sample = candidate_data.get("is_sample", brand_dict.get("is_sample", False))

        if not candidate_name:
            raise ValidationError("Candidate name or identifier is required for evaluation.")

        # -------------------------------------------------------------
        # Route to appropriate deterministic detector
        # -------------------------------------------------------------
        asset_type_normalized = ASSET_TYPE_ALIASES[asset_type]
        if asset_type_normalized == "mobile_app":
            outcome = self.app_detector.evaluate_full(candidate_data, brand_dict)
        elif asset_type_normalized == "domain":
            outcome = self.domain_detector.evaluate_full(candidate_data, brand_dict)
        else:
            outcome = self.social_detector.evaluate_full(candidate_data, brand_dict)


        # -------------------------------------------------------------
        # 1. Official Asset Exclusion Handling (Non-negotiable rule)
        # -------------------------------------------------------------
        if outcome.is_official:
            logger.info(
                "Candidate '%s' excluded: Matches verified brand asset (%s)",
                candidate_name,
                outcome.exclusion_reason
            )
            return {
                "brand_id": brand_id,
                "candidate_name": candidate_name,
                "asset_type": asset_type_normalized,
                "asset_type_defaulted": asset_type_defaulted,
                "is_official": True,
                "excluded": True,
                "exclusion_reason": outcome.exclusion_reason,
                "risk_score": 0.0,
                "final_risk_score": 0.0,
                "rule_based_score": 0.0,
                "ml_risk_score": None,
                "ml_predicted_class": None,
                "ml_confidence": None,
                "ml_model_version": None,
                "ml_fallback_used": False,
                "severity": "LOW",
                "signals": [],
                "evidence": [],
                "persisted": False,
                "finding": None,
            }

        # -------------------------------------------------------------
        # 2. Rule-Based Threat Evaluation Signals
        # -------------------------------------------------------------
        rule_eval = outcome.risk_evaluation
        rule_score = round(float(rule_eval.total_score), 1)
        signals = list(rule_eval.signals)
        evidence_records = list(outcome.evidence_records)
        if asset_type_defaulted:
            evidence_records.append({
                "evidence_type": "assumption",
                "description": (
                    f"No asset_type was supplied; the candidate was assessed as '{DEFAULT_ASSET_TYPE}'. "
                    "An analyst should confirm the asset type."
                ),
                "source_reference": "detection_service_input_defaults",
            })

        # -------------------------------------------------------------
        # 3. Benign Unrelated Screening Check
        # If candidate has zero trademark overlap and 0 detector signals,
        # it is completely unrelated and not treated as a threat finding.
        # -------------------------------------------------------------
        if rule_score == 0.0 and len(signals) == 0:
            return {
                "brand_id": brand_id,
                "candidate_name": candidate_name,
                "asset_type": asset_type_normalized,
                "asset_type_defaulted": asset_type_defaulted,
                "is_official": False,
                "excluded": False,
                "risk_score": 0.0,
                "final_risk_score": 0.0,
                "rule_based_score": 0.0,
                "ml_risk_score": 0.0,
                "ml_predicted_class": "LEGITIMATE",
                "ml_confidence": 1.0,
                "ml_model_version": self.risk_classifier.get_version(),
                "ml_fallback_used": False,
                "severity": "LOW",
                "signals": [],
                "evidence": [],
                "persisted": False,
                "finding": None,
            }

        # -------------------------------------------------------------
        # 4. Specialized Machine Learning Pipeline Routing & Hybrid Fusion
        # - "domain" / "url": Specialized lexical URL phishing model (OTX/Tranco 10k samples)
        # - "social": Specialized social fake profile model (InstaFake 1.1k samples)
        # - "mobile_app": Explicit deterministic baseline (pending ground truth labels)
        # - Fallback: Transparent attribution, provenance logging, and zero hallucination
        # -------------------------------------------------------------
        ml_risk_score: Optional[float] = None
        ml_predicted_class: str = "UNKNOWN"
        ml_confidence: Optional[float] = None
        ml_version: Optional[str] = None
        ml_fallback_used: bool = False
        fallback_reason: Optional[str] = None
        # False when the ML output answers a different question than brand risk
        # (e.g. generic fake-account probability) and must not be averaged in.
        ml_fused_into_score: bool = True

        if self._custom_risk_classifier_passed and not self.risk_classifier.is_available():
            ml_fallback_used = True
            fallback_reason = "Injected custom ML classifier artifact unavailable"

        elif asset_type_normalized == "domain":
            indicator = candidate_data.get("source_url") or candidate_data.get("url") or candidate_name
            if self.ml_service and self.ml_service.is_url_model_available():
                url_pred = self.ml_service.predict_url_risk(indicator)
                if url_pred.get("available") and url_pred.get("risk_score") is not None:
                    ml_risk_score = float(url_pred["risk_score"])
                    ml_predicted_class = "SUSPICIOUS" if url_pred.get("is_phishing_risk") else "LEGITIMATE"
                    prob = float(url_pred.get("risk_probability", 0.0))
                    ml_confidence = prob if url_pred.get("is_phishing_risk") else round(1.0 - prob, 4)
                    ml_version = f"url_phishing_v{url_pred.get('model_version', '1.0.0')}"
                    ml_fallback_used = False
                    # Not fused: on leakage-safe host-only evaluation the lexical model misses
                    # most phishing hosts (see docs/PHASE0_AUDIT.md §8–10), so it must not
                    # move the risk score at a fixed weight.
                    ml_fused_into_score = False
                    evidence_records.append({
                        "evidence_type": "url_phishing_ml_classification",
                        "description": (
                            f"Lexical URL model ({ml_version}) predicted {ml_predicted_class} "
                            f"(uncalibrated score: {ml_risk_score}/100). Supporting signal only; it is not "
                            "included in the risk score. Limitation: in host-only evaluation it detected "
                            "roughly a third to two-fifths of phishing hosts, so a LEGITIMATE result is not reassurance."
                        ),
                        "source_reference": ml_version,
                    })
                else:
                    ml_fallback_used = True
                    fallback_reason = url_pred.get("error") or url_pred.get("reason") or "URL model inference failure"
            else:
                ml_fallback_used = True
                fallback_reason = "URL phishing pipeline artifact unavailable"

        elif asset_type_normalized == "social":
            if self.ml_service and self.ml_service.is_social_model_available():
                social_pred = self.ml_service.predict_social_risk(candidate_data, brand_profile=brand_dict)
                fake_info = social_pred.get("generic_fake_account_ml", {})
                if fake_info.get("status") == "operational" and fake_info.get("fake_score") is not None:
                    ml_risk_score = float(fake_info["fake_score"])
                    prob = float(fake_info.get("fake_probability", 0.0))
                    ml_predicted_class = "SUSPICIOUS" if prob >= 0.5 else "LEGITIMATE"
                    ml_confidence = prob if prob >= 0.5 else round(1.0 - prob, 4)
                    ml_version = f"social_fake_v{fake_info.get('model_version', '1.0.0')}"
                    ml_fallback_used = False
                    ml_fused_into_score = False
                    evidence_records.append({
                        "evidence_type": "social_account_ml_classification",
                        "description": (
                            f"Generic fake/automated-account model ({ml_version}, InstaFake 2018) predicted "
                            f"{ml_predicted_class} (uncalibrated fake score: {ml_risk_score}/100). "
                            "This is not evidence of brand impersonation and is not included in the risk score; "
                            "brand impersonation is assessed by deterministic trademark rules."
                        ),
                        "source_reference": ml_version,
                    })
                elif fake_info.get("status") == "insufficient_metadata":
                    ml_fallback_used = True
                    missing = ", ".join(fake_info.get("missing_metadata") or [])
                    fallback_reason = f"Social fake-account model skipped: missing metadata ({missing})"
                    evidence_records.append({
                        "evidence_type": "missing_data",
                        "description": (
                            f"Generic fake-account model not run because profile metadata was not supplied: {missing}. "
                            "An analyst should collect follower/following/post counts before judging automation."
                        ),
                        "source_reference": "social_fake_model_input_check",
                    })
                else:
                    ml_fallback_used = True
                    fallback_reason = fake_info.get("status") or "Social ML inference failure"
            else:
                ml_fallback_used = True
                fallback_reason = "Social fake account pipeline artifact unavailable"

        elif asset_type_normalized == "mobile_app":
            # Explicitly heuristic: pending verified ground-truth brand impersonation dataset
            ml_fallback_used = True
            ml_predicted_class = "HEURISTIC_EVALUATION"
            ml_version = "heuristic_engine_v1.0"
            fallback_reason = "Mobile app model omitted pending verified ground-truth brand dataset"
            evidence_records.append({
                "evidence_type": "heuristic_risk_evaluation",
                "description": (
                    "Mobile application threat evaluated strictly via deterministic developer/package heuristics. "
                    "Supervised ML is omitted pending verified ground-truth brand impersonation dataset."
                ),
                "source_reference": "heuristic_engine",
            })

        else:
            # Fallback to generic RiskClassifier for unknown/custom asset types
            ml_result = self.risk_classifier.classify(candidate_data=candidate_data, brand_profile=brand_dict)
            if ml_result.get("fallback_used"):
                ml_fallback_used = True
                fallback_reason = ml_result.get("error") or "Generic model fallback"
            else:
                ml_risk_score = float(ml_result.get("ml_risk_score", 0.0))
                ml_predicted_class = str(ml_result.get("predicted_class", "UNKNOWN"))
                ml_confidence = float(ml_result.get("confidence", 0.0))
                ml_version = str(ml_result.get("model_version", "1.0.0"))
                ml_fallback_used = False
                # Not fused: trained on a 60-record bootstrap set and evaluated on 15
                # records, so its metrics carry no statistical weight.
                ml_fused_into_score = False
                evidence_records.append({
                    "evidence_type": "ml_risk_classification",
                    "description": (
                        f"Generic bootstrap model ({ml_version}) predicted {ml_predicted_class} "
                        f"(uncalibrated score: {ml_risk_score}/100). Supporting signal only; it is not "
                        "included in the risk score. Limitation: trained on 60 records and evaluated on 15, "
                        "so its accuracy is not established."
                    ),
                    "source_reference": f"ml_model_v{ml_version}",
                })

        # Compute composite risk score with documented fusion strategy
        if ml_fallback_used or ml_risk_score is None or not ml_fused_into_score:
            if fallback_reason:
                logger.info("ML routing fallback for '%s' (%s): %s", candidate_name, asset_type_normalized, fallback_reason)
            final_score = rule_score
            final_severity = rule_eval.severity
        else:
            final_score = round(min(100.0, max(0.0, self.rule_weight * rule_score + self.ml_weight * ml_risk_score)), 1)
            if final_score >= 80.0:
                final_severity = "CRITICAL"
            elif final_score >= 50.0:
                final_severity = "HIGH"
            elif final_score >= 25.0:
                final_severity = "MEDIUM"
            else:
                final_severity = "LOW"

        # -------------------------------------------------------------
        # 5. Separate Detection Confidence from Potential Severity/Impact
        # -------------------------------------------------------------
        if signals:
            rule_conf = sum(s.confidence for s in signals) / len(signals)
        else:
            rule_conf = 0.5

        if ml_confidence is not None and not ml_fallback_used and ml_fused_into_score:
            detection_confidence = round(self.rule_weight * rule_conf + self.ml_weight * ml_confidence, 2)
        else:
            detection_confidence = round(rule_conf, 2)

        # -------------------------------------------------------------
        # 6. Persistence & Repeat Scans Deduplication
        # -------------------------------------------------------------
        finding_record = None

        if persist:
            existing = self.threat_repo.find_existing(
                brand_id=brand_id,
                candidate_name=candidate_name,
                asset_type=asset_type_normalized,
                source_url=source_url,
            )

            finding_model = self.threat_repo.save_or_update(
                brand_id=brand_id,
                asset_type=asset_type_normalized,
                candidate_name=candidate_name,
                source_url=source_url,
                risk_score=final_score,
                rule_based_score=rule_score,
                ml_risk_score=ml_risk_score,
                ml_predicted_class=ml_predicted_class,
                ml_confidence=ml_confidence,
                ml_model_version=ml_version,
                ml_fallback_used=ml_fallback_used,
                severity=final_severity,
                detection_source=detection_source,
                is_sample=is_sample,
                signals=signals,
                evidence_records=evidence_records,
                existing_finding=existing,
            )
            finding_record = finding_model.to_dict()

        return {
            "brand_id": brand_id,
            "candidate_name": candidate_name,
            "asset_type": asset_type_normalized,
            "asset_type_defaulted": asset_type_defaulted,
            "is_official": False,
            "excluded": False,
            "risk_score": final_score,
            "final_risk_score": final_score,
            "rule_based_score": rule_score,
            "ml_risk_score": ml_risk_score,
            "ml_predicted_class": ml_predicted_class,
            "ml_confidence": ml_confidence,
            "detection_confidence": detection_confidence,
            "ml_model_version": ml_version,
            "ml_fallback_used": ml_fallback_used,
            "ml_fused_into_score": bool(ml_fused_into_score and not ml_fallback_used and ml_risk_score is not None),
            "severity": final_severity,
            "signals": [
                {
                    "signal_type": s.signal_type,
                    "score": s.severity_score,
                    "confidence": s.confidence,
                    "explanation": s.explanation,
                }
                for s in signals
            ],
            "evidence": evidence_records,
            "persisted": persist,
            "finding": finding_record,
        }

