# SURAKSHA UI redesign: foundation milestone (2026-10-19)

## Approach (chosen to keep effort low)
The views used about 3,300 hard-coded navy/cyan hex classes. Rewriting 12,000 lines of views was not
necessary: instead, colours were moved onto a small set of semantic, theme-aware tokens, and only the
shell was rewritten by hand. Every existing page therefore picks up the new look and a light/dark
theme without any logic being touched.

## What changed
- **Design tokens:** `frontend/tailwind.config.js` and `frontend/src/index.css` define 16 semantic colours
  (canvas, surface x3, line, fg x3, accent, ai, ok, warn, high, danger). Semantic meaning is fixed across
  pages: danger = critical, high = high, warn = medium, ok = low/verified, accent = primary action, ai = ML/AI content.
- **Palette:** neutral surfaces with one restrained indigo accent. The grid background, glows and gradients are gone.
- **Theme:** light, dark, and follow-system. Toggle in the top bar; choice stored in `localStorage` under
  `suraksha.theme` (preference only). The theme applies only inside the workspace, so the public landing page keeps its own look.
- **Shell (hand-written):**
  - `Sidebar.tsx`: grouped as Workspace / Threat intelligence / Operations / System, with real counts only,
    current brand and live-vs-demo mode, backend reachability, and the signed-in user.
  - `Header.tsx`: page title, brand selector, CSV export (disabled when there are no findings), theme toggle.
  - `WorkspaceShell.tsx`: slim demo banner, short fade between routes (disabled for reduced-motion).
- **Removed unsupported claims:** "SOC-2 Controls Active", "Encrypted", and hard-coded fake analyst identity in the
  live workspace. The named demo analyst exists only inside the labelled demo sandbox.
- **Codemods** (kept outside the repo; originals backed up in the scratchpad): hex colours, `text-white`,
  stock Tailwind colour families and glow shadows were mapped to tokens in 22+ files.

## Verified
- `vite build` passes (no TypeScript or lint script exists in `package.json`, so neither was run).
- Browser check on the production build, demo mode: all 10 workspace routes render in both themes.
- Automated text-contrast scan (>= 3:1) across all 10 routes in both themes: clean after one fix.
- At 375px: navigation drawer opens and all 10 routes have no horizontal overflow.

## Not done / limits
- **No live-data check:** the backend was not running, so the 500s in the console are the missing API. Real-data
  states (loading/error/empty) were not exercised.
- **Vite dev server crashes** on this machine (exit 0xC0000409); the production preview was used instead.
- **Page-level redesign not done.** Pages keep their old layouts. Notably Overview still opens with a large
  "Mathematical Scoring Formula" hero, and the intro animation and landing page remain in the old neon style.
- **Not tested:** 1024/768/360px widths, keyboard-only navigation, screen readers, forms with real submissions,
  export download, threat-graph interactions.
- **Inline colours:** `ThreatRadarVisualization` and `DashboardHeroRadar` (canvas) and some template-literal colours still use the old cyan.
- No browser tests exist in the repo.

## Continuation checklist
1. Overview: replace hero + formula with severity/status/asset-type breakdown and a priority queue.
2. Findings workbench: sortable, filterable table with pagination (Reports view is the base).
3. Retire or restyle the vault intro and the landing page.
4. Run the app against the real backend and fix loading/error/empty states.
5. Add Playwright smoke tests for routes, theme toggle and mobile drawer.

## Intro animation replaced (2026-10-19)
- The 840-line "vault" intro (radar, particles, terminal text) was removed. `components/intro/BrandIntro.tsx` replaces it:
  the shield outline draws itself, then the wordmark and tagline settle in. About 1.8 s in total.
- Plays once per browser session (`sessionStorage: suraksha_intro_seen`); `?intro=1` replays it. Click or any key skips it.
  Reduced-motion users skip it entirely. Only compositor-friendly properties (opacity, transform, stroke offset) animate.
