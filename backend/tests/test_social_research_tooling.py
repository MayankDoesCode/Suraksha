"""Offline tests for the Dataset A collection queue and the Dataset B candidate artifact (no network)."""
import csv
import json
import os

import pandas as pd

from backend.app.ml.annotations import SOCIAL_COLUMNS, parse_registry, validate_annotations
from backend.scripts import collect_social_candidates as col

MODELS = os.path.join(os.path.dirname(os.path.dirname(__file__)), "app", "ml", "models")


class _Resp:
    def __init__(self, body):
        self.status_code, self.content = 200, json.dumps(body).encode()

    def raise_for_status(self):
        pass

    def json(self):
        return json.loads(self.content)


def _fake_get(url, params=None, headers=None, timeout=None):
    if "bsky" in url:
        return _Resp({"actors": [{"handle": "acme-help.bsky.social", "displayName": "Acme Help", "description": "mail me at x@y.com"},
                                 {"handle": "acme.com", "displayName": "Acme"}]})
    return _Resp({"accounts": [{"acct": "acmesupport@mastodon.social", "display_name": "Acme Support", "note": "", "url": "https://mastodon.social/@acmesupport"}]})


def test_collector_writes_unlabelled_valid_queue(tmp_path, monkeypatch):
    reg = tmp_path / "registry.csv"
    reg.write_text("brand_name,official_domains,official_social_handles,official_android_package_ids,official_ios_bundle_ids,"
                   "official_profile_source_url,official_app_source_url,verified_by,verified_at_utc,notes\n"
                   "Acme,acme.com,bluesky:acme.com,,,https://acme.com/social,,tester,2026-10-01T00:00:00Z,\n")
    monkeypatch.setattr(col, "DATA", str(tmp_path / "data"))
    monkeypatch.setattr(col, "QUEUE", str(tmp_path / "data" / "processed" / "queue.csv"))
    monkeypatch.setattr(col, "PAUSE_S", 0)
    monkeypatch.setattr(col.requests, "get", _fake_get)
    monkeypatch.setattr("sys.argv", ["x", "--registry", str(reg)])
    col.main()
    col.main()  # second run must not duplicate rows

    with open(col.QUEUE, newline="", encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))
    assert list(rows[0].keys()) == SOCIAL_COLUMNS
    assert len(rows) == 3  # 2 bluesky + 1 mastodon, de-duplicated across queries and runs
    assert all(r["label"] == "" and r["reviewer_id"] == "" and r["evidence_summary"] == "" for r in rows)
    assert not any("x@y.com" in r["bio_text"] for r in rows)
    official = [r for r in rows if r["username"] == "acme.com"][0]
    assert json.loads(official["profile_metadata_json"])["in_official_registry"] is True  # hint only, still unlabelled
    raw = list((tmp_path / "data" / "raw" / "social_candidates").rglob("*.json"))
    assert raw, "raw API responses must be kept"
    frame = pd.read_csv(col.QUEUE, dtype=str).fillna("")
    report = validate_annotations(frame, "social", parse_registry(pd.read_csv(reg, dtype=str).fillna("")))
    assert report.ok and report.to_dict()["trainable_rows"] == 0


def test_xgb_candidate_is_saved_beside_but_not_replacing_shipped_model():
    cand = json.load(open(os.path.join(MODELS, "social_fake_xgb_candidate_manifest.json")))
    shipped = json.load(open(os.path.join(MODELS, "social_fake_manifest.json")))
    assert cand["status"] == "candidate_not_deployed"
    assert shipped["model_artifact"] == "social_fake_pipeline.joblib"
    assert os.path.exists(os.path.join(MODELS, cand["model_artifact"]))
    assert "NOT brand impersonation" in cand["task"]


def test_synthetic_profile_model_is_marked_synthetic_and_reads_bios():
    import joblib
    import pandas as pd
    man = json.load(open(os.path.join(MODELS, "social_impersonation_synthetic_manifest.json")))
    assert man["status"] == "synthetic_trained_not_validated" and man["not_loaded_by_service"] is True
    model = joblib.load(os.path.join(MODELS, man["model_artifact"]))
    same_name = dict(brand="acme", handle="acme_updates", display="Acme Updates")
    rows = pd.DataFrame([{**same_name, "bio": "Official Acme support. DM us your OTP to verify your account"},
                         {**same_name, "bio": "Fan page. Not affiliated with Acme."}])
    p = model.predict_proba(rows)[:, 1]
    assert p[0] > p[1]  # identical names, so only the bio can separate them


def test_social_check_adds_synthetic_advisory_evidence_without_moving_score(app):
    from backend.app.database import get_db
    from backend.app.models import Brand, BrandSocialHandle
    from backend.app.services.detection_service import DetectionService
    with app.app_context():
        db = get_db()
        brand = Brand(name="Acme")
        db.add(brand); db.commit(); db.refresh(brand)
        db.add(BrandSocialHandle(brand_id=brand.id, platform="twitter", handle="acme", url="https://twitter.com/acme")); db.commit()
        svc = DetectionService()
        cand = {"asset_type": "social", "candidate_name": "@acme_support", "platform": "twitter",
                "display_name": "Acme Support", "bio": "Official Acme support. DM us your OTP to verify your account"}
        res = svc.evaluate_candidate(brand.id, cand, persist=False)
        ev = [e for e in res["evidence"] if e["evidence_type"] == "social_impersonation_ml_synthetic"]
        assert len(ev) == 1 and "SYNTHETIC-trained" in ev[0]["description"] and "not included in the risk score" in ev[0]["description"]

        import backend.app.ml.profile_impersonation_service as pis
        os.environ["SURAKSHA_DISABLE_SYNTHETIC_PROFILE_MODEL"] = "1"
        try:
            res_off = svc.evaluate_candidate(brand.id, cand, persist=False)
        finally:
            del os.environ["SURAKSHA_DISABLE_SYNTHETIC_PROFILE_MODEL"]
        assert not [e for e in res_off["evidence"] if e["evidence_type"] == "social_impersonation_ml_synthetic"]
        assert res_off["risk_score"] == res["risk_score"]  # advisory evidence never moves the score

        official = svc.evaluate_candidate(brand.id, {"asset_type": "social", "candidate_name": "@acme", "platform": "twitter",
                                                     "source_url": "https://twitter.com/acme"}, persist=False)
        assert official["is_official"] and not official.get("evidence")  # officials excluded before any scoring
