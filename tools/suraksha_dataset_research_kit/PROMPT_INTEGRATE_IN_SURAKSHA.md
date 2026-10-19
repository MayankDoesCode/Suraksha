# Claude Code / Antigravity prompt: integrate dataset research kit safely

You are working in `C:\Users\MAYANK\OneDrive\Desktop\Suraksha`.

First read `RESEARCH_REPORT.md` and this kit's README before modifying anything. The goal is to improve SURAKSHA's data quality and evaluation, not to blindly replace live models.

## Tasks

1. Audit the current repo, current git status, dataset locations, URL/social model feature schemas, training scripts, model artifact versions, and serving call sites. Preserve every pre-existing user modification. Do not run destructive Git commands, commit, push, or deploy.
2. Run `scripts/01_download_phiusiil.py` in an environment with network access. Store files beneath an explicit local `data/suraksha_ml/` output root. Confirm UCI label semantics and manifest/checksum.
3. Build domain-grouped URL train/validation/test splits and run `scripts/06_train_eval_url_baseline.py`. Preserve the test set. Do not replace the existing URL model until it is compared against this baseline on a shared, frozen evaluation set and its inference contract is compatible.
4. Do NOT place downloaded/raw datasets into source control or Docker build context. Add appropriate `.gitignore`/Docker ignore rules only after inspecting existing rules. Never copy the restricted InstaFake data into production images.
5. InstaFake is CC BY-NC 4.0. Use `scripts/02_download_instafake_noncommercial.py --confirm-noncommercial`, `scripts/03_prepare_instafake.py --confirm-noncommercial`, and `scripts/07_eval_instafake_baseline.py --research-only` only for allowed non-commercial research. Keep its model/data under `research_only`. This dataset's labels are generic fake/automated accounts—not brand impersonation. Do not use this dataset/model for commercial deployment without additional permission/legal review.
6. Fetch the F-Droid and Apple catalog references only as reference candidates. Do not label catalog membership as benign, or Apple search results as official, without verification against an authoritative brand source.
7. Create a separate schema for manually adjudicated social/app brand-impersonation records using the provided templates and labeling protocol. Unreviewed data must remain `unknown` or `suspicious_unverified` and must not enter the supervised positive/negative benchmark.
8. Add a dataset manifest and model card describing source, terms, schema, labels, data versions, leakage controls, metrics, intended use, non-use, and limitations.
9. Add unit tests for label mapping, duplicate/conflicting-label handling, missing fields, exact official-asset exclusion, domain/package grouping, and no cross-split group leakage.
10. Run backend tests, dataset pipeline checks, and frontend build. Report exact commands and actual results. No invented metrics.

## Final report

Return source inventory, downloaded row counts, data license/terms status, data-quality diagnostics, baseline metrics, files changed, tests run, and remaining gaps. Separate measured results from assumptions. Keep the frontend UI unchanged. No commit, push, or deploy.