- Verified: build passes; the animation timeline exists and the intro hands over to the landing page.
  The finished frame was checked on a frozen copy, so the in-motion frames were not visually inspected.

## Overview and findings workbench (2026-10-19)
- **Overview** (`views/OverviewDashboard.tsx`, rewritten): the formula hero and decorative radar are gone. Every figure is counted from the
  findings already loaded for the selected brand (`candidates` in `AppContext`); nothing is invented.
  - Stat row: open findings, critical + high, under investigation, verified assets on file.
  - Breakdowns by severity, status and asset type (dismissed findings excluded from severity and type).
  - Priority queue: New or Investigating findings, most severe first, newest first within a severity. Click opens the dossier.
  - Recent status changes from the investigation audit trail (`statusHistory`), with real analyst and timestamp.
  - States: loading skeleton, "register a brand" onboarding (no brand, not demo), "no findings yet" (says assessments run on demand,
    not continuous monitoring), and an alert when the backend is unreachable.
- **Findings table** (`components/FindingsTable.tsx`, new): search; severity, status and asset-type filters; clickable sortable headers
  with `aria-sort`; default sort severity then newest; pagination (10 per page); long identifiers truncate with a tooltip; rows are
  keyboard-operable (Enter/Space); empty, no-match and clear-filters states. Used by **Reports & exports**.
- **Export:** the Reports button exports exactly the filtered rows (count shown in the button). Header export now passes demo mode, so demo
  data exports in demo mode (before, it exported nothing there).
- **Dossier dialog:** Escape now closes it and focus returns to the row that opened it.

### Verified (production build, demo data, browser)
Filter by severity (6 -> 3 rows, export button 6 -> 3), no-match state, sort by title with `aria-sort`, Enter opens the dossier,
Escape closes it and restores focus, Overview counts match the Reports rows. The Vite dev server crashes on this machine, so the preview build was used.

### Not verified
- Behaviour against the real backend (only demo data was loaded), the pagination control with more than 10 rows, and widths other than ~800 and 375 px.
- Severity here is each finding's stored `riskCategory`; the backend's score is not re-derived in the UI.
- No bulk actions (the backend has no bulk endpoint).

## Brand & verified assets page (2026-10-19)
- Layout: compact header (brand name, brand selector, Edit/New brand/Reset demo) and five tabs with live counts
  (Identity, Domains, Social profiles, Mobile apps, Partners). All panels stay mounted, so one form and one Save cover everything.
  The gradient hero, "Stage 2 Registry" banner and numbered headings were removed. Domain list is one or two columns instead of three.
- **Save now reports the real outcome.** Before, the backend call was fire-and-forget and "saved" showed regardless. Now:
  saving -> saved to backend, or "not saved to the backend: <reason>; your edits are still on this page".
  If the backend is unreachable it says the change is session-only and will not apply to scans.
- **Demo isolation fix:** saving the demo brand no longer calls the backend (before, with the backend online it could have created a real
  brand record from demo data).
- Verified (production build, demo data): tab switching shows one panel at a time, adding a domain updates the count (4 -> 5), and saving shows
  "Saved in this demo session only." A first attempt at the tab wrapping nested the panels incorrectly; browser inspection caught it and it was fixed.
- Not verified: saving against a running backend (success and error paths), the Social/Apps/Partners add flows after the retheme, and widths below ~800 px.

## Lookalike engine page (2026-10-19)
- **Removed fake progress.** The analysis runs synchronously in the browser (`utils/lookalikeEngine.ts`), but the page showed a three-step
  "Normalizing... / Computing... / Cross-referencing..." progress bar driven by timers. The result now appears immediately.
- **Escalation is now honest and durable where it can be:**
  - Live workspace, backend online, brand saved: runs the **backend detector** (`POST /brands/{id}/scan`, the real `DetectionService`:
    official-asset exclusion, IDNA/confusables, path rules) and saves a finding, then refreshes the findings list. The banner says whether a finding
    was created, matched an official asset, or found nothing, and shows backend severity and score. The backend result can differ from the browser analysis.
  - Backend request fails: shows the error and allows retry (nothing is added locally).
  - Demo mode or backend unreachable: adds the finding to this session only and says so ("will be lost on refresh").
  - Live workspace with no saved brand: asks the user to save a brand first.
  Before, escalating always showed "successfully escalated" although the finding existed only in browser memory.
