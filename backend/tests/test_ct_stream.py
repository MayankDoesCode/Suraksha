import json

from backend.app.intel.ct_stream import CtStream, prefilter

BRANDS = [{"id": "b1", "domains": ["acmefinance.com"]}]


def test_prefilter_matches_lookalikes_only():
    assert prefilter("acmefinanc.com", BRANDS)["brand_id"] == "b1"
    assert prefilter("secure-acmefinance.support", BRANDS)
    assert prefilter("gardenbooks12.net", BRANDS) is None
    assert prefilter("acmefinance.com", BRANDS) is None
    assert prefilter("mail.acmefinance.com", BRANDS) is None


class FakeDetection:
    def __init__(self):
        self.calls = []

    def evaluate_candidate(self, brand_id, data, persist=False):
        self.calls.append(data["candidate_name"])
        return {"finding": {"id": "f"}}


def test_replay_evaluates_only_prefiltered(tmp_path):
    p = tmp_path / "r.jsonl"
    p.write_text("\n".join(json.dumps({"domain": d}) for d in ["a1b2c3.com", "acmefinanc.com", "*.acmefinance-login.com", "127.0.0.1"]) + "\nnot json\n")
    det = FakeDetection()
    st = CtStream(detection=det, brand_loader=lambda: BRANDS, mode="replay", replay_path=str(p)).run_once()
    assert sorted(det.calls) == ["acmefinanc.com", "acmefinance-login.com"]
    assert st["seen"] == 4 and st["prefiltered"] == 2 and st["findings"] == 2 and st["errors"] == 1 and st["finished"]


def test_shipped_replay_file_finds_exactly_five_planted():
    det = FakeDetection()
    CtStream(detection=det, brand_loader=lambda: BRANDS).run_once()
    assert len(det.calls) == 5


def test_status_endpoint(client):
    r = client.get("/api/v1/ct/status")
    assert r.status_code == 200 and r.get_json()["data"]["mode"] == "replay"


def test_live_mode_fails_loudly():
    s = CtStream(detection=FakeDetection(), brand_loader=lambda: BRANDS, mode="live")
    s._guarded()
    assert s.stats["errors"] == 1 and "not enabled" in s.stats["last_error"]


def test_start_endpoint_scopes_to_owner_and_resets_stats(client, monkeypatch):
    import time
    from backend.app.intel import ct_stream
    seen = {}
    monkeypatch.setattr(ct_stream.CtStream, "_load_brands", lambda self: (seen.setdefault("owner", self.owner_id), [])[1])
    ct_stream._instance = None
    r = client.post("/api/v1/ct/start")
    assert r.status_code == 202
    for _ in range(50):
        if ct_stream.get_stream().status()["finished"]:
            break
        time.sleep(0.05)
    assert ct_stream.get_stream().status()["finished"]
    ct_stream._instance = None
