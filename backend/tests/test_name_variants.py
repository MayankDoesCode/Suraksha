from backend.app.intel.name_variants import variants


def test_variants_cover_attack_patterns_and_are_unique():
    v = variants("Acme Pay")
    low = [x.lower() for x in v]
    assert "acme pay" in low and "acmepay" in low and "acme pay support" in low
    assert "camepay" in low                      # adjacent swap
    assert len(v) == len(set(low)) and len(v) <= 8


def test_extra_queries_included_and_short_names_safe():
    assert "acme fintech" in [x.lower() for x in variants("Acme", ["Acme FinTech"], limit=12)]
    assert variants("ab")  # never raises on very short names
