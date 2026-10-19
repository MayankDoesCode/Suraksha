"""
Deterministic, explainable URL path/structure analysis.

Pure string parsing: nothing is fetched or resolved, so this cannot widen the SSRF
surface. Each finding names the rule that fired and the exact text it matched so an
analyst can verify it by eye.

These observations are weak on their own ("/login" is normal on most sites). The
domain detector therefore only turns them into risk signals when the URL is also
related to the brand being protected. See DomainDetector.
"""

import ipaddress
import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional
from urllib.parse import parse_qsl, unquote, urlparse

MAX_URL_LENGTH = 2048
MAX_TOKENS = 64

# Whole-token matches only, so "accountants" or "blogin" do not match.
CREDENTIAL_LURE_TOKENS = frozenset({
    "login", "logon", "signin", "verify", "verification", "validate", "authenticate",
    "password", "passwd", "credential", "credentials", "otp", "kyc", "wallet",
    "recover", "recovery", "unlock", "suspended", "restore", "webscr", "secure",
    "confirm", "billing", "reactivate",
})
# Pairs that become a lure when joined: sign-in, log-in, re-activate ...
_JOINABLE_PAIRS = {("sign", "in"): "signin", ("log", "in"): "login", ("log", "on"): "logon"}

PAYLOAD_EXTENSIONS = frozenset({"apk", "exe", "scr", "msi", "bat", "ps1", "jar", "dmg", "iso", "vbs", "xapk"})
REDIRECT_PARAMS = frozenset({
    "url", "redirect", "redirect_uri", "redirect_url", "return", "returnurl", "next",
    "continue", "goto", "dest", "destination", "target", "link",
})
SENSITIVE_QUERY_KEYS = frozenset({"password", "passwd", "pass", "pwd", "otp", "pin", "cvv", "ssn"})

_IPV4_RE = re.compile(r"^\d{1,3}(?:\.\d{1,3}){3}$")
_TOKEN_SPLIT_RE = re.compile(r"[^a-z0-9]+")


@dataclass
class UrlPathFinding:
    rule_id: str
    detail: str
    matched: List[str] = field(default_factory=list)


@dataclass
class UrlPathAnalysis:
    has_path_or_query: bool = False
    hostname: str = ""
    path: str = ""
    lure_tokens: List[str] = field(default_factory=list)
    brand_tokens_in_path: List[str] = field(default_factory=list)
    brand_tokens_in_userinfo: List[str] = field(default_factory=list)
    structure_findings: List[UrlPathFinding] = field(default_factory=list)

    @property
    def has_signals(self) -> bool:
        return bool(self.lure_tokens or self.structure_findings)


def pick_url_with_path(*candidates: Optional[str]) -> Optional[str]:
    """First candidate that looks like a URL carrying a path, query or userinfo."""
    for c in candidates:
        s = str(c or "").strip()
        if not s:
            continue
        rest = s.split("://", 1)[-1]
        if "/" in rest or "?" in rest or "@" in rest:
            return s
    return None


def _tokens(text: str) -> List[str]:
    return [t for t in _TOKEN_SPLIT_RE.split(text.lower()) if t][:MAX_TOKENS]


def _lure_tokens(tokens: List[str]) -> List[str]:
    found: List[str] = []
    for t in tokens:
        if t in CREDENTIAL_LURE_TOKENS and t not in found:
            found.append(t)
    for a, b in zip(tokens, tokens[1:]):
        joined = _JOINABLE_PAIRS.get((a, b))
        if joined and joined not in found:
            found.append(joined)
    return found


def analyze_url_path(raw_url: Optional[str], brand_tokens: List[str]) -> UrlPathAnalysis:
    """
    Parse `raw_url` and report lure tokens, brand tokens in path/userinfo and structural red flags.
    `brand_tokens` are lowercase brand names / official SLDs; tokens shorter than 4 characters are ignored.
    """
    result = UrlPathAnalysis()
    s = str(raw_url or "").strip()
    if not s or len(s) > MAX_URL_LENGTH:
        return result
    s = re.sub(r"[\x00-\x1f\x7f-\x9f]", "", s)
    parsed_input = s if "://" in s else "https://" + s
    try:
        parsed = urlparse(parsed_input)
        hostname = (parsed.hostname or "").lower()
        netloc = parsed.netloc
        path = unquote(parsed.path or "").lower()
        query_pairs = parse_qsl(parsed.query or "", keep_blank_values=True)
    except ValueError:
        return result

    result.hostname = hostname
    result.path = path
    result.has_path_or_query = bool(path.strip("/") or parsed.query)
    brand_tokens = [t for t in dict.fromkeys(b.strip().lower() for b in brand_tokens if b) if len(t) >= 4]

    # 1. Credential lure tokens + brand tokens in the path
    path_tokens = _tokens(path)
    result.lure_tokens = _lure_tokens(path_tokens)
    path_compact = "".join(path_tokens)
    result.brand_tokens_in_path = [b for b in brand_tokens if b.replace("-", "").replace(" ", "") in path_compact]

    # 2. Structural red flags
    userinfo = netloc.rsplit("@", 1)[0].lower() if "@" in netloc else ""
    if userinfo:
        userinfo_compact = "".join(_tokens(userinfo))
        result.brand_tokens_in_userinfo = [b for b in brand_tokens if b.replace("-", "").replace(" ", "") in userinfo_compact]
        if "." in userinfo or result.brand_tokens_in_userinfo:
            result.structure_findings.append(UrlPathFinding(
                "USERINFO_DECEPTION",
                f"Text before '@' ('{userinfo[:60]}') looks like a trusted name, but the real host is '{hostname}'.",
                [userinfo[:60]],
            ))

    ip_host = False
    if hostname:
        try:
            ipaddress.ip_address(hostname.strip("[]"))
            ip_host = True
        except ValueError:
            ip_host = bool(_IPV4_RE.match(hostname))
    if ip_host:
        result.structure_findings.append(UrlPathFinding(
            "IP_LITERAL_HOST", f"URL uses a raw IP address ('{hostname}') instead of a domain name.", [hostname]))

    ext_match = re.search(r"\.([a-z0-9]{2,5})$", path.rstrip("/"))
    if ext_match and ext_match.group(1) in PAYLOAD_EXTENSIONS:
        result.structure_findings.append(UrlPathFinding(
            "PAYLOAD_FILE_EXTENSION",
            f"Path points directly at an installable/executable file type ('.{ext_match.group(1)}').",
            [ext_match.group(1)]))

    for key, value in query_pairs:
        k = key.lower()
        v = unquote(value).lower()
        if k in REDIRECT_PARAMS and re.match(r"^(https?:)?//", v):
            result.structure_findings.append(UrlPathFinding(
                "EMBEDDED_REDIRECT",
                f"Query parameter '{k}' carries another URL ('{v[:60]}'), a common redirect/lure pattern.",
                [k]))
            break
    sensitive = [k.lower() for k, _ in query_pairs if k.lower() in SENSITIVE_QUERY_KEYS]
    if sensitive:
        result.structure_findings.append(UrlPathFinding(
            "SENSITIVE_QUERY_PARAMETER",
            f"Query string names sensitive credential field(s): {', '.join(sorted(set(sensitive)))}.",
            sorted(set(sensitive))))
    return result
