"""
Optional page probe: load a suspect page in a headless browser and report observable facts as rule signals.

OFF by default (PAGE_PROBE_ENABLED=false). Needs the optional `playwright` package; the visual-similarity signal also
needs `Pillow` + `imagehash` and reference screenshots in backend/app/data/brand_refs/<brand-slug>.png. Anything
missing is reported as skipped, never silently faked. Every navigation and sub-request is checked against the SSRF
guard (public hosts only). The probe returns signals only; it never sets severity itself.
"""
import io
import logging
import os
import re
from typing import Any, Callable, Dict, List, Optional
from urllib.parse import urlparse

from backend.app.detection.base import DetectionSignal
from backend.app.intel.netsafe import UnsafeTarget, normalize_hostname, resolve_public

logger = logging.getLogger(__name__)
REFS_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "brand_refs")
TIMEOUT_MS = 10_000
PHASH_MAX_DISTANCE = 10  # of 64 bits


def enabled() -> bool:
    return os.getenv("PAGE_PROBE_ENABLED", "false").lower() in ("1", "true", "yes")


def slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def phash_distance(png_a: bytes, png_b: bytes) -> Optional[int]:
    """Hamming distance between perceptual hashes, or None if the imaging libraries are unavailable."""
    try:
        import imagehash
        from PIL import Image
    except ImportError:
        return None
    ha = imagehash.phash(Image.open(io.BytesIO(png_a)))
    hb = imagehash.phash(Image.open(io.BytesIO(png_b)))
    return int(ha - hb)


def _guard_route(route, request):
    try:
        host = normalize_hostname(urlparse(request.url).hostname or "")
        resolve_public(host)
        route.continue_()
    except Exception:
        route.abort()


def _launch_playwright(domain: str, timeout_ms: int) -> Dict[str, Any]:
    """Real browser fetch. Returns {final_url, title, text, has_password_field, png}."""
    from playwright.sync_api import sync_playwright  # optional dependency
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        try:
            ctx = browser.new_context(ignore_https_errors=True, java_script_enabled=True, accept_downloads=False)
            page = ctx.new_page()
            page.route("**/*", _guard_route)
            page.goto("https://" + domain, timeout=timeout_ms, wait_until="domcontentloaded")
            return {
                "final_url": page.url, "title": page.title(), "text": (page.inner_text("body") or "")[:20000],
                "has_password_field": page.locator("input[type=password]").count() > 0,
                "png": page.screenshot(type="png", full_page=False),
            }
        finally:
            browser.close()


class PageProbe:
    def __init__(self, fetch: Optional[Callable[[str, int], Dict[str, Any]]] = None, refs_dir: Optional[str] = None, timeout_ms: int = TIMEOUT_MS):
        self.fetch = fetch or _launch_playwright
        self.refs_dir = refs_dir or REFS_DIR
        self.timeout_ms = timeout_ms

    def probe(self, domain: str, brand_name: str, force: bool = False) -> Dict[str, Any]:
        if not (force or enabled()):
            return {"enabled": False, "signals": [], "skipped": ["page probe disabled (PAGE_PROBE_ENABLED=false)"]}
        try:
            host = normalize_hostname(domain)
            resolve_public(host)
        except UnsafeTarget as exc:
            return {"enabled": True, "signals": [], "skipped": [f"refused: {exc}"]}
        try:
            page = self.fetch(host, self.timeout_ms)
        except ImportError:
            return {"enabled": True, "signals": [], "skipped": ["playwright is not installed"]}
        except Exception as exc:
            return {"enabled": True, "signals": [], "skipped": [f"page did not load: {type(exc).__name__}"]}

        signals: List[DetectionSignal] = []
        skipped: List[str] = []
        text = f"{page.get('title', '')} {page.get('text', '')}".lower()
        mentions = bool(brand_name) and brand_name.lower() in text
        if page.get("has_password_field"):
            signals.append(DetectionSignal(
                signal_type="PAGE_LOGIN_FORM", severity_score=10.0, confidence=0.6,
                explanation="The page contains a password field. Common on legitimate sites too; it matters in combination with brand use.",
                evidence_fields=["has_password_field"]))
            if mentions:
                signals.append(DetectionSignal(
                    signal_type="PAGE_BRAND_TEXT_WITH_LOGIN", severity_score=22.0, confidence=0.75,
                    explanation=f"The page asks for a password and names '{brand_name}' in its visible text, on a domain that is not the brand's.",
                    evidence_fields=["title", "has_password_field"]))
        elif mentions:
            signals.append(DetectionSignal(
                signal_type="PAGE_BRAND_TEXT", severity_score=6.0, confidence=0.5,
                explanation=f"The page text mentions '{brand_name}'. Weak on its own (news, fan and review sites do this).", evidence_fields=["title"]))

        ref_path = os.path.join(self.refs_dir, slug(brand_name) + ".png")
        similarity = None
        if not os.path.isfile(ref_path):
            skipped.append("visual similarity skipped: no reference screenshot for this brand")
        elif not page.get("png"):
            skipped.append("visual similarity skipped: no screenshot captured")
        else:
            with open(ref_path, "rb") as fh:
                dist = phash_distance(page["png"], fh.read())
            if dist is None:
                skipped.append("visual similarity skipped: Pillow/imagehash not installed")
            else:
                similarity = round(1 - dist / 64, 3)
                if dist <= PHASH_MAX_DISTANCE:
                    signals.append(DetectionSignal(
                        signal_type="PAGE_VISUAL_SIMILARITY", severity_score=25.0, confidence=0.7,
                        explanation=f"The page's rendered screenshot is visually close to the stored {brand_name} reference (perceptual-hash distance {dist}/64).",
                        evidence_fields=["screenshot"]))
        return {"enabled": True, "final_url": page.get("final_url"), "has_password_field": bool(page.get("has_password_field")),
                "visual_similarity": similarity, "signals": signals, "skipped": skipped}
