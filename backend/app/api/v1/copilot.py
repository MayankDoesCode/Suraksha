import re
import time
import logging
from typing import Dict, Any, List, Optional
from flask import Blueprint, request, jsonify, current_app

from backend.app.utils.limiter import limiter

from backend.app.intel.google_safe_browsing import google_safe_browsing
from backend.app.intel.threat_feed import threat_feed_service
from backend.app.intel.permutations import generate as generate_permutations
from backend.app.detection.brand_extractor import BrandExtractor
from backend.app.detection.domain_detector import DomainDetector
from backend.app.ai.groq_service import groq_service
from backend.app.utils.auth import get_authenticated_user_optional

logger = logging.getLogger(__name__)

copilot_bp = Blueprint("copilot", __name__)
domain_detector = DomainDetector()


def extract_url_from_text(text: str) -> Optional[str]:
    """Extract first valid HTTP/HTTPS URL or domain string from free text."""
    if not text:
        return None
    url_pattern = r"(https?://[^\s]+|[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z0-9]{2,}(?:/[^\s]*)?)"
    match = re.search(url_pattern, text)
    if match:
        return match.group(0).rstrip(".,;:?!)")
    return None


@copilot_bp.route("/copilot/verify-url", methods=["POST"])
@limiter.limit(lambda: current_app.config.get("RATELIMIT_AI", "15 per minute"))
def verify_url():
    """
    Unified URL & Domain Verification:
    1. Google Safe Browsing & Web Reputation check.
    2. Auto-Brand Detection (extracts targeted brand like PayPal, Apple, or custom).
    3. Multi-layer rule-based heuristic scoring (subdomain hijack, combosquatting, lure keywords).
    """
    payload = request.get_json(silent=True) or {}
    raw_url = payload.get("url") or payload.get("target") or payload.get("candidate_name") or ""
    override_brand = payload.get("brand_name") or payload.get("target_brand")

    if not raw_url.strip():
        return jsonify({
            "success": False,
            "error": {
                "code": "MISSING_URL",
                "message": "Please provide a valid URL or domain string to inspect."
            }
        }), 400

    # 1. Google Safe Browsing Intelligence Check
    google_intel = google_safe_browsing.check_url(raw_url)

    # 2. Target Brand Extraction
    brand_intel = BrandExtractor.detect_target_brand(raw_url, registered_brand_name=override_brand)
    target_brand_name = brand_intel["brand_name"]
    official_domain = brand_intel.get("official_domain") or f"{target_brand_name.lower().replace(' ', '')}.com"

    # 3. Suraksha Deep Heuristic Domain Evaluation
    synthetic_brand_profile = {
        "name": target_brand_name,
        "domains": [{"domain": official_domain}] if official_domain else []
    }
    detection_outcome = domain_detector.evaluate_full(
        {"candidate_name": raw_url, "source_url": raw_url},
        synthetic_brand_profile
    )

    risk_eval = detection_outcome.risk_evaluation
    signals = [
        {
            "signal_type": s.signal_type,
            "severity_score": s.severity_score,
            "confidence": s.confidence,
            "explanation": s.explanation,
        }
        for s in risk_eval.signals
    ]

    # Combine Google Safe Browsing severity if flagged
    final_score = risk_eval.total_score
    if google_intel.get("is_flagged_by_google"):
        final_score = max(final_score, 85.0)

    severity = "CRITICAL" if final_score >= 70.0 else ("HIGH" if final_score >= 45.0 else ("MEDIUM" if final_score >= 25.0 else "LOW"))
    is_threat = severity in ("CRITICAL", "HIGH", "MEDIUM") or google_intel.get("is_flagged_by_google", False)

    # Plain-English Executive Synthesis
    if is_threat:
        summary = (
            f"⚠️ THREAT DETECTED: Target URL impersonates '{target_brand_name}'. "
            f"Exhibits {len(signals)} adversarial signal(s) with threat score {final_score:.1f}/100 ({severity}). "
            f"Google Safe Browsing status: {google_intel.get('details')}."
        )
    else:
        summary = (
            f"Clean / Low Risk: No active brand impersonation indicators or malware patterns observed "
            f"for '{target_brand_name}'. Score: {final_score:.1f}/100."
        )

    return jsonify({
        "success": True,
        "data": {
            "target_url": raw_url,
            "is_threat": is_threat,
            "severity": severity,
            "threat_score": round(final_score, 1),
            "summary": summary,
            "detected_brand": brand_intel,
            "google_safe_browsing": google_intel,
            "signals": signals,
            "evidence": detection_outcome.evidence_records,
            "recommended_action": (
                "Issue registrar abuse notice and block host on perimeter DNS."
                if is_threat else "Routine logging; no adversarial action required."
            )
        }
    }), 200


