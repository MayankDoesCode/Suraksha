from backend.app.detection.combined import combine


def test_rule_only_lists_missing_inputs():
    r = combine(40)
    assert r["combined_score"] == 40 and len(r["unavailable_inputs"]) == 4


def test_contributions_sum_and_caps():
    r = combine(50, url_model_probability=1.0, domain_age_days=2, tls={"self_signed": True}, page_similarity=1.0)
    assert r["combined_score"] == sum(c["points"] for c in r["contributions"]) == 50 + 8 + 12 + 4 + 12
    assert combine(99, 1.0, 1)["combined_score"] == 100


def test_weak_inputs_cannot_exceed_cap_and_low_prob_adds_nothing():
    r = combine(0, url_model_probability=0.4, domain_age_days=400)
    assert r["combined_score"] == 0
    assert combine(0, 1.0, 1, {"self_signed": True}, 1.0)["combined_score"] <= 36
