# Free hosting on a Hugging Face Space (full model, ~16 GB RAM)

Use this instead of Render if you want the full URL model without paying. The Space repo holds only two
small files; the image builds Suraksha from GitHub.

1. Create a free account at huggingface.co, then **New Space**: name `suraksha`, SDK **Docker** (Blank), hardware **CPU basic (free)**, visibility **Public**.
2. Open the Space's **Files** tab and add two files, copying the contents of:
   - `docs/huggingface/README.md` to `README.md` (replace the generated one)
   - `docs/huggingface/Dockerfile` to `Dockerfile`
3. Commit. The Space builds (about 8 to 15 minutes the first time). The **Logs** tab shows progress.
4. Your link is `https://<your-username>-suraksha.hf.space`.

Settings to add under the Space's **Settings → Variables and secrets** (all optional for demo mode):
- Secret `SECRET_KEY`: any long random string.
- Secret `DATABASE_URL`: a free Postgres URL from neon.tech. Without it findings live in a SQLite file that resets on restart.
- Variables `VITE_FIREBASE_*`: copy from your Render environment if you want Google sign-in (they are used at build time).

Notes:
- The repository must be public, or the Dockerfile's `git clone` needs a token.
- Free Spaces pause after ~48 h without visits; open the link before the demo. A Space wakes much faster than Render.
- To deploy new code, change `ARG CACHE_BUST=1` in the Space's Dockerfile to a new number (2, 3, ...) and commit; the latest code is cloned on that build.
- To use another branch, change `ARG BRANCH` in the Space's Dockerfile.
- Android app: rebuild with `api_base_url` set to `https://<your-username>-suraksha.hf.space/api/v1` (Actions → Android APK → Run workflow, or push a new tag after changing the default).