- Header gradient, "Stage 3" banner and progress UI replaced with a short description and two actions.
- Verified (production build, demo data): no progress text, result appears immediately, escalation shows the session-only message, the new finding appears
  at the top of Reports.
- **Not verified:** the live-workspace paths (backend save, official match, nothing-to-flag, error) because they need sign-in and a running backend.
  The result panels, preset suite and glyph view were restyled by the token pass only, not redesigned.

## Reference study and landing rebuild (2026-10-19)
**What was studied:** Ascora's public landing page, its sign-in screen and the Hackxelerate README. I did not sign in to Ascora, so its in-app
screens were not seen; nothing was copied (text, code, logo or assets).

**Patterns adopted (reinterpreted for SURAKSHA):**
- Near-black canvas, one soft periwinkle accent with dark text on solid buttons, 1px quiet borders, larger corner radii (1-1.25 rem).
- A grotesk typeface (Geist) with tight heading tracking and a strong size hierarchy.
- A "loop" story instead of a feature list: Monitor, Detect, Explain, Investigate, Respond.
- A concrete example finding that shows *why* it was flagged and what is *not* established (Ascora does this with a student card).
- An honest "what we measured" strip, including unflattering numbers, mirroring Ascora's "a plain baseline scores close; we say so".
- A splash with a visible Skip control.

**Changed:**
- `components/landing/LandingPage.jsx` rewritten (about 190 lines). The seven neon landing files (3D globe, radar canvases, capability grids; ~3,000 lines) were deleted.
- Tokens: dark palette now near-black with the periwinkle accent; radii, font and heading tracking updated. Light theme unchanged.
- Intro: Skip button added; colours follow the new palette.
- The landing's four figures come from `docs/PHASE0_AUDIT.md` (frozen test set, October 2026): shipped URL model scoring bare domains catches 42% of
  phishing hosts at 95% precision (2,210 hosts); a content-free format baseline scores F1 0.87 against 0.90; 0 verified social and 0 verified app
  impersonation labels exist. They are static text, so they must be updated when the models or labels change.

**Verified (production build):** landing renders with the new styling, "Open SURAKSHA" leads to sign-in and the demo workspace, Geist loads, no horizontal overflow at ~800 px.

**Not done:** the sign-in page keeps its old two-column layout; Watchtower, Social, Apps, Investigations and Threat graph keep their old layouts
(recoloured only); the landing was not checked on a phone-width viewport or in light theme (it uses dark tokens by default).

## Sign-in page (2026-10-19)
- `views/AuthView.tsx` rebuilt from 738 to ~340 lines: one centred card (sign in, create workspace, reset password), Google button, an
  "Explore with demo data" row below it, and a "Back to site" link. The two-column marketing panel with the radar visual was removed.
- **Auth logic untouched:** the same `signIn`, `signUp`, `signInWithGoogle`, `resetPassword`, `signInAsDemoAnalyst`, validation messages and
  `initialMode` handling are used.
- **"Role-free":** the page has no role picker; roles come from the account profile as before.
- **Removed unsupported claims:** "zero-trust Firestore token authorization", "Enterprise workspace isolation active", and the "Firebase Enterprise Authentication" banner.
  The unconfigured-Firebase notice now just says sign-in is not configured here and demo data is available.
- Accessibility: every field has a label, correct `autocomplete`, password show/hide with an accessible name, error alert and success status regions.
- Verified (production build, browser): typing keeps input focus, password toggle, validation message, switching between sign in / create / reset, and the demo button
  opening the workspace with the demo banner. No script errors. (An earlier draft defined the inputs inside the component, which would have dropped focus on
  every keystroke; it was caught in review, hoisted, and the focus check above confirms the fix.)
