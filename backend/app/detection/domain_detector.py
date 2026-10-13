import re
from urllib.parse import urlparse
from typing import Dict, Any, List, Optional, Set
from dataclasses import dataclass, field

from backend.app.detection.base import DetectionSignal, RiskEvaluation, RiskScoreEngine, BaseDetector
from backend.app.detection.similarity import NameSimilarityService, SUSPICIOUS_KEYWORDS, LEET_MAP
from backend.app.detection.social_detector import DetectionOutcome

# High-risk TLDs commonly abused in automated phishing / brand impersonation
HIGH_RISK_TLDS: Set[str] = {
    "xyz", "top", "online", "site", "club", "vip", "work", "cc", "buzz",
    "cfd", "sbs", "rest", "surf", "icu", "cam", "fit", "tk", "ml", "ga", "cf", "gq"
}

PHISHING_INTENT_KEYWORDS: List[str] = [
    "login", "signin", "sign-in", "auth", "portal", "verify", "verification",
    "secure", "security", "account", "wallet", "kyc", "claims", "support",
    "helpdesk", "recover", "recovery", "refund", "update", "banking", "token",
    "bonus", "rewards", "claim", "dispute", "compliance", "confirm"
]


def extract_domain_components(raw_input: str) -> Dict[str, str]:
    """
    Extract clean domain, hostname, SLD (second-level domain), and TLD from raw input or URL.
    Handles:
    - 'https://secure-login.apexpay.com/auth' -> hostname: 'secure-login.apexpay.com', sld: 'apexpay', tld: 'com'
    - 'apexpay-login.xyz' -> hostname: 'apexpay-login.xyz', sld: 'apexpay-login', tld: 'xyz'
    """
    cleaned = raw_input.strip().lower()
    if not cleaned.startswith(("http://", "https://")):
        cleaned = "https://" + cleaned

    try:
        parsed = urlparse(cleaned)
        hostname = (parsed.hostname or "").strip().lower()
    except Exception:
        hostname = raw_input.strip().lower().split("/")[0]

    # Strip port if present
    if ":" in hostname:
        hostname = hostname.split(":")[0]

    parts = hostname.split(".")
    if len(parts) >= 2:
        tld = parts[-1]
        sld = parts[-2]
    else:
        tld = ""
        sld = hostname

    return {
        "hostname": hostname,
        "sld": sld,
        "tld": tld,
        "parts": parts,
    }


