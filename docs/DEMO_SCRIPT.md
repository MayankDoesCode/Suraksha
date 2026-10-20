# Demo script (3 minutes) - Suraksha: Social & App Monitoring

Prep: open the app in demo mode ("Explore with demo data"). Brand = Acme Corp with an official logo, handles and apps already defined. Rehearse twice.

**0:00 - Problem (15 s)**
"Fake support accounts and copycat apps steal OTPs and logins in a brand's name. Suraksha finds them across social media and app stores, explains each detection, and never flags the brand's own assets."

**0:15 - Brand Profile (30 s)** - open *Brand Profile*
Show the official name, logo, handles, apps, partners. "This is the ground truth. It excludes official assets and drives every detection. Logos are validated on upload." (Mention: PNG/JPEG/WEBP/GIF, 2 MB.)

**0:45 - Social monitoring (60 s)** - *Check a social profile*
1. Load the **official** scenario -> excluded, reason shown (exact verified handle).
2. Load **"Official Helpdesk & Refund Support"** -> HIGH/CRITICAL. Point to the signals: look-alike handle, copied avatar (logo match %), OTP/refund bio, off-platform contact. "Every point of the score is a named signal."
3. Load **parody** -> low/medium with the non-affiliation disclaimer as counter-evidence. "We don't over-flag."
4. Optional live touch: upload any other image as the profile image -> logo signal disappears.

**1:45 - App store monitoring (60 s)** - *Check a mobile app*
1. **Official** scenario -> excluded (verified publisher + package).
2. **Rogue** scenario -> CRITICAL: icon copies the logo, brand name in the title, unverified publisher, package mimicry, third-party APK mirror, abusive permissions.
3. **Partner** scenario -> Medium "authorized partner", not an attack. "Contracted partners are mitigated, not hidden."
4. Type `Acme Bnak`, `AcmeBank Pro`, `4cme B4nk` in the name field -> all caught; `Daily Yoga`, `River Bank Cafe` -> clean.

**2:45 - Close (15 s)**
"Unavailable sources degrade to labeled sample or manual input; everything is explainable; a human confirms every action. 100+ automated tests cover exclusion, look-alikes, logo/icon similarity, and false positives."

## Slide outline (6)
1. Problem and who it protects
2. Brand Profile as ground truth (screenshot)
3. Social detection: signals + official exclusion (screenshot of the helpdesk scenario)
4. App detection: name, icon, publisher, description (screenshot of the rogue scenario)
5. Look-alike bonus: table of caught variants vs normal names left alone
6. Architecture (docs/ARCHITECTURE.svg) + honest limits and roadmap (live X / Google Play connectors, trained impersonation model with verified labels)

## Likely judge questions
- *Why not flag everything similar?* Generic words are ignored; official assets are excluded first; partners/parody are mitigated; mismatches alone are not proof.
- *What if X or Google Play is unavailable?* Source status shows it; manual submission and labeled sample data keep working.
- *How accurate is logo matching?* Perceptual hash: robust to resize, re-encode and light edits (edited copy ~99 %, unrelated art ~63 % in our test); heavily redrawn logos are a known limit.
