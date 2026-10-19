"""Shared utilities for the SURAKSHA dataset research kit."""
from __future__ import annotations
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def ensure_root(root: str | Path) -> Path:
    path = Path(root).expanduser().resolve()
    for child in ("raw", "processed", "manifests", "reports", "artifacts"):
        (path / child).mkdir(parents=True, exist_ok=True)
    return path


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False, default=str) + "\n", encoding="utf-8")


def safe_extract_zip(zip_path: Path, destination: Path) -> None:
    """Extract a ZIP while preventing path traversal."""
    import zipfile
    destination.mkdir(parents=True, exist_ok=True)
    dest_resolved = destination.resolve()
    with zipfile.ZipFile(zip_path) as archive:
        for item in archive.infolist():
            out = (destination / item.filename).resolve()
            if out != dest_resolved and dest_resolved not in out.parents:
                raise ValueError(f"Unsafe ZIP member path: {item.filename}")
        archive.extractall(destination)
