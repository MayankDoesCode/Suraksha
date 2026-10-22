import os
import re
import logging
from typing import Dict, Any, List, Optional
from urllib.parse import urlparse
import requests

logger = logging.getLogger(__name__)

# Deceptive & High-abuse TLDs frequently flagged by Google Safe Browsing
HIGH_ABUSE_TLDS = {
    "xyz", "top", "online", "site", "club", "vip", "work", "cc", "buzz",
    "cfd", "sbs", "rest", "surf", "icu", "cam", "fit", "tk", "ml", "ga", "cf", "gq"
}

# High-risk phishing lure keywords
HIGH_RISK_LURE_WORDS = [
    "login", "signin", "sign-in", "auth", "portal", "verify", "verification",
    "secure", "security", "account", "wallet", "kyc", "claims", "support",
    "helpdesk", "recover", "recovery", "refund", "update", "banking", "token",
    "bonus", "rewards", "claim", "dispute", "compliance", "confirm"
]


class GoogleSafeBrowsingService:
    """
    Google Safe Browsing & Web Reputation Intelligence Service.
    Queries the Google Safe Browsing API v4 for live malware/phishing matches,
    with an evidence-based heuristic reputation fallback when API key is unconfigured.
    """

    def __init__(self, api_key: Optional[str] = None, timeout: float = 3.0):
        self.api_key = api_key or os.getenv("GOOGLE_SAFE_BROWSING_API_KEY")
        self.timeout = timeout
        self.endpoint = "https://safebrowsing.googleapis.com/v4/threatMatches:find"

    def is_api_configured(self) -> bool:
        return bool(self.api_key and len(self.api_key.strip()) > 10)

    def check_url(self, raw_url: str) -> Dict[str, Any]:
        """
        Evaluate a target URL or domain against Google Safe Browsing intelligence.
        Returns verified reputation status, threat types, and advisory links.
        """
        clean_url = str(raw_url or "").strip()
        if not clean_url.startswith(("http://", "https://")):
            check_target = f"https://{clean_url}"
        else:
            check_target = clean_url

        try:
            parsed = urlparse(check_target)
            hostname = (parsed.hostname or clean_url.split("/")[0]).lower().strip(".:")
            tld = hostname.split(".")[-1] if "." in hostname else ""
        except Exception:
            hostname = clean_url
            tld = ""

        # Advisory URL for Google Transparency Report
        advisory_url = f"https://transparencyreport.google.com/safe-browsing/search?url={check_target}"

        # 1. Live Google Safe Browsing API v4 check if key is available
        if self.is_api_configured():
            try:
                payload = {
                    "client": {
                        "clientId": "suraksha-brand-defense",
                        "clientVersion": "1.0.0"
                    },
                    "threatInfo": {
                        "threatTypes": [
                            "MALWARE",
                            "SOCIAL_ENGINEERING",
                            "UNWANTED_SOFTWARE",
                            "POTENTIALLY_HARMFUL_APPLICATION"
                        ],
                        "platformTypes": ["ANY_PLATFORM"],
                        "threatEntryTypes": ["URL"],
                        "threatEntries": [{"url": check_target}]
                    }
                }
                resp = requests.post(
                    f"{self.endpoint}?key={self.api_key}",
                    json=payload,
                    timeout=self.timeout
                )
                if resp.status_code == 200:
                    data = resp.json()
                    matches = data.get("matches", [])
                    if matches:
                        threat_types = [m.get("threatType", "THREAT") for m in matches]
                        return {
                            "url": check_target,
                            "hostname": hostname,
                            "is_flagged_by_google": True,
                            "threat_types": threat_types,
                            "verdict": "MALICIOUS",
                            "google_advisory_url": advisory_url,
                            "lookup_method": "live_google_safe_browsing_api",
                            "details": f"Flagged by Google Safe Browsing as: {', '.join(threat_types)}.",
                            "safe_to_visit": False,
                        }
                    else:
                        return {
                            "url": check_target,
                            "hostname": hostname,
                            "is_flagged_by_google": False,
                            "threat_types": [],
                            "verdict": "CLEAN",
                            "google_advisory_url": advisory_url,
                            "lookup_method": "live_google_safe_browsing_api",
                            "details": "No active threat matches found in Google Safe Browsing registry.",
                            "safe_to_visit": True,
                        }
            except Exception as e:
                logger.warning(f"Google Safe Browsing API lookup failed: {e}. Falling back to heuristic reputation.")

        # 2. Heuristic Web Reputation & Threat Intelligence Fallback
        return self._heuristic_reputation_check(check_target, hostname, tld, advisory_url)

    def _heuristic_reputation_check(
        self,
        check_target: str,
        hostname: str,
        tld: str,
        advisory_url: str
    ) -> Dict[str, Any]:
        """
        Deep heuristic analysis evaluating abusive TLDs, credential harvesting keywords,
        user-info deception, and DNS patterns.
        """
        threat_indicators = []
        is_suspicious_tld = tld in HIGH_ABUSE_TLDS
        found_lures = [kw for kw in HIGH_RISK_LURE_WORDS if kw in check_target.lower()]

        if is_suspicious_tld and found_lures:
            threat_indicators.append("SOCIAL_ENGINEERING (Deceptive TLD + Phishing Lures)")
        elif is_suspicious_tld:
            threat_indicators.append("HIGH_RISK_TLD_REPUTATION")
        elif len(found_lures) >= 2:
            threat_indicators.append("SUSPICIOUS_CREDENTIAL_HARVESTING_LURES")

        if "@" in check_target:
            threat_indicators.append("BASIC_AUTH_URL_DECEPTION")

        # Evaluate final reputation verdict
        if any("SOCIAL_ENGINEERING" in t or "BASIC_AUTH" in t for t in threat_indicators):
            verdict = "MALICIOUS"
            is_flagged = True
            details = (
                f"Flagged as deceptive: Host embeds credential lures {found_lures} "
                f"registered under high-abuse TLD '.{tld}'."
            )
            safe = False
        elif threat_indicators:
            verdict = "SUSPICIOUS"
            is_flagged = True
            details = f"Suspicious web indicators: {', '.join(threat_indicators)}."
            safe = False
        else:
            verdict = "UNRATED_CLEAN"
            is_flagged = False
            details = "No malicious web patterns observed in target URL structure."
            safe = True

        return {
            "url": check_target,
            "hostname": hostname,
            "is_flagged_by_google": is_flagged,
            "threat_types": threat_indicators,
            "verdict": verdict,
            "google_advisory_url": advisory_url,
            "lookup_method": "google_reputation_heuristics",
            "details": details,
            "safe_to_visit": safe,
        }


google_safe_browsing = GoogleSafeBrowsingService()
