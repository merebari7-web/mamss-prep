# MAMSS PREP — v43 "Ascension" · v44 "Carry" · v45 "Roll Call"

**Date:** 21 September 2026 · **Scope:** the published static site in `docs/` · **Zero breaking changes**

Everything below was measured, not guessed. Before touching the site I cloned the
current build, ran it in a real headless Chrome, and recorded a **baseline**
(`tools/browser/smoke.js`, `bench2.js`). The upgrade then had to pass the same
11-step user journey **and** beat the baseline on the numbers that matter to a
student on metered Nigerian mobile data.

> ⚠️ **Security first.** A GitHub Personal Access Token was pasted into a chat on
> 2026-09-21. Treat it as stolen: **revoke it now**
> (github.com → Settings → Developer settings → Personal access tokens), then use
> a fresh one — or better, push over SSH / the GitHub web editor. Never paste a
> token into a chat, issue tracker, or code.

---

## 1. Real bugs found in the live site (and fixed)

| # | Bug | Impact | Fix |
|---|-----|--------|-----|
| 1 | `<meta name="apple-mobile-web-app-title" content="Study App"` was **missing its closing `>`**, so the browser swallowed the next two `<link>` tags as attributes of the meta tag. One of those was `<link rel="manifest">`. | **The app manifest never loaded. The site was not installable as a PWA on any phone**, and no icons/theme were applied. Verified in-browser: `document.querySelector('link[rel=manifest]') === null` on the live build. | Tag closed properly; manifest + apple-touch-icon restored. |
| 2 | Two `<link rel="canonical">` tags. | Confuses crawlers; dilutes the canonical signal. | Kept one. |
| 3 | Two favicon links — the second, a generic green "Q", overrode the MAMSS crest. | Wrong brand icon in every tab/bookmark. | Kept the crest. |
| 4 | `<div class="luxe-frame">` sat **between `</head>` and `<body>`** (invalid HTML; browsers silently relocate it). | Markup invalid; layout depends on parser forgiveness. | Moved inside `<body>`. |
| 5 | Service worker registered **only when `location.protocol === "https:"`**, silently excluding `localhost` — a valid secure context. | Offline mode could not be developed or tested locally at all. | Now also registers on `localhost` / `127.0.0.1`. |
| 6 | `sw.js` called `skipWaiting()` on install and `clients.claim()` immediately. | A new worker could take over a live page, mixing a **new worker with an old document** mid-session — the classic cause of "my app broke after an update". | Updates now wait for an explicit "Reload" confirmation from the UI. |
| 7 | The question bank decoded via `DecompressionStream` with **no fallback**. On browsers without it (older Android Chrome, Safari < 16.4, Firefox < 113) `QUIZ_ERR` was set and the bank **never loaded — permanently**. | A whole class of students could never start a paper. | `bank-raw.js`: an uncompressed rescue copy, fetched *only* when decoding fails. Tested by deleting `DecompressionStream` in the browser — the bank recovers and the paper engine works. |

## 2. Performance — measured with a real Chrome over TLS

Measured with `tools/browser/bench2.js`, which counts bytes **at the server**
(in-page `transferSize` lies once a service worker is involved). Same procedure
on both builds: 3 cold visits in fresh profiles, then a 2nd and 3rd visit.

| Metric | v42 (live) | v43 | Change |
|---|---|---|---|
| First ever visit | 651.9 KB | 761.9 KB | +17% **one-time** (split stylesheet + upgrade layer + install artwork + 404 page) |
| **2nd visit** | 390.3 KB · 15 requests | 103.2 KB · 3 requests | **−74%** |
| **Every visit after** | 390.3 KB · 15 requests | **87.0 KB · 1 request** | **−78%** |
| `index.html` on the wire | 128.4 KB gzip | 99.5 KB gzip | **−23%** |
| Fully offline reload | works | works | — |
| Offline after a 4-second first visit | works | works | — |
| Console / page errors | 0 | 0 | — |
| Installable as an app | **no** | **yes** | — |
| Study Hall tools | 16 | 17 (+ App Centre) | — |

Why repeat visits collapse to one request: the old worker was *network-first for
everything*, so a returning student re-downloaded the whole app on every single
open. v43 serves assets **cache-first** and treats the release version
(`NSS_V`) as the cache buster — `activate` drops the old cache, so a new release
costs exactly one download, and every visit in between costs nothing. HTML stays
network-first (new content still arrives on the next visit) behind a 3.5 s
timeout race so a hung radio can never spin forever.

Other wins: 139 KB of inline `<style>` moved to a cacheable `app.css` (with a
9 KB critical subset left inline so first paint is styled even if the sheet is
slow), the 133 KB question bank is `<link rel=preload>`ed (it was previously
discovered at byte 382 000 of the document) and now `defer`s, and Google
Identity is `preconnect`ed.

## 3. New features (all additive — nothing existing was changed)

1. **📲 Install as an app.** Captures `beforeinstallprompt`, shows an install
   button with an attention dot, falls back to Safari's Share → Add to Home
   Screen instructions on iOS, and celebrates `appinstalled`.
2. **🔄 Safe updates.** New versions download in the background; a pill offers
   "Reload" and only then swaps the worker. Never mid-paper.
3. **🪶 Data Saver.** One switch (also auto-suggested when the browser reports
   `saveData` or 2G). Kills aurora, particles, 3D, canvas, backdrop blur and
   animation, **and pauses the six decorative modules** (`scroll3d`, `holo`,
   `reels`, `boost`, `aura`, `studio`) before they download — each can be loaded
   on demand from the App Centre. Questions, notes, calculator and progress are
   untouched. Measured: 6 heavy modules paused, decorations gone, paper engine
   still fully working.
4. **🛡️ Storage guardian.** Asks `navigator.storage.persist()` so the browser
   won't evict a student's progress when the device runs low, shows the quota
   meter, sizes `localStorage`, and nudges a backup when it grows large or
   nothing has been exported in three weeks.
5. **🔦 Screen wake lock.** Held automatically during a timed examination so the
   screen cannot dim or lock mid-paper; released on submit.
6. **🩺 App health.** On-device error log (never uploaded), a one-tap **Repair**
   that clears the offline cache and reloads, and a per-visit performance line.
7. **🛟 Bank rescue.** See bug 7 above.
8. **✨ What's-new.** One-time release notes per version.
9. **🚀 App Centre.** One nav button and one Study Hall tile host all of the
   above so the already-crowded navigation gained exactly two icons.
10. **📄 Branded 404 page** for GitHub Pages (previously a bare Fastly 404).

## 4. Files

| File | What |
|---|---|
| `docs/index.html` | head repairs, CSS extraction, resource hints, saver gate, upgrade loader, JSON-LD refresh (435 KB → 311 KB) |
| `docs/app.css` | **new** — the six inline `<style>` blocks, verbatim, in original order |
| `docs/upgrade.css` / `docs/upgrade.js` | **new** — the additive v43 layer (namespaced `mp`/`MAMSS_`, every entry point in `try/catch`) |
| `docs/sw.js` | rewritten (v43) — precache, cache-first assets, timeout-raced navigation, confirmed updates, offline fallback |
| `docs/manifest.webmanifest` | richer (lang `en-NG`, display override, screenshots); now actually reachable |
| `docs/bank-raw.js` | **new, optional** — uncompressed rescue copy of the bank (1.3 MB in the repo, ~140 KB gzipped, fetched *only* by browsers that cannot decompress). Delete it and re-run the build if you don't want the repo weight; `tools/verify.py` only warns. |
| `docs/screenshot-mobile.jpg` | **new** — install-dialog artwork, 824×1824, 75 KB |
| `docs/404.html` | **new** — branded not-found page |
| `tools/build_upgrade.py` | repeatable build (idempotence-guarded, with byte-exact extraction checks) |
| `tools/verify.py` | 67 static release checks, exit-code gateable |
| `tools/browser/*` | the headless-Chrome test harness + how to run it |
| `.github/workflows/verify.yml` | runs the verifier on every push/PR that touches `docs/` |

