"""Logo / icon / avatar comparison for impersonation detection.

Perceptual hashing (dHash + aHash on a 16x16 grayscale thumbnail) so that
re-encoded, resized, lightly recoloured or watermarked copies of an official
logo still match, while unrelated images do not. If Pillow or the image is
unavailable the signal is reported as *unavailable* - never guessed.
"""
import base64
import binascii
import io
import ipaddress
import os
import re
import socket
import urllib.error
import urllib.request
from dataclasses import dataclass
from functools import lru_cache
from typing import Optional
from urllib.parse import urlparse

try:  # Pillow is optional; the detectors degrade gracefully without it.
    from PIL import Image, ImageOps
except Exception:  # pragma: no cover
    Image = None
    ImageOps = None

MAX_IMAGE_BYTES = 2 * 1024 * 1024
FETCH_TIMEOUT_SECONDS = 4
LOGO_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "logos")
_LOGO_PATH_RE = re.compile(r"^/api/v1/brands/([A-Za-z0-9_-]{1,64})/logo$")
_HASH_SIDE = 16

MATCH_STRONG = 0.88   # near-identical image (copy / re-encode / small edit)
MATCH_LIKELY = 0.80   # same artwork with noticeable edits


@dataclass
class VisualResult:
    available: bool
    similarity: float = 0.0
    reason: str = ""


def pillow_available() -> bool:
    return Image is not None


def logo_path_for(brand_id: str) -> str:
    safe = re.sub(r"[^A-Za-z0-9_-]", "", str(brand_id))[:64]
    return os.path.join(LOGO_DIR, f"{safe}.img")


def validate_image_bytes(data: bytes) -> Optional[str]:
    """Return an error message if bytes are not an acceptable raster image."""
    if not data:
        return "Empty file."
    if len(data) > MAX_IMAGE_BYTES:
        return f"Image exceeds {MAX_IMAGE_BYTES // (1024 * 1024)} MB limit."
    if Image is None:
        return "Image support (Pillow) is not installed on the server."
    try:
        with Image.open(io.BytesIO(data)) as img:
            if img.format not in ("PNG", "JPEG", "WEBP", "GIF"):
                return "Logo must be a PNG, JPEG, WEBP or GIF image."
            if img.width < 16 or img.height < 16:
                return "Image is too small (minimum 16x16 pixels)."
            img.verify()
    except Exception:
        return "File is not a valid image."
    return None


def _pixels(im):
    getter = getattr(im, "get_flattened_data", None) or im.getdata
    return list(getter())


def image_hash(data: bytes) -> Optional[str]:
    """512-bit perceptual hash (hex), or None when it cannot be computed."""
    if Image is None or not data or len(data) > MAX_IMAGE_BYTES:
        return None
    try:
        with Image.open(io.BytesIO(data)) as img:
            img.seek(0)
            if img.mode in ("RGBA", "LA", "P"):
                rgba = img.convert("RGBA")
                bg = Image.new("RGBA", rgba.size, (255, 255, 255, 255))
                bg.alpha_composite(rgba)
                img = bg
            gray = ImageOps.autocontrast(img.convert("L"))
            n = _HASH_SIDE
            small = gray.resize((n + 1, n), Image.LANCZOS)
            px = _pixels(small)
            d_bits = []
            for y in range(n):
                row = px[y * (n + 1):(y + 1) * (n + 1)]
                d_bits.extend(1 if row[x] > row[x + 1] else 0 for x in range(n))
            tiny = _pixels(gray.resize((n, n), Image.LANCZOS))
            mean = sum(tiny) / len(tiny)
            a_bits = [1 if p > mean else 0 for p in tiny]
        bits = d_bits + a_bits
        return "%0*x" % (len(bits) // 4, int("".join(map(str, bits)), 2))
    except Exception:
        return None


def hash_similarity(a: Optional[str], b: Optional[str]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dist = bin(int(a, 16) ^ int(b, 16)).count("1")
    total = len(a) * 4
    return round(1.0 - dist / total, 4)


def _is_public_host(host: str) -> bool:
    try:
        for info in socket.getaddrinfo(host, None):
            ip = ipaddress.ip_address(info[4][0])
            if (ip.is_private or ip.is_loopback or ip.is_link_local
                    or ip.is_reserved or ip.is_multicast or ip.is_unspecified):
                return False
        return True
    except Exception:
        return False


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def _fetch_url(url: str) -> Optional[bytes]:
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        return None
    if not _is_public_host(parsed.hostname):  # SSRF guard
        return None
    try:
        opener = urllib.request.build_opener(_NoRedirect)
        req = urllib.request.Request(url, headers={"User-Agent": "Suraksha-ImageCheck/1.0"})
        with opener.open(req, timeout=FETCH_TIMEOUT_SECONDS) as resp:
            data = resp.read(MAX_IMAGE_BYTES + 1)
        return data if len(data) <= MAX_IMAGE_BYTES else None
    except (urllib.error.URLError, OSError, ValueError):
        return None


def resolve_image_bytes(ref: Optional[str]) -> Optional[bytes]:
    """Resolve a data: URI, an uploaded-logo API path, or a public http(s) URL."""
    if not ref or not isinstance(ref, str):
        return None
    ref = ref.strip()
    if ref.startswith("data:"):
        try:
            _, payload = ref.split(",", 1)
            data = base64.b64decode(payload, validate=False)
            return data if len(data) <= MAX_IMAGE_BYTES else None
        except (ValueError, binascii.Error):
            return None
    m = _LOGO_PATH_RE.match(ref)
    if m:
        path = logo_path_for(m.group(1))
        if os.path.isfile(path):
            with open(path, "rb") as fh:
                return fh.read(MAX_IMAGE_BYTES + 1)
        return None
    return _fetch_url(ref)


@lru_cache(maxsize=256)
def _cached_remote_hash(ref: str) -> Optional[str]:
    return image_hash(resolve_image_bytes(ref) or b"")


def hash_from_ref(ref: Optional[str]) -> Optional[str]:
    if not ref:
        return None
    m = _LOGO_PATH_RE.match(ref.strip())
    if m:  # local files can change on re-upload: key the cache on mtime
        path = logo_path_for(m.group(1))
        try:
            return _local_hash(path, os.path.getmtime(path))
        except OSError:
            return None
    if ref.strip().startswith("data:"):
        return image_hash(resolve_image_bytes(ref) or b"")
    return _cached_remote_hash(ref.strip())


@lru_cache(maxsize=64)
def _local_hash(path: str, _mtime: float) -> Optional[str]:
    with open(path, "rb") as fh:
        return image_hash(fh.read(MAX_IMAGE_BYTES + 1))


def compare_to_brand_logo(candidate_image_ref: Optional[str], brand: dict) -> VisualResult:
    """Compare a candidate avatar/icon with the brand's official logo."""
    if not candidate_image_ref:
        return VisualResult(False, 0.0, "No candidate image supplied.")
    if Image is None:
        return VisualResult(False, 0.0, "Image comparison unavailable (Pillow not installed).")
    brand_ref = brand.get("logo_url") or ""
    if not brand_ref:
        return VisualResult(False, 0.0, "Brand profile has no official logo to compare against.")
    brand_hash = hash_from_ref(brand_ref)
    if not brand_hash:
        return VisualResult(False, 0.0, "Official logo could not be loaded.")
    cand_hash = hash_from_ref(candidate_image_ref)
    if not cand_hash:
        return VisualResult(False, 0.0, "Candidate image could not be loaded.")
    return VisualResult(True, hash_similarity(brand_hash, cand_hash), "")
