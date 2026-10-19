"""
Takedown / abuse report drafting.

Assembles an evidence-backed report for a registrar, hosting provider, social platform, app store or the internal case
file, straight from what is recorded on a finding. Nothing is sent: the report is a draft that a named analyst must
verify. An integrity hash over the evidence manifest lets a recipient (or a later audit) confirm the evidence has not
changed since the report was drafted.
"""

import hashlib
import os
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


# ------------------------------------------------------------------------------------------ takedown notices
NOTICES = {"registrar": "Domain registrar", "host": "Hosting provider", "trademark": "Trademark / impersonation notice"}


def _jinja():
    from jinja2 import Environment, FileSystemLoader, StrictUndefined
    return Environment(loader=FileSystemLoader(os.path.join(os.path.dirname(__file__), "..", "templates")), undefined=StrictUndefined, autoescape=False, keep_trailing_newline=True)


def render_takedown(finding: Dict[str, Any], brand_name: str, notice: str, abuse_email: Optional[str], analyst: Optional[str] = None) -> Dict[str, Any]:
    if notice not in NOTICES:
        raise ValidationError("Unknown notice type.", details=[{"field": "notice", "message": "Use one of: " + ", ".join(sorted(NOTICES))}])
    if finding.get("asset_type") != "domain":
        raise ValidationError("Takedown notices are generated for domain findings only.", details=[{"field": "asset_type", "message": "Finding is a " + str(finding.get("asset_type")) + "."}])
    evidence = [e for e in finding.get("evidence", []) if e.get("evidence_type") != "analyst_triage_audit"]
    infra = _infra(evidence)
    keys = [("IP addresses", "dns_records.a"), ("Name servers", "dns_records.ns"), ("Registrar", "whois_registration.registrar"),
            ("Registered", "whois_registration.registered_at"), ("Certificate SHA-256", "tls_certificate.sha256")]
    indicators = [label + ": " + infra[k] for label, k in keys if infra.get(k)]
    to = abuse_email or "[abuse contact not found in RDAP: look up the registrar or network abuse address]"
    ctx = {
        "subject": "Brand impersonation: " + str(finding.get("candidate_name")), "to": to,
        "recipient": {"registrar": infra.get("whois_registration.registrar") or "Abuse Team", "host": "Abuse Team", "trademark": "Trust & Safety Team"}[notice],
        "target": finding.get("candidate_name"), "source_url": finding.get("source_url"), "brand": brand_name,
        "severity": finding.get("severity", "UNKNOWN"), "score": finding.get("final_risk_score", finding.get("risk_score", 0)),
        "first_seen": finding.get("observed_at") or finding.get("created_at") or "not recorded", "indicators": indicators,
        "reasons": [x.get("explanation") for x in finding.get("signals", [])], "manifest": manifest_hash(evidence), "evidence_count": len(evidence),
        "analyst_line": ("Submitting analyst: " + analyst) if analyst else "Submitting analyst: [to be completed]",
    }
    text = _jinja().get_template("takedown/" + notice + ".j2").render(**ctx)
    return {"notice": notice, "label": NOTICES[notice], "to": to, "abuse_contact_source": "rdap" if abuse_email else "not found",
            "subject": ctx["subject"], "text": text, "manifest_sha256": ctx["manifest"], "sent": False}


def to_eml(notice: Dict[str, Any]) -> bytes:
    from email.message import EmailMessage
    m = EmailMessage()
    m["Subject"] = notice["subject"]
    m["To"] = notice["to"] if ("@" in notice["to"] and "[" not in notice["to"]) else "undisclosed-recipients:;"
    m["X-Suraksha-Draft"] = "not-sent; analyst verification required"
    m.set_content(notice["text"])
    return bytes(m)


def to_pdf(text: str) -> bytes:
    """Dependency-free text PDF (Helvetica, Latin-1)."""
    import textwrap

    def esc(t):
        return t.encode("latin-1", "replace").decode("latin-1").replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")

    lines: List[str] = []
    for raw in text.splitlines():
        lines += textwrap.wrap(raw, 92) or [""]
    pages = [lines[i:i + 52] for i in range(0, len(lines), 52)] or [[]]
    objs: List[bytes] = [b"<< /Type /Catalog /Pages 2 0 R >>", b"", b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"]
    kids = []
    for pg in pages:
        stream = "BT /F1 10 Tf 50 800 Td 14 TL\n" + "\n".join("(" + esc(l) + ") Tj T*" for l in pg) + "\nET"
        sb = stream.encode("latin-1")
        objs.append(b"<< /Length " + str(len(sb)).encode() + b" >>\nstream\n" + sb + b"\nendstream")
        cid = len(objs)
        objs.append(("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents %d 0 R /Resources << /Font << /F1 3 0 R >> >> >>" % cid).encode())
        kids.append("%d 0 R" % len(objs))
    objs[1] = ("<< /Type /Pages /Kids [%s] /Count %d >>" % (" ".join(kids), len(kids))).encode()
    out, offs = bytearray(b"%PDF-1.4\n"), []
    for i, o in enumerate(objs, 1):
        offs.append(len(out))
        out += ("%d 0 obj\n" % i).encode() + o + b"\nendobj\n"
    xref = len(out)
    out += ("xref\n0 %d\n0000000000 65535 f \n" % (len(objs) + 1)).encode() + b"".join(("%010d 00000 n \n" % o).encode() for o in offs)
    out += ("trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (len(objs) + 1, xref)).encode()
    return bytes(out)


def generate_takedown(finding_id: str, notice: str = "registrar", analyst: Optional[str] = None, repo=None, rdap_fetch=None) -> Dict[str, Any]:
    """Draft a takedown notice for a domain finding using the RDAP abuse contact. Never sent."""
    from backend.app.intel import rdap as rdap_mod
    from backend.app.repositories.threat_repository import ThreatRepository
    from backend.app.utils.errors import NotFoundError
    finding = (repo or ThreatRepository()).get_by_id(finding_id)
    if not finding:
        raise NotFoundError("Finding with ID '" + finding_id + "' not found.")
    data = finding.to_dict(include_relations=True)
    rec = (rdap_fetch or rdap_mod.fetch_rdap)(finding.candidate_name) if finding.asset_type == "domain" else None
    n = render_takedown(data, finding.brand.name if finding.brand else "the brand", notice, getattr(rec, "abuse_email", None), analyst)
    n["finding_id"] = finding_id
    n["rdap_error"] = getattr(rec, "error", None)
    return n
