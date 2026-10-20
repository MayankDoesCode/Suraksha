# STATE
Done: steps 1-6 (backend 239 tests pass, npm test 27 pass, build ok). Nothing committed.
- 1 CT feed (replay only; live not implemented, fails loudly): GET /api/v1/ct/status -> {success, data:{mode,running,seen,prefiltered,findings,errors,finished}}
- 2 Takedown: POST /api/v1/findings/<id>/takedown body {"notice":"registrar|host|trademark","format":"json|eml|pdf"} -> json: {to,abuse_contact_source,subject,text,manifest_sha256,sent:false,eml_base64,pdf_base64}; eml/pdf return the file. PDF is dependency-free text PDF (no reportlab). Domain findings only.
- 3 intel/page_probe.py: PAGE_PROBE_ENABLED=false default; playwright/Pillow/imagehash NOT installed here, so untested live (mocked tests only). Refs dir backend/app/data/brand_refs/<brand-slug>.png (absent -> visual signal skipped).
- 4 detection/combined.py: result["combined"] = {combined_score, contributions[], unavailable_inputs[]}; advisory, final_risk_score stays rule-based. python -m backend.scripts.eval_detection on SYNTHETIC eval_set.json (200 items): P 0.989 R 0.940; misses: short-brand combos (login-sbi.com) and short-name transpositions (patym.com). Not a real-world accuracy figure.
- 4 retrained URL model NOT wired: no registrable-domain-overlap check vs test set recorded (only exact-host exclusion). Next: add that check, then wire.
- 5 graph_service: campaigns[] in GET /brands/<id>/graph (strong/medium link, or 2+ weak kinds; issuer added as weak). 6 Indian brand profiles seeded by seed_demo_data (domains only). Threat-graph UI display of campaigns NOT done (backend-only scope).
- 6 AuthView claims removed. .gsd/ and GSD-STYLE.md moved to _to_delete/. .agent/ skipped (Antigravity running). *.db are untracked, left in place (app uses sentinelshield.db); added to .gitignore.
SECURITY: frontend/.env.local and frontend/firebase-applet-config.json are TRACKED in git and contain a Firebase web apiKey (39 chars). Web apiKeys are public identifiers but should be restricted in Firebase console; untrack .env.local (git rm --cached) and rotate if any non-web secret was ever in them.
BLOCKED: none.

## Update: detector fixes + URL model check
- Detector: fixed eTLD bug (sbi.co.in gave sld "co"; now co.in/org.in etc. via TWO_LEVEL_SUFFIXES), exact-token + one-edit rule for 3-letter brands, adjacent-transposition rule (len>=5). Tests: test_domain_detector_short_names.py.
- Eval (synthetic, 200): before P 0.989 R 0.940 -> after P 1.000 R 0.980. Left: sbisecure.co.in-style concatenated lures. Naive 3-letter containment was REJECTED (flagged "sbirthday.org").
- URL model NOT wired: 12 of 88 OpenPhish registrable domains also in training pool (github.io, vercel.app, netlify.app, blogspot.com, ...). Also the earlier 93% recall is inflated: 272 hosts are only 88 root domains. Next: group-aware retest excluding shared-hosting roots.

## URL model v2.0.0 PROMOTED
- Zero registrable-domain overlap with OpenPhish test (88 roots removed from training). Host-level recall 94.5% vs 8.1% shipped; root-level 83% vs 23%; false-alarm 3.5% vs 2.0%. Artifact 32 MB (consider git LFS). amazon.in scores MEDIUM (false alarm). Evidence-only; README metrics still describe v1.
- CT replay panel (Watchtower) + POST /api/v1/ct/start (owner-scoped). 253 backend tests pass.

## UI story pass (partial, token-limited)
- P4 DONE: components/FindingTimeline.tsx + utils/findingTimeline.ts (+test). Steps only from recorded timestamps (cert not_before, RDAP registered_at, created_at, evidence captured_at); fewer than 2 -> honest empty state. Shown in dossier Overview (live mode only).
- P5/P6 were already done earlier (takedown buttons, campaigns panel); not redone.
- P3 BLOCKED: "domains screened today", "median time-to-detect", "takedowns drafted" are not tracked by any endpoint. Showing them would need new backend counters; not faked.
- NOT STARTED: P1 tokens, P2 seeded demo workspace, P7 story landing, P8 empty/loading states, P9 screenshots.
- npm test 29 pass, build ok.
- P3 DONE (real): GET /metrics now returns flagged_last_24h, takedowns_drafted (counted from "takedown_drafted" evidence written by the takedown endpoint), median_hours_cert_to_detection (+sample size; null when no looked-up certificates). Overview shows them via components/ProofNumbers.tsx (count-up, reduced-motion aware, "No data yet" when null). Live mode only. "Enterprise SOC Active" label replaced by "Workspace active". 254 backend tests pass.

## PS pivot: Social & App Monitoring only (Kampus.VC). Domain/CT/takedown work is OUT of scope for scoring.
- Backend: detection/visual.py (perceptual logo/icon hash, SSRF-safe fetch), text_similarity.py; social_detector adds LOGO_SIMILARITY, SCAM_CUES, NEW_UNVERIFIED_ACCOUNT; app_detector adds ICON_SIMILARITY, DESCRIPTION_SIMILARITY, BRAND_WORD_IN_TITLE, package mimicry on brand tokens, verified-publisher-family exclusion (needs publisher AND namespace).
- BUG FIXED: spacing variants (acme_bank, acme.bank) were excluded as the official handle (compact match). Now exact handle only.
- Logo upload: POST/GET /api/v1/brands/<id>/logo (png/jpeg/webp/gif, 2MB, stored in backend/app/data/logos/). requirements.txt: Pillow added (run pip install -r backend/requirements.txt).
- Frontend: utils/appEngine.ts replaces the old keyword-only app check (official exclusion, look-alike names, publisher/package/icon/description, partner mitigation, missing-data notes); utils/imageHash.ts (canvas hash, verified in Chromium: edited copy 98.8%, unrelated 62.7%); social engine gets LOGO_SIMILARITY; avatar/icon upload + package id fields; Brand Profile saves logo to backend; demo logos in data/demoLogos.ts.
- Tests: backend test_visual_signals.py, test_lookalike_names.py (49); frontend appEngine.test.ts (22). `npm test` runs all.
- Docs: docs/ARCHITECTURE.svg, docs/REQUIREMENTS_MATRIX.md, docs/DEMO_SCRIPT.md.
- Env note: 9 backend failures seen only in the Linux check VM (sklearn 1.7.2 vs pinned 1.9.1 -> ML artifacts refused). Re-run full suite on your machine.
- NOT done: live X/Google Play data (needs credentials), README metrics still describe old state, backend scan API doesn't yet accept avatar/icon from the UI (UI uses client engines; API supports avatar_url/icon_url).

## Mobile, CI and look-alike ML (latest)
- Android app: Capacitor project in `frontend/android`, PWA manifest/service worker, bottom tab bar on phones. Build the APK with GitHub Actions (see `docs/MOBILE.md`; copy `docs/github-workflows/*.yml` to `.github/workflows/`).
- Look-alike name model: `python -m backend.scripts.train_lookalike_model` writes `backend/app/ml/models/lookalike_model.joblib` + manifest; served at `POST /api/v1/ml/predict-lookalike` (advisory, official handles excluded first, loads through the sklearn version guard). Trained on SYNTHETIC data with brand-grouped split; its scores show the pipeline works, not real-world accuracy.
- Fixed: CORS config for Android origins (class-body scoping bug).