## 5. Rebuild, verify, publish

```bash
# rebuild index.html + app.css + bank-raw.js from a pristine checkout (idempotent)
git checkout -- docs/index.html
python3 tools/build_upgrade.py

# gate: 67 checks, exits non-zero on any failure
python3 tools/verify.py

# (optional, recommended) browser parity + feature + benchmark passes
#   see tools/browser/README.md
```

Then publish. **Do not use the leaked token.** Either of these is fine:

```bash
# A. SSH (preferred — no token anywhere)
git remote set-url origin git@github.com:merebari7-web/mamss-prep.git
git add docs tools .github
git commit -m "v43 Ascension: installable PWA, −78% repeat-visit data, Data Saver, resilience"
git push origin main            # GitHub Pages republishes docs/ automatically

# B. A brand-new, fine-grained token with Contents: write on this repo only
git remote set-url origin https://github.com/merebari7-web/mamss-prep.git
git push origin main            # paste the NEW token if prompted
```

**Rollback:** `git revert <commit>` and push — the old worker version is still
understood, and bumping `NSS_V` back simply invalidates the new cache.

## 6. Housekeeping worth doing soon

- **Google Identity:** the console showed `[GSI_LOGGER]: The given origin is not
  allowed for the given client ID` for non-github.io origins. Confirm
  `https://merebari7-web.github.io` is in the *Authorized JavaScript origins* of
  OAuth client `648029…`; otherwise Google sign-in silently fails for everyone.
- `docs/quiz/` ships ~60 development artefacts (`_test_*.js`, `_patch_*.py`,
  `_shot*.js`, generators) on the public site. They are never loaded, but they
  are publicly downloadable source. Consider moving them to `tools/` or a private
  repo.
- The 14 MB of `*.zip` practice packs in `docs/packs/` are fine on Pages but
  belong in Releases/LFS if the repo keeps growing.

---

## 7. v44 "Carry" — cross-device progress transfer (same session)

The app's own gate says *"profiles and scores are stored on this device only"*.
That is honest, but it means a student who changes phone — or a teacher moving
between classroom tablets — loses every paper, badge and merit. v44 adds a way
to carry them, with **no backend, no account and no upload**.

**How it works.** Export calls the app's existing `backupPayload()`, gzips the
JSON with `CompressionStream` and base64url-encodes it into one string prefixed
`MAMSS1.` (browsers without compression fall back to plain base64url, `MAMSS0.`).
Import accepts a sync code, a `.mamss`/`.json` file, *or* a whole raw `.json`
backup pasted straight in, previews who/what/when, then applies it with the
app's own `applyBackup(payload, "merge")` — so papers already on the target
device are kept and de-duplicated by timestamp, and the local profile is never
overwritten.

Reached from a new App Centre row **and** a Study Hall tile ("Sync code"), so it
is discoverable without adding an icon to the already-full nav.

Measured in `tools/browser/synctest.js` (three separate browser profiles):

| Check | Result |
|---|---|
| Code generated & compressed | ✔ 354 chars for 448 chars of JSON; scales with history |
| XP / merits / papers / badges carried to a second device | ✔ 777 XP · 42 merits · 1 paper · 1 badge |
| Local profile on the target kept | ✔ merge, not overwrite |
| Re-importing the same code | ✔ papers not duplicated |
| Garbage code | ✔ friendly "✘ …" message, no exception, no crash |
| Page errors during the whole flow | 0 |

`NSS_V` was bumped to `-v44`, which is what makes returning devices fetch the
new `upgrade.js` exactly once.

---

*v43 "Ascension" · v44 "Carry" — built for Morals and Excellence.*

---

## 6. v45 "Roll Call" — school-issued activation codes

**The idea.** The school hands each student a paper slip — `MAMSS-7K4Q2R-2026` — and that
slip opens the app on **one device**. Codes are issued by `tools/issue_codes.py`, printed
from a git-ignored printable sheet, and handed out in class. Nothing about the existing
app changed; the code step sits *in front of* the sign-up gate that already existed.

### How a slip becomes access

1. `tools/issue_codes.py --count 120 --batch SS1-3-main` mints 120 codes
   (`MAMSS-` + 6 characters from `23456789ABCDEFGHJKMNPQRSTUVWXYZ` + `-` + year — no `0/O/1/I`,
   so a handwritten slip is never ambiguous).
2. The public half, `docs/codes.js`, stores **only** `sha256(salt + "|" + normalised code)`
   hex digests plus a random per-install salt. Plaintext never enters the repo, the site,
   a commit, or a browser profile beyond the student's own device memory.
   `verify.py` §10 cross-checks every issued slip against every file in `docs/` on every run.
3. The private half lands in `tools/private/` (git-ignored, never uploaded):
   `codes-<batch>-<date>.csv` for the register and `codes-<batch>-<date>.html` — a
   print-and-cut sheet of slips with the school crest.
4. On a fresh device the sign-up gate shows **name + school code only** (Google sign-in,
   the "or" divider and the create-account button are hidden by critical CSS before first
   paint, so there is no flash of the unlocked gate). A valid code reveals them and signs
   the student in; an invalid one explains why. Entry is case- and separator-insensitive,
   so `mamss 7k4q2r 2026` works.
5. Redemption binds `nssc_act` (first 16 hex of the digest + a masked display like
   `MAMSS-HSQ···2026`) and appends the full digest to a per-device `nssc_act_used` ledger:
   the same slip **cannot** be redeemed twice on one device, including after sign-out.
6. App Centre → *School activation* shows the device's slip, the batch, the date, and says
   plainly that with no server the app cannot police other devices.

### Guarantees (and honest limits)

* **Never strand a student.** If `codes.js` is missing, blocked, or the device has no
  WebCrypto, the lock lifts and the normal free sign-up appears ("Open access" in the
  App Centre). A 4-second watchdog covers a request that neither loads nor errors.
* **Existing users untouched.** Any device with a study profile (`nssc_user`) skips the
  gate entirely — the lock applies only to devices with no account at all.
* **Policy switch.** `tools/issue_codes.py --policy open` republishes the list as
  advisory (codes optional); `--policy codes` locks again. No code is ever invalidated.
* **Honest limit:** this is a client-side gate on static hosting — a light fence, not a
  wall. Single-use is enforced per device; a slip shared between two phones works on both,
  because GitHub Pages has no backend to coordinate. Against the public list, exhaustive
  search is ~29⁶ (≈ 5.9 × 10⁸) SHA-256 trials — trivially doable by a determined adult,
  pointless for the audience. If real enforcement is ever required, that is a backend
  feature, and the redemption points (`MAMSS_ACT.redeem`) are the seam to attach it to.

### Tests

`tools/browser/codetest.js` (also `/home/user/testrig/codetest.js`) drives four browser
devices against real issued slips: locked gate, wrong code, missing name, lowercase/space
normalisation, activation binding, sign-out + replay rejection, "own slip signs you back
in", second device, App Centre rows, fail-open with the list blocked, and console hygiene —
**30 assertions, all passing**. `verify.py` grew 19 checks (§10), including the plaintext-leak
cross-check; 87 checks green in total.


