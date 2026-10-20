"""Logo/icon matching, scam cues, description similarity and official-asset exclusion."""
import base64
import io

import pytest

PIL = pytest.importorskip("PIL")
from PIL import Image, ImageDraw  # noqa: E402

from backend.app.detection import visual  # noqa: E402
from backend.app.detection.app_detector import AppDetector  # noqa: E402
from backend.app.detection.social_detector import SocialDetector  # noqa: E402


def _logo(kind="acme", size=128, fmt="PNG", tint=0):
    img = Image.new("RGB", (size, size), "white")
    d = ImageDraw.Draw(img)
    s = size / 128
    if kind == "acme":
        d.ellipse([10 * s, 10 * s, 118 * s, 118 * s], fill=(20 + tint, 40, 140))
        d.polygon([(64 * s, 25 * s), (100 * s, 100 * s), (28 * s, 100 * s)], fill="white")
        d.rectangle([30 * s, 80 * s, 98 * s, 92 * s], fill=(250, 200, 0))
    else:  # unrelated artwork
        d.rectangle([0, 0, size, size], fill=(200, 30, 30))
        for i in range(0, size * 2, int(16 * s)):
            d.line([(i, 0), (0, i)], fill="black", width=int(5 * s))
        d.ellipse([40 * s, 40 * s, 90 * s, 90 * s], fill="green")
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return "data:image/%s;base64,%s" % (fmt.lower(), base64.b64encode(buf.getvalue()).decode())


BRAND = {
    "name": "Acme Bank",
    "description": "Acme Bank mobile banking: check balances, transfer money, pay bills and manage cards securely.",
    "logo_url": _logo("acme"),
    "social_handles": [{"handle": "acmebank", "platform": "x", "url": "https://x.com/acmebank"}],
    "domains": [{"domain": "acmebank.com"}],
    "app_identifiers": [{"identifier": "com.acme.bank", "platform": "android", "app_name": "Acme Bank"}],
    "publishers": [{"publisher_name": "Acme Bank Ltd"}],
}


def _names(outcome):
    return {s.signal_type for s in outcome.risk_evaluation.signals}


def test_hash_robust_to_resize_reencode_and_small_edit_but_not_other_art():
    base = visual.hash_from_ref(_logo("acme"))
    assert visual.hash_similarity(base, visual.hash_from_ref(_logo("acme", 300, "JPEG"))) >= visual.MATCH_STRONG
    assert visual.hash_similarity(base, visual.hash_from_ref(_logo("acme", 128, "PNG", tint=40))) >= visual.MATCH_LIKELY
    assert visual.hash_similarity(base, visual.hash_from_ref(_logo("other"))) < visual.MATCH_LIKELY


def test_social_copied_logo_and_scam_bio_flagged():
    out = SocialDetector().evaluate_full({
        "candidate_name": "acme_support_help", "platform": "x",
        "avatar_url": _logo("acme", 200, "JPEG"),
        "bio": "Official Acme Bank care. Send OTP for refund, DM us on WhatsApp +91 98765 43210",
        "account_age_days": 12,
    }, BRAND)
    assert not out.is_official
    assert {"LOGO_SIMILARITY", "SCAM_CUES", "NEW_UNVERIFIED_ACCOUNT"} <= _names(out)
    assert out.risk_evaluation.severity in ("HIGH", "CRITICAL")


def test_social_logo_copy_with_unrelated_name_still_flagged():
    out = SocialDetector().evaluate_full(
        {"candidate_name": "quickloans247", "avatar_url": _logo("acme", 256, "PNG")}, BRAND)
    assert "LOGO_SIMILARITY" in _names(out)


def test_social_official_and_unrelated_not_flagged():
    det = SocialDetector()
    official = det.evaluate_full({"candidate_name": "AcmeBank", "platform": "x", "avatar_url": _logo("acme")}, BRAND)
    assert official.is_official and not official.risk_evaluation.signals
    unrelated = det.evaluate_full({
        "candidate_name": "bakerytown", "avatar_url": _logo("other"),
        "bio": "Fresh bread daily. DM us for orders. Call +91 90000 11111", "account_age_days": 5}, BRAND)
    assert not unrelated.risk_evaluation.signals  # scam-like wording alone is not brand impersonation


def test_social_missing_or_broken_image_degrades_gracefully():
    out = SocialDetector().evaluate_full({"candidate_name": "acme_bank_help", "avatar_url": "data:image/png;base64,@@@"}, BRAND)
    assert "LOGO_SIMILARITY" not in _names(out)
    assert any(e["evidence_type"] == "visual_check_unavailable" for e in out.evidence_records)
    out2 = SocialDetector().evaluate_full({"candidate_name": "acme_bank_help"}, {**BRAND, "logo_url": None})
    assert "LOGO_SIMILARITY" not in _names(out2)


def test_app_icon_copy_by_other_publisher_flagged():
    out = AppDetector().evaluate_full({
        "candidate_name": "Acme Bank Rewards", "package_id": "com.fastcash.rewards",
        "publisher_name": "FastCash Studio", "icon_url": _logo("acme", 180, "JPEG"),
        "description": "Acme Bank mobile banking: check balances, transfer money and pay bills. Claim rewards."}, BRAND)
    assert {"ICON_SIMILARITY", "PUBLISHER_MISMATCH", "DESCRIPTION_SIMILARITY"} <= _names(out)


def test_app_official_and_publisher_family_excluded_but_namespace_alone_is_not():
    det = AppDetector()
    assert det.evaluate_full({"candidate_name": "Acme Bank", "package_id": "com.acme.bank", "platform": "android"}, BRAND).is_official
    fam = det.evaluate_full({"candidate_name": "Acme Wallet", "package_id": "com.acme.wallet",
                             "publisher_name": "Acme Bank Ltd"}, BRAND)
    assert fam.is_official and "namespace" in fam.exclusion_reason
    squat = det.evaluate_full({"candidate_name": "Acme Wallet", "package_id": "com.acme.wallet",
                               "publisher_name": "Random Dev"}, BRAND)
    assert not squat.is_official and squat.risk_evaluation.signals


def test_app_unrelated_not_flagged():
    out = AppDetector().evaluate_full({
        "candidate_name": "Daily Yoga", "package_id": "com.zen.yoga", "publisher_name": "Zen Apps",
        "icon_url": _logo("other"), "description": "Stretch, breathe and relax with guided yoga sessions."}, BRAND)
    assert not out.risk_evaluation.signals


def test_private_urls_are_not_fetched():
    assert visual.resolve_image_bytes("http://127.0.0.1/logo.png") is None
    assert visual.resolve_image_bytes("http://169.254.169.254/latest/meta-data") is None
    assert visual.resolve_image_bytes("file:///etc/passwd") is None
