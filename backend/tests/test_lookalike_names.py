"""Look-alike name bonus: swaps, added words, spacing - without over-flagging normal names."""
import pytest

from backend.app.detection.app_detector import AppDetector
from backend.app.detection.social_detector import SocialDetector

BRAND = {
    "name": "Acme Bank", "description": "", "logo_url": None,
    "social_handles": [{"handle": "acmebank", "platform": "x", "url": ""}],
    "domains": [{"domain": "acmebank.com"}],
    "app_identifiers": [{"identifier": "com.acme.bank", "platform": "android", "app_name": "Acme Bank"}],
    "publishers": [{"publisher_name": "Acme Bank Ltd"}],
}

SOCIAL_LOOKALIKES = [
    "acmebnak", "acme_bank", "acme bank", "acme.bank", "a c m e b a n k", "acme-bank-support",
    "acmebank_official", "acmebankk", "acmebank1", "аcmebank", "4cmebank", "acmeb4nk",
    "acme_bank_care", "acmebank_help", "the_acme_bank", "acmebankindia", "acmebanc", "acmmebank",
    "amcebank", "acme_bank_kyc", "acmebankcustomercare",
]
SOCIAL_NORMAL = [
    "bakerytown", "blue_mountain_cafe", "yogaflow", "crime_news", "acorn_bakery", "tacoma_parks",
    "mechanic_hub", "bank_of_nowhere", "academy_notes", "acne_clinic", "river_bank_cafe", "pacific_bank",
]
APP_LOOKALIKES = ["Acme Banking", "AcmeBank Pro", "Acme Bnak", "Acme Bank Rewards", "Acme Wallet",
                  "Acme Bank Secure Login", "Acme-Bank", "Acme B4nk", "Acme Bank Official"]
APP_NORMAL = ["Daily Yoga", "Bank Calculator", "River Bank Cafe", "Pocket Budget", "Tacoma Transit", "Acorn Games"]


@pytest.mark.parametrize("name", SOCIAL_LOOKALIKES)
def test_social_lookalike_flagged(name):
    out = SocialDetector().evaluate_full({"candidate_name": name, "platform": "x"}, BRAND)
    assert not out.is_official and out.risk_evaluation.signals


@pytest.mark.parametrize("name", SOCIAL_NORMAL)
def test_social_normal_name_not_flagged(name):
    out = SocialDetector().evaluate_full({"candidate_name": name, "platform": "x"}, BRAND)
    assert not out.risk_evaluation.signals


def test_social_exact_official_handle_still_excluded_case_and_at_sign():
    for variant in ("acmebank", "AcmeBank", "@acmebank"):
        assert SocialDetector().evaluate_full({"candidate_name": variant, "platform": "x"}, BRAND).is_official


@pytest.mark.parametrize("title", APP_LOOKALIKES)
def test_app_lookalike_flagged(title):
    out = AppDetector().evaluate_full(
        {"candidate_name": title, "package_id": "com.rando.app", "publisher_name": "Random Dev"}, BRAND)
    assert not out.is_official and out.risk_evaluation.signals


@pytest.mark.parametrize("title", APP_NORMAL)
def test_app_normal_title_not_flagged(title):
    out = AppDetector().evaluate_full(
        {"candidate_name": title, "package_id": "com.rando.x", "publisher_name": "Random Dev"}, BRAND)
    assert not out.risk_evaluation.signals
