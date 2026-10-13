import logging
from typing import Dict, Any, Optional, List

from backend.app.repositories.brand_repository import BrandRepository
from backend.app.repositories.threat_repository import ThreatRepository
from backend.app.detection.social_detector import SocialDetector
from backend.app.detection.app_detector import AppDetector
from backend.app.detection.domain_detector import DomainDetector
from backend.app.ai.risk_classifier import risk_classifier as default_risk_classifier, RiskClassifier
from backend.app.utils.errors import NotFoundError, ValidationError

logger = logging.getLogger(__name__)


class DetectionService:
    """
    Hybrid cybersecurity detection and risk scoring engine.
    Combines deterministic rules (brand exclusions, publisher mismatch, package mimicry, domain typosquatting)
    with a trained Machine Learning classifier to generate explainable, calibrated threat scores.
    """

    def __init__(
        self,
        brand_repo: Optional[BrandRepository] = None,
        threat_repo: Optional[ThreatRepository] = None,
        risk_classifier: Optional[RiskClassifier] = None,
        rule_weight: float = 0.60,
        ml_weight: float = 0.40,
    ):
        self.brand_repo = brand_repo or BrandRepository()
        self.threat_repo = threat_repo or ThreatRepository()
        self.social_detector = SocialDetector()
        self.app_detector = AppDetector()
        self.domain_detector = DomainDetector()
        self.risk_classifier = risk_classifier or default_risk_classifier
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
        asset_type = (candidate_data.get("asset_type") or "social").lower()
        candidate_name = (
            candidate_data.get("candidate_name") or
            candidate_data.get("handle") or
            candidate_data.get("app_name") or ""
        ).strip()
        source_url = candidate_data.get("source_url") or candidate_data.get("profile_url")
        detection_source = candidate_data.get("detection_source", "similarity_engine")
        is_sample = candidate_data.get("is_sample", True)

        if not candidate_name:
            raise ValidationError("Candidate name or identifier is required for evaluation.")

        # -------------------------------------------------------------
        # Route to appropriate deterministic detector
        # -------------------------------------------------------------
        if asset_type in ("mobile_app", "app"):
            outcome = self.app_detector.evaluate_full(candidate_data, brand_dict)
            asset_type_normalized = "mobile_app"
        elif asset_type in ("domain", "url", "dns", "web", "website"):
            outcome = self.domain_detector.evaluate_full(candidate_data, brand_dict)
            asset_type_normalized = "domain"
        else:
            outcome = self.social_detector.evaluate_full(candidate_data, brand_dict)
            asset_type_normalized = "social"


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
        # 4. Machine Learning Inference & Hybrid Fusion
        # -------------------------------------------------------------
        ml_result = self.risk_classifier.classify(
            candidate_data=candidate_data,
            brand_profile=brand_dict
        )

        if ml_result.get("fallback_used"):
            # Resilient fallback: use deterministic rule scoring alone
            logger.warning(
                "ML model in fallback mode for candidate '%s': %s",
                candidate_name, ml_result.get("error")
            )
            final_score = rule_score
            final_severity = rule_eval.severity
            ml_risk_score = None
            ml_predicted_class = "UNKNOWN"
            ml_confidence = None
            ml_version = None
            ml_fallback_used = True
        else:
            ml_fallback_used = False
            ml_risk_score = float(ml_result.get("ml_risk_score", 0.0))
            ml_predicted_class = str(ml_result.get("predicted_class", "UNKNOWN"))
            ml_confidence = float(ml_result.get("confidence", 0.0))
            ml_version = str(ml_result.get("model_version", "1.0.0"))

            # Configurable weighted hybrid score
            final_score = round(min(100.0, max(0.0, self.rule_weight * rule_score + self.ml_weight * ml_risk_score)), 1)

            if final_score >= 80.0:
                final_severity = "CRITICAL"
            elif final_score >= 50.0:
                final_severity = "HIGH"
            elif final_score >= 25.0:
                final_severity = "MEDIUM"
            else:
                final_severity = "LOW"

            evidence_records.append({
                "evidence_type": "ml_risk_classification",
                "description": (
                    f"Fitted model ({ml_version}) predicted {ml_predicted_class} with "
                    f"{int(ml_confidence * 100)}% confidence (ML score: {ml_risk_score}/100)."
                ),
                "source_reference": f"ml_model_v{ml_version}",
            })

        # -------------------------------------------------------------
        # 5. Separate Detection Confidence from Potential Severity/Impact
        # -------------------------------------------------------------
        if signals:
            rule_conf = sum(s.confidence for s in signals) / len(signals)
        else:
            rule_conf = 0.5

        if ml_confidence is not None and not ml_fallback_used:
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

