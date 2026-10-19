"""
Certificate Transparency feed: newly issued certificate names are checked against protected brands.

CT_MODE=replay (default) reads a JSONL file (one {"domain": ...} per line). CT_MODE=live is NOT implemented in
this build and fails loudly rather than pretending. A cheap prefilter (brand token or edit distance <= 2 to a
verified domain) runs first; survivors go through DetectionService, which reuses domain_detector / similarity
and persists findings (the same persistence path ScanService uses). A CT hit means a certificate exists for the
name, not that the name is malicious.
"""
import json
import logging
import os
import threading
import time
from typing import Any, Dict, Iterable, List, Optional

from backend.app.detection.similarity import levenshtein_distance
from backend.app.intel.netsafe import UnsafeTarget, normalize_hostname

logger = logging.getLogger(__name__)
DEFAULT_REPLAY = os.path.join(os.path.dirname(__file__), "..", "data", "ct_replay.jsonl")


def label_of(domain: str) -> str:
    parts = domain.lower().split(".")
    return parts[-2] if len(parts) >= 2 else parts[0]


def prefilter(domain: str, brands: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Return {brand_id, reason} when `domain` is worth a full evaluation, else None. Official names never match."""
    lab = label_of(domain)
    for b in brands:
        if domain in b["domains"] or domain.endswith(tuple("." + d for d in b["domains"])):
            return None
    for b in brands:
        for d in b["domains"]:
            base = label_of(d)
            if len(base) >= 4 and base in domain.replace("-", ""):
                return {"brand_id": b["id"], "reason": f"contains brand token '{base}'"}
            if abs(len(lab) - len(base)) <= 2 and levenshtein_distance(lab, base) <= 2:
                return {"brand_id": b["id"], "reason": f"edit distance <= 2 from '{base}'"}
    return None


class CtStream:
    def __init__(self, detection=None, brand_loader=None, mode: Optional[str] = None, replay_path: Optional[str] = None):
        self.mode = (mode or os.getenv("CT_MODE", "replay")).lower()
        self.replay_path = replay_path or os.getenv("CT_REPLAY_PATH", DEFAULT_REPLAY)
        self._detection = detection
        self._brand_loader = brand_loader or self._load_brands
        self._thread: Optional[threading.Thread] = None
        self._stop = threading.Event()
        self.stats: Dict[str, Any] = {"seen": 0, "prefiltered": 0, "findings": 0, "errors": 0, "started_at": None, "finished": False}

    @property
    def detection(self):
        if self._detection is None:
            from backend.app.services.detection_service import DetectionService
            self._detection = DetectionService()
        return self._detection

    owner_id: Optional[str] = None  # None = every brand (admin / tests); otherwise only this user's brands

    def _load_brands(self) -> List[Dict[str, Any]]:
        from backend.app.models.brand import Brand
        from backend.app.repositories.brand_repository import BrandRepository
        out = []
        for b in BrandRepository().session.query(Brand).all():
            if self.owner_id is not None and b.owner_id != self.owner_id:
                continue
            ds = [d["domain"].lower() for d in b.to_dict(include_relations=True).get("domains", []) if d.get("domain")]
            if ds:
                out.append({"id": b.id, "domains": ds})
        return out

    def _names(self) -> Iterable[str]:
        if self.mode != "replay":
            raise RuntimeError("Only CT_MODE=replay is implemented; live certstream is not enabled in this build")
        with open(self.replay_path, encoding="utf8") as fh:
            for line in fh:
                if self._stop.is_set():
                    return
                try:
                    yield json.loads(line)["domain"]
                except (ValueError, KeyError):
                    self.stats["errors"] += 1

    def run_once(self) -> Dict[str, Any]:
        brands = self._brand_loader()
        for raw in self._names():
            self.stats["seen"] += 1
            try:
                name = normalize_hostname(raw.lstrip("*."))
            except UnsafeTarget:
                continue
            hit = prefilter(name, brands)
            if not hit:
                continue
            self.stats["prefiltered"] += 1
            try:
                res = self.detection.evaluate_candidate(
                    hit["brand_id"],
                    {"asset_type": "domain", "candidate_name": name, "source_url": f"https://{name}", "detection_source": "ct_stream"},
                    persist=True,
                )
                self.stats["findings"] += int(bool(res.get("finding")))
            except Exception:
                logger.exception("CT evaluation failed for %s", name)
                self.stats["errors"] += 1
        self.stats["finished"] = True
        return self.status()

    def start(self, owner_id: Optional[str] = None) -> bool:
        if self._thread and self._thread.is_alive():
            return False
        self._stop.clear()
        self.owner_id = owner_id
        self.stats.update(seen=0, prefiltered=0, findings=0, errors=0, started_at=time.time(), finished=False)
        self.stats.pop("last_error", None)
        self._thread = threading.Thread(target=self._guarded, daemon=True, name="ct-stream")
        self._thread.start()
        return True

    def _guarded(self):
        try:
            self.run_once()
        except Exception as exc:
            self.stats["errors"] += 1
            self.stats["last_error"] = str(exc)

    def stop(self):
        self._stop.set()

    def status(self) -> Dict[str, Any]:
        return {"mode": self.mode, "running": bool(self._thread and self._thread.is_alive()), **self.stats,
                "note": "Replay reads a local file. Live CT is not enabled in this build."}


_instance: Optional[CtStream] = None


def get_stream() -> CtStream:
    global _instance
    if _instance is None:
        _instance = CtStream()
    return _instance