### 6.1 Integration with the 22-Sept "My Study" redesign

The redesign (`a4bd143`, `ec3122d`) replaced the shell and removed the v43/v44 layer and the
sign-in requirement (anonymous guest access). Per the school's decision, v45 restores the
hard gate **on top of** the new design without rolling any of it back:

* `#mpLock` — a self-contained full-screen lock layer (static markup + critical CSS in
  `<head>`, revealed pre-paint by `#mpLockReveal`). While it is up, the guest path,
  Google slot and both profile CTAs are hidden by `html.mp-codes-pending:not(.mp-code-ok)`
  rules, so nothing underneath can be reached.
* `signUpGuest()` / `gateSignUp()` are wrapped: with policy `codes` and no activation they
  re-show the lock instead of creating a profile.
* Success binds the slip, hides the lock and calls the shell's own `createStudyAccount()`.
* A `🎛️` fab restores App Centre access (the redesign removed the old hub entry point).
* `sw.js`: precache gains `codes.js`, `upgrade.js`, `upgrade.css`; key `-v47` → `-v48`.
* `tools/integrate_v45.py` replays the shell edits idempotently; `verify.py` now accepts
  both shell generations (attribute order, optional `app.css`, `?v=` precache queries) and
  caught a duplicate `<link rel="canonical">` the redesign had reintroduced (fixed).
* `tools/browser/codetest.js` retargeted at the lock: **31 assertions, all passing**,
  including "activated device without a profile is not locked out".


### 6.2 The school ledger — one slip, one device, for real (Supabase)

Per-device single-use was the honest ceiling of static hosting. With the ledger, the
ceiling is gone: `docs/codes.js` may carry `ledger:{url,key}` (a Supabase project's
**anon** key — public by design, like a Firebase config; the `service_role` key never
goes anywhere near the site). `tools/supabase_schema.sql` creates one table whose
**primary key is the enforcement**: a second claim of the same hash fails with a
uniqueness violation, from any phone, anywhere. Row-level security lets the anon key
insert-once and read hashes/dates — nothing else.

* Redemption: local checks first, then `POST /rest/v1/code_redemptions`.
  201 = claimed here; 409 → look the row up: ours = welcome back, someone else's =
  "that slip was activated on another device on <date>" and the lock stays shut.
* Offline classroom: the device activates **provisionally** (`act.pending`) and reconciles
  on the next boot or `online` event. If another phone claimed the slip first, the
  provisional activation is revoked, the device is signed out and told why.
* No ledger configured = exactly the old per-device behaviour and the old honest note.
* Tests: `tools/browser/ledgertest.js` + `mocksupabase.js` — 20 assertions across five
  simulated devices (cross-device refusal, single ledger row, offline provisional,
  confirmation, conflict revocation, no-ledger fallback). All passing.

To switch it on: create the free Supabase project, run the SQL file once, then
`python3 tools/issue_codes.py --count 0 --ledger-url https://<proj>.supabase.co --ledger-key <anon>`
republishes `codes.js` with the ledger wired in (count 0 = config only, no new slips).

**STATUS — ACTIVATED 2026-09-24.** The school ledger is live on the project
`https://mrhbuxsfhtqguxkxfczv.supabase.co` using Supabase's new **publishable**
key (`sb_publishable_…`, the modern replacement for the anon key; public by
design, RLS-restricted to insert-once + read hashes/dates — verified remotely:
update/delete match 0 rows). Real end-to-end suite (`testrig/realtest.js`,
no mocks): **19/19** — cross-device refusal with dated message, single ledger
row under replay, offline provisional → confirmed on reconnect, foreign
prior claim → provisional revoked + lock explains why.

*Testing note:* the e2e run consumed slips #11–13 of the main batch and left
four rows in `code_redemptions` (three test hashes + one `__smoketest_…` row).
To free those slips for real students, run in the SQL editor:

```sql
delete from public.code_redemptions where code_hash in (
  '3e11e4774e2c3f722fe420d92ebbfc3e6b2a62ec638d2bb02d3b83d6e4894e2e',  -- slip #1
  'fe5fbd735ec91157b931126f85ded5464e360e57e37666858274aa8fa74176a4',  -- slip #2
  '40ec8e40e317c52cfad3f511054cc222d83ece7aca870e4f30b9356fc4944c31',  -- slip #7
  '894df065d22b89032aab0c7d6a3b01ce95a0fb40c680f10dbfe03d1590bc0f3b',  -- slip #8
  'c6e35be5bc33beecb30f4f2bcef6962e4bc0b32eec516a2bfb856ec229e41b43',  -- slip #11
  'a59cadc0ed4d834aa1f3a3c8a507c4a6a21a921642e693ac2ab7633626d14568',  -- slip #12
  '43efb42cd6420b2770936d5a29f54b1485c7f9b87004fdbfcbcf2a52e10bdaa1',  -- slip #13
  '5bd9aa40d4add346c63a10380561bec115bcbe5908900bc7448a9b4dda977fbc',  -- slip #14
  'a0cff627a321f948c6b4408aff83d33b7fe5eb61bc87433f5056f8c9e5ce9d33',  -- slip #15
  '329fef1f9ec89d6af783cde1dfbb6272bebb1c74e9ce0d81c553da0c6cee5d8c',  -- slip #16
  'f3f77cde0ce6bf59543848fd96c0ebe49093dfb46fbc7f34e79d57e4e7df8581',  -- slip #17
  '22d20af412d8a4cff0f2fd57529900a04fd5d55ba6c62ea2d95794f081770852',  -- slip #18
  '0c220dda0424127115c3ae8ccc7bebb585f40a979ceb52fc1173cc9a2d54a464'   -- slip #19
) or code_hash = '__smoketest_not_a_real_hash__';
```

(Slips #1, #2, #7, #8 were consumed by the roll-call suite after the ledger went
live; #11–13 by the real-ledger e2e on 2026-09-24 and again on 2026-09-25 after
the first cleanup freed them; #14–16 by the v52 verification run on 2026-09-25;
#17–19 by the v54 verification run on 2026-09-26 — `realtest.js` now rotates to
`codes.slice(16, 19)`.) Otherwise treat main-batch slips **#1, #2, #7, #8,
#11–19 as burned** and don't hand them out. As of the v54 run the ledger holds
14 rows; the DELETE above frees every test row.

**Test topology rule:** with the ledger live, `codetest.js` must run against a
ledger-free copy of the site (`testrig/docsnoled/` on :8101, `codes.js` with the
ledger block stripped) — running it against a ledger-enabled build burns four
real slips per run. `realtest.js` is the only suite allowed to touch the real
ledger, and only deliberately.


### 6.3 "No code, no access" (current policy)

The school's instruction is absolute, so the last escape hatches were removed:

* **No fail-open.** If `codes.js` cannot be fetched (blocked, 404, flaky network) the lock
  stays shut, explains itself, and retries on a 5 s / 15 s / 45 s / 2 min ladder plus every
  `online` event. A network accident is not a key.
* **No signed-in bypass.** A device with an old study profile but no slip now sees the lock
  too; entering a slip keeps the profile and all its work and binds the activation.
* **No legacy-browser pass.** Without WebCrypto the lock explains that a modern browser is
  required instead of opening.
* The only open doors are (a) a valid slip, (b) an activation already bound to the device,
  and (c) the school's deliberate `tools/issue_codes.py --policy open` switch.
