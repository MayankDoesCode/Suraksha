"""
Takedown / abuse report drafting.

Assembles an evidence-backed report for a registrar, hosting provider, social platform, app store or the internal case
file, straight from what is recorded on a finding. Nothing is sent: the report is a draft that a named analyst must
verify. An integrity hash over the evidence manifest lets a recipient (or a later audit) confirm the evidence has not
changed since the report was drafted.
"""

import hashlib
import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from backend.app.services.enrichment_service import parse_kv
from backend.app.utils.errors import ValidationError

AUDIENCES = {
    "registrar": {"asset_types": {"domain"}, "label": "Domain registrar"},
    "hosting": {"asset_types": {"domain"}, "label": "Hosting provider / network operator"},
    "platform": {"asset_types": {"social"}, "label": "Social platform trust & safety"},
    "app_store": {"asset_types": {"mobile_app"}, "label": "App store review team"},
    "internal": {"asset_types": {"domain", "social", "mobile_app"}, "label": "Internal case file"},
}

ACTION = {
    "registrar": "Please review this domain and, if you agree it is being used to impersonate {brand}, suspend or lock it and preserve the registration records.",
    "hosting": "Please review the content served from the addresses below and, if you agree it impersonates {brand}, disable it and preserve the relevant logs.",
    "platform": "Please review this account against your impersonation policy and, if it violates it, restrict or remove it.",
    "app_store": "Please review this listing for misuse of the {brand} name, package identifier or publisher identity, and remove it if it violates your policy.",
    "internal": "Record in the case file and decide on escalation.",
}


def manifest_hash(evidence: List[Dict[str, Any]]) -> str:
    """SHA-256 over a canonical, order-independent form of the evidence list."""
    rows = sorted(
        [(e.get("evidence_type", ""), e.get("description", ""), e.get("source_reference") or "", e.get("captured_at") or "") for e in evidence]
    )
    return hashlib.sha256(json.dumps(rows, separators=(",", ":"), ensure_ascii=False).encode("utf-8")).hexdigest()


def _infra(evidence: List[Dict[str, Any]]) -> Dict[str, str]:
    merged: Dict[str, str] = {}
    for e in evidence:
        if e.get("evidence_type") in ("dns_records", "whois_registration", "tls_certificate"):
            for k, v in parse_kv(e.get("description", "")).items():
                merged.setdefault(f"{e['evidence_type']}.{k}", v)
    return merged


def build_report(finding: Dict[str, Any], brand_name: str, audience: str, analyst: Optional[str] = None) -> Dict[str, Any]:
    if audience not in AUDIENCES:
        raise ValidationError("Unknown report audience.", details=[{"field": "audience", "message": f"Use one of: {', '.join(sorted(AUDIENCES))}"}])
    spec = AUDIENCES[audience]
    asset_type = finding.get("asset_type")
    if asset_type not in spec["asset_types"]:
        raise ValidationError(
            f"A {spec['label'].lower()} report does not apply to a {asset_type} finding.",
            details=[{"field": "audience", "message": f"Valid audiences for {asset_type}: {', '.join(a for a, s in AUDIENCES.items() if asset_type in s['asset_types'])}"}],
        )

    evidence = [e for e in finding.get("evidence", []) if e.get("evidence_type") != "analyst_triage_audit"]
    signals = finding.get("signals", [])
    infra = _infra(evidence)
    target = finding.get("candidate_name", "")
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")

    to_hint = {
        "registrar": infra.get("whois_registration.abuse_email") or f"the abuse contact of {infra.get('whois_registration.registrar') or 'the registrar'} (see the domain's RDAP/WHOIS record)",
        "hosting": "the abuse contact for the network that hosts the addresses below (look up the ASN holder)",
        "platform": "the platform's impersonation / trust & safety reporting channel",
        "app_store": "the store's developer-content or IP-complaint channel",
        "internal": "case file",
    }[audience]

    lines: List[str] = [
        f"Subject: Brand impersonation report: {target}",
        f"To: {to_hint}",
        f"From: {brand_name} security team" + (f" (analyst: {analyst})" if analyst else ""),
        f"Date: {now}",
        "",
        "## Summary",
        f"We believe `{target}` ({asset_type}) is being used to impersonate {brand_name}. SURAKSHA assessed it as "
        f"**{finding.get('severity', 'UNKNOWN')}** severity (rule-based score {finding.get('final_risk_score', finding.get('risk_score', 0))}/100) "
        f"and first recorded it at {finding.get('observed_at') or finding.get('created_at') or 'an unrecorded time'}.",
        "",
        "## Indicators",
        f"- Target: `{target}`" + (f" ({finding['source_url']})" if finding.get("source_url") else ""),
    ]
    for label, key in [
        ("IP addresses", "dns_records.a"), ("Name servers", "dns_records.ns"), ("Network (ASN)", "dns_records.asn"),
        ("Registrar", "whois_registration.registrar"), ("Registered", "whois_registration.registered_at"),
        ("TLS certificate issuer", "tls_certificate.issuer"), ("TLS certificate SHA-256", "tls_certificate.sha256"),
    ]:
        if infra.get(key):
            lines.append(f"- {label}: {infra[key]}")

    lines += ["", "## Why it is believed to be impersonation (rule-based findings)"]
    lines += [f"- {s.get('explanation')}" for s in signals] or ["- No rule signal is recorded on this finding."]

    lines += ["", "## Evidence", "| Type | Observation | Source | Captured |", "| --- | --- | --- | --- |"]
    for e in evidence:
        desc = (e.get("description") or "").replace("|", "\\|").replace("\n", " ")
        lines.append(f"| {e.get('evidence_type')} | {desc} | {e.get('source_reference') or ''} | {e.get('captured_at') or ''} |")
    if not evidence:
        lines.append("| (none recorded) | | | |")

    lines += ["", "## Requested action", ACTION[audience].format(brand=brand_name), ""]
    digest = manifest_hash(evidence)
    lines += [
        "## Verification and integrity",
        "This is a draft assembled by SURAKSHA from recorded observations. It has not been sent. A named analyst must verify the facts above before it is submitted, "
        "and any ML output on the finding is supporting evidence only.",
        f"Evidence manifest SHA-256: `{digest}` ({len(evidence)} records).",
    ]

    return {
        "finding_id": finding.get("id"),
        "audience": audience,
        "audience_label": spec["label"],
        "subject": f"Brand impersonation report: {target}",
        "to_hint": to_hint,
        "body_markdown": "\n".join(lines),
        "evidence_count": len(evidence),
        "manifest_sha256": digest,
        "requires_analyst_verification": True,
        "sent": False,
        "generated_at": now,
    }
