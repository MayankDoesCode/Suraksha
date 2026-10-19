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
