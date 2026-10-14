import logging
from typing import Dict, Any, List, Tuple
from backend.app.ai.groq_service import GroqAIService, groq_service

logger = logging.getLogger(__name__)

# Evaluation Dataset covering supported finding types & threat scenarios
EVALUATION_DATASET: List[Dict[str, Any]] = [
    {
        "id": "eval_typosquat_001",
        "scenario": "typosquatting_domain",
        "brand_profile": {
            "id": "brand_paytm_01",
            "name": "Paytm",
            "official_domains": ["paytm.com", "paytmbank.com"],
            "official_socials": ["@paytm"],
        },
        "finding": {
            "id": "find_001",
            "candidate_name": "paytmm.com",
            "asset_type": "domain",
            "source_url": "https://paytmm.com",
            "risk_score": 75.0,
            "severity": "high",
            "detection_source": "Lookalike Domain Scanner",
            "observed_at": "2026-10-14T06:00:00Z",
            "ml_model_version": "1.0",
            "ml_predicted_class": "SUSPICIOUS",
            "ml_confidence": 0.88,
        },
        "signals": [
            {
                "signal_type": "TYPOSQUAT_ADDITION",
                "severity": "high",
                "confidence": 0.90,
                "explanation": "Detected single-character repetition 'm' at end of brand name.",
            },
            {
                "signal_type": "KEYWORD_MATCH",
                "severity": "medium",
                "confidence": 0.80,
                "explanation": "Exact root brand token 'paytm' present inside domain.",
            },
        ],
        "evidence": [
            {
                "evidence_type": "DNS_A_RECORD",
                "description": "Domain resolves to untrusted external hosting IP 198.51.100.42.",
            }
        ],
        "comparison": {
            "similarity_to_brand_pct": 85.7,
            "levenshtein_distance": 1,
            "is_official_match": False,
            "suspicious_keywords": [],
        },
        "expected_facts": ["paytmm.com", "Paytm", "domain"],
        "disallowed_hallucinations": ["threat intelligence feed", "FBI alert", "CISA advisory"],
    },
    {
        "id": "eval_rogue_app_002",
        "scenario": "rogue_mobile_app",
        "brand_profile": {
            "id": "brand_apex_01",
            "name": "ApexPay",
            "official_domains": ["apexpay.com"],
            "official_socials": ["@apexpay"],
        },
        "finding": {
            "id": "find_002",
            "candidate_name": "ApexPay Pro Support APK",
            "asset_type": "app",
            "source_url": "http://free-apk-vault.net/apexpay-pro.apk",
            "risk_score": 90.0,
            "severity": "critical",
            "detection_source": "App Store Impersonation Monitor",
            "observed_at": "2026-10-14T06:10:00Z",
            "ml_model_version": "1.0",
            "ml_predicted_class": "MALICIOUS",
            "ml_confidence": 0.95,
        },
        "signals": [
            {
                "signal_type": "DEVELOPER_MISMATCH",
                "severity": "critical",
                "confidence": 0.95,
                "explanation": "Publisher 'Unknown Devs LLC' does not match verified developer 'ApexPay Inc'.",
            },
            {
                "signal_type": "UNOFFICIAL_MARKETPLACE",
                "severity": "high",
                "confidence": 0.90,
                "explanation": "Host domain 'free-apk-vault.net' is an unverified third-party APK distributor.",
            },
        ],
        "evidence": [
            {
                "evidence_type": "PACKAGE_HASH",
                "description": "SHA256 signature does not match official production keystore.",
            }
        ],
        "comparison": {
            "similarity_to_brand_pct": 78.0,
            "levenshtein_distance": 3,
            "is_official_match": False,
            "suspicious_keywords": ["support", "pro"],
        },
        "expected_facts": ["ApexPay Pro Support APK", "ApexPay", "app"],
        "disallowed_hallucinations": ["VirusTotal 60/70 engines", "Interpol warrant"],
    },
    {
        "id": "eval_official_allowlist_003",
        "scenario": "allowlist_official_domain",
        "brand_profile": {
            "id": "brand_paytm_01",
            "name": "Paytm",
            "official_domains": ["paytm.com", "help.paytm.com"],
            "official_socials": ["@paytm"],
        },
        "finding": {
            "id": "find_003",
            "candidate_name": "help.paytm.com",
            "asset_type": "domain",
            "source_url": "https://help.paytm.com",
            "risk_score": 0.0,
            "severity": "low",
            "detection_source": "Official Asset Scanner",
            "observed_at": "2026-10-14T06:15:00Z",
            "ml_model_version": None,
            "ml_predicted_class": "BENIGN",
            "ml_confidence": 0.99,
        },
        "signals": [
            {
                "signal_type": "OFFICIAL_ASSET_MATCH",
                "severity": "low",
                "confidence": 1.0,
                "explanation": "Exact sub-domain match against verified corporate asset inventory.",
            }
        ],
        "evidence": [
            {
                "evidence_type": "ALLOWLIST_ENTRY",
                "description": "Validated corporate domain under verified ownership.",
            }
        ],
        "comparison": {
            "similarity_to_brand_pct": 100.0,
            "levenshtein_distance": 0,
            "is_official_match": True,
            "suspicious_keywords": [],
        },
        "expected_facts": ["help.paytm.com", "Paytm", "domain"],
        "disallowed_hallucinations": ["phishing campaign", "credential harvester"],
    },
    {
        "id": "eval_phishing_url_004",
        "scenario": "credential_phishing_url",
        "brand_profile": {
            "id": "brand_apex_01",
            "name": "ApexPay",
            "official_domains": ["apexpay.com"],
            "official_socials": ["@apexpay"],
        },
        "finding": {
            "id": "find_004",
            "candidate_name": "login-apexpay-security.com",
            "asset_type": "domain",
            "source_url": "http://login-apexpay-security.com/verify",
            "risk_score": 85.0,
            "severity": "high",
            "detection_source": "URL Phishing ML Classifier",
            "observed_at": "2026-10-14T06:20:00Z",
            "ml_model_version": "1.0",
            "ml_predicted_class": "PHISHING",
            "ml_confidence": 0.92,
        },
        "signals": [
            {
                "signal_type": "PHISHING_KEYWORD_COMBO",
                "severity": "high",
                "confidence": 0.91,
                "explanation": "Combines high-risk tokens 'login', 'security', and 'verify'.",
            }
        ],
        "evidence": [
            {
                "evidence_type": "HTTP_REDIRECT",
                "description": "Page mimics corporate single sign-on form without valid SSL certificate.",
            }
        ],
        "comparison": {
            "similarity_to_brand_pct": 65.0,
            "levenshtein_distance": 8,
            "is_official_match": False,
            "suspicious_keywords": ["login", "security", "verify"],
        },
        "expected_facts": ["login-apexpay-security.com", "ApexPay", "domain"],
        "disallowed_hallucinations": ["APT29 attribution", "Dark web ransom note"],
    },
    {
        "id": "eval_homoglyph_005",
        "scenario": "unicode_homoglyph_domain",
        "brand_profile": {
            "id": "brand_paytm_01",
            "name": "Paytm",
            "official_domains": ["paytm.com"],
            "official_socials": ["@paytm"],
        },
        "finding": {
            "id": "find_005",
            "candidate_name": "pаytm.com",  # Cyrillic 'а'
            "asset_type": "domain",
            "source_url": "https://xn--pytm-43d.com",
            "risk_score": 95.0,
            "severity": "critical",
            "detection_source": "Homoglyph Detector",
            "observed_at": "2026-10-14T06:25:00Z",
            "ml_model_version": "1.0",
            "ml_predicted_class": "SUSPICIOUS",
            "ml_confidence": 0.96,
        },
        "signals": [
            {
                "signal_type": "HOMOGLYPH_CYRILLIC",
                "severity": "critical",
                "confidence": 0.98,
                "explanation": "Punycode string 'xn--pytm-43d.com' contains Cyrillic small letter 'a' (U+0430).",
            }
        ],
        "evidence": [
            {
                "evidence_type": "PUNYCODE_DECODING",
                "description": "Visual spoofing attempt targeting Latin 'paytm.com'.",
            }
        ],
        "comparison": {
            "similarity_to_brand_pct": 90.0,
            "levenshtein_distance": 1,
            "is_official_match": False,
            "suspicious_keywords": [],
        },
        "expected_facts": ["pаytm.com", "Paytm", "domain"],
        "disallowed_hallucinations": ["Stolen database dumped online"],
    },
]


