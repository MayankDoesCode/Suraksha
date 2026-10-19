import re
from urllib.parse import urlparse

from backend.app.detection.similarity import levenshtein_distance

from backend.app.intel.permutations import TWO_LEVEL_SUFFIXES
from typing import Dict, Any, List, Optional, Set
from dataclasses import dataclass, field
import idna

from backend.app.detection.base import DetectionSignal, RiskEvaluation, RiskScoreEngine, BaseDetector
from backend.app.detection.similarity import NameSimilarityService, SUSPICIOUS_KEYWORDS, LEET_MAP
from backend.app.detection.social_detector import DetectionOutcome
from backend.app.detection.url_path_analysis import analyze_url_path, pick_url_with_path

# Base severity per structural red flag (URL_DECEPTIVE_STRUCTURE).
STRUCTURE_RULE_SCORES = {
    "USERINFO_DECEPTION": 35.0,
    "PAYLOAD_FILE_EXTENSION": 30.0,
    "IP_LITERAL_HOST": 25.0,
    "EMBEDDED_REDIRECT": 20.0,
    "SENSITIVE_QUERY_PARAMETER": 20.0,
}

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


def extract_domain_components(raw_input: str) -> Dict[str, Any]:
    """
    Extract clean domain, hostname, SLD (second-level domain), and TLD from raw input or URL.
    Standards-aware:
    - Decodes Punycode ('xn--...') to human-readable Unicode representation.
    - Encodes non-ASCII Unicode IDNs to standard Punycode/ASCII hostname.
    - Preserves original input safely.
    - Handles malformed inputs, invalid codepoints, null bytes, and protocol prefixes without throwing.
    """
    original_input = str(raw_input or "").strip()
    cleaned = original_input.lower()

    # Safely remove null bytes and control characters
    cleaned = re.sub(r"[\x00-\x1f\x7f-\x9f]", "", cleaned)

    if not cleaned.startswith(("http://", "https://")):
        cleaned_url = "https://" + cleaned
    else:
        cleaned_url = cleaned

    try:
        parsed = urlparse(cleaned_url)
        raw_host = (parsed.hostname or "").strip().lower()
    except Exception:
        raw_host = cleaned.split("/")[0]

    # Strip port if present
    if ":" in raw_host:
        raw_host = raw_host.split(":")[0]

    raw_host = raw_host.rstrip(".")

    # Standards-aware IDNA/Punycode normalization
    unicode_hostname = raw_host
    punycode_hostname = raw_host
    is_idn = False

    if raw_host:
        try:
            if "xn--" in raw_host:
                unicode_hostname = idna.decode(raw_host)
                punycode_hostname = raw_host
                is_idn = True
            elif any(ord(c) > 127 for c in raw_host):
                unicode_hostname = raw_host
                punycode_hostname = idna.encode(raw_host).decode("ascii")
                is_idn = True
            else:
                unicode_hostname = raw_host
                punycode_hostname = raw_host
        except Exception:
            # Catch malformed punycode, invalid codepoint, or decoding errors safely
            unicode_hostname = raw_host
            punycode_hostname = raw_host

    parts = unicode_hostname.split(".") if unicode_hostname else []
    if len(parts) >= 3 and ".".join(parts[-2:]) in TWO_LEVEL_SUFFIXES:
        tld = ".".join(parts[-2:])  # e.g. co.in, co.uk: the registrable label is the one before the suffix
        sld = parts[-3]
    elif len(parts) >= 2:
        tld = parts[-1]
        sld = parts[-2]
    else:
        tld = ""
        sld = unicode_hostname

    puny_parts = punycode_hostname.split(".") if punycode_hostname else []
    if len(puny_parts) >= 3 and ".".join(puny_parts[-2:]) in TWO_LEVEL_SUFFIXES:
        punycode_sld = puny_parts[-3]
    else:
        punycode_sld = puny_parts[-2] if len(puny_parts) >= 2 else punycode_hostname

    return {
        "original_input": original_input,
        "hostname": unicode_hostname,
        "unicode_hostname": unicode_hostname,
        "punycode_hostname": punycode_hostname,
        "sld": sld,
        "punycode_sld": punycode_sld,
        "tld": tld,
        "parts": parts,
        "is_idn": is_idn,
    }


def is_adjacent_transposition(a: str, b: str) -> bool:
    """True when `a` equals `b` with exactly one pair of adjacent characters swapped (a != b)."""
    if a == b or len(a) != len(b):
        return False
    diff = [i for i in range(len(a)) if a[i] != b[i]]
    return len(diff) == 2 and diff[1] == diff[0] + 1 and a[diff[0]] == b[diff[1]] and a[diff[1]] == b[diff[0]]