class DomainDetector(BaseDetector):
    """
    Evaluates suspicious candidate domains against verified brand domain assets.
    Detects typosquatting, TLD-swaps, homoglyphs, and phishing-intent keyword lures.
    """

    def evaluate(self, candidate: Dict[str, Any], brand_profile: Dict[str, Any]) -> List[DetectionSignal]:
        """BaseDetector interface implementation."""
        outcome = self.evaluate_full(candidate, brand_profile)
        return outcome.risk_evaluation.signals

    def evaluate_full(self, candidate: Dict[str, Any], brand_profile: Dict[str, Any]) -> DetectionOutcome:
        """
        Comprehensive domain evaluation checking for official exclusions,
        similarity to official domains, homoglyphs, and phishing intent signals.
        """
        brand_name = brand_profile.get("name", "")
        official_domain_objs = brand_profile.get("domains", [])
        official_domain_names = [
            d.get("domain", "").strip().lower()
            for d in official_domain_objs
            if d.get("domain")
        ]

        raw_candidate = (
            candidate.get("candidate_name") or
            candidate.get("domain") or
            candidate.get("source_url") or
            candidate.get("url") or ""
        ).strip()

        components = extract_domain_components(raw_candidate)
        candidate_hostname = components["hostname"]
        candidate_sld = components["sld"]
        candidate_tld = components["tld"]

        if not candidate_hostname:
            return DetectionOutcome(
                is_official=False,
                exclusion_reason=None,
                risk_evaluation=RiskEvaluation(total_score=0.0, severity="LOW", signals=[]),
                evidence_records=[],
            )

        # -------------------------------------------------------------
        # 1. Official Domain Asset Exclusion Check
        # -------------------------------------------------------------
        for off_dom in official_domain_names:
            off_comp = extract_domain_components(off_dom)
            off_hostname = off_comp["hostname"]

            # Exact match: candidate is the official domain
            if candidate_hostname == off_hostname:
                return DetectionOutcome(
                    is_official=True,
                    exclusion_reason=f"Exact match against verified official domain '{off_dom}'.",
                    risk_evaluation=RiskEvaluation(total_score=0.0, severity="LOW", signals=[]),
                    evidence_records=[],
                )

            # Legitimate authorized subdomain of official domain (e.g. auth.apexpay.com of apexpay.com)
            if candidate_hostname.endswith("." + off_hostname):
                return DetectionOutcome(
                    is_official=True,
                    exclusion_reason=f"Authorized subdomain of verified official domain '{off_dom}'.",
                    risk_evaluation=RiskEvaluation(total_score=0.0, severity="LOW", signals=[]),
                    evidence_records=[],
                )

        # -------------------------------------------------------------
        # 2. Signal Generation (Candidate is NOT an official domain)
        # -------------------------------------------------------------
        signals: List[DetectionSignal] = []
        evidence: List[Dict[str, Any]] = []

        brand_compact = NameSimilarityService.normalize_compact(brand_name)
        brand_clean = brand_name.strip().lower()

        # Check official domain SLDs for comparison
        official_slds = [extract_domain_components(d)["sld"] for d in official_domain_names]
        target_slds = list(set([brand_compact, brand_clean] + [s for s in official_slds if s]))

        # Normalize candidate SLD for comparison
        cand_norm_sld = candidate_sld.replace("-", "").replace("_", "")

        # Signal A: Direct Brand Name / SLD Look-Alike & Typosquatting
        best_sim_score = 0.0
        best_sim_explanation = ""
        matched_target = ""

        for target in target_slds:
            if not target:
                continue
            sim = NameSimilarityService.compare(candidate_sld, target)
            if sim.similarity_score > best_sim_score:
                best_sim_score = sim.similarity_score
                best_sim_explanation = sim.explanation
                matched_target = target

        # De-leeted candidate SLD and hostname for normalized matching
        de_leeted_sld = candidate_sld
        for digit, char in LEET_MAP.items():
            de_leeted_sld = de_leeted_sld.replace(digit, char)

        # Check if the brand name is embedded as a prominent token in the hostname
        clean_hostname_compact = candidate_hostname.replace("-", "").replace(".", "")
        brand_embedded = (
            brand_compact in clean_hostname_compact or
            brand_compact in de_leeted_sld.replace("-", "") or
            any(t in candidate_hostname for t in target_slds if len(t) >= 4) or
            any(t in de_leeted_sld for t in target_slds if len(t) >= 4)
        )

        if best_sim_score >= 0.75 or (best_sim_score >= 0.60 and brand_embedded):
            score_impact = min(55.0, round(best_sim_score * 50.0, 1))
            signals.append(
                DetectionSignal(
                    signal_type="LOOKALIKE_DOMAIN",
                    severity_score=score_impact,
                    confidence=0.92,
                    explanation=(
                        f"Candidate domain SLD '{candidate_sld}' closely mimics verified brand target "
                        f"'{matched_target}' ({best_sim_score:.2f} similarity score). {best_sim_explanation}"
                    ),
                    evidence_fields=["candidate_domain", "similarity_score", "matched_target"]
                )
            )
            evidence.append({
                "evidence_type": "domain_typosquat_analysis",
                "description": f"Domain hostname '{candidate_hostname}' exhibits visual/lexical typosquatting of '{matched_target}'.",
                "source_reference": candidate_hostname,
            })

        # Signal B: Phishing Intent / Security Keywords in Hostname
        found_intent_keywords = [
            kw for kw in PHISHING_INTENT_KEYWORDS
            if kw in candidate_hostname
        ]
        if found_intent_keywords and brand_embedded:
            signals.append(
                DetectionSignal(
                    signal_type="PHISHING_KEYWORD_IN_DOMAIN",
                    severity_score=40.0,
                    confidence=0.90,
                    explanation=(
                        f"Candidate domain embeds high-risk credential-harvesting/phishing keyword(s): "
                        f"{found_intent_keywords} alongside brand token '{brand_name}'."
                    ),
                    evidence_fields=["phishing_keywords", "candidate_domain"]
                )
            )
            evidence.append({
                "evidence_type": "phishing_lure_detection",
                "description": f"Domain contains credential harvesting lure tokens: {', '.join(found_intent_keywords)}",
                "source_reference": candidate_hostname,
            })

        # Signal C: TLD-Swap Impersonation
        # Brand operates on a legitimate TLD, but candidate registers identical SLD on alternate TLD
        official_tlds = [extract_domain_components(d)["tld"] for d in official_domain_names]
        if candidate_sld in target_slds and candidate_tld and candidate_tld not in official_tlds:
            tld_score = 45.0 if candidate_tld in HIGH_RISK_TLDS else 35.0
            signals.append(
                DetectionSignal(
                    signal_type="TLD_SWAP_IMPERSONATION",
                    severity_score=tld_score,
                    confidence=0.95,
                    explanation=(
                        f"Candidate registered exact brand name '{candidate_sld}' under unverified TLD "
                        f"'.{candidate_tld}' (official TLDs: {', '.join('.' + t for t in official_tlds)})."
                    ),
                    evidence_fields=["candidate_tld", "official_tlds"]
                )
            )
            evidence.append({
                "evidence_type": "tld_impersonation",
                "description": f"TLD-swap attack observed: brand SLD '{candidate_sld}' registered on '.{candidate_tld}'.",
                "source_reference": candidate_hostname,
            })

        # Signal D: Leetspeak / Homoglyph Substitutions in Domain
        has_digit_substitution = False
        substituted_chars = []
        for char, sub in LEET_MAP.items():
            if char in candidate_sld and sub in brand_clean:
                has_digit_substitution = True
                substituted_chars.append(f"'{char}'->'{sub}'")

        if has_digit_substitution and brand_embedded:
            signals.append(
                DetectionSignal(
                    signal_type="HOMOGLYPH_SUBSTITUTION",
                    severity_score=35.0,
                    confidence=0.88,
                    explanation=(
                        f"Domain utilizes character homoglyph/leetspeak substitutions: "
                        f"{', '.join(substituted_chars)} to deceive users."
                    ),
                    evidence_fields=["homoglyphs", "candidate_sld"]
                )
            )
            evidence.append({
                "evidence_type": "homoglyph_analysis",
                "description": f"Leetspeak/character substitution detected: {', '.join(substituted_chars)}",
                "source_reference": candidate_hostname,
            })

        # -------------------------------------------------------------
        # 3. Calculate Risk & Return Consolidated Outcome
        # -------------------------------------------------------------
        risk_evaluation = RiskScoreEngine.calculate_risk(signals)

        return DetectionOutcome(
            is_official=False,
            exclusion_reason=None,
            risk_evaluation=risk_evaluation,
            evidence_records=evidence,
        )