@copilot_bp.route("/copilot/chat", methods=["POST"])
@limiter.limit(lambda: current_app.config.get("RATELIMIT_AI", "15 per minute"))
def copilot_chat():
    """
    AI Security Copilot Chatbot:
    Accepts user prompts, inspects URLs, grounds responses in real Google Safe Browsing
    and Suraksha detector telemetry, and answers analyst queries.
    """
    payload = request.get_json(silent=True) or {}
    message = payload.get("message") or payload.get("prompt") or ""
    explicit_url = payload.get("url")
    target_brand = payload.get("target_brand")
    history = payload.get("history") or []

    if not message.strip() and not explicit_url:
        return jsonify({
            "success": False,
            "error": {
                "code": "MISSING_MESSAGE",
                "message": "Message or URL is required."
            }
        }), 400

    # Extract target URL from explicit parameter or message body
    url_to_inspect = explicit_url or extract_url_from_text(message)
    inspection_data = None

    if url_to_inspect:
        # 1. Google Safe Browsing
        google_intel = google_safe_browsing.check_url(url_to_inspect)

        # 2. Brand Detection
        brand_intel = BrandExtractor.detect_target_brand(url_to_inspect, registered_brand_name=target_brand)
        t_brand = brand_intel["brand_name"]
        t_domain = brand_intel.get("official_domain") or f"{t_brand.lower().replace(' ', '')}.com"

        # 3. Rules Detection
        outcome = domain_detector.evaluate_full(
            {"candidate_name": url_to_inspect, "source_url": url_to_inspect},
            {"name": t_brand, "domains": [{"domain": t_domain}]}
        )

        score = outcome.risk_evaluation.total_score
        if google_intel.get("is_flagged_by_google"):
            score = max(score, 85.0)

        signals = [s.signal_type for s in outcome.risk_evaluation.signals]
        sev = "CRITICAL" if score >= 70.0 else ("HIGH" if score >= 45.0 else ("MEDIUM" if score >= 25.0 else "LOW"))

        inspection_data = {
            "url": url_to_inspect,
            "target_brand": t_brand,
            "threat_score": round(score, 1),
            "severity": sev,
            "signals": signals,
            "google_status": google_intel.get("details"),
            "google_verdict": google_intel.get("verdict"),
            "is_flagged_by_google": google_intel.get("is_flagged_by_google"),
            "advisory_url": google_intel.get("google_advisory_url"),
        }

    # Compute contextual suggested actions
    suggested_actions = []
    if inspection_data:
        target_brand = inspection_data["target_brand"]
        target_url = inspection_data["url"]
        if inspection_data["severity"] in ("CRITICAL", "HIGH", "MEDIUM"):
            suggested_actions = [
                {
                    "type": "draft_takedown",
                    "label": "Draft Takedown Notice",
                    "url": target_url,
                    "target_brand": target_brand,
                },
                {
                    "type": "open_lookalike",
                    "label": "Inspect Lookalike Engine",
                    "url": target_url,
                    "target_brand": target_brand,
                },
                {
                    "type": "generate_permutations",
                    "label": f"Generate {target_brand} Permutations",
                    "target": target_brand,
                },
            ]
        else:
            suggested_actions = [
                {
                    "type": "generate_permutations",
                    "label": f"Hunt Proactive Lookalikes for {target_brand}",
                    "target": target_brand,
                },
                {
                    "type": "open_lookalike",
                    "label": "Open Lookalike Engine",
                    "url": target_url,
                    "target_brand": target_brand,
                },
            ]
    else:
        suggested_actions = [
            {"type": "prompt", "label": "Scan PayPal Lookalike", "prompt": "Check https://paypal-security-login.xyz"},
            {"type": "prompt", "label": "Draft Abuse Email", "prompt": "Draft registrar abuse notice for paypal-security-login.xyz"},
            {"type": "prompt", "label": "Explain Combosquatting", "prompt": "How does combosquatting work?"},
            {"type": "prompt", "label": "Explain Homoglyphs", "prompt": "How do homoglyph and punycode attacks work?"},
        ]

    # Generate conversational AI response
    ai_response = _generate_copilot_response(message, inspection_data, history)

    return jsonify({
        "success": True,
        "data": {
            "response": ai_response,
            "inspection": inspection_data,
            "suggested_actions": suggested_actions,
        }
    }), 200