- **Not verified:** real sign-in, sign-up, Google SSO and password-reset calls (they need working Firebase credentials), dark theme and phone width.

## Investigations page (2026-10-19)
**Real defects found and fixed** (the old page was 451 lines):
- **Expanding any row crashed the view.** It treated `evidence` (a string) as an array, rendered analyst-note objects as text, and read two fields that do not
  exist (`detectedAt`, `threatScore`), showing "Invalid Date" and "undefined/100". The expanded panel now shows the assessment, supporting and opposing evidence,
  what is not established, next steps and the latest note, from the real fields.
- **Status changes were not honest.** The change showed immediately and a backend failure was swallowed ("ignorable for demo records"); demo ids were also sent to the backend.
  `AppContext.updateCandidateStatus` now returns a result: demo findings stay local and say so; live findings wait for the server and are **rolled back** if it
  rejects the change, with the error shown. (The dossier dialog calls the same function but does not show the error message yet; it only rolls back.)
- **Audit trail attribution.** Inline changes were signed "Alex Mercer (Threat Lead)" for every user. They now use the signed-in user's name (the dossier's default name is cleared too).
- **Delete without confirmation.** The trash button silently removed a finding from the browser. It is now "Hide from this view" with an inline confirm, and the page states that
  this does not delete anything on the server and that analyst notes are not stored on the server.
- **Layout:** status tabs with counts, search, one row per finding (severity, inline status, Open), expandable evidence, "show more", collapsed status history,
  and an empty state. Sorted by severity then newest.

**Verified (production build, demo data, browser):** rows render, expanding shows evidence without a crash, a status change shows "Demo data: changed in this session only",
the Dismissed tab filters, hiding asks for confirmation, history lists 8 events, no script errors.
**Not verified:** the live-server status paths (saved, rejected and rolled back, unreachable) because they need sign-in and a backend; dossier error message; narrow phones.

## Watchtower page (2026-10-19)
**Dishonest behaviour removed** (the old page was 840 lines):
- **Invented results.** When the backend call failed for any reason, the page generated a local "fallback" evaluation with hard-coded numbers
  (risk HIGH, score 78, edit distance 4, similarity 65%) and showed it like a real result. That is gone: a failed check shows the error and says
  nothing was evaluated or saved.
- **Fake data sources.** A "source" dropdown (certificate transparency and similar) implied feeds that are never queried. It is replaced by an optional
  free-text "Where did you find it?" that is stored as provenance.
- **Continuous-monitoring switch.** It changed only a label (and sent a value the backend maps to on-demand anyway). Removed. The page now states every check is on demand.
- **Misleading status.** The backend summary hard-codes `watchtower_status: "ACTIVE_SURVEILLANCE"`; the page no longer shows it. It shows real counts
  (verified domains/profiles/apps, findings, scheduled monitoring jobs) and says when no scheduled monitoring exists.
- **Persistence.** "Route to investigation" used to add a browser-only finding. "Save as finding" now re-runs the backend check with
  `persist_to_investigation: true`, refreshes findings and reports the saved finding, or says nothing was saved.
- Pre-filled another brand's name ("paytm-kyc-verify.vip") in the input: removed.
- Demo mode: no backend requests are made; the page explains this and links to the Lookalike engine. Brand id comes only from the selected saved brand.

**Result view** separates what the backend returned: severity and rule score, rules that fired, observed facts, model inferences (not verified),
what is not established, next steps, similarity metrics (only those returned), and the backend's own scan-mode note.

**Verified (browser, demo data):** the explanatory state renders, issues no watchtower request, and the link to the Lookalike engine works; no script errors.
**Not verified:** the live path (run check, save as finding, error states, scope counts). It needs sign-in and a running backend and could not be exercised here.
The backend `ACTIVE_SURVEILLANCE` constant is still in `api/v1/brands.py` and should be removed or made real.

