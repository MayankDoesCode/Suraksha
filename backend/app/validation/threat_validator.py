from typing import Dict, Any, List, Tuple
from urllib.parse import urlparse

SAFE_URL_SCHEMES = {"http", "https"}
VALID_ASSET_TYPES = {"social", "mobile_app", "domain"}
VALID_SEVERITIES = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}
VALID_REVIEW_STATUSES = {
    "NEW",
    "UNDER_INVESTIGATION",
    "CONFIRMED_THREAT",
    "FALSE_POSITIVE",
    "RESOLVED",
}

class FindingValidator:
    """Validates threat finding payloads and status updates."""

    @staticmethod
    def validate(data: Any, is_update: bool = False) -> Tuple[Dict[str, Any], List[Dict[str, str]]]:
        errors = []
        cleaned = {}

        if not isinstance(data, dict):
            return {}, [{"field": "body", "message": "Request body must be a valid JSON object"}]

        # 1. Candidate Name
        if "candidate_name" in data:
            name = str(data["candidate_name"]).strip() if data["candidate_name"] is not None else ""
            if not name:
                errors.append({"field": "candidate_name", "message": "Candidate name is required and cannot be empty"})
            elif len(name) > 255:
                errors.append({"field": "candidate_name", "message": "Candidate name cannot exceed 255 characters"})
            else:
                cleaned["candidate_name"] = name
        elif not is_update:
            errors.append({"field": "candidate_name", "message": "Candidate name is required"})

        # 2. Asset Type
        if "asset_type" in data:
            asset_type = str(data["asset_type"]).strip().lower() if data["asset_type"] is not None else ""
            if asset_type not in VALID_ASSET_TYPES:
                errors.append({
                    "field": "asset_type",
                    "message": f"Asset type must be one of: {', '.join(sorted(VALID_ASSET_TYPES))}"
                })
            else:
                cleaned["asset_type"] = asset_type
        elif not is_update:
            errors.append({"field": "asset_type", "message": "Asset type is required"})

        # 3. Risk Score
        if "risk_score" in data:
            try:
                score = float(data["risk_score"])
                if score < 0.0 or score > 100.0:
                    errors.append({"field": "risk_score", "message": "Risk score must be between 0.0 and 100.0"})
                else:
                    cleaned["risk_score"] = round(score, 1)
            except (ValueError, TypeError):
                errors.append({"field": "risk_score", "message": "Risk score must be a numeric value between 0.0 and 100.0"})
        elif not is_update:
            cleaned["risk_score"] = 0.0

        # 4. Severity
        if "severity" in data:
            sev = str(data["severity"]).strip().upper() if data["severity"] is not None else ""
            if sev not in VALID_SEVERITIES:
                errors.append({
                    "field": "severity",
                    "message": f"Severity must be one of: {', '.join(sorted(VALID_SEVERITIES))}"
                })
            else:
                cleaned["severity"] = sev
        elif not is_update:
            cleaned["severity"] = "LOW"

        # 5. Review Status
        if "review_status" in data:
            status = str(data["review_status"]).strip().upper() if data["review_status"] is not None else ""
            if status not in VALID_REVIEW_STATUSES:
                errors.append({
                    "field": "review_status",
                    "message": f"Review status must be one of: {', '.join(sorted(VALID_REVIEW_STATUSES))}"
                })
            else:
                cleaned["review_status"] = status
        elif not is_update:
            cleaned["review_status"] = "NEW"

        # 6. Source URL
        if "source_url" in data:
            url = str(data["source_url"]).strip() if data["source_url"] is not None else ""
            if url:
                if len(url) > 1024:
                    errors.append({"field": "source_url", "message": "Source URL cannot exceed 1024 characters"})
                else:
                    parsed = urlparse(url)
                    if parsed.scheme.lower() not in SAFE_URL_SCHEMES:
                        errors.append({
                            "field": "source_url",
                            "message": "Source URL must use http:// or https://"
                        })
                    else:
                        cleaned["source_url"] = url
            else:
                cleaned["source_url"] = None

        # 7. Detection Source & is_sample
        if "detection_source" in data:
            cleaned["detection_source"] = str(data["detection_source"]).strip()[:128]
        elif not is_update:
            cleaned["detection_source"] = "similarity_engine"

        if "is_sample" in data:
            cleaned["is_sample"] = bool(data["is_sample"])
        elif not is_update:
            cleaned["is_sample"] = True

        return cleaned, errors
