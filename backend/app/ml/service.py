import os
import json
import logging
from typing import Optional, Dict, Any

import joblib
from backend.app.ml.pipeline import (
    DEFAULT_MODEL_DIR,
    MANIFEST_FILENAME,
    MODEL_FILENAME,
    build_feature_text,
)
from backend.app.ml.url_pipeline import (
    URL_MANIFEST_FILENAME,
    URL_MODEL_FILENAME,
)

logger = logging.getLogger(__name__)


class MLService:
    """
    Unified Inference and Telemetry Service for SURAKSHA ML Components.
    
    Safety & Integrity Guarantees:
    1. Scope Separation: URL phishing predictions are strictly separated from
       mobile-app / social-profile impersonation. The URL model does NOT claim
       to validate other threat categories.
    2. Zero Hallucination: True evaluation metrics and data provenance are loaded
       strictly from disk manifests; zero metrics are fabricated.
    3. Zero Auto-Confirmation: ML inference provides assistive advisory scores.
       Findings require analyst verification and are NEVER auto-confirmed.
    4. Non-Breaking: If a model component is absent, the system gracefully falls
       back to deterministic rule-based evaluation.
    """

    def __init__(self, model_dir: Optional[str] = None):
        self.model_dir = model_dir or DEFAULT_MODEL_DIR
        self.url_model = None
        self.url_manifest = None
        self.candidate_model = None
        self.candidate_manifest = None
        self._load_models()

    def _load_models(self) -> None:
        """Load trained models and manifests from model directory."""
        # 1. Load URL Phishing Component
        url_manifest_path = os.path.join(self.model_dir, URL_MANIFEST_FILENAME)
        url_model_path = os.path.join(self.model_dir, URL_MODEL_FILENAME)

        if os.path.exists(url_manifest_path):
            try:
                with open(url_manifest_path, "r", encoding="utf-8") as f:
                    self.url_manifest = json.load(f)
            except Exception as e:
                logger.warning("Could not read URL manifest: %s", e)
                self.url_manifest = None

        if os.path.exists(url_model_path) and self.url_manifest and self.url_manifest.get("trained"):
            try:
                self.url_model = joblib.load(url_model_path)
                logger.info(
                    "SURAKSHA URL Phishing ML Model v%s loaded successfully from %s",
                    self.url_manifest.get("model_version", "1.0.0"),
                    url_model_path,
                )
            except Exception as e:
                logger.error("Failed to load URL model artifact: %s", e)
                self.url_model = None

        # 2. Load General Candidate Impersonation Component (if trained)
        candidate_manifest_path = os.path.join(self.model_dir, MANIFEST_FILENAME)
        candidate_model_path = os.path.join(self.model_dir, MODEL_FILENAME)

        if os.path.exists(candidate_manifest_path):
            try:
                with open(candidate_manifest_path, "r", encoding="utf-8") as f:
                    self.candidate_manifest = json.load(f)
            except Exception as e:
                logger.warning("Could not read candidate manifest: %s", e)
                self.candidate_manifest = None

        if os.path.exists(candidate_model_path) and self.candidate_manifest and self.candidate_manifest.get("trained"):
            try:
                self.candidate_model = joblib.load(candidate_model_path)
                logger.info("Candidate Impersonation ML Model loaded successfully.")
            except Exception as e:
                logger.error("Failed to load candidate model artifact: %s", e)
                self.candidate_model = None

    def reload(self) -> None:
        """Reload all model components from disk."""
        self._load_models()

    def is_url_model_available(self) -> bool:
        """Check if URL phishing model artifact is operational."""
        return self.url_model is not None and bool(self.url_manifest and self.url_manifest.get("trained"))

    def is_available(self) -> bool:
        """Check if any ML model component is operational."""
        return self.is_url_model_available() or (
            self.candidate_model is not None and bool(self.candidate_manifest and self.candidate_manifest.get("trained"))
        )

    def get_metadata(self) -> Dict[str, Any]:
        """
        Expose honest, comprehensive telemetry for all ML components.
        Explicitly documents scope boundaries and avoids claiming general validity.
        """
        # URL Component Metadata
        if self.is_url_model_available():
            url_meta = {
                "available": True,
                "status": "operational",
                "model_version": self.url_manifest.get("model_version", "1.0.0"),
                "architecture": self.url_manifest.get("architecture"),
                "dataset_source": self.url_manifest.get("dataset_metadata", {}).get("source"),
                "license": self.url_manifest.get("dataset_metadata", {}).get("license"),
                "total_samples": self.url_manifest.get("dataset_metadata", {}).get("total_samples"),
                "train_samples": self.url_manifest.get("dataset_metadata", {}).get("train_samples"),
                "test_samples": self.url_manifest.get("dataset_metadata", {}).get("test_samples"),
                "metrics": self.url_manifest.get("metrics"),
                "scope_boundary": self.url_manifest.get("scope_boundary"),
            }
        else:
            url_meta = {
                "available": False,
                "status": "not_loaded",
                "reason": (
                    self.url_manifest.get("reason")
                    if self.url_manifest
                    else "URL phishing model artifact not found on disk."
                ),
            }

        # Mobile App & Social Component Metadata
        if self.candidate_model is not None and self.candidate_manifest and self.candidate_manifest.get("trained"):
            candidate_meta = {
                "available": True,
                "status": "operational",
                "model_version": self.candidate_manifest.get("model_version", "1.0.0"),
                "metrics": self.candidate_manifest.get("metrics"),
            }
        else:
            candidate_meta = {
                "available": False,
                "status": "not_loaded",
                "reason": "No labelled dataset currently available for mobile app / social impersonation. Supervised training skipped to prevent label fabrication.",
                "scope_boundary": "Handled strictly via deterministic rule-based engine and verified ground-truth asset whitelisting.",
            }

        is_avail = self.is_available()
        top_version = None
        top_status = "not_loaded"
        top_metrics = None
        if self.candidate_model is not None and self.candidate_manifest and self.candidate_manifest.get("trained"):
            top_version = self.candidate_manifest.get("model_version", "1.0.0")
            top_status = "operational"
            top_metrics = self.candidate_manifest.get("metrics")
        elif self.is_url_model_available():
            top_version = self.url_manifest.get("model_version", "1.0.0")
            top_status = "operational"
            top_metrics = self.url_manifest.get("metrics")

        return {
            "available": is_avail,
            "overall_available": is_avail,
            "status": top_status,
            "model_version": top_version,
            "metrics": top_metrics,
            "auto_confirmation": False,
            "advisory_only": True,
            "components": {
                "url_phishing": url_meta,
                "mobile_app_social_impersonation": candidate_meta,
            },
        }

    def predict_url_risk(self, url_or_domain: str) -> Dict[str, Any]:
        """
        Execute URL / lookalike domain phishing risk classification.
        """
        if not self.is_url_model_available():
            return {
                "available": False,
                "task": "url_phishing_detection",
                "reason": "URL phishing model is not loaded.",
                "risk_score": None,
                "risk_probability": None,
            }

        clean_url = str(url_or_domain).strip()
        try:
            probs = self.url_model.predict_proba([clean_url])[0]
            classes = list(self.url_model.classes_)
            prob_phishing = float(probs[classes.index(1)]) if 1 in classes else float(probs[-1])
            risk_score = round(prob_phishing * 100.0, 1)

            if risk_score >= 80.0:
                tier = "HIGH"
            elif risk_score >= 50.0:
                tier = "MEDIUM"
            else:
                tier = "LOW"

            return {
                "available": True,
                "task": "url_phishing_detection",
                "model_version": self.url_manifest.get("model_version", "1.0.0"),
                "indicator": clean_url,
                "is_phishing_risk": prob_phishing >= 0.5,
                "risk_probability": round(prob_phishing, 4),
                "risk_score": risk_score,
                "severity_tier": tier,
                "requires_analyst_review": True,
                "auto_confirmed": False,
                "scope_note": "Evaluated strictly by URL/domain lexical model. Requires analyst corroboration.",
            }
        except Exception as e:
            logger.error("Error evaluating URL risk: %s", e)
            return {
                "available": False,
                "task": "url_phishing_detection",
                "error": str(e),
                "risk_score": None,
            }

    def predict_candidate(self, candidate_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Route candidate to appropriate model based on indicator type.
        """
        c_type = str(candidate_data.get("candidate_type") or candidate_data.get("type") or "").lower()
        url = candidate_data.get("url") or candidate_data.get("source_url") or candidate_data.get("indicator")

        # If it's a domain or URL candidate, use URL model
        if c_type in ["url", "domain", "hostname"] or (url and c_type not in ["app", "social"]):
            return self.predict_url_risk(url or candidate_data.get("candidate_name", ""))

        # Otherwise, check mobile app / social impersonation model
        if self.candidate_model is not None and self.candidate_manifest and self.candidate_manifest.get("trained"):
            text = build_feature_text(candidate_data)
            probs = self.candidate_model.predict_proba([text])[0]
            classes = list(self.candidate_model.classes_)
            prob = float(probs[classes.index(1)]) if 1 in classes else float(probs[-1])
            score_val = round(prob * 100.0, 1)
            return {
                "available": True,
                "task": "candidate_impersonation",
                "risk_probability": round(prob, 4),
                "risk_score": score_val,
                "ml_score": score_val,
                "requires_analyst_review": True,
                "auto_confirmed": False,
            }

        return {
            "available": False,
            "task": "candidate_impersonation",
            "reason": "No labelled dataset available for mobile app / social impersonation. Model not trained.",
            "requires_analyst_review": True,
            "auto_confirmed": False,
        }


# Global singleton instance
_ml_service: Optional[MLService] = None


def get_ml_service(model_dir: Optional[str] = None) -> MLService:
    """Get or initialize global MLService singleton."""
    global _ml_service
    if _ml_service is None or (model_dir and _ml_service.model_dir != model_dir):
        _ml_service = MLService(model_dir=model_dir)
    return _ml_service
