"""
Registration data (who registered a domain, when, through which registrar, with what abuse contact) from the
public RDAP service. RDAP is the structured, standards-based successor to WHOIS.

Outbound requests go to https://rdap.org (the IANA bootstrap redirector) and the registry it redirects to.
Redirects are followed manually, at most 3 hops, and every hop must be https to a public hostname.
"""

import logging
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional
from urllib.parse import urljoin, urlparse

import requests

from backend.app.intel.netsafe import UnsafeTarget, normalize_hostname, resolve_public

logger = logging.getLogger(__name__)

RDAP_BASE = "https://rdap.org/domain/"
MAX_HOPS = 3
MAX_BYTES = 512_000


@dataclass
class RdapRecord:
    domain: str
    found: bool
    observed_at: float
    registered_at: Optional[str] = None
    updated_at: Optional[str] = None
    expires_at: Optional[str] = None
    age_days: Optional[int] = None
    registrar: Optional[str] = None
    abuse_email: Optional[str] = None
    nameservers: List[str] = field(default_factory=list)
    status: List[str] = field(default_factory=list)
    source: str = "rdap"
    error: Optional[str] = None

    def to_dict(self) -> dict:
        return asdict(self)


def _vcard_value(entity: Dict[str, Any], key: str) -> Optional[str]:
    for item in (entity.get("vcardArray") or [None, []])[1]:
        if item and item[0] == key and len(item) >= 4:
            value = item[3]
            return value if isinstance(value, str) else None
    return None


def _walk_entities(entities: List[Dict[str, Any]]):
    for e in entities or []:
        yield e
        yield from _walk_entities(e.get("entities") or [])


def parse_rdap(domain: str, payload: Dict[str, Any], now: Optional[datetime] = None) -> RdapRecord:
    """Pure parser for an RDAP domain object."""
    now = now or datetime.now(timezone.utc)
    rec = RdapRecord(domain=domain, found=True, observed_at=time.time())
    for ev in payload.get("events") or []:
        when = ev.get("eventDate")
        action = (ev.get("eventAction") or "").lower()
        if not when:
            continue
        if action == "registration":
            rec.registered_at = when
        elif action in ("last changed", "last update of rdap database"):
            rec.updated_at = rec.updated_at or when
        elif action == "expiration":
            rec.expires_at = when
    if rec.registered_at:
        try:
            registered = datetime.fromisoformat(rec.registered_at.replace("Z", "+00:00"))
            if registered.tzinfo is None:
                registered = registered.replace(tzinfo=timezone.utc)
            rec.age_days = max(0, (now - registered).days)
        except ValueError:
            rec.age_days = None
    for e in _walk_entities(payload.get("entities") or []):
        roles = [r.lower() for r in e.get("roles") or []]
        if "registrar" in roles and not rec.registrar:
            rec.registrar = _vcard_value(e, "fn")
        if "abuse" in roles and not rec.abuse_email:
            rec.abuse_email = _vcard_value(e, "email")
    rec.nameservers = sorted({(n.get("ldhName") or "").lower().rstrip(".") for n in payload.get("nameservers") or [] if n.get("ldhName")})
    rec.status = [str(s) for s in payload.get("status") or []]
    return rec


def fetch_rdap(
    domain: str,
    http_get: Optional[Callable[..., Any]] = None,
    timeout: float = 4.0,
    resolver: Optional[Callable[..., list]] = None,
) -> RdapRecord:
    """Look up `domain` via RDAP. Never raises: failures come back as a record with `error` set."""
    try:
        name = normalize_hostname(domain)
    except UnsafeTarget as exc:
        return RdapRecord(domain=str(domain)[:253], found=False, observed_at=time.time(), error=f"refused: {exc}")
    get = http_get or requests.get
    url = RDAP_BASE + name
    try:
        for _ in range(MAX_HOPS + 1):
            parsed = urlparse(url)
            if parsed.scheme != "https":
                return RdapRecord(domain=name, found=False, observed_at=time.time(), error="refused: non-https redirect")
            host = normalize_hostname(parsed.hostname or "")
            if resolver is None:
                resolve_public(host)  # raises UnsafeTarget for internal targets
            else:
                resolve_public(host, resolver)
            resp = get(url, headers={"Accept": "application/rdap+json, application/json"}, timeout=timeout, allow_redirects=False, stream=False)
            if resp.status_code in (301, 302, 303, 307, 308) and resp.headers.get("Location"):
                url = urljoin(url, resp.headers["Location"])
                continue
            if resp.status_code == 404:
                return RdapRecord(domain=name, found=False, observed_at=time.time(), error="not found in RDAP (may be unregistered or an unsupported TLD)")
            if resp.status_code != 200:
                return RdapRecord(domain=name, found=False, observed_at=time.time(), error=f"RDAP HTTP {resp.status_code}")
            if len(resp.content or b"") > MAX_BYTES:
                return RdapRecord(domain=name, found=False, observed_at=time.time(), error="RDAP response too large")
            return parse_rdap(name, resp.json())
        return RdapRecord(domain=name, found=False, observed_at=time.time(), error="too many redirects")
    except UnsafeTarget as exc:
        return RdapRecord(domain=name, found=False, observed_at=time.time(), error=f"refused: {exc}")
    except Exception as exc:  # network errors, bad JSON ...
        logger.info("RDAP lookup for %s failed: %s", name, exc)
        return RdapRecord(domain=name, found=False, observed_at=time.time(), error=f"RDAP lookup failed: {type(exc).__name__}")
