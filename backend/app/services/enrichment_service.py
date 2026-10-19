"""
Passive domain enrichment: DNS + registration (RDAP) + TLS certificate, turned into recorded evidence and
a small set of explainable rule signals.

All facts are OBSERVED (what a public registry, resolver or TLS handshake returned at a stated time).
Signals such as "registered 3 days ago" are rules over those facts; they are not machine-learning output.
"""

import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional

from backend.app.detection.base import DetectionSignal
from backend.app.intel import dns_probe as dns_mod
from backend.app.intel import rdap as rdap_mod
from backend.app.intel import tls_cert as tls_mod
from backend.app.intel.netsafe import UnsafeTarget, normalize_hostname
from backend.app.repositories.threat_repository import ThreatRepository
from backend.app.utils.errors import NotFoundError, ValidationError

logger = logging.getLogger(__name__)

ENRICHMENT_EVIDENCE_TYPES = ("dns_records", "whois_registration", "tls_certificate")
ENRICHMENT_SIGNAL_TYPES = ("NEWLY_REGISTERED_DOMAIN", "SELF_SIGNED_CERTIFICATE", "FRESH_CERTIFICATE")


def kv(**pairs: Any) -> str:
    """Human-readable, machine-parseable 'key=value; key=value' line. Empty values are omitted."""
    return "; ".join(f"{k}={','.join(v) if isinstance(v, (list, tuple)) else v}" for k, v in pairs.items() if v not in (None, "", [], ()))


def parse_kv(text: str) -> Dict[str, str]:
    out: Dict[str, str] = {}
    for part in (text or "").split("; "):
        key, sep, value = part.partition("=")
        if sep:
            out[key.strip()] = value.strip()
    return out


@dataclass
class DomainIntel:
    domain: str
    observed_at: str
    dns: Dict[str, Any]
    rdap: Dict[str, Any]
    tls: Dict[str, Any]

    def to_dict(self) -> dict:
        return {"domain": self.domain, "observed_at": self.observed_at, "dns": self.dns, "rdap": self.rdap, "tls": self.tls}


