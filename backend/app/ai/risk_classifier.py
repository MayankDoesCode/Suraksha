import os
import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional

import joblib

logger = logging.getLogger(__name__)

DEFAULT_MODELS_DIR = Path(__file__).resolve().parent / "models"
DEFAULT_MODEL_FILE = DEFAULT_MODELS_DIR / "risk_classifier_v1.joblib"
DEFAULT_METADATA_FILE = DEFAULT_MODELS_DIR / "model_metadata_v1.json"


class RiskClassifier:
    """
    Production-ready Machine Learning Risk Classifier.
    Loads versioned scikit-learn pipeline artifacts, extracts multimodal features,
    predicts threat class probabilities, and provides explicit fallback behavior
    if model artifacts are missing or corrupted.
    """

    _instance = None
    _pipeline = None
    _metadata: Optional[Dict[str, Any]] = None
    _load_error: Optional[str] = None
    _artifact_compat: Optional[Dict[str, Any]] = None

    def __init__(self, model_path: Optional[Path] = None, metadata_path: Optional[Path] = None):
        self.model_path = Path(model_path) if model_path else DEFAULT_MODEL_FILE
        self.metadata_path = Path(metadata_path) if metadata_path else DEFAULT_METADATA_FILE
        self._ensure_loaded()

    def _ensure_loaded(self) -> bool:
        """Load model pipeline into memory once (cached)."""
        if self._pipeline is not None:
            return True

        if not self.model_path.exists():
            self._load_error = f"Model artifact not found at: {self.model_path}"
            logger.warning(self._load_error)
            return False

        try:
            from backend.app.ml.artifact_compat import load_artifact
            pipeline, compat = load_artifact(self.model_path, "generic_risk_classifier")
            self._artifact_compat = compat.to_dict()
            if pipeline is None:
                raise RuntimeError(compat.message)
            self._pipeline = pipeline
            if self.metadata_path.exists():
                with open(self.metadata_path, "r", encoding="utf-8") as f:
                    self._metadata = json.load(f)
            else:
                self._metadata = {"model_version": "1.0.0", "algorithm": "RandomForestClassifier"}

            self._load_error = None
            logger.info("Successfully loaded ML Risk Classifier (%s)", self.get_version())
            return True
        except Exception as exc:
            self._load_error = f"Failed to load model artifact: {str(exc)}"
            self._pipeline = None
            logger.error(self._load_error)
            return False

    def is_available(self) -> bool:
        """Check if ML model artifact is loaded and operational."""
        return self._pipeline is not None or self._ensure_loaded()

    def get_version(self) -> str:
        """Return model version string."""
        if self._metadata and "model_version" in self._metadata:
            return str(self._metadata["model_version"])
        return "1.0.0"

    def get_status(self) -> Dict[str, Any]:
        """Telemetry diagnostics for the health endpoint."""
        available = self.is_available()
        return {
            "available": available,
            "loaded": self._pipeline is not None,
            "model_version": self.get_version() if available else None,
            "algorithm": self._metadata.get("algorithm") if self._metadata else "RandomForestClassifier",
            "model_type": "RandomForestClassifier + FeatureUnion (TF-IDF & Scaler)",
            "status": "operational" if available else "fallback_mode",
            "error": self._load_error,
            "artifact_compatibility": self._artifact_compat,
        }

    def classify(
        self,
        candidate_data: Dict[str, Any],
        brand_profile: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Classify candidate asset data.
        Returns standardized dictionary with predicted class, continuous risk score,
        probabilities, and fallback flags.
        """
        if not self.is_available():
            return {
                "ml_enabled": False,
                "ml_available": False,
                "model_version": None,
                "predicted_class": "UNKNOWN",
                "ml_risk_score": 0.0,
                "probabilities": {},
                "confidence": 0.0,
                "fallback_used": True,
                "error": self._load_error or "ML model artifact not loaded",
            }

        try:
            # Package candidate with brand baseline for the pipeline
            augmented_candidate = dict(candidate_data or {})
            if brand_profile:
                augmented_candidate["brand_name"] = (
                    brand_profile.get("name") or brand_profile.get("brand_name") or ""
                )
                augmented_candidate["official_publishers"] = [
                    p.get("publisher_name", "") if isinstance(p, dict) else str(p)
                    for p in (brand_profile.get("publishers") or [])
                ]
                augmented_candidate["official_domains"] = [
                    d.get("domain", "") if isinstance(d, dict) else str(d)
                    for d in (brand_profile.get("domains") or [])
                ]

            # Direct input to unified scikit-learn pipeline
            predictions = self._pipeline.predict([augmented_candidate])
            predicted_class = str(predictions[0]).upper()

            # Probability extraction
            classes = list(self._pipeline.classes_)
            prob_dist: Dict[str, float] = {}

            if hasattr(self._pipeline, "predict_proba"):
                probs = self._pipeline.predict_proba([augmented_candidate])[0]
                for cls_name, p in zip(classes, probs):
                    prob_dist[str(cls_name).upper()] = round(float(p), 4)

            # Suspicious probability defines the 0-100 ML risk score
            suspicious_prob = prob_dist.get("SUSPICIOUS", 1.0 if predicted_class == "SUSPICIOUS" else 0.0)
            ml_risk_score = round(suspicious_prob * 100.0, 1)
            confidence = prob_dist.get(predicted_class, 1.0)

            return {
                "ml_enabled": True,
                "ml_available": True,
                "model_version": self.get_version(),
                "predicted_class": predicted_class,
                "ml_risk_score": ml_risk_score,
                "probabilities": prob_dist,
                "confidence": round(float(confidence), 2),
                "fallback_used": False,
                "error": None,
            }
        except Exception as exc:
            logger.error("Error during ML classification: %s", str(exc), exc_info=True)
            return {
                "ml_enabled": False,
                "ml_available": True,
                "model_version": self.get_version(),
                "predicted_class": "UNKNOWN",
                "ml_risk_score": 0.0,
                "probabilities": {},
                "confidence": 0.0,
                "fallback_used": True,
                "error": f"Inference failure: {str(exc)}",
            }


# Singleton instance for application runtime
risk_classifier = RiskClassifier()
