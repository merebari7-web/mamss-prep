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