## Threat graph page (2026-10-19)
**Problem found.** The old graph drew stored demo constants with hand-written "clusters", and in a live workspace it contained only browser-added nodes with random
positions. `addCandidate` also created an "Impersonation Suspect [Inferred]" edge for every high or critical finding. Real backend findings never appeared in it,
and the page text claimed edges were "strictly established via observed telemetry".

**Rebuilt as a derivation from the findings** (`utils/threatGraph.ts`, pure and unit-tested). Nothing is stored and no layout is random.
| Link | Basis | Rule |
|---|---|---|
| Recorded against brand | Observed | Every finding (drawn faintly) |
| Explicitly referenced | Observed | One finding's recorded evidence names the other's identifier (identifier of 5+ characters); the quote is shown |
| Same developer | Observed | Identical developer string on two findings (star pattern, not a clique) |
| Same host | Observed | Same web host, excluding shared platforms (Instagram, Play Store, GitHub and similar) |
| Similar name | **Inferred** | Character-trigram similarity >= 60%, only where nothing observed links the pair, max 2 per finding; dashed, with a strength and "may be coincidence" |

- Page: observed/inferred toggle, include-dismissed toggle, zoom, keyboard-selectable nodes, a details panel listing each link with its evidence, and a plain-text
  "Relationships between findings" table (the accessible version of the graph). Links are curved so they never pass through the brand node.
- Empty state when there are no findings. Real findings now appear in the graph in live workspaces because it reads the same findings list as every other page.
- Tests: 9 new unit tests (`npm test`: 15 passing in total) cover each rule, short-identifier protection, shared-platform exclusion, inferred-only-when-unlinked, and dismissed handling.

**Verified (production build, demo data, browser):** 4 findings and 1 observed link found from real demo evidence text (wallet-recovery domain names the rogue handle), details panel shows
the quoted evidence, keyboard selection, zoom, dismissed toggle (5 to 7 nodes), no script errors.
**Not verified:** a live workspace, phone width, graphs larger than about 30 findings (the radial layout will get crowded), pan by dragging (the view scrolls instead).
**Left as is:** `threatNodes` / `threatEdges` in `AppContext` are now unused by this page; the old demo constants remain there and should be removed in a cleanup.

## Sign-in animations and shield mark (2026-10-19)
- **Shield mark** (`components/ShieldMark.tsx`): the outline draws itself (0.9 s), then the tick, then a soft accent fill; "SURAKSHA" fades in beneath.
  It replaces the small filled logo square in the sign-in card.
- **Entrance motion** (all in `index.css`, 0.45-0.5 s ease-out): card rises in, fields stagger about 55 ms apart, the top glow fades in, and the
  heading and subtitle re-animate when switching between sign in, create workspace and reset.
- **Feedback motion:** error alert shakes once, buttons press down (scale 0.98), a real spinner shows while submitting, and the arrows on "Back to site" and "Explore with demo data" nudge on hover.
- Everything is disabled by the existing `prefers-reduced-motion` rule; only opacity, transform and stroke offset animate.
- Verified (browser): 15 running animations on load (draw, rise, glow); frames at 0.5 s and at the end show the shield drawing and then complete;
  typing keeps focus; the error alert has the shake class; the sign-up form animates on mount; no script errors. Real motion was judged from frozen frames, not by watching it play.
- **Bug caught and fixed during this work:** the first version re-ran the heading animation with a changing `key`. In this build that left every previous
  heading in the page, so after a few mode switches four headings were stacked. Headings are now mounted conditionally per mode. Browser check: one heading per
  mode through sign in, create, sign in, reset and back; one form; validation alerts do not accumulate. I did not find why a key swap left stale nodes here,
  so avoid key-swap remounting for animation elsewhere.

## Landing page animation (2026-10-19)
- **Hero:** a large shield draws itself (outline, tick, soft fill) above the headline; the copy and buttons rise in one after another; the example finding card slides
  in, its severity pill pops, and its "why flagged" and "not established" lines appear in sequence.
