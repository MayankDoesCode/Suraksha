import logging
from typing import Dict, Any, Optional, List

from backend.app.repositories.brand_repository import BrandRepository
from backend.app.repositories.threat_repository import ThreatRepository
from backend.app.detection.social_detector import SocialDetector
from backend.app.detection.app_detector import AppDetector
from backend.app.utils.errors import NotFoundError, ValidationError

logger = logging.getLogger(__name__)

class DetectionService:
    """
    Core orchestrator evaluating candidate external assets against registered brand identities.
    Enforces official asset exclusion, deterministic scoring, and deduplicated persistence.
    """

    def __init__(
        self,
        brand_repo: Optional[BrandRepository] = None,
        threat_repo: Optional[ThreatRepository] = None
    ):
        self.brand_repo = brand_repo or BrandRepository()
        self.threat_repo = threat_repo or ThreatRepository()
        self.social_detector = SocialDetector()
        self.app_detector = AppDetector()

    def evaluate_candidate(
        self,
        brand_id: str,
        candidate_data: Dict[str, Any],
        persist: bool = True
    ) -> Dict[str, Any]:
        """
        Evaluate a candidate asset (social profile or mobile app) against a brand's verified assets.
        If the candidate is an official asset, it is excluded and NOT saved as a suspicious finding.
        Otherwise, explainable signals and risk scores are calculated and persisted.
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
        # Route to appropriate detector
        # -------------------------------------------------------------
        if asset_type in ("mobile_app", "app"):
            outcome = self.app_detector.evaluate_full(candidate_data, brand_dict)
            asset_type_normalized = "mobile_app"
        else:
            outcome = self.social_detector.evaluate_full(candidate_data, brand_dict)
            asset_type_normalized = "social"

        # -------------------------------------------------------------
        # 1. Official Asset Exclusion Handling
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
                "severity": "LOW",
                "signals": [],
                "persisted": False,
            }

        # -------------------------------------------------------------
        # 2. Risk Evaluation
        # -------------------------------------------------------------
        risk_eval = outcome.risk_evaluation
        total_score = risk_eval.total_score
        severity = risk_eval.severity

        finding_record = None

        # -------------------------------------------------------------
        # 3. Persistence & Repeat Scans Deduplication
        # -------------------------------------------------------------
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
                risk_score=total_score,
                severity=severity,
                detection_source=detection_source,
                is_sample=is_sample,
                signals=risk_eval.signals,
                evidence_records=outcome.evidence_records,
                existing_finding=existing,
            )
            finding_record = finding_model.to_dict()

        return {
            "brand_id": brand_id,
            "candidate_name": candidate_name,
            "asset_type": asset_type_normalized,
            "is_official": False,
            "excluded": False,
            "risk_score": total_score,
            "severity": severity,
            "signals": [
                {
                    "signal_type": s.signal_type,
                    "score": s.severity_score,
                    "confidence": s.confidence,
                    "explanation": s.explanation,
                }
                for s in risk_eval.signals
            ],
            "evidence": outcome.evidence_records,
            "persisted": persist,
            "finding": finding_record,
        }