def _generate_copilot_response(
    user_message: str,
    inspection_data: Optional[Dict[str, Any]],
    history: List[Dict[str, str]]
) -> str:
    """
    Generate evidence-grounded AI copilot response using Groq LLM (or deterministic fallback).
    """
    msg_lower = (user_message or "").lower()

    if inspection_data:
        context_prompt = (
            f"You are the Suraksha AI Cyber Defense Copilot.\n"
            f"The analyst provided a link to inspect: {inspection_data['url']}\n"
            f"SURAKSHA GROUND-TRUTH TELEMETRY:\n"
            f"- Targeted Impersonated Brand: {inspection_data['target_brand']}\n"
            f"- Threat Severity: {inspection_data['severity']} (Score: {inspection_data['threat_score']}/100)\n"
            f"- Rule Signals Detected: {', '.join(inspection_data['signals']) or 'None'}\n"
            f"- Google Safe Browsing Intelligence: {inspection_data['google_status']}\n\n"
            f"User Question: \"{user_message}\"\n\n"
            f"Instructions:\n"
            f"1. Clearly state whether the link is malicious/fraudulent or safe.\n"
            f"2. Explain which brand it attacks and the exact deception tricks used (subdomains, combosquatting, lure words, deceptive TLD).\n"
            f"3. Quote Google Safe Browsing status.\n"
            f"4. Provide 2-3 concrete security recommendations (e.g. takedown notice, block on DNS, alert staff).\n"
            f"5. Keep the tone professional, authoritative, and concise."
        )
    else:
        context_prompt = (
            f"You are the Suraksha AI Cyber Defense Copilot, an enterprise brand protection assistant.\n"
            f"User Question: \"{user_message}\"\n"
            f"Answer the user's cybersecurity question with authoritative, actionable, and structured guidance."
        )

    # 1. Attempt Groq LLM execution if client is configured
    if groq_service.is_available():
        try:
            client = groq_service._client
            messages = [{"role": "system", "content": context_prompt}]
            for h in history[-4:]:
                messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})
            messages.append({"role": "user", "content": user_message or "Analyze this URL."})

            completion = client.chat.completions.create(
                model=groq_service.model,
                messages=messages,
                temperature=0.2,
                max_tokens=600,
            )
            return completion.choices[0].message.content
        except Exception as e:
            logger.warning(f"Groq LLM call failed: {e}. Falling back to structured synthesis.")

    # 2. Evidence-Grounded Deterministic Synthesis Fallback
    # Intent: Takedown or abuse notice request
    if any(k in msg_lower for k in ("takedown", "dmca", "abuse email", "abuse notice", "cease and desist", "draft notice")):
        url_match = (inspection_data["url"] if inspection_data else extract_url_from_text(user_message)) or "suspicious-domain-login.xyz"
        brand_guess = (inspection_data["target_brand"] if inspection_data else BrandExtractor.detect_target_brand(url_match)["brand_name"])
        return (
            f"### 📋 **RFC-Compliant Abuse Takedown Notice Template**\n\n"
            f"Here is an authoritative abuse notice ready to send to the host or domain registrar for **`{url_match}`**:\n\n"
            f"```text\n"
            f"To: abuse@{url_match.split('/')[0]} (or authoritative registrar abuse mailbox)\n"
            f"Subject: URGENT: Copyright & Trademark Infringement / Phishing Report - [{url_match}]\n\n"
            f"Dear Abuse & Trust & Safety Team,\n\n"
            f"I am writing on behalf of the Brand Security Operations Center for {brand_guess}.\n\n"
            f"We have detected active brand impersonation and credential harvesting hosted on your network:\n"
            f"- Infringing URL: {url_match}\n"
            f"- Targeted Intellectual Property: {brand_guess}\n"
            f"- First Observed: {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}\n"
            f"- Violation: Phishing, Deceptive Impersonation, Trademark Misuse\n\n"
            f"The site attempts to deceive consumers into disclosing credentials and personal data under our brand identity.\n\n"
            f"We urgently request that you immediately suspend domain resolution and terminate the hosting service for this host pursuant to your Acceptable Use Policy.\n\n"
            f"Sincerely,\n"
            f"Suraksha Cyber Defense Operations Team\n"
            f"https://suraksha.cyberdefense.local\n"
            f"```\n\n"
            f"💡 *Tip: You can also use Suraksha's built-in Takedown Modal to send this notice directly to registrar APIs.*"
        )

    if inspection_data:
        brand = inspection_data["target_brand"]
        score = inspection_data["threat_score"]
        sev = inspection_data["severity"]
        signals_list = inspection_data["signals"] if inspection_data["signals"] else ["No specific patterns"]
        signals_str = ", ".join(signals_list)
        google_stat = inspection_data["google_status"]
        google_verdict = inspection_data.get("google_verdict", "INSPECTED")

        if sev in ("CRITICAL", "HIGH"):
            return (
                f"### ⚠️ **CRITICAL THREAT: Fraudulent Impersonation Detected**\n\n"
                f"The URL **`{inspection_data['url']}`** is an active adversarial link designed to mimic **{brand}**.\n\n"
                f"- **Target Brand:** {brand}\n"
                f"- **Threat Score:** {score}/100 ({sev})\n"
                f"- **Adversarial Signals:** {signals_str}\n"
                f"- **Google Safe Browsing & Reputation:** {google_verdict} — {google_stat}\n\n"
                f"#### **Recommended Defensive Actions:**\n"
                f"1. **Immediate Takedown:** Submit an abuse notice to the domain's authoritative registrar.\n"
                f"2. **DNS Sinkholing:** Block `{inspection_data['url']}` on corporate firewalls and DNS filters.\n"
                f"3. **Advisory Submission:** Submit this domain directly to Google Safe Browsing and Microsoft Defender SmartScreen."
            )
        else:
            return (
                f"### 🛡️ **URL Evaluation: Clean / Low Impersonation Risk**\n\n"
                f"The URL **`{inspection_data['url']}`** showed low threat probability against **{brand}**.\n\n"
                f"- **Threat Score:** {score}/100 ({sev})\n"
                f"- **Signals:** {signals_str}\n"
                f"- **Google Status:** {google_verdict} ({google_stat})\n\n"
                f"No urgent takedown action indicated."
            )

    # Intent: Combosquatting explanation
    if "combosquat" in msg_lower:
        return (
            "### 🔬 **Combosquatting: Adversarial Anatomy & Detection**\n\n"
            "**Combosquatting** occurs when an attacker registers a domain combining a legitimate brand name with trusted operational keywords.\n\n"
            "#### Common Combosquatting Patterns:\n"
            "- **Authentication Lures:** `brand-login.com`, `brand-verify.net`, `signin-brand.top`\n"
            "- **Support & Security:** `brand-security-help.com`, `brand-support-desk.org`\n"
            "- **Financial & Billing:** `brand-billing-update.com`, `brand-rewards-claim.info`\n\n"
            "#### Why Combosquatting is Dangerous:\n"
            "Unlike typosquatting (which relies on accidental mistypes like `gogle.com`), combosquatting is used in **spear-phishing and SMS lure campaigns**. Victims intentionally click the link believing it represents a specialized corporate sub-service.\n\n"
            "#### How Suraksha Detects Combosquatting:\n"
            "Suraksha's deterministic engine splits domain tokens, compares against our 40+ high-risk keyword ontology (e.g. `verify`, `auth`, `portal`, `secure`), and flags combinations exceeding high brand similarity ratios."
        )

    # Intent: Homoglyphs and Punycode
    if any(k in msg_lower for k in ("homoglyph", "punycode", "idn", "lookalike", "typosquat")):
        return (
            "### 🔤 **Homoglyphs & IDN Homograph Attacks**\n\n"
            "An **IDN Homograph Attack** is a technique where an adversary replaces Latin letters with visually identical characters from other alphabets (such as Cyrillic, Greek, or Cherokee).\n\n"
            "#### How It Works:\n"
            "- The Cyrillic small letter **`а`** (Unicode U+0430) looks identical to Latin **`a`** (Unicode U+0061).\n"
            "- An attacker registers `pаypal.com` (with Cyrillic `а`).\n"
            "- To the DNS system, this resolves as the Punycode string: **`xn--pypal-4ve.com`**.\n"
            "- When rendered in modern address bars or phishing emails, it looks completely authentic to the victim.\n\n"
            "#### Suraksha Countermeasures:\n"
            "- **Punycode Decoding:** Automatic conversion of `xn--` domains to canonical Unicode.\n"
            "- **Confusable Script Analysis:** Scans for mixed scripts (e.g. Cyrillic + Latin within the same label).\n"
            "- **Levenshtein & Damerau Distance:** Calculates visual string distance against protected brand trademarks."
        )

    # Intent: Subdomain hijack
    if "subdomain" in msg_lower:
        return (
            "### 🌐 **Subdomain Hijacking & Brand Abuse**\n\n"
            "**Subdomain Brand Abuse** typically manifests in two distinct forms:\n\n"
            "1. **Deceptive Subdomain Spoofing:**\n"
            "   An attacker registers their own domain (`evilhost.com`) and creates a subdomain like `paypal.evilhost.com`. On mobile browsers where long URLs truncate, users only see `paypal.` in the address bar.\n\n"
            "2. **Subdomain Takeover (CNAME Dangling):**\n"
            "   A company points a DNS CNAME (e.g. `promo.brand.com`) to a third-party cloud service (AWS S3, GitHub Pages, Heroku). If that service bucket is deleted without updating DNS, an attacker can claim the bucket and serve malware under the legitimate brand's root domain!\n\n"
            "#### Defense in Suraksha:\n"
            "Suraksha flags nested brand identifiers in non-authoritative host labels with the `SUBDOMAIN_HIJACK_PATTERN` signal."
        )

    # Intent: Google Safe Browsing
    if any(k in msg_lower for k in ("safe browsing", "google", "reputation", "blacklist")):
        return (
            "### 🛡️ **Google Safe Browsing & Threat Feeds in Suraksha**\n\n"
            "Suraksha integrates with **Google Safe Browsing API v4** and live threat feeds from **abuse.ch URLhaus**.\n\n"
            "- **Coverage:** Over 4 billion devices worldwide rely on Safe Browsing to block malware, deceptive sites, and unwanted software.\n"
            "- **Verdict Types:**\n"
            "  - `MALICIOUS`: Actively observed serving exploits, credential phishing, or ransomware.\n"
            "  - `SUSPICIOUS`: Newly registered high-risk domains with deceptive infrastructure.\n"
            "  - `CLEAN`: Not currently listed in active global malware lists.\n\n"
            "Paste any URL into this copilot to run an immediate Safe Browsing lookup with Suraksha multi-signal scoring!"
        )

    # Default Copilot Greetings / Help
    return (
        "Hello! I am your **Suraksha AI Cyber Defense Copilot**.\n\n"
        "I am ready to assist you with real-time brand protection and threat hunting. Here is what I can do:\n\n"
        "- 🔍 **Instant URL Inspection:** Paste any link or domain (e.g. `https://paypal-security-login.xyz`). I will run Google Safe Browsing, brand lookalike algorithms, and risk scoring.\n"
        "- 📝 **Draft Takedowns:** Ask me to `\"Draft takedown notice for <domain>\"` to generate an RFC-compliant abuse email for domain registrars.\n"
        "- 🔬 **Threat Explanations:** Ask me about `Combosquatting`, `IDN Homoglyphs`, or `Subdomain Hijacks` for deep tactical explainers.\n"
        "- 🌐 **Proactive Hunting:** Ask me to hunt permutations for your brand to catch spoof domains before attackers deploy them."
    )