def has_exact_token(hostname: str, target: str) -> bool:
    """Short brand names (<4 chars) only count as embedded when they stand alone between separators or digits."""
    labels = hostname.lower().split(".")[:-1] or [hostname.lower()]
    return any(target in re.split(r"[-_\d]+", label) for label in labels)


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
        candidate_unicode_hostname = components["unicode_hostname"]
        candidate_punycode_hostname = components["punycode_hostname"]
        candidate_sld = components["sld"]
        candidate_tld = components["tld"]

        if not candidate_hostname and not candidate_unicode_hostname:
            return DetectionOutcome(
                is_official=False,
                exclusion_reason=None,
                risk_evaluation=RiskEvaluation(total_score=0.0, severity="LOW", signals=[]),
                evidence_records=[],
            )

        # -------------------------------------------------------------
        # 1. Official Domain Asset Exclusion Check
        # Check against both standard ASCII/Punycode and decoded Unicode representations.
        # Strict equality preserves script boundaries (e.g. Cyrillic 'а' != Latin 'a').
        # -------------------------------------------------------------
        for off_dom in official_domain_names:
            off_comp = extract_domain_components(off_dom)
            off_unicode_host = off_comp["unicode_hostname"]
            off_punycode_host = off_comp["punycode_hostname"]

            # Exact match: candidate is the official domain
            if (candidate_unicode_hostname and candidate_unicode_hostname == off_unicode_host) or \
               (candidate_punycode_hostname and candidate_punycode_hostname == off_punycode_host):
                return DetectionOutcome(
                    is_official=True,
                    exclusion_reason=f"Exact match against verified official domain '{off_dom}'.",
                    risk_evaluation=RiskEvaluation(total_score=0.0, severity="LOW", signals=[]),
                    evidence_records=[],
                )

            # Legitimate authorized subdomain of official domain (e.g. auth.apexpay.com of apexpay.com)
            if (off_unicode_host and candidate_unicode_hostname.endswith("." + off_unicode_host)) or \
               (off_punycode_host and candidate_punycode_hostname.endswith("." + off_punycode_host)):
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

        # Unicode Confusable Homoglyph Analysis (UTS #39)
        # Derive Latin equivalent if candidate uses mixed-script / confusable glyphs (e.g. Cyrillic, Greek)
        resolved_latin_sld, confusables_found = NameSimilarityService.resolve_confusables(candidate_sld)
        if confusables_found:
            confusable_sim = 0.0
            matched_conf_target = ""
            for target in target_slds:
                if not target:
                    continue
                if resolved_latin_sld == target or target in resolved_latin_sld:
                    confusable_sim = 1.0
                    matched_conf_target = target
                    break
                sim_res = NameSimilarityService.compare(resolved_latin_sld, target)
                if sim_res.similarity_score > confusable_sim:
                    confusable_sim = sim_res.similarity_score
                    matched_conf_target = target

            if confusable_sim >= 0.75:
                confusable_details = ", ".join(
                    f"{c['script']} '{c['character']}' ({c['codepoint']})->'{c['latin_replacement']}'"
                    for c in confusables_found[:4]
                )
                signals.append(
                    DetectionSignal(
                        signal_type="UNICODE_HOMOGLYPH_IMPERSONATION",
                        severity_score=55.0,
                        confidence=0.96,
                        explanation=(
                            f"Domain '{candidate_unicode_hostname}' ({candidate_hostname}) uses deceptive "
                            f"Unicode/Punycode homoglyphs: {confusable_details} mimicking brand target '{matched_conf_target}'."
                        ),
                        evidence_fields=["unicode_hostname", "punycode_hostname", "homoglyphs", "target_brand"]
                    )
                )
                evidence.append({
                    "evidence_type": "unicode_confusable_analysis",
                    "description": (
                        f"Deceptive Unicode homoglyphs: {confusable_details}. "
                        f"Target brand: '{matched_conf_target}'. Canonical Latin resolution: '{resolved_latin_sld}'."
                    ),
                    "source_reference": components.get("original_input", candidate_hostname),
                })

        # Normalize candidate SLD for comparison
        cand_norm_sld = candidate_sld.replace("-", "").replace("_", "")

        # Signal A: Direct Brand Name / SLD Look-Alike & Typosquatting
        best_sim_score = 0.0
        best_sim_explanation = ""
        matched_target = ""

        # Test both candidate SLD and confusable-resolved SLD
        candidate_sld_variants = [candidate_sld]
        if resolved_latin_sld and resolved_latin_sld != candidate_sld:
            candidate_sld_variants.append(resolved_latin_sld)

        for sld_var in candidate_sld_variants:
            for target in target_slds:
                if not target:
                    continue
                if len(target) < 4:
                    # Containment similarity on 3-letter names flags every word that starts with them ("sbirthday"),
                    # so only a standalone token or a single edit counts.
                    if target in re.split(r"[-_\d]+", sld_var):
                        short_score, why = 0.90, "The verified short brand name appears as a standalone token."
                    elif levenshtein_distance(sld_var, target) <= 1:
                        short_score, why = 0.78, "The name is one character edit away from the verified short brand name."
                    else:
                        continue
                    if short_score > best_sim_score:
                        best_sim_score, best_sim_explanation, matched_target = short_score, why, target
                    continue
                sim = NameSimilarityService.compare(sld_var, target)
                if sim.similarity_score > best_sim_score:
                    best_sim_score = sim.similarity_score
                    best_sim_explanation = sim.explanation
                    matched_target = target

        # A single adjacent-character swap (patym / paytm) is a classic typo-squat but scores low on edit distance.
        for sld_var in candidate_sld_variants:
            for target in target_slds:
                if target and len(target) >= 5 and " " not in target and is_adjacent_transposition(sld_var, target) and best_sim_score < 0.88:
                    best_sim_score = 0.88
                    best_sim_explanation = "Two adjacent characters are swapped relative to the verified name (transposition typo-squat)."
                    matched_target = target

        # De-leeted candidate SLD and hostname for normalized matching
        de_leeted_sld = resolved_latin_sld or candidate_sld
        for digit, char in LEET_MAP.items():
            de_leeted_sld = de_leeted_sld.replace(digit, char)

        # Check if the brand name is embedded as a prominent token in the hostname
        clean_hostname_compact = candidate_hostname.replace("-", "").replace(".", "")
        clean_unicode_compact = candidate_unicode_hostname.replace("-", "").replace(".", "")
        resolved_hostname = candidate_hostname
        if resolved_latin_sld and candidate_sld in candidate_unicode_hostname:
            resolved_hostname = candidate_unicode_hostname.replace(candidate_sld, resolved_latin_sld)

        brand_embedded = (
            brand_compact in clean_hostname_compact or
            brand_compact in clean_unicode_compact or
            brand_compact in de_leeted_sld.replace("-", "") or
            any(t in candidate_hostname for t in target_slds if len(t) >= 4) or
            any(t in resolved_hostname for t in target_slds if len(t) >= 4) or
            any(t in de_leeted_sld for t in target_slds if len(t) >= 4) or
            any(has_exact_token(candidate_hostname, t) for t in target_slds if t and 3 <= len(t) < 4 and " " not in t)
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
                "source_reference": components.get("original_input", candidate_hostname),
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

        # Signals E/F: URL path and structure. Weak on their own ("/login" is normal on
        # most sites), so they only count when the URL is also tied to the protected
        # brand: via the hostname, or via the brand name appearing in the path/userinfo.
        url_with_path = pick_url_with_path(
            candidate.get("source_url"), candidate.get("url"), candidate.get("candidate_name"), candidate.get("domain")
        )
        if url_with_path:
            path_tokens = [t for t in target_slds + [brand_compact, brand_clean] if t]
            path_analysis = analyze_url_path(url_with_path, path_tokens)
            host_related = bool(brand_embedded or best_sim_score >= 0.60)
            brand_in_path = list(path_analysis.brand_tokens_in_path)
            brand_in_userinfo = list(path_analysis.brand_tokens_in_userinfo)
            brand_related = host_related or bool(brand_in_path) or bool(brand_in_userinfo)

            if path_analysis.lure_tokens and brand_related:
                lures = path_analysis.lure_tokens
                if host_related:
                    lure_score = 25.0 + (5.0 if (brand_in_path or len(lures) >= 2) else 0.0)
                    lure_conf = 0.80
                    context = "on a hostname that already resembles the brand"
                else:
                    lure_score, lure_conf = 20.0, 0.60
                    context = (
                        f"on host '{path_analysis.hostname}', which does not itself resemble the brand, "
                        f"but the path names the brand ({', '.join(brand_in_path)}); "
                        "verify the host is not a legitimate third-party page"
                    )
                signals.append(
                    DetectionSignal(
                        signal_type="URL_PATH_CREDENTIAL_LURE",
                        severity_score=lure_score,
                        confidence=lure_conf,
                        explanation=(
                            f"URL path '{path_analysis.path[:80]}' contains credential-lure token(s) {lures} {context}."
                        ),
                        evidence_fields=["url_path", "lure_tokens", "brand_in_path"],
                    )
                )
                evidence.append({
                    "evidence_type": "url_path_lure",
                    "description": (
                        f"Path tokens {lures} matched the credential-lure list; brand tokens in path: "
                        f"{brand_in_path or 'none'}. Rule-based, not an ML prediction."
                    ),
                    "source_reference": url_with_path[:200],
                })

            if path_analysis.structure_findings and brand_related:
                findings = sorted(
                    path_analysis.structure_findings, key=lambda f: -STRUCTURE_RULE_SCORES.get(f.rule_id, 15.0)
                )
                base = STRUCTURE_RULE_SCORES.get(findings[0].rule_id, 15.0)
                struct_score = min(45.0, base + 5.0 * (len(findings) - 1))
                signals.append(
                    DetectionSignal(
                        signal_type="URL_DECEPTIVE_STRUCTURE",
                        severity_score=struct_score,
                        confidence=0.80,
                        explanation="Suspicious URL structure alongside brand context: " + " ".join(f.detail for f in findings),
                        evidence_fields=["url_structure", "rule_ids"],
                    )
                )
                evidence.append({
                    "evidence_type": "url_structure_analysis",
                    "description": "Rules fired: " + ", ".join(f.rule_id for f in findings) + ". Rule-based, not an ML prediction.",
                    "source_reference": url_with_path[:200],
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
