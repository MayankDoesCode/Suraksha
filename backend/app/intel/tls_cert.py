"""
Read the TLS certificate a domain presents: issuer, validity window, subject alternative names, fingerprint.

This performs a TLS handshake only (no HTTP request, nothing is downloaded or rendered), to port 443 of an
address that has already been checked as publicly routable. Certificate verification is deliberately OFF:
the aim is to *observe* what a suspicious host presents (including self-signed certificates), not to trust it.
"""

import hashlib
import logging
import socket
import ssl
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Callable, List, Optional

from cryptography import x509
from cryptography.hazmat.primitives import hashes
from cryptography.x509.oid import NameOID

from backend.app.intel.netsafe import UnsafeTarget, is_public_ip, normalize_hostname

logger = logging.getLogger(__name__)


@dataclass
class CertObservation:
    host: str
    ip: Optional[str]
    observed_at: float
    presented: bool = False
    subject_cn: Optional[str] = None
    issuer: Optional[str] = None
    not_before: Optional[str] = None
    not_after: Optional[str] = None
    age_days: Optional[int] = None
    san: List[str] = field(default_factory=list)
    sha256: Optional[str] = None
    serial: Optional[str] = None
    self_signed: bool = False
    error: Optional[str] = None
    source: str = "tls-handshake"

    def to_dict(self) -> dict:
        return asdict(self)


def _name_attr(name: x509.Name, oid) -> Optional[str]:
    attrs = name.get_attributes_for_oid(oid)
    return attrs[0].value if attrs else None


def parse_certificate(host: str, ip: Optional[str], der: bytes, now: Optional[datetime] = None) -> CertObservation:
    """Pure parser for a DER certificate."""
    now = now or datetime.now(timezone.utc)
    cert = x509.load_der_x509_certificate(der)
    obs = CertObservation(host=host, ip=ip, observed_at=time.time(), presented=True)
    obs.subject_cn = _name_attr(cert.subject, NameOID.COMMON_NAME)
    issuer_cn = _name_attr(cert.issuer, NameOID.COMMON_NAME)
    issuer_org = _name_attr(cert.issuer, NameOID.ORGANIZATION_NAME)
    obs.issuer = ", ".join(p for p in (issuer_cn, issuer_org) if p) or None
    nb, na = cert.not_valid_before_utc, cert.not_valid_after_utc
    obs.not_before, obs.not_after = nb.isoformat(), na.isoformat()
    obs.age_days = max(0, (now - nb).days)
    try:
        san = cert.extensions.get_extension_for_class(x509.SubjectAlternativeName).value
        obs.san = sorted(san.get_values_for_type(x509.DNSName))[:50]
    except x509.ExtensionNotFound:
        obs.san = []
    obs.sha256 = cert.fingerprint(hashes.SHA256()).hex()
    obs.serial = format(cert.serial_number, "x")
    obs.self_signed = cert.subject == cert.issuer
    return obs


def _default_fetch(host: str, ip: str, port: int, timeout: float) -> bytes:
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE  # observe, do not trust
    with socket.create_connection((ip, port), timeout=timeout) as raw:
        with ctx.wrap_socket(raw, server_hostname=host) as tls:
            der = tls.getpeercert(binary_form=True)
    if not der:
        raise ssl.SSLError("no certificate presented")
    return der


def fetch_certificate(
    domain: str,
    ip: Optional[str],
    timeout: float = 3.0,
    fetch: Optional[Callable[[str, str, int, float], bytes]] = None,
) -> CertObservation:
    """Handshake with `ip` (already resolved for `domain`). Never raises."""
    try:
        host = normalize_hostname(domain)
    except UnsafeTarget as exc:
        return CertObservation(host=str(domain)[:253], ip=ip, observed_at=time.time(), error=f"refused: {exc}")
    if not ip or not is_public_ip(ip):
        return CertObservation(host=host, ip=ip, observed_at=time.time(), error="refused: address is not publicly routable")
    try:
        der = (fetch or _default_fetch)(host, ip, 443, timeout)
        return parse_certificate(host, ip, der)
    except Exception as exc:
        return CertObservation(host=host, ip=ip, observed_at=time.time(), error=f"no certificate observed: {type(exc).__name__}")