@copilot_bp.route("/copilot/threat-feed/recent", methods=["GET"])
@limiter.limit(lambda: current_app.config.get("RATELIMIT_ML", "30 per minute"))
def get_recent_threat_feed():
    """Returns recent wild threat URLs from abuse.ch URLhaus & curated phishing corpus."""
    try:
        limit = min(50, int(request.args.get("limit", 25)))
    except (ValueError, TypeError):
        limit = 25
    threats = threat_feed_service.get_recent_threats(limit=limit)
    return jsonify({
        "success": True,
        "data": {
            "threats": threats,
            "total_count": len(threats),
            "source": "abuse.ch URLhaus & Curated Phishing Corpus",
            "last_updated": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
        }
    }), 200


@copilot_bp.route("/copilot/threat-feed/search", methods=["POST"])
@limiter.limit(lambda: current_app.config.get("RATELIMIT_ML", "30 per minute"))
def search_threat_feed():
    """Searches active threat feed entries matching a brand, domain, or threat tag."""
    payload = request.get_json(silent=True) or {}
    query = payload.get("query") or payload.get("brand") or ""
    try:
        limit = min(50, int(payload.get("limit", 20)))
    except (ValueError, TypeError):
        limit = 20
    results = threat_feed_service.search_threats(query=query, limit=limit)
    return jsonify({
        "success": True,
        "data": {
            "query": query,
            "results": results,
            "count": len(results)
        }
    }), 200


