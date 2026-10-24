"""
Write `artifact_sha256` into every model manifest that names an artifact, so loaders can refuse corrupted or tampered
files. Re-run after retraining a model. Reads artifacts only; never changes them.

    python -m backend.scripts.stamp_artifact_checksums
"""
import json
import os

from backend.app.ml.artifact_compat import file_sha256

MODELS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "app", "ml", "models")


def main():
    for name in sorted(os.listdir(MODELS)):
        if not name.endswith(".json") or "manifest" not in name:
            continue
        path = os.path.join(MODELS, name)
        with open(path, encoding="utf-8") as fh:
            manifest = json.load(fh)
        artifact = manifest.get("model_artifact")
        if not artifact or not os.path.exists(os.path.join(MODELS, artifact)):
            print(f"skip   {name} (no artifact)")
            continue
        digest = file_sha256(os.path.join(MODELS, artifact))
        if manifest.get("artifact_sha256") == digest:
            print(f"ok     {name}")
            continue
        manifest["artifact_sha256"] = digest
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(manifest, fh, indent=2)
        print(f"stamp  {name} -> {artifact} {digest[:12]}")


if __name__ == "__main__":
    main()