- **Nav:** the same shield mark, small, drawn on load.
- **Scroll reveal** (`components/landing/Reveal.jsx`): section headings and cards fade and lift as they scroll into view, with a short stagger per card. The four "measured"
  numbers count up from zero when they appear (42%, 0.87 F1; the two zeros stay zero).
- **Feedback:** cards lift 3 px on hover, buttons press down, arrows nudge on hover.
- Reduced-motion users get everything immediately, with no movement.
- **Two bugs caught while testing, both fixed:**
  1. My first safety timer revealed every section after 4 seconds even if never scrolled to, so the below-the-fold animations were lost for anyone who paused at the top.
  2. IntersectionObserver never fired in the embedded browser pane, which would have left content invisible. Reveal now checks element position on scroll and resize instead.
- Verified (browser): below-fold sections stay hidden for 5 s at the top (0 of 15 revealed), the five loop cards reveal when scrolled to, and the counter sampled mid-animation reads 0%, then 25%, then 42%.
  Motion was judged from sampled states and frozen frames, not by watching it play, and the animations were not checked on a phone.

## Visual direction replaced: Linear / Sentry / Cloudflare / Wiz (2026-10-19)
**What was read:** text of the Linear refresh article, the Cloudflare One navigation changelog and Wiz's platform page. Sentry's changelog page rendered empty, so the issue-details pattern
(list plus focused detail with key facts and tabs) comes from general knowledge of that product, not from the page. No reference was inspected visually.

**Design system (index.css, tailwind.config.js):** Linear-style neutral dark palette with one indigo accent (dark is the default; light remains), softer 1px borders, 15px root for density,
13px UI text, radii cut from 12-20px to 6-12px, pills only for tiny status chips, no gradients or glows. Content sits in an inset panel and the sidebar recedes.

**Navigation (Cloudflare):** task-named, collapsible groups (Detect, Triage, Protect, System) in one shared `navigation.ts`, used by the sidebar, the breadcrumb and the command palette. Only existing routes; no Settings
page exists, so none is listed. Brand switcher moved into the sidebar header. **Command palette** (Ctrl/Cmd+K): go to any page, find any finding, toggle theme; full keyboard control.

**Investigations (Sentry):** issue list (severity bar, identifier, status, type, linked count, age; arrow keys or j/k) plus a detail panel: key facts, tabs for Overview, Evidence, Activity (timeline + notes) and Related,
status as the primary control, "Full dossier" for the AI assistant. Opening a finding from the overview, findings table, graph or palette now lands here (`focusedFindingId` in `AppContext`).

**Overview (Linear + Wiz):** a metric strip, a "Needs attention" queue ranked by severity and then by connected observed evidence (shown per row), and compact severity, status and type splits.
**Findings:** dense table with a severity dot instead of badges. **Threat graph (Wiz):** selecting a node dims everything not connected to it, plus a legend; observed vs inferred as before.
**Models & status:** rewritten. The old page printed hard-coded fallback numbers (90.1% accuracy, 97.4% precision) when the backend was down, and presented leakage-inflated metrics as "verified". It now shows only what
the backend returns, marks unavailable data as unavailable, and carries the measured limitation (about 42% of phishing hosts caught, about 95% precision, on hostnames). The separate social and app tester forms were removed;
the Social and Mobile app pages do those assessments.

**Verified (production build, demo data):** all 10 pages render with no script errors and no horizontal overflow; contrast scan found two small low-contrast labels, one fixed by lifting the subtle-text and accent colours;
command palette opens, filters findings and Enter opens the finding in Investigations; list navigation, tabs, notes, status change and "Full dossier" work; graph focus works.
**Not verified:** live backend paths; phone-width and tablet layouts after this change; Social, Mobile apps, Lookalike, Watchtower and Protected assets pages were re-coloured and re-tokened but not re-laid-out
(their earlier honesty fixes stand); light theme was not re-audited. Reload in demo mode drops back to an empty live workspace (existing behaviour of the demo session, not changed).