def evaluate_evidence_grounding(
    telemetry: Dict[str, Any],
    structured_analysis: Dict[str, Any],
    expected_facts: List[str],
    disallowed_hallucinations: List[str],
) -> Tuple[bool, List[str]]:
    """
    Checks that the AI output is grounded in actual telemetry and does not hallucinate
    unverified external threat intelligence feeds.
    """
    errors = []
    observed_facts = structured_analysis.get("observed_facts", [])
    facts_text = " ".join(observed_facts).lower()
    summary_text = structured_analysis.get("summary", "").lower()
    full_text = f"{facts_text} {summary_text}"

    # Verify expected facts appear in either observed facts or summary
    for fact in expected_facts:
        if fact.lower() not in full_text:
            errors.append(f"Expected grounded fact '{fact}' not found in AI analysis.")

    # Check for hallucinated intelligence claims
    for term in disallowed_hallucinations:
        if term.lower() in full_text:
            errors.append(f"AI response hallucinated unverified external intelligence: '{term}'.")

    return (len(errors) == 0, errors)


def evaluate_structured_schema(structured_analysis: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """Validates presence and non-emptiness of all mandatory epistemic fields."""
    errors = []
    required_keys = [
        "summary",
        "observed_facts",
        "model_inferences",
        "unverified_claims",
        "recommended_actions",
        "confidence_limitations",
    ]
    for key in required_keys:
        if key not in structured_analysis:
            errors.append(f"Missing mandatory epistemic field '{key}'.")
        elif key in ["observed_facts", "model_inferences", "unverified_claims", "recommended_actions"]:
            val = structured_analysis[key]
            if not isinstance(val, list) or len(val) == 0:
                errors.append(f"Epistemic list '{key}' is empty or not a list.")

    return (len(errors) == 0, errors)


def evaluate_unverified_claims_presence(structured_analysis: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """Asserts that the model explicitly documents knowledge gaps and unverified items."""
    errors = []
    claims = structured_analysis.get("unverified_claims", [])
    if not claims or len(claims) == 0:
        errors.append("Unverified claims section is empty; epistemic bounds violated.")
    return (len(errors) == 0, errors)


def evaluate_safety_invariants(
    finding: Dict[str, Any],
    result: Dict[str, Any],
) -> Tuple[bool, List[str]]:
    """Asserts that risk scores are immutable and automated takedowns are not triggered."""
    errors = []
    if result.get("detector_risk_score") != finding.get("risk_score"):
        errors.append("Detector risk score was altered during AI investigation.")
    if result.get("auto_confirmed") is not False:
        errors.append("AI investigation incorrectly enabled automated confirmation.")
    return (len(errors) == 0, errors)


def run_ai_grounding_evaluations(
    ai_service: GroqAIService = None,
) -> Dict[str, Any]:
    """
    Run evaluation pipeline against all test scenarios in the dataset.
    Returns metrics on grounding accuracy, schema adherence, and invariant enforcement.
    """
    service = ai_service or groq_service
    results = []
    passed_count = 0

    for item in EVALUATION_DATASET:
        scenario_id = item["id"]
        brief_result = service.generate_investigation_brief(
            brand_profile=item["brand_profile"],
            finding=item["finding"],
            signals=item["signals"],
            evidence=item["evidence"],
            comparison=item["comparison"],
        )
        analysis = brief_result.get("structured_analysis", {})

        schema_ok, schema_errs = evaluate_structured_schema(analysis)
        grounding_ok, ground_errs = evaluate_evidence_grounding(
            telemetry=item,
            structured_analysis=analysis,
            expected_facts=item["expected_facts"],
            disallowed_hallucinations=item["disallowed_hallucinations"],
        )
        claims_ok, claims_errs = evaluate_unverified_claims_presence(analysis)
        safety_ok, safety_errs = evaluate_safety_invariants(item["finding"], brief_result)

        all_errs = schema_errs + ground_errs + claims_errs + safety_errs
        is_pass = (len(all_errs) == 0)
        if is_pass:
            passed_count += 1

        results.append({
            "scenario_id": scenario_id,
            "scenario": item["scenario"],
            "passed": is_pass,
            "errors": all_errs,
            "execution_time_ms": brief_result.get("execution_time_ms"),
            "provider": brief_result.get("provider"),
        })

    total = len(EVALUATION_DATASET)
    return {
        "total_scenarios": total,
        "passed_scenarios": passed_count,
        "pass_rate_pct": round((passed_count / total) * 100.0, 1),
        "results": results,
    }
