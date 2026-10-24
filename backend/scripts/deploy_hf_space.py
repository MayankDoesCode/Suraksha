"""
Build and upload the SURAKSHA ML Hugging Face Space.

    set HF_TOKEN=hf_...        (a write token from https://huggingface.co/settings/tokens)
    python -m backend.scripts.deploy_hf_space --repo <your-username>/suraksha-ml [--private]

Copies only what inference needs (backend ML code, detection helpers, model artifacts, the training scripts the pickled
models reference) into a build folder, then creates/updates a Docker Space. Tests, data/ and databases are never uploaded.
Afterwards set on Render: SURAKSHA_ML_REMOTE_URL=https://<user>-suraksha-ml.hf.space (and SURAKSHA_ML_REMOTE_TOKEN if
you set SPACE_API_TOKEN as a Space secret).
"""
import argparse
import os
import shutil
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
IGNORE = shutil.ignore_patterns("__pycache__", "*.pyc", "tests", "*.db", "data", "*.sqlite*", "node_modules")


def build(dst):
    shutil.copytree(os.path.join(ROOT, "deploy", "hf_space"), dst, dirs_exist_ok=True)
    shutil.copytree(os.path.join(ROOT, "backend"), os.path.join(dst, "backend"), ignore=IGNORE, dirs_exist_ok=True)
    reqs = open(os.path.join(ROOT, "backend", "requirements.txt"), encoding="utf-8").read()
    with open(os.path.join(dst, "requirements.txt"), "w", encoding="utf-8") as fh:
        fh.write(reqs + "\ngunicorn\n")
    return dst


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", required=True, help="<username>/<space-name>")
    ap.add_argument("--private", action="store_true")
    args = ap.parse_args()
    token = os.getenv("HF_TOKEN")
    if not token:
        raise SystemExit("Set HF_TOKEN to a Hugging Face write token first.")
    from huggingface_hub import HfApi
    api = HfApi(token=token)
    api.create_repo(args.repo, repo_type="space", space_sdk="docker", private=args.private, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        folder = build(os.path.join(tmp, "space"))
        api.upload_folder(folder_path=folder, repo_id=args.repo, repo_type="space", commit_message="Deploy SURAKSHA ML service")
    user, name = args.repo.split("/", 1)
    print(f"Space: https://huggingface.co/spaces/{args.repo}")
    print(f"API base for Render: https://{user.lower()}-{name.lower().replace('_', '-')}.hf.space")


if __name__ == "__main__":
    main()