## "Ask in plain English" (from Ascora) (2026-10-19)
Ascora's standout feature is turning a question into a validated filter, never raw SQL. SURAKSHA's version is on the **Findings** page: type a question such as
"critical or high domains from the last 7 days that are linked" and press Ask.
- **Deterministic and local** (`utils/askFilter.ts`): no language model, no query language, nothing leaves the browser, no usage cost.
- **Transparent:** the page shows what it understood as chips (severity, type, status, age, "has observed links", text) and lists any words it did not use. Nothing is guessed:
  unrecognised words become text search, and if that matches nothing the table says so.
- Understands: severity words (and "severe" = critical + high), asset types (domain, social profile, app...), status (unreviewed, investigating, confirmed, dismissed, open),
  time (last N hours/days/weeks, today, this week, older than N days) and "linked" (backed by the observed links in the threat graph).
- 8 unit tests (23 frontend tests pass in total). Browser check on demo data: "critical findings" returned 3 of 6, "linked domains" returned 1, "open social profiles from the last 30 days" returned 2,
  and a nonsense term returned an honest empty table; clear restores all 6.
- Limits: English only, no negation ("not dismissed" is understood only as "open"), no AND/OR beyond the listed words.
- "aegis.render" was taken to mean the Ascora link; I found no file or link by the name "aegis" on disk.

## Opening title, version 4: assembling shield (2026-10-19)
Reference: the Razorpay Aegis opening (black screen, partner wordmark, then a shield-and-name lockup, "Skip Intro  Esc" pill). I looked at three captured frames of it. Earlier SURAKSHA versions were thin line drawings
and were rejected; this one was chosen from three options.
- Pure black with a very soft vignette. Four steel and indigo **plates fly in from different directions and lock together**, a centre gem pops into place, a thin outline appears,
  and one pass of light crosses the shield. The shield then slides left as the wordmark is revealed beside it.
- Text lockup: **SURAKSHA**, a hairline rule, the Hindi line **आपकी सुरक्षा, हमारा साथ** (Noto Sans Devanagari, loaded from Google Fonts, with Nirmala UI / Mangal as fallbacks;
  no letter-spacing so conjuncts are not broken), then "DIGITAL BRAND PROTECTION".
- Hairline progress bar along the bottom; "Skip Intro Esc" pill; any key skips; reduced-motion users skip it. About 5.4 s. Plays once per session (`?intro=1` replays).
- Checked from frozen frames at 0.75 s (plates mid-flight), 2.15 s (assembled with gem) and 4.7 s (final lockup). Not watched live. The Hindi line was verified by code points; its glyph shaping
  was judged at small size only.

## Dashboard redo: minimal, presentation-led (2026-10-19)
Brief: "extraordinary", then "minimalistic, not much content, but a good way of presentation". Three things only, no card grid:
1. **Greeting + one sentence** ("2 findings are waiting for a decision", from New + Investigating counts) and one action, **Check a domain**.
2. **Exposure hero**: an animated severity ring (segments draw in) with the open-finding count in the middle, the severity legend, three large numbers (critical or high, investigating,
   verified assets; counted up on load) and a single review-pipeline bar (New, Investigating, Confirmed, Dismissed, with "x of y reviewed").
3. **Needs attention**: the top 5 New or in-progress findings, most severe first and then most connected evidence, each with the observed link that connects it when there is one. Click opens it in Investigations.
Everything is counted from the loaded findings; there is no estimated score, trend or status light. Removed from the page: severity, status and type panels, activity feed and the metric strip.
`components/dashboard/charts.tsx` holds the ring (it draws only the counts it is given).
**Also removed:** the "Example finding" card on the landing hero (the hero is now one column with a larger headline).
Verified (production build, demo data, browser): ring has two segments for the demo's 3 critical and 1 medium, numbers match the findings (3, 2, 8; 6 of 6 reviewed), the queue shows the connected evidence line,
no script errors; one label that wrapped ("In progress") was widened. Not verified: phone width, light theme, empty and loading states of the new layout.
