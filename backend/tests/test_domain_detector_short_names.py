import pytest

from backend.app.detection.domain_detector import DomainDetector, extract_domain_components, is_adjacent_transposition

SBI = {"id": "b", "name": "State Bank of India", "domains": [{"domain": "sbi.co.in", "is_primary": True}], "social_handles": [], "app_identifiers": [], "keywords": []}
PAYTM = {**SBI, "name": "Paytm", "domains": [{"domain": "paytm.com", "is_primary": True}]}


def score(name, brand):
    out = DomainDetector().evaluate_full({"asset_type": "domain", "candidate_name": name, "source_url": "https://" + name}, brand)
    return 0.0 if out.is_official else out.risk_evaluation.total_score


def test_two_level_suffix_sld():
    c = extract_domain_components("sbi.co.in")
    assert c["sld"] == "sbi" and c["tld"] == "co.in"
    assert extract_domain_components("example.com")["sld"] == "example"


@pytest.mark.parametrize("name", ["login-sbi.com", "pay-sbi.com", "sbi-kyc-update.com"])
def test_short_brand_with_lure_keyword_is_flagged(name):
    assert score(name, SBI) >= 25


@pytest.mark.parametrize("name", ["patym.com", "paytm-support.net"])
def test_short_name_typos_flagged(name):
    assert score(name, PAYTM) >= 25


@pytest.mark.parametrize("name", ["visibility.com", "sbirthday.org", "sbi.co.in", "mail.sbi.co.in", "loginsystems.com", "wikipedia.org"])
def test_unrelated_or_official_not_flagged(name):
    assert score(name, SBI) < 25


def test_transposition_helper():
    assert is_adjacent_transposition("patym", "paytm") and not is_adjacent_transposition("paytm", "paytm")
    assert not is_adjacent_transposition("paxtm", "paytm") and not is_adjacent_transposition("pytam", "paytm")