@copilot_bp.route("/copilot/generate-permutations", methods=["POST"])
@limiter.limit(lambda: current_app.config.get("RATELIMIT_AI", "15 per minute"))
def generate_attack_permutations():
    """
    Generates 20+ proactive adversarial permutations (typosquats, combosquats, homoglyphs, tld-swaps)
    for any target brand or domain and scores each one with the deterministic detection engine.
    """
    payload = request.get_json(silent=True) or {}
    brand_or_domain = (payload.get("domain") or payload.get("brand_name") or payload.get("brand") or "").strip()
    try:
        limit = min(40, int(payload.get("limit", 25)))
    except (ValueError, TypeError):
        limit = 25

    if not brand_or_domain:
        return jsonify({
            "success": False,
            "error": {"code": "MISSING_INPUT", "message": "Domain or brand name is required."}
        }), 400

    clean_target = brand_or_domain.lower().replace("https://", "").replace("http://", "").split("/")[0]
    if "." not in clean_target:
        base_domain = f"{clean_target}.com"
        target_brand = brand_or_domain.capitalize()
    else:
        base_domain = clean_target
        target_brand = clean_target.split(".")[0].capitalize()

    try:
        raw_candidates = generate_permutations(domain=base_domain, limit=limit)
    except Exception as e:
        logger.warning(f"Permutations generator failed: {e}")
        raw_candidates = []

    scored_candidates = []
    synthetic_brand_profile = {
        "name": target_brand,
        "domains": [{"domain": base_domain}]
    }

    for c in raw_candidates:
        eval_outcome = domain_detector.evaluate_full(
            {"candidate_name": c.domain, "source_url": f"http://{c.domain}"},
            synthetic_brand_profile
        )
        score = eval_outcome.risk_evaluation.total_score
        sev = eval_outcome.risk_evaluation.severity
        scored_candidates.append({
            "domain": c.domain,
            "technique": c.technique,
            "risk_score": round(score, 1),
            "severity": sev,
            "signals": [s.signal_type for s in eval_outcome.risk_evaluation.signals],
        })

    # Sort candidates by risk score descending
    scored_candidates.sort(key=lambda x: x["risk_score"], reverse=True)

    return jsonify({
        "success": True,
        "data": {
            "target_brand": target_brand,
            "base_domain": base_domain,
            "permutations": scored_candidates,
            "count": len(scored_candidates)
        }
    }), 200
