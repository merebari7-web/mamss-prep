# MAMSS PREP — v43 "Ascension" upgrade

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

*v43 "Ascension" — built for Morals and Excellence.*