class EnrichmentService:
    def __init__(
        self,
        probe: Optional[dns_mod.DnsProbe] = None,
        rdap_fetch: Optional[Callable[[str], rdap_mod.RdapRecord]] = None,
        tls_fetch: Optional[Callable[[str, Optional[str]], tls_mod.CertObservation]] = None,
        repo: Optional[ThreatRepository] = None,
    ):
        self.probe = probe or dns_mod.DnsProbe()
        self.rdap_fetch = rdap_fetch or rdap_mod.fetch_rdap
        self.tls_fetch = tls_fetch or tls_mod.fetch_certificate
        self._repo = repo

    @property
    def repo(self) -> ThreatRepository:
        if self._repo is None:
            self._repo = ThreatRepository()
        return self._repo

    # ------------------------------------------------------------------------------------ collection
    def collect(self, domain: str, observation: Optional[dns_mod.DnsObservation] = None) -> DomainIntel:
        name = normalize_hostname(domain)  # raises UnsafeTarget
        dns_obs = observation or self.probe.probe(name)
        rdap_rec = self.rdap_fetch(name)
        first_ip = next((ip for ip in dns_obs.a if ip not in dns_obs.non_public_addresses), None)
        tls_obs = self.tls_fetch(name, first_ip) if first_ip else tls_mod.CertObservation(host=name, ip=None, observed_at=0.0, error="no public IPv4 address to contact")
        return DomainIntel(
            domain=name,
            observed_at=datetime.now(timezone.utc).isoformat(),
            dns=dns_obs.to_dict(), rdap=rdap_rec.to_dict(), tls=tls_obs.to_dict(),
        )

    # ------------------------------------------------------------------------------------ evidence
    @staticmethod
    def evidence_records(intel: DomainIntel) -> List[Dict[str, str]]:
        out: List[Dict[str, str]] = []
        d, r, t = intel.dns, intel.rdap, intel.tls
        if d.get("resolves") or d.get("nxdomain"):
            asn_bits = [f"{ip}:AS{i['asn']}/{i['prefix']}/{i['country']}" for ip, i in sorted((d.get("asns") or {}).items())]
            out.append({
                "evidence_type": "dns_records",
                "description": kv(resolves="true" if d.get("resolves") else "false", a=d.get("a"), aaaa=d.get("aaaa"), ns=d.get("ns"), mx=d.get("mx"), asn=asn_bits, observed_at=intel.observed_at),
                "source_reference": "dns",
            })
        if r.get("found"):
            out.append({
                "evidence_type": "whois_registration",
                "description": kv(registered_at=r.get("registered_at"), age_days=r.get("age_days"), registrar=r.get("registrar"), abuse_email=r.get("abuse_email"),
                                  nameservers=r.get("nameservers"), status=r.get("status"), observed_at=intel.observed_at),
                "source_reference": "rdap.org",
            })
        if t.get("presented"):
            out.append({
                "evidence_type": "tls_certificate",
                "description": kv(issuer=t.get("issuer"), subject_cn=t.get("subject_cn"), not_before=t.get("not_before"), age_days=t.get("age_days"),
                                  self_signed="true" if t.get("self_signed") else "false", san=t.get("san", [])[:10], sha256=t.get("sha256"), ip=t.get("ip"), observed_at=intel.observed_at),
                "source_reference": f"tls://{intel.domain}:443",
            })
        return out

    # ------------------------------------------------------------------------------------ signals
    @staticmethod
    def risk_signals(intel: DomainIntel) -> List[DetectionSignal]:
        signals: List[DetectionSignal] = []
        age = intel.rdap.get("age_days")
        if intel.rdap.get("found") and age is not None and age <= 30:
            signals.append(DetectionSignal(
                signal_type="NEWLY_REGISTERED_DOMAIN",
                severity_score=30.0 if age <= 7 else 20.0,
                confidence=0.9 if age <= 7 else 0.85,
                explanation=f"Registered {age} day{'s' if age != 1 else ''} ago according to RDAP. Phishing infrastructure is disproportionately very new; many legitimate domains are new too.",
                evidence_fields=["registered_at", "age_days"],
            ))
        t = intel.tls
        if t.get("presented") and t.get("self_signed"):
            signals.append(DetectionSignal(
                signal_type="SELF_SIGNED_CERTIFICATE", severity_score=12.0, confidence=0.7,
                explanation="The host presents a self-signed TLS certificate, so no public certificate authority vouches for it.",
                evidence_fields=["issuer", "self_signed"],
            ))
        elif t.get("presented") and t.get("age_days") is not None and t["age_days"] <= 3:
            signals.append(DetectionSignal(
                signal_type="FRESH_CERTIFICATE", severity_score=8.0, confidence=0.6,
                explanation=f"Its TLS certificate was issued {t['age_days']} day(s) ago. Weak on its own: free certificate authorities issue certificates instantly.",
                evidence_fields=["not_before", "age_days"],
            ))
        return signals

    # ------------------------------------------------------------------------------------ persistence
    def enrich_finding(self, finding_id: str, observation: Optional[dns_mod.DnsObservation] = None) -> Dict[str, Any]:
        finding = self.repo.get_by_id(finding_id)
        if not finding:
            raise NotFoundError(f"Finding with ID '{finding_id}' not found.")
        if finding.asset_type != "domain":
            raise ValidationError("Passive enrichment applies to domain findings only.", details=[{"field": "asset_type", "message": f"Finding is a '{finding.asset_type}', not a domain."}])
        target = finding.candidate_name
        try:
            intel = self.collect(target, observation=observation)
        except UnsafeTarget as exc:
            raise ValidationError("This finding's target cannot be looked up.", details=[{"field": "candidate_name", "message": str(exc)}])
        updated = self.repo.apply_enrichment(
            finding_id, self.evidence_records(intel), self.risk_signals(intel), ENRICHMENT_EVIDENCE_TYPES, ENRICHMENT_SIGNAL_TYPES,
        )
        return {
            "finding": updated.to_dict(include_relations=True),
            "intel": intel.to_dict(),
            "disclaimer": "Observed from public DNS, RDAP and a TLS handshake. Facts are as of the stated time; signals are rule-based and need analyst review.",
        }