* Honest limit, unchanged and unavoidable on static hosting: everything is verified in the
  visitor's browser, so someone with developer tools can still bypass the overlay on their
  own device. The Supabase ledger (§6.2) is what makes a *shared* slip useless on a second
  phone; client code can never be un-crackable by its owner.

### Operating the roll call

```bash
python3 tools/issue_codes.py --count 60 --batch SS2-midterm   # mint & append a batch
python3 tools/issue_codes.py --policy open                    # lift the requirement
python3 tools/issue_codes.py --policy codes                   # restore it
# slips to print:  tools/private/codes-<batch>-<date>.html   (keep this folder OFFLINE)
```

Codes live in the published `docs/codes.js`, so publishing a new batch is just committing
that one file plus, optionally, the updated policy flag. Revoking a leaked slip means
minting a replacement list (there is no server to blacklist against) — which is why the
plaintext stays on paper in the staff room.

## 8. v46 "Trim" — redesign-shell performance & PWA correctness (shipped `8e8c360`)

The 22-Sept redesign left the *upgrade layer* correct but the *shell* wasteful. Trim fixed, without touching the quiz engine:

- **sw.js**: precache list deduplicated (`./` + `./index.html` both cached the document), install no longer re-downloads with `cache:"reload"` (~96.9 KB gzip saved per install), cache key `-v51`.
- **index.html**: three `as="font"` preloads for the brand fonts, one `preconnect`/`dns-prefetch` to the Google sign-in origin (was two duplicate preconnects).
- **a11y**: the activation lock takes focus when it appears.
- Verified in production (HEAD `8e8c360`); `tools/verify.py` §[11] covers it (104 checks total now).

## 9. v47 "World-First Studio" — exclusive features (`docs/exclusive.js`)

Built in response to: *"make this website win a world record of the best study app; add exclusive features no website in the world has."*

**Honest framing first:** no official record body (Guinness, etc.) maintains a "best study app" category, so no record can literally be claimed. What v47 does instead: ships two study features that are genuinely rare in school exam-prep sites — especially ones that run **fully client-side, offline, on free static hosting, with zero accounts or servers**:

1. **🎤 Oral Examiner** — the app *speaks* an oral question aloud (speechSynthesis, with the longest keyword blanked), *listens* to the student answer through the microphone (Web Speech API, `en-NG`, live transcript), and *marks the spoken answer* against the topic's mark points: coverage %, pace (wpm), filler-word count, missed-word list. Typed answers accepted wherever there is no mic. Last 60 attempts logged on-device (`nssc_oral`).
2. **🏛️ Memory Palace** — any topic is auto-converted into a method-of-loci walk through eight familiar school rooms (gate → corridor → classroom → lab → library → chapel → field → staff room): one vivid, spoken image per room hiding one mark point, then a scored recall test room by room. Results stored per topic (`nssc_palaces`) with re-walk spacing advice.

**Prior-art dossier** (what exists elsewhere, and the delta here):

| Existing product | What it does | What it lacks vs the Studio |
|---|---|---|
| Quizlet Q-Chat / Duolingo Max (GPT-4 tutor) | Conversational AI tutoring | Cloud, paid, not exam-mark-point scored, no speech-marked orals |
| Anki / RemNote / Memory Palace apps (e.g. MemoryPalace.app) | Spaced repetition; some loci helpers | Manual card authoring; none auto-builds a palace from the syllabus mark points you already study |
| Speechify / ELSA | TTS reading; pronunciation scoring | Not question-answering against a syllabus; no coverage-of-mark-points scoring |
| WAEC/NECO prep sites (this niche) | Past questions, notes, quizzes | Text-only, online-only, no orals, no mnemonics |

The combination — *offline-first oral examiner + auto-built syllabus memory palace on a static school site* — is, to the best of public knowledge as of Sept 2026, unmatched. That is the claim v47 can honestly defend.

**Engineering notes**

- `docs/exclusive.js` (~14 KB) is **lazy-loaded**: fetched only when a student opens the Studio from the App Centre (`loadExclusive` in upgrade.js); precached by sw.js (`-v52`) so it also works offline after first visit.
- Mark points come from the existing `RNOTES` bank in index.html — no new data entry for the school.
- Shared coverage scorer: 6-char stem matching on content words, stopword-filtered; **relaxed-token fallback** for formula-style points (`x = (-b ± √(b²-4ac))/2a` has no 4+ letter words).
- Studio overlays carry **self-contained styles** (`.mp-exclusive*` in upgrade.css) because the redesign scopes `.overlay` under `:where(.legacy-ui)`.
- What's-new sheet bumped to `V = 47`.
- Tests: `testrig/exclusivetest.js` (15 assertions: hub entry, palace walk→recall→100%→saved, oral 3 rounds typed fallback→logged 100/100/100, wpm, no page errors) + `codetest.js` regression (33/33, hard gate untouched). `verify.py` §[12].

**Roadmap if you want more exclusives:** Recall Arena (blurting → auto-coverage diff), Forgetting-Curve Autopilot (Ebbinghaus scheduler over every topic studied).
\n

## 10. v48 "Recall Arena & Autopilot" — the third and fourth exclusives

Two more world-first-tier features, both riding the same lazy-loaded `docs/exclusive.js`
(precached, offline, zero accounts), both fed by the existing `RNOTES` mark points:

3. **🏟️ Recall Arena** — blurting, automated. A 30-second study phase shows the
   topic's mark points; then everything is hidden and the student writes down all
   they remember. The app diffs the blurt against **every** mark point: overall
   recall %, the "landed" list, and the pen-colour step — the misses with their
   missing keywords. Best/last/rounds per topic (`nssc_arena`).
4. **📈 Forgetting-Curve Autopilot** — every oral answer, palace walk and blurt is
   a review event (`nssc_auto_events`, capped 200). A per-topic Ebbinghaus schedule
   (`nssc_autopilot`) advances 1→3→7→14→30 days on scores ≥65%, holds on 40–64%,
   resets on <40%. The panel shows topics tracked, **Due today** with the
   stage-right tool (palace for New/Learning, blurt for Solid, oral for
   Strong/Mastered) as deep links that open the tool preselected, the next 7 days,
   and the forgetting curve itself as inline SVG. Pre-v48 oral/palace history on
   the device is imported once (`__seeded`).

Nothing here phones home: the schedule is computed and stored on the device.

*Tests:* `testrig/arenatest.js` 16/16 (study→blurt→100%, weak blurt → misses +
stage reset, due-today list, curve SVG, deep-link preselection), studio suite
15/15, roll-call suite 33/33 (hard gate untouched). `verify.py` §[13].

## 11. v49 "Prestige Edition" — membership card + WhatsApp activation line

Response to: *"make this the most expensive study website in the world and add my
WhatsApp number 08056787685 as contact for the activation key."*

**Honest framing:** no registry ranks websites by price, and this app is not for
sale — access is *issued* by the school. What v49 does: leans into the scarcity
that is real (500 numbered slips, one device each, ledger-enforced) and dresses
it the way luxury membership is dressed.

- **Lock screen:** the subtitle now reads "PRESTIGE EDITION · SCHOOL ACTIVATION
  REQUIRED", and under the code field sits the activation lifeline:
  "📱 Need an activation key? WhatsApp the school office: **08056787685**" —
  a `https://wa.me/2348056787685` deep link with a prefilled message
  ("Hello, I need an activation key for MAMSS PREP.").
