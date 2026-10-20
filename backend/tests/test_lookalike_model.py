from backend.app.ml.lookalike_service import predict_lookalike


def test_official_excluded():
    assert predict_lookalike("@acme", "acme", ["acme"])["is_official_asset"] is True


def test_lookalike_scores_higher_than_unrelated():
    a = predict_lookalike("acme_support", "acme", [])
    b = predict_lookalike("gardenhq", "acme", [])
    if a["available"]:
        assert a["probability"] > b["probability"]
        assert a["probability"] > 0.5 > b["probability"]
