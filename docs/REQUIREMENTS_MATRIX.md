# Requirements matrix - Digital Risk Protection: Social & App Monitoring

Challenge: Kampus.VC / HacXLerate. Every requirement mapped to where it is implemented, how it is tested, and its honest limits.

| Criterion (weight) | Requirement | Implementation | Evidence (tests) | Known limits |
|---|---|---|---|---|
| **Brand Profile (15)** | Define official name, logo, social accounts, apps, identifiers | Brand Profile view; backend `brands` API; validated logo upload `POST /api/v1/brands/<id>/logo` (PNG/JPEG/WEBP/GIF, 2 MB, type-checked) | `test_brands.py`, `test_visual_signals.py` | SVG logos are accepted in the browser demo only; the server stores raster formats |
| | Validation; profile guides detection | `BrandValidator`; the profile feeds official-asset exclusion, name/logo/publisher/package checks | `test_brands.py`, `appEngine.test.ts` | |
| **Social monitoring (30)** | Impersonating profiles, fake pages, scam accounts | `social_detector.py` (server) and `socialEngine.ts` (browser): name/handle similarity, homoglyphs, leetspeak, lure words, credential-harvesting cues, off-platform contact, new-account flag | `test_visual_signals.py`, `test_lookalike_names.py`, `socialEngine.test.ts` | Live X data needs a bearer token; otherwise manual / sample input |
| | Similar logos | Perceptual hash of avatar vs official logo (`visual.py`, `imageHash.ts`); near-copy -> HIGH even if the name is unrelated | `test_visual_signals.py`; verified in real Chromium: edited copy 98.8 %, unrelated art 62.7 % | Heavily redrawn logos may fall below the threshold |
| | Official accounts not flagged | Exact-handle / URL exclusion before scoring; spacing variants (`acme_bank`) are NOT treated as official | `test_lookalike_names.py` | |
| **App store monitoring (30)** | Similar app names | Look-alike title engine (swaps, spacing, added words, homoglyphs, leetspeak, brand-word reuse) | `appEngine.test.ts`, `test_lookalike_names.py` | |
| | Logo / icon impersonation | Icon perceptual hash vs official logo | `appEngine.test.ts`, `test_visual_signals.py` | |
| | Different developer / publisher | Publisher mismatch, publisher-imitation, package-id mimicry; official publisher family excluded on trusted stores; partners mitigated | `appEngine.test.ts`, `test_visual_signals.py` | A mismatch alone is never treated as proof; missing data is reported, not guessed |
| | Resembling descriptions | Bag-of-words cosine vs brand description + brand-claim detection | `appEngine.test.ts`, `test_visual_signals.py` | |
| | Official apps not flagged | Package-id / name+publisher exclusion; same name on an untrusted mirror is NOT trusted | `appEngine.test.ts` | |
| **User experience (15)** | Easy setup, readable detections | Guided scenarios, per-signal explanations, counter-evidence, recommended actions | UI | |
| | Unavailable sources handled | Connector status (`/integrations/status`): live / unavailable; manual submission and labeled sample data keep the product usable; icon-check and missing-field notes are shown instead of silent skips | `test_connectors.py` | |
| **Bonus: look-alike names** | Character swaps, added words, spacing - without over-flagging | 49 server + 20 browser table cases (positives and normal names) | `test_lookalike_names.py`, `appEngine.test.ts` | Generic words (bank, pay, wallet…) alone never flag an app or account |

## Honesty notes (say these in the demo)
- The ML fake-account model is supporting evidence about automation only; impersonation is decided by the rules above.
- Logo matching is perceptual, not a legal trademark finding. A human analyst confirms every action.
- Test sets are small and partly synthetic; numbers are regression guards, not production accuracy.