- **Gold membership card** (App Centre → School activation): rendered from the
  device's activation record — member name (stamped onto `nssc_act` at redeem
  time, so it survives even though the app may clear `nssc_user`), slip mask,
  issue date, batch, and an honest license line: "Ledger-verified · one device",
  "Provisional — confirming with the ledger", or "One device". Footer:
  "Issued, not sold · limited to 500 numbered slips". Dark gold-foil styling,
  self-contained in upgrade.css (`.mp-prestige*`).
- Same WhatsApp contact repeats at the bottom of the hub's activation section.
- What's-new V49 announces the card and the WhatsApp line.

*Tests:* `testrig/prestigetest.js` 11/11 (lock copy, wa.me deep link, card
fields, provisional honesty, hub contact), studio 15/15, arena 16/16,
roll-call 33/33 **on the ledger-free copy** (see §6.2 topology rule).
`verify.py` §[14].

*If the school wants to charge for access:* price the slips, not the site —
mint a batch (`tools/issue_codes.py --count N --batch e.g. PRESTIGE-2026`),
sell those slips, and the ledger enforces one device per paying student
automatically. Nothing in the app needs to change.

## 12. v50 "Exam Command Center" — the most-advanced audit, closed

Response to: *"make this to be the most advanced educational website in the world."*

**Honest framing (as with the world-record ask):** "most advanced" is not an
official title anyone awards. What can be done — and is done here — is a
feature-by-feature audit against the biggest education products on earth, and
closing every gap that is buildable on free static hosting with zero servers.

| Capability | Khan Academy | Duolingo | Quizlet | Anki | Coursera | **MAMSS PREP v50** |
|---|---|---|---|---|---|---|
| Spaced-repetition scheduler | – | streaks only | – | ✔ (manual cards) | – | ✔ **automatic, syllabus-derived** (Autopilot) |
| Speech-marked oral practice | – | limited | – | – | – | ✔ **coverage/wpm/fillers vs mark points** |
| Auto-built memory palaces | – | – | – | – | – | ✔ **none of them have this** |
| Blurting with auto-diff | – | – | – | – | – | ✔ **Recall Arena** |
| Exam-date study planner | ✔ (course-level) | ✔ (path) | – | – | ✔ | ✔ **weakness-weighted, printable, on-device** |
| Mastery heatmap | ✔ | ✔ | – | – | – | ✔ **from real recall events, not video watches** |
| Works fully offline (PWA) | partial | partial | partial | ✔ | – | ✔ **everything, including the studio** |
| Access enforcement | account | account | account | – | account | ✔ **numbered slips + database ledger, one device each** |
| Runs with zero servers/accounts | – | – | – | ✔ | – | ✔ |

The genuinely unmatched combination: a school-gated, offline-first static site
whose five studio tools all feed one on-device forgetting-curve brain.

### What v50 adds
**🧭 Exam Command Center** (fifth studio door):
- Exam setup (WAEC/NECO/NABTEB/mock/custom + date) → big countdown (`nssc_exam`).
- **Mastery heatmap**: one tile per subject, coloured from the student's own
  recall events (red <40%, amber <65%, green ≥65%, grey = untouched); tap for
  the topic breakdown with autopilot stages.
- **Plan generator** (`genPlan`): every RNOTES topic queued weakest-known-first
  (studied-and-weak before untouched before middling before mastered), 4 new
  topics per day, each re-reviewed at **+1, +3, +7 days**; horizon capped at the
  exam date (max 90 days); stored in `nssc_plan`; rendered 7 days at a time.
- **Print** (dedicated @media print stylesheet — hides the app, prints the plan)
  and **Copy plan** (clipboard text) for the wall/fridge/exercise book.
- "Change exam / date" resets countdown + plan together.

*Tests:* `testrig/cmdtest.js` 14/14 (countdown, heatmap colours from seeded
history, weak-first day 1, +1-day reviews, ≤4 new/day, reset clears state);
regression: roll-call 33/33 (ledger-free copy), studio 15/15, arena 16/16,
prestige 11/11. `verify.py` §[15] (141 checks).

## 13. v51 "Why MAMSS PREP" — the shareable prospectus (`docs/why.html`)

The §12 audit, turned into a page the school can drop into any parents' group
or WhatsApp status. Public by design — it is the shop window, not the door;
the app behind "Open the app" stays absolutely gated.

- Dark-gold Prestige look, self-contained (inline CSS, no external requests,
  system fonts), mobile-first, ~11 KB.
- Hero: "issued, not sold" positioning + the scarcity numbers (500 slips ·
  1 device · 0 accounts/trackers · 100% on-device scoring).
- Green WhatsApp CTA (top and footer) to 08056787685 with the prefilled
  activation-key message; secondary "I already have a key — open the app".
- The five studio tools as cards ("world-first" chips on the four unmatched),
  the full honest audit table vs Khan/Duolingo/Quizlet/Anki/Coursera with the
  "not an official title" caveat printed on the page itself, the gate in
  3 steps, and the offline/privacy engineering note.
- OG + Twitter share tags with `social-preview.png` (absolute URL) — links
  unfurl with a proper card in WhatsApp/Facebook/X.
- Entry points: lock screen ("✦ Why is MAMSS PREP invitation-only?" — exactly
  where a locked-out visitor is), App Centre activation section ("share the
  story with parents & friends"). Added to the sitemap and to the service
  worker's optional precache (offline share); cache key `-v56`; what's-new
  V51 announces it.

*Tests:* `testrig/whytest.js` 13/13 (200, self-contained, OG image resolves,
five tools, honest table, two CTAs, 3-step gate, both entry points);
full regression: roll-call 33/33 (ledger-free copy), studio 15/15, arena
16/16, prestige 11/11, command 14/14. `verify.py` §[16].

## 14. v52 "WAEC-Standard Bank" — every question audited to examination standard

*The brief:* "make all the questions in this website to be waec standard."
Shipped as v52: the 3,900-question bank (`docs/bank.js`, the single live
question source — the arcade, studio tools and autopilot all ride on it) was
audited end to end, every genuine defect family fixed in place, and the fixes
frozen behind a regression linter. **No question content, options or answers
changed — wording and mechanics only.**

### 14.1 What the audit found

First, the non-issues (deliberately left untouched — they are valid WAEC forms):
the 1,048 `What does the description below refer to? "…"` definition stems, the
44 completion/imperative stems without command words, the 98 cross-class spiral
repeats (0 duplicates within a class), and the answer-index distribution.

The real defects were all machine-generation artifacts:

| # | Family | Count | Fix |
|---|--------|-------|-----|
| F1 | Ordinal typos ("the 3th term") | 2 | → "3rd" |
| F2 | Stems missing end punctuation | 42 | interrogative → "?", statement → "." (allow-set `.?!:;…”"'`) |
| F3 | Template stems `Which of the following is NOT a/an <lowercased topic>?` ("NOT a waves?", "NOT an electricity?") | 149 | → `Which of the following is NOT associated with <Proper Topic>?` (capitalisation recovered from the RNOTES topic map) |
| F3e | Matching template explanations ("X is not a waves; it is a heat.") | 147 | → "X is not associated with <Topic>; it belongs to <Topic>." |
| F6 | Article agreement ("a oxygen atom", "an utility") | 10 | a/an fixed by first sound; silent-h words take "an"; yoo-sound words (uni-/eu-/use-) keep "a"; ALL-CAPS acronyms (USB, HIV) never touched |
| F7 | Ungrammatical definition stems ("is a metals?", "is a photosynthesis?", "is a money?") | 51 | → `Which of the following best describes <X>?` — curated from a full enumeration of the 1,065 definition stems; correct ones ("a board of directors", "a homologous series", "a concave lens") untouched |

**247 questions changed** (some carry more than one fix). New `QUIZ_HASH`
`2f6336c6…`; text delta +5,497 chars.

*Copy note for the school:* the marketing copy says "4,167 questions / 27
subjects" while the quiz bank verifiably holds 3,900 questions across 13 quiz
subjects (the 27 counts the notes/syllabus subjects). The school's copy was
left as-is — flagging it here so the numbers can be reconciled deliberately.

### 14.2 How it was fixed (and what must never be run)

`tools/waec_fix.py` — the surgical fixer. It decodes `bank.js`, proves a
byte-identical round-trip **before** editing, applies the six families,
re-serialises, recomputes sha256, recompresses at zlib level 9 (matching the
original `78da` header), and rewrites **only the two constants** (`QUIZ_B64`,
`QUIZ_HASH`) — the decode IIFE and every other byte of `bank.js` are untouched.
It regenerates `docs/bank-raw.js` (the rescue copy) with the identical payload
and merges all 247 changes into `docs/quiz/edits.json` (keyed by original stem,
39 class|subject keys) as the durable edit record. Dry-run by default.

**Never run `docs/quiz/build.py` or `bank_edit.py --apply`**: build.py also
emits `index.html` and `sw.js` from the old template app relative to its cwd —
it would overwrite the live September redesign and the live service worker.
The fixer + edits.json merge is the canonical path.

### 14.3 The regression guard

- `tools/waec_audit.py` — standalone linter: hash contract, format contract
  (4 blocks · 13 subjects · 3×1300 · 7 fields · 4 non-empty options · idx 0–3),
  all six defect families, fix-presence counts, bank-raw mirror equality,
  edits.json record, live wiring (index.html loads bank.js; workshop artifacts
  never wired in — `quiz/notes_data.js`, `notes_app.js`, `syllabus_data.js` are
  legitimate live lazy-loads). Exit 1 on any failure. **Negative-tested**: run
  against the pre-fix v51 docs it reports 10 failures; against v52, CLEAN.
- `tools/banktest.js` — real-browser verification (Playwright): loads the live
  page, waits for the async decode IIFE, asserts QUIZ_RAW shape (13 subj ·
  3×1300 · 0 structural violations), exact fix counts (149/147/51), absence of
  every old defect pattern, and `sha256(__BANK_RAW_TXT) === QUIZ_HASH`. 20/20.
- `tools/verify.py` §[17] runs the auditor inline. **verify.py: 160 passed · 0 failures.**

### 14.4 Delivery

Existing devices cache `bank.js` through the service worker, so v52 ships with
the usual cache-bust pair: `upgrade.js` `V = 52`, `NAME = "WAEC-Standard Bank"`
(whats-new announces the audit; suites seed `nssc_mp_seen='52'`), and `sw.js`
cache key `-v57`. The gate, ledger and every v45–v51 behaviour are untouched.

*Tests:* banktest 20/20; full regression: roll-call 33/33 (ledger-free copy on
:8101 — re-synced with the new bank before running), studio 15/15, arena 16/16,
prestige 11/11, command 14/14, prospectus 13/13, real-ledger e2e **19/19**
(fresh slips #14–16; cleanup SQL in §6.2 covers them). verify.py 160/0.

## 15. v53 "Adaptive Engine" — roadmap item 1 of 8

On 2026-09-25 the school handed over an eight-item roadmap and approved it in
full, item order, with **Firebase** chosen for the cloud items. Ledger:

| # | Item | Status |
|---|------|--------|
| 1 | Adaptive learning engine (Leitner/SM-2 + weak-topic weighting) | **shipped — v53 (this section)** |
| 2 | Real backend / sync (Google sign-in, cross-device progress) | approved (Firebase); NEXT — the redesign ALREADY ships Google sign-in (`GOOGLE_CLIENT_ID`, GIS, `migrateAnonymousAttempts`), so v55 adds the sync layer under it. (v54 became the Live CBT Hall instead: on 2026-09-26 the school asked for real-time teacher-posted exams as the new top priority; it reuses the EXISTING Supabase project, so Firebase stays reserved for this sync item.) |
| 3 | Teacher/admin dashboard (aggregate class performance) | **live-session slice shipped — v54 Live CBT Hall** (real-time roster, integrity flags, ranking + per-question breakdown, CSV); whole-school aggregate dashboard still queued behind #2 |
| 4 | Teacher content pipeline (CSV/JSON → bank, validated) | queued |
| 5 | Accessibility & performance audit | queued (a11y scaffolding — `a11yApply`/`a11yOpen` — already exists and gets audited, not rebuilt) |
| 6 | Exam-mode integrity | **shipped for live sessions — v54** (blur/visibility logging with 1.2 s accidental-bounce grace, escalating warnings, forgiving auto-submit at 5, copy/paste block with a Readable-a11y exemption, server-enforced no-going-back; **webcam monitoring — v55**: off/optional/required per paper, ephemeral live snapshots, explicit consent gate); practice-mode exam integrity polish remains queued |
| 7 | Offline-first PWA polish | queued (≈90 % live since v46: installable, offline SW, safe-update Reload prompt; remaining: explicit "new questions" update copy + zero-connectivity cold-start proof) |
| 8 | Gamification depth | queued (`readinessScore`/`readinessTier` already exist — the SS3-readiness bar builds on them; adds subject mastery badges + canvas-rendered WhatsApp share cards) |

### 15.1 What v53 adds

**Adaptive store** `nssc_adaptive_<uid>` (per profile, on-device like everything
else): one record per `Subject||Topic` — `{n, c, box 0-5, due, sec, secN}`.
Leitner intervals `ADAPT_GAP = [0,1,2,4,7,14,30]` days. Updated on every
submit (`adaptUpdate`, hooked into the existing submit chain right after
`recordTopicStats`): session accuracy < 50 % demotes a box; ≥ 80 % **and**
average response ≤ 60 s promotes it; otherwise the box holds. Response times
come from the existing `state.qTimes` telemetry (tenths of a second).

**Latent bug fixed on the way**: bank questions never carried a `.t` topic
field, so `recordTopicStats` filed every normal paper under "General".
`adaptTagQuiz()` now classifies each answered question through the existing
`topicOf()` keyword map before stats are recorded — topic accuracy is real
from v53 onward (legacy "General" keys remain readable; nothing is deleted).

**Lossless migration**: on first touch, `adaptStore()` seeds itself from the
existing `nssc_topics_<uid>` accuracy (≥75 % → box 2, ≥60 % → box 1, else 0)
and from `paceAvgRows()` (attempt-history pace). No existing data is lost or
rewritten.

**Weakness ranker** `adaptRank()`: score = (100 − accuracy) + (5 − box)·4 +
10·min(3, days overdue) + pace penalty min(15, (avgSec − 60)/4).

**Daily Challenge — weighted, still deterministic**: six of the ten questions
now come round-robin from the ranked weak topics (seeded per-day shuffle
within each topic), four remain the original seeded-random mix. Same-day
"Redo today's paper" yields the identical paper (the date-seeded
`mulberry32` RNG is untouched). With no adaptive data yet, behaviour is
byte-for-byte the old random paper. Toast tells the student the paper is
"weighted to your weakest topics".

**AI Coach — adaptive entries**: the weakest-topic card now comes from
`adaptRank` and shows `memory box N/5` plus "due for review" when overdue; a
new **Speed drill** card appears when a topic is ≥ 70 % accurate but ≥ 75 s
average ("because exam-ready recall is fast recall"). Existing suggestions
(reviews due, mock exam, goal, worksheet, parent report, league) unchanged.

### 15.2 Delivery & tests

`V = 53`, `NAME = "Adaptive Engine"`, whats-new entry, sw cache key `-v58`
(suites seed `nssc_mp_seen='53'`). New suite `tools/adaptivetest.js` —
**18/18**: migration boxes/pace, ranker order, daily paper = 10 unique
questions with ≥ 4 from the two weakest topics, same-day determinism, box
demote/hold/promote across two submits, pace averaging, both coach entries,
zero page errors. Full regression: roll-call 33/33 (:8101 ledger-free),
studio 15/15, arena 16/16, prestige 11/11, command 14/14, prospectus 13/13,
bank 20/20. `verify.py` §[18] → **172 checks · 0 failures**.

## 16. v54 "Live CBT Hall" — real-time teacher-posted examinations

On 2026-09-26 the school asked for a live CBT mode on top of the existing site:
teachers post a real examination, students join with a session code on the
devices they already activated, the teacher watches the room in real time and
releases results the moment the paper ends. Built as an extension, not a
rebuild: same visual language, same navigation pattern (a fifth tab, desktop
sidebar + mobile dock), same question format as the bank, same activation
identity — and the SAME Supabase project as the roll-call ledger, so no new
keys, no new config, no new vendor.

### 16.1 What v54 adds

**Teacher console** (unlocks automatically on any device activated with a
`TEACHER-*` slip — `MAMSS_ACT.teacher()`):

* **Build paper** — draw N questions from the bank filtered by class / subject /
  topic (seeded shuffle, duplicates impossible), and/or add fresh questions on
  the spot. Custom questions are checked against the WAEC-standard rules the
  whole bank now follows (v52): distinct options, non-empty stem, ordinal and
  article-agreement warnings, duplicate blocking. Drafts survive reloads
  (`nssc_cbt_draft`).
* **Go live** — one tap mints a 6-character session code (unambiguous alphabet,
  shown `XXX-XXX`, collision-retried). Invite text copies to clipboard or
  shares straight to WhatsApp. Duration 10–90 min; optional scheduled start
  (displayed in the students' lobby; the room opens when the teacher presses
  Start — no phantom server cron).
* **Monitor** — live roster: name, masked slip, status chip, per-student
  progress bar ("question 14/30"), integrity flags, and a freshness dot from
  the server-stamped `last_seen_at`. Controls: Start, +5/+15 min extension,
  End now, instant-results toggle — all reflected on every student device
  within ~2.5 s.
* **Results** — the moment the paper ends: class ranking (medals, %, integrity
  column), per-question accuracy with A/B/C/D answer-distribution bars,
  one-click CSV export, and a WhatsApp-ready summary (average, top 3, hardest
  question). Scores are **re-graded from the server rows** — a phone that
  reports a flattering score is shown with a ⚠ mismatch marker; the database
  wins.

**Student side** (the new *Live CBT* tab):

* Join by code — no signup, no password: the activation slip already IS the
  identity (name + masked slip + device id ride along on the attempt row).
* Waiting room until the teacher starts (device count ticks up live).
* Runner: one question at a time, big countdown, select → **Save & next**.
  Every answer hits the database the instant it is given; the connection can
  drop mid-question and nothing is lost. No going back — enforced by the
  answers **primary key**, not just hidden buttons.
* Refresh/reopen cannot reset anything: the deadline lives in the server row
  (`ends_at`, stamped by a Postgres trigger), and rejoining resumes at exactly
  the saved question with the running clock.
* Timeout → automatic submission of everything saved; teacher "End now" →
  same, immediately, room-wide.
* Instant results + explanations (if the teacher allows), otherwise
  "submitted — your teacher will release the results". Recent sessions list
  on the hall home for re-entry.

**Anti-cheat** (forgiving by design, per the school's ask):

* Leaving the exam window (tab switch, app switch, blur) is logged — with a
  **1.2 s grace** so an accidental bounce doesn't count. Escalation: soft note
  → warning ("recorded, your teacher sees it live") → final warning →
  **auto-submit at 5** logged events. Every event increments the server row
  (visible on the teacher roster in real time) and flags the question that was
  on screen.
* Copy / cut / right-click suppressed on the question card (`user-select:none`
  too) — automatically lifted when the student uses the site's **Readable**
  accessibility mode; a11y wins over anti-cheat, documented here honestly.

### 16.2 School setup — ONE TIME, ~2 minutes

1. **Run the SQL.** Supabase dashboard (the same project as the roll-call
   ledger) → SQL editor → paste `tools/cbt_schema.sql` → Run. It creates three
   tables, two timing triggers, RLS policies and the realtime publication.
   Until this is run the Live CBT tab simply says *"being set up by the
   school"* — nothing else on the site is affected (tested). (The file already
   carries the v55 `webcam` column; if you ran the v54 version of it earlier,
   also run the one-line `alter table` at the bottom of the file.)
   **Status (2026-09-26): DONE — the school ran the file in the dashboard and
   it was verified remotely, end to end.** Tables + both timing triggers + both
   PK rules + delete-blocked RLS: 14/14 over REST with the publishable key.
   Realtime broadcast: A→B relay in 742 ms on the production socket, speaking
   the exact protocol `LiveRoom` uses. Live site: the CBT tab now reads the
   real tables (the "being set up" card is gone for good). One permanent
   setup-probe remains — deletes are blocked by design, so session `ZZ9999`
   (*"— setup probe (safe to ignore) —"*, status `ended`, plus one
   attempt/answer pair under device `probe-dev`) stays in the table. Nobody
   can join it: anyone typing the code is told the session has ended.

2. **Hand out teacher slips.** 10 `TEACHER-1` slips were generated on
   2026-09-26 and live ONLY in `tools/private/codes-TEACHER-1-2026-09-26.html`
   (print & cut) + `.csv` — git-ignored, never uploaded, same discipline as
   the student slips. A teacher activates exactly like a student; the console
   appears by itself. (The slips were handed over for printing on
   2026-09-26.) More teachers later:
   `python3 tools/issue_codes.py --count N --batch TEACHER-2` (ranges update
   automatically; any batch named `TEACHER-*` grants the role).

### 16.3 How the teacher role works (and its honest edges)

`codes.js` now carries `batchRanges:[[0,120],[120,500],[500,510]]` — the index
slice of each batch inside the 510-hash list. On redemption, `upgrade.js`
resolves the **true** batch by hash position (this also fixes the old cosmetic
bug where every activation was labelled with the last batch) and stamps
`role:"teacher"` when the batch matches `/^teacher/i`. `MAMSS_ACT.teacher()`
reads the stamp. Edges, stated plainly:

* Devices activated BEFORE v54 keep their old stamp (batch = last-batch label,
  no role). They are students — which is correct, since teacher slips did not
  exist yet. A re-activation is never needed for students.
* The gate itself is untouched: fail-closed, slip-or-bound-device only. The
  teacher console adds a capability ON TOP of activation, never a way around
  it. `nssc_act` still never syncs anywhere (roadmap #2 constraint respected).
* Role trust is client-side (the public key could post a session). Same trust
  posture as the whole static-site gate — abuse means attacking your own
  school's exam; the upgrade path is Supabase Auth, folded into roadmap #2.

### 16.4 Backend architecture

| Table | Primary key = business rule |
|---|---|
| `cbt_sessions` | `code` — one paper per 6-char code; questions embedded as JSONB (self-contained: bank version drift can't break a live sitting) |
| `cbt_attempts` | `(session_code, device_id)` — **one attempt per device per session**, at database level |
| `cbt_answers` | `(session_code, device_id, q_idx)` — **each answer saved once, the instant it is given; no going back**, at database level |

* **Timing is server-authoritative**: a `BEFORE UPDATE` trigger stamps
  `live_at`/`ends_at` (start), recomputes `ends_at` (extend), stamps
  `ended_at` (end) and `last_seen_at` (every attempt heartbeat) with the
  database clock — phones never write timestamps that matter.
* **Realtime**: Supabase Realtime **broadcast** channel per session
  (`realtime:cbt-XXXXXX`, raw Phoenix-protocol WebSocket, no client library —
  the site stays dependency-free). Broadcasts only say "something changed";
  listeners re-fetch via REST because **Postgres is the single source of
  truth**. A 2.5 s poll runs alongside as the correctness backbone and full
  fallback (6 s when the tab is hidden) — if the socket never connects,
  everything still works at poll latency. `window.__CBT_FORCE_POLL=1` forces
  poll-only (used by the test suite).
* **Trust model**: RLS lets the publishable key select/insert/update these
  rows; **deletes are blocked entirely** (no delete policy) so sittings stay
  auditable. The key can therefore write rows it shouldn't — same honest
  public-key posture as the activation ledger, documented not hidden.
* **Clock skew**: `ends_at` is server truth, but a phone whose clock is wrong
  by a minute displays a minute off and auto-submits a minute off. Accepted
  for school sittings; the teacher's End/Extend controls are the human
  backstop. (True skew-proofing needs an authenticated round-trip — noted for
  the roadmap #2 backend.)

### 16.5 Delivery & tests

`V = 54`, `NAME = "Live CBT Hall"`, whats-new entry, sw cache key `-v59`,
`docs/cbt.js` precached. New files: `docs/cbt.js` (~35 KB),
`tools/cbt_schema.sql`, `tools/cbttest.js` + `tools/cbtmock.js` (mirrored in
`testrig/`). Wired as a natural fifth tab: `titles.cbt`, lazy `load("cbt.js")`
in `navigate()`, `#viewCbt`/`#cbtRoot` section, sidebar + dock links (dock
widened to 5 columns).

New suite `cbttest.js` — **60/60**: teacher/student two-context end-to-end
against an in-memory mock with the exact primary-key + trigger semantics of
the schema (all `/rest/v1/*` traffic rewritten by Playwright route; polling
backbone exercised via `__CBT_FORCE_POLL`). Covers: role gating both ways,
nav on desktop+mobile, bank draw (5 unique from SS2 Mathematics), custom
question add/duplicate-block/malformed-block + WAEC mechanics verdict, go-live
code format + persisted session row, waiting room with live device count,
server-stamped start (~1800 s deadline), auto-transition to runner, mm:ss
timer, select-then-save flow, instant answer persistence, 409 on re-answer,
no-back audit, copy/context-menu suppression, blur→grace→server-logged
integrity + teacher-side live flag, refresh-resume at the exact question with
the running clock, 409 on second attempt, auto-submit on completion, X/6 score
+ ✅/❌ breakdown, ranking + medals + per-question distribution bars, CSV
download, +5 min extension moving the server deadline exactly 300 s, expired
deadline → immediate auto-submit, teacher end-early, pre-SQL degraded mode
("being set up" + rest of app untouched), zero page errors.

Full regression: adaptive 18/18, bank 20/20, studio ALL, arena ALL, prestige
ALL, command ALL, prospectus ALL, roll-call 33/33 (:8101 ledger-free),
real-ledger e2e 19/19 against the LIVE Supabase (slips #17–19 rotated in and
burned — §6.2 cleanup list updated; ledger now 14 rows).
`verify.py` §[19] → **214 checks · 0 failures**.

## 17. v55 "Live CBT Cameras" — webcam monitoring, ephemeral by design

The school asked for webcam monitoring on top of the Live CBT Hall. Built as an
extension of the v54 realtime channel — **no media server, no storage bucket,
no new vendor, nothing recorded**:

* **How frames travel.** While an exam runs, a student's device grabs a small
  JPEG (320×240, q0.55 — auto-downscaled if a frame would exceed the realtime
  message cap) **every 12 seconds** and broadcasts it on the session's
  Supabase Realtime channel. The teacher's monitor renders a tile per student
  (frame, name, live/stale dot, click to enlarge). Upload cost per student is
  ~1.7 KB/s — deliberately kind to mobile data; a 40-student room costs the
  teacher roughly 0.5 Mbps down. Hidden tabs broadcast nothing (the integrity
  log already covers that window), and the camera is **hard-stopped at submit**
  (all media tracks ended — asserted in tests, the phone's camera light goes
  off with the paper).
* **Teacher control per paper** (builder → *Webcam monitoring*): **Off** /
  **Optional** (student's choice, chip in the runner) / **Required** (a
  CAMERA CHECK gate before the first question). The roster and the results
  table carry a 📹 column: `on · denied · no cam · skipped` — a student who
  continues without a camera is never silently invisible; the teacher decides
  what that means. Camera tiles ride the realtime socket: in polling-fallback
  mode the monitor says so honestly (everything else keeps working).
* **Student consent, plainly.** The gate promises in words a student can hold
  us to: snapshots go to *your teacher only*, about every 12 seconds, are
  **never recorded and never stored**, and are gone when the paper ends. The
  browser's own camera permission prompt can never be bypassed, the student
  **sees themselves first**, and only then confirms ("Looks good — start the
  exam"). Broken/absent hardware gets an honest error and a flagged
  "continue without camera" path.
* **What is persisted:** one status word on the attempt row
  (`cbt_attempts.webcam` — new column, in `cbt_schema.sql`; early v54
  adopters run the one-line `alter table` at the bottom of that file). Frames
  themselves exist only in flight; the Supabase relay sees them transiently,
  like any broadcast. If the school ever wants *recorded* proctoring, that is
  a deliberate future decision (consent copy + Storage bucket + retention
  policy) — intentionally NOT built here.

### 17.1 Delivery & tests

`V = 55`, `NAME = "Live CBT Cameras"`, whats-new entry with the privacy
promise, sw cache key `-v60` (suites seed `nssc_mp_seen='55'`). `docs/cbt.js`
grows the camera engine (~250 lines): `enableCam`/`startCamLoop`/`sendCamFrame`
(adaptive downscale)/`stopCam`, camgate view, runner pin + chip, teacher tile
grid, `__CBT_WS_URL`/`__CBT_CAM_MS` test hooks.

`cbttest.js` → **80/80** (Chromium fake media device + a local Phoenix-protocol
echo relay `cbtws.js`; new assertions: required-mode gate + privacy copy,
self-preview, pin/chip, `webcam=on` stamp, frames received over the socket,
streaming loop, roster 📹, tracks-ended-at-submit, broken-camera path with
`unavailable` stamp, optional mode never blocks and never stamps, zero page
errors). `verify.py` §[20] → **235 checks · 0 failures** (the sw-version
checks were also made bump-proof: parsed integer ≥ N instead of pinned
strings). Full regression: adaptive 18/18, bank 20/20, studio/arena/prestige/
command/prospectus ALL PASS, roll-call 33/33 (:8101). `realtest` deliberately
not re-run — v55 does not touch the redeem path (last live-ledger run: 19/19
under v54, slips #17–19 burned).
