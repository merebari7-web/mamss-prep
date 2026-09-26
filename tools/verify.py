#!/usr/bin/env python3
"""
MAMSS Prep — release verifier.

Static checks that can run anywhere (no browser needed):
  python3 tools/verify.py

Guards the things that have actually broken before:
  • the malformed <meta> that silently swallowed <link rel="manifest">
  • duplicate canonical / favicon links
  • CSS lost or duplicated during the app.css extraction
  • a service-worker precache list pointing at files that do not exist
  • bank-raw.js drifting out of sync with bank.js
  • manifest icons/screenshots that are declared but missing (or the wrong size)

Exit code 0 = ship it. Anything else = do not deploy.
"""
import base64
import json
import os
import re
import struct
import subprocess
import sys
import zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(ROOT, "docs")

FAIL, WARN, OK = 0, 0, 0


def ok(msg):
    global OK
    OK += 1
    print("  \033[32m✔\033[0m " + msg)


def fail(msg):
    global FAIL
    FAIL += 1
    print("  \033[31m✘ FAIL\033[0m " + msg)


def warn(msg):
    global WARN
    WARN += 1
    print("  \033[33m!\033[0m " + msg)


def png_size(path):
    with open(path, "rb") as fh:
        d = fh.read(33)
    if d[:8] != b"\x89PNG\r\n\x1a\n":
        return None
    return struct.unpack(">II", d[16:24])


def jpeg_size(path):
    with open(path, "rb") as fh:
        d = fh.read()
    i = 2
    while i < len(d) - 9:
        if d[i] != 0xFF:
            i += 1
            continue
        marker = d[i + 1]
        if marker in (0xC0, 0xC1, 0xC2, 0xC3):
            h, w = struct.unpack(">HH", d[i + 5 : i + 9])
            return (w, h)
        if marker in (0xD8, 0xD9) or 0xD0 <= marker <= 0xD7:
            i += 2
            continue
        seg = struct.unpack(">H", d[i + 2 : i + 4])[0]
        i += 2 + seg
    return None


def git_show(path):
    try:
        return subprocess.run(
            ["git", "-C", ROOT, "show", "HEAD:" + path],
            capture_output=True, text=True, timeout=60,
        ).stdout
    except Exception:
        return ""


def prev_blob(path, current):
    """Most recent *committed* version of `path` whose content differs from the
    working copy. Works whether the verifier runs before the commit (HEAD is the
    old version) or after it / in CI (we must look one commit further back)."""
    try:
        commits = subprocess.run(
            ["git", "-C", ROOT, "log", "--format=%H", "-n", 10, "HEAD", "--", path],
            capture_output=True, text=True, timeout=60,
        ).stdout.split()
        for h in commits:
            blob = subprocess.run(
                ["git", "-C", ROOT, "show", h + ":" + path],
                capture_output=True, text=True, timeout=60,
            ).stdout
            if blob and blob != current:
                return blob
    except Exception:
        pass
    return ""


def main():
    print("\nMAMSS PREP — release verifier\n" + "=" * 46)
    idx_path = os.path.join(DOCS, "index.html")
    if not os.path.exists(idx_path):
        fail("docs/index.html not found")
        return 1
    s = open(idx_path, encoding="utf-8").read()
    head = s[: s.find("</head>")]

    print("\n[1] Document head")
    # the bug that made the app uninstallable
    if re.search(r'<meta[^>]*"[^>]*<link', head):
        fail('malformed <meta> is swallowing a <link> (the manifest bug is back)')
    else:
        ok("no malformed meta/link sequence")
    if re.search(r'<link[^>]*rel="manifest"[^>]*>|<link[^>]*href="manifest\.webmanifest"[^>]*>', s):
        ok('<link rel="manifest"> present — the app is installable')
    else:
        fail('<link rel="manifest"> missing — the PWA cannot be installed')
    n_canon = len(re.findall(r'<link[^>]*rel="canonical"', s))
    (ok if n_canon == 1 else fail)("exactly one canonical link (found %d)" % n_canon)
    n_icon = len(re.findall(r'<link rel="icon"', s))
    (ok if n_icon == 1 else warn)("one favicon link (found %d)" % n_icon)
    # count real tags only: text inside HTML comments does not create elements
    tags_only = re.sub(r"<!--.*?-->", "", s, flags=re.S)
    for tag, want in (("</head>", 1), ("<body", 1), ("</body>", 1), ("<html", 1), ("</html>", 1)):
        c = tags_only.count(tag)
        (ok if c == want else fail)("%s appears %d time(s)" % (tag, c))
    if "</head>" in s and '<div class="luxe-frame"' in s.split("<body", 1)[1]:
        ok(".luxe-frame lives inside <body>")
    else:
        warn(".luxe-frame is not inside <body>")
    if ('id="mpCritical"' in head and '<link rel="stylesheet" href="app.css">' in head) \
       or 'id="mpLockCss"' in head:
        ok("critical CSS inline + full sheet linked")
    else:
        fail("critical CSS / app.css link missing")
    n_style = len(re.findall(r"<style[^>]*>", head))
    (ok if n_style == 1 else fail)("exactly one inline <style> left in <head> (found %d)" % n_style)
    if '<link rel="preload" href="bank.js"' in head:
        ok("bank.js preloaded")
    else:
        warn("bank.js is not preloaded")
    if '<script src="bank.js" defer>' in s:
        ok("bank.js defers (non-render-blocking)")
    else:
        warn("bank.js is still render-blocking")
    if ("mpSaverGate" in head and "mpUpgrade" in s) or ('upgrade.js' in s and 'mpLockCss' in head):
        ok("upgrade layer installed (v43 gate or v45 lock generation)")
    else:
        fail("Data-Saver gate or upgrade layer loader missing")
    if re.search(r"127\\\.0\\\.0\\\.1", s) or "localhost" in s:
        ok("service worker also registers on localhost (dev/test)")
    else:
        warn("service worker only registers on https")

    print("\n[2] JSON-LD structured data")
    m = re.search(r'<script type="application/ld\+json">(.*?)</script>', s, re.S)
    if not m:
        fail("no JSON-LD block")
    else:
        try:
            d = json.loads(m.group(1))
            ok("valid JSON-LD (@type=%s)" % d.get("@type"))
            for k in ("name", "url", "description", "softwareVersion", "featureList", "offers"):
                (ok if k in d else warn)("  field present: %s" % k)
        except Exception as e:
            fail("JSON-LD does not parse: %s" % e)

    print("\n[3] app.css extraction fidelity")
    css_path = os.path.join(DOCS, "app.css")
    if not os.path.exists(css_path):
        if os.path.exists(os.path.join(DOCS, "ui", "study.css")):
            warn("docs/app.css absent — redesign shell uses ui/study.css")
        else:
            fail("docs/app.css missing")
    else:
        css = open(css_path, encoding="utf-8").read()
        ok("app.css present (%s chars)" % f"{len(css):,}")
        prev = prev_blob("docs/index.html", open(idx_path, encoding="utf-8").read())
        if prev:
            blocks = re.findall(r"<style[^>]*>(.*?)</style>", prev[: prev.find("</head>")], re.S)
            missing = [i for i, b in enumerate(blocks) if b not in css]
            if blocks and not missing:
                ok("all %d CSS blocks from the pre-upgrade index.html are present verbatim" % len(blocks))
            elif blocks:
                fail("CSS blocks missing from app.css: %s" % missing)
            # the inline critical sheet must not have stolen rules
            inline = re.findall(r'<style[^>]*>(.*?)</style>', head, re.S)
            ok("inline critical CSS is %s chars" % f"{sum(len(x) for x in inline):,}")
        else:
            warn("could not read HEAD:docs/index.html — skipped byte-exact CSS comparison")

    print("\n[4] Service worker")
    sw_path = os.path.join(DOCS, "sw.js")
    if not os.path.exists(sw_path):
        fail("docs/sw.js missing")
    else:
        sw = open(sw_path, encoding="utf-8").read()
        v = re.search(r'const NSS_V = "([^"]+)" \+ "([^"]+)"', sw)
        if v:
            ok("cache version %s%s" % (v.group(1), v.group(2)))
            prev_sw = prev_blob("docs/sw.js", sw)
            pv = re.search(r'const NSS_V = "([^"]+)" \+ "([^"]+)"', prev_sw)
            if not pv:
                warn("no earlier committed sw.js to compare — cannot confirm NSS_V bump")
            elif (pv.group(1) + pv.group(2)) == (v.group(1) + v.group(2)):
                fail("NSS_V was NOT bumped — returning users will keep the old cache")
            else:
                ok("NSS_V bumped from %s%s" % (pv.group(1), pv.group(2)))
        else:
            fail("could not read NSS_V")
        core = re.search(r"const NSS_CORE = \[(.*?)\];", sw, re.S)
        if not core:
            fail("NSS_CORE precache list not found")
        else:
            entries = re.findall(r'"([^"]+)"', core.group(1))
            absent = []
            for e in entries:
                rel = e.split("?")[0].lstrip("./")
                if rel in ("", "index.html"):
                    rel = "index.html"
                if not os.path.exists(os.path.join(DOCS, rel)):
                    absent.append(e)
            (ok if not absent else fail)(
                "all %d precache entries exist on disk%s"
                % (len(entries), "" if not absent else " — MISSING: " + ", ".join(absent))
            )
            if len([e for e in entries if e.rstrip("/") in ("", "./")]) > 1:
                warn("the document is precached under more than one key")
        for needle, label in (
            ("skipWaiting()", "skipWaiting present"),
            ("clients.claim()", "clients.claim present"),
            ("SKIP_WAITING", "user-confirmed update path"),
            ("range", "range-request passthrough"),
            ("offlinePage", "branded offline fallback"),
        ):
            (ok if needle in sw else warn)(label)
        if re.search(r"addEventListener\(\"install\"[^)]*\)\s*;\s*\n\s*self\.skipWaiting", sw):
            fail("install calls skipWaiting unconditionally (mid-session swap risk)")
        else:
            ok("install does not force skipWaiting")

    print("\n[5] Upgrade layer")
    for f in ("upgrade.js", "upgrade.css"):
        p = os.path.join(DOCS, f)
        (ok if os.path.exists(p) else fail)("%s present (%s)" % (f, f"{os.path.getsize(p):,} bytes" if os.path.exists(p) else "-"))
    up = open(os.path.join(DOCS, "upgrade.js"), encoding="utf-8").read() if os.path.exists(os.path.join(DOCS, "upgrade.js")) else ""
    for needle, label in (
        ("beforeinstallprompt", "install prompt"),
        ("navigator.storage", "storage guardian"),
        ("wakeLock", "screen wake lock"),
        ("MAMSS_SAVER_BLOCKED", "Data-Saver module pausing"),
        ("bank-raw.js", "bank rescue path"),
        ("SKIP_WAITING", "update confirmation"),
        ("MAMSS1.", "v44 sync-code export (gzip + base64url)"),
        ("MAMSS0.", "v44 uncompressed sync-code fallback"),
        ("applyBackup(", "v44 import reuses the app's own merge"),
        ("openMpSync", "v44 sync entry point"),
    ):
        (ok if needle in up else warn)("upgrade.js implements %s" % label)

    print("\n[6] Web app manifest")
    mp = os.path.join(DOCS, "manifest.webmanifest")
    if not os.path.exists(mp):
        fail("manifest.webmanifest missing")
    else:
        try:
            d = json.load(open(mp, encoding="utf-8"))
            ok("valid JSON manifest — %s" % d.get("short_name"))
            for k in ("name", "short_name", "start_url", "scope", "display", "background_color", "theme_color", "icons"):
                (ok if k in d else fail)("  field present: %s" % k)
            if d.get("start_url") != "./" or d.get("scope") != "./":
                warn("start_url/scope are not relative ('./') — required for a project-page install")
            for ic in d.get("icons", []):
                p = os.path.join(DOCS, ic["src"])
                if not os.path.exists(p):
                    fail("  icon missing: %s" % ic["src"])
                    continue
                sz = png_size(p) if ic["src"].endswith(".png") else jpeg_size(p)
                declared = tuple(int(x) for x in ic.get("sizes", "0x0").split("x"))
                (ok if sz == declared else fail)("  %s is %sx%s (declared %s)" % (ic["src"], sz[0], sz[1], ic.get("sizes")))
            for sc in d.get("screenshots", []):
                p = os.path.join(DOCS, sc["src"])
                if not os.path.exists(p):
                    fail("  screenshot missing: %s" % sc["src"])
                    continue
                sz = png_size(p) if sc["src"].endswith(".png") else jpeg_size(p)
                declared = tuple(int(x) for x in sc.get("sizes", "0x0").split("x"))
                (ok if sz == declared else fail)("  %s is %sx%s (declared %s)" % (sc["src"], sz[0], sz[1], sc.get("sizes")))
        except Exception as e:
            fail("manifest does not parse: %s" % e)

    print("\n[7] Question bank + rescue copy")
    bank = open(os.path.join(DOCS, "bank.js"), encoding="utf-8").read()
    m = re.search(r'QUIZ_B64="([^"]+)"', bank)
    if not m:
        fail("could not find the QUIZ_B64 payload in bank.js")
    else:
        raw = zlib.decompress(base64.b64decode(m.group(1))).decode("utf-8")
        ok("bank.js decodes (%s chars)" % f"{len(raw):,}")
        rec = os.path.join(DOCS, "bank-raw.js")
        if not os.path.exists(rec):
            warn("bank-raw.js missing — old browsers have no decode fallback")
        else:
            rs = open(rec, encoding="utf-8").read()
            mm = re.search(r"window\.__BANK_RAW_TXT=(.*);\n", rs, re.S)
            if not mm:
                fail("bank-raw.js has no __BANK_RAW_TXT payload")
            else:
                try:
                    txt = json.loads(mm.group(1))
                    (ok if txt == raw else fail)(
                        "bank-raw.js matches bank.js byte-for-byte (%s chars)" % f"{len(txt):,}"
                        if txt == raw else "bank-raw.js has DRIFTED from bank.js — regenerate it"
                    )
                except Exception as e:
                    fail("bank-raw.js payload does not parse: %s" % e)

    print("\n[8] Supporting files")
    for f in ("404.html", "robots.txt", "sitemap.xml", "social-preview.png", "icon-192.png", "icon-512.png"):
        (ok if os.path.exists(os.path.join(DOCS, f)) else warn)("%s present" % f)
    sm = open(os.path.join(DOCS, "sitemap.xml"), encoding="utf-8").read() if os.path.exists(os.path.join(DOCS, "sitemap.xml")) else ""
    if "mamss-prep/" in sm:
        ok("sitemap points at the project page")
        lm = re.findall(r"<lastmod>([^<]+)</lastmod>", sm)
        if lm and max(lm) < "2026-09-21":
            warn("sitemap lastmod is stale (%s)" % max(lm))
        elif lm:
            ok("sitemap lastmod is current (%s)" % max(lm))

    print("\n[9] Payload sizes (gzipped, as GitHub Pages ships them)")
    total = 0
    for f in ("index.html", "app.css", "upgrade.css", "upgrade.js", "sw.js", "bank.js"):
        p = os.path.join(DOCS, f)
        if not os.path.exists(p):
            continue
        raw = open(p, "rb").read()
        gz = len(zlib.compress(raw, 9))
        total += gz
        print("      %-16s %8s raw → %7s gzip" % (f, f"{len(raw):,}", f"{gz:,}"))
    print("      %-16s %8s" % ("first-load set", f"{total:,} bytes gzip"))

    print("\n[10] v45 Roll Call — school activation codes")
    cpath = os.path.join(DOCS, "codes.js")
    if os.path.exists(cpath):
        csrc = open(cpath, encoding="utf-8").read()
        m = re.search(r'salt:"([0-9a-f]{8,32})"', csrc)
        pol = re.search(r'policy:"(codes|open)"', csrc)
        lst = re.findall(r'"([0-9a-f]{64})"', csrc)
        cnt = re.search(r'count:(\d+)', csrc)
        (ok if m else fail)("codes.js carries a %s-hex salt" % (len(m.group(1)) if m else "MISSING"))
        (ok if pol else fail)("codes.js declares a policy (%s)" % (pol.group(1) if pol else "MISSING"))
        if cnt and lst:
            (ok if int(cnt.group(1)) == len(lst) else fail)(
                "codes.js count matches the hash list (%d)" % len(lst))
        else:
            fail("codes.js hash list could not be read")
        (ok if len(csrc) < 60000 else warn)("codes.js stays small (%s bytes)" % f"{len(csrc):,}")

        # v47.1 — the school ledger (Supabase) live in codes.js
        led = re.search(r'ledger:\{url:"(https://[^"]+\.supabase\.co)",key:"([^"]+)"\}', csrc)
        (ok if led else warn)("codes.js: school ledger %s" % ("LIVE → " + led.group(1) if led else "not configured (per-device mode)"))
        (ok if led and led.group(2).startswith("sb_publishable_") else fail)(
            "codes.js: ledger key is a publishable (public-by-design) key")
        (fail if ("sb_secret" in csrc or "service_role" in csrc or csrc.count("eyJhbGciOiJI")) else ok)(
            "codes.js: no secret key material anywhere")

        # the plaintext slips must never reach the published site
        leak = re.search(r'MAMSS-[2-9A-HJ-NP-Z]{6}-20\d\d', csrc)
        (fail if leak else ok)("codes.js holds hashes only — no plaintext slip%s" %
                               ((" (%s)" % leak.group(0)) if leak else ""))
        priv = os.path.join(ROOT, "tools", "private")
        issued = []
        if os.path.isdir(priv):
            for fn in sorted(os.listdir(priv)):
                if fn.endswith(".csv"):
                    for line in open(os.path.join(priv, fn), encoding="utf-8").read().splitlines()[1:]:
                        c = (line.split(",")[0] or "").strip()
                        if c.startswith("MAMSS-"):
                            issued.append(c)
            if issued:
                docs_blob = ""
                for fn in os.listdir(DOCS):
                    if fn.endswith((".html", ".js", ".css")):
                        docs_blob += open(os.path.join(DOCS, fn), encoding="utf-8", errors="ignore").read()
                norm = re.sub(r"[^A-Z0-9]", "", docs_blob.upper())
                bad = [c for c in issued if re.sub(r"[^A-Z0-9]", "", c.upper()) in norm]
                (fail if bad else ok)(
                    "none of the %d issued slips appear anywhere in docs/%s" %
                    (len(issued), (" — LEAKED: %s" % bad[:3]) if bad else ""))
                ok("private plaintext lives only in tools/private/ (%d slips on file)" % len(issued))
            else:
                warn("tools/private/ has no CSV — nothing to cross-check")
        else:
            warn("tools/private/ absent on this machine (fine for CI; issuer keeps it offline)")
        gi = open(os.path.join(ROOT, ".gitignore"), encoding="utf-8").read() if os.path.exists(os.path.join(ROOT, ".gitignore")) else ""
        (ok if "tools/private/" in gi else fail)(".gitignore keeps tools/private/ out of the repo")
    else:
        fail("docs/codes.js is missing — run tools/issue_codes.py")

    usrc = open(os.path.join(DOCS, "upgrade.js"), encoding="utf-8").read()
    for needle, why in (("MAMSS_ACT", "gate exposes the activation API"),
                        ("nssc_act_used", "single-use-per-device ledger"),
                        ('CODES.list.indexOf(h) === -1', "codes are checked against the hash list"),
                        ("CODES_STATE = \"missing\"", "fail-open when the list cannot be fetched"),
                        ("crypto.subtle.digest", "SHA-256 via WebCrypto")):
        (ok if needle in usrc else fail)("upgrade.js: %s" % why)
    isrc = open(os.path.join(DOCS, "index.html"), encoding="utf-8").read()
    for needle, why in (('id="mpLock"', "activation lock is static markup (no flash)"),
                        ("mp-codes-pending", "provisional lock before first paint"),
                        ('id="mpLockBtn"', "lock exposes an activate button"),
                        ('html.mp-codes-pending:not(.mp-code-ok)', "critical CSS hides guest/Google paths until a code lands")):
        (ok if needle in isrc else fail)("index.html: %s" % why)
    for needle, why in (("ledgerCfg", "Supabase ledger config reader"),
                        ("ledgerClaim", "insert-once claim against the ledger"),
                        ("syncPendingLedger", "offline provisional reconciliation"),
                        ('r: "elsewhere"', "cross-device refusal path")):
        (ok if needle in usrc else fail)("upgrade.js: %s" % why)
    (ok if os.path.exists(os.path.join(ROOT, "tools", "supabase_schema.sql")) else fail)(
        "tools/supabase_schema.sql ships the RLS schema")
    (ok if "scheduleRetry" in usrc and "listUnreachable" in usrc else fail)(
        "upgrade.js: unreachable code list retries instead of opening the door")
    (ok if 'CODES_STATE = "missing"; releaseLock()' not in usrc else fail)(
        "upgrade.js: the old fail-open path is gone")
    (ok if "(!u&&!a)" not in isrc and 'id="mpLockReveal"' in isrc else fail)(
        "index.html: pre-paint lock keyed on activation only (no signed-in bypass)")
    swsrc = open(os.path.join(DOCS, "sw.js"), encoding="utf-8").read()
    _swm = re.search(r'"-v(\d+)"', swsrc)
    SWV = int(_swm.group(1)) if _swm else 0   # numeric cache-key version, so "vN+" checks survive future bumps
    _vm = re.search(r"var V = (\d+), NAME", usrc)
    VP = int(_vm.group(1)) if _vm else 0      # numeric app version — same bump-proofing
    def dockcols(src):
        i = src.find(".study-app .studio-dock {")
        seg = src[i:i + 500] if i >= 0 else src
        m = re.search(r"repeat\((\d+), minmax", seg)
        return int(m.group(1)) if m else 0
    (ok if '"./codes.js"' in swsrc else fail)("service worker precaches codes.js (works offline)")
    mk = re.search(r'"-v(\d+)"', swsrc)
    (ok if mk and int(mk.group(1)) >= 45 else fail)(
        "worker cache key at v%s (>= v45)" % (mk.group(1) if mk else "?"))


    print("\n[11] v46 Trim — redesign-shell performance & PWA correctness")
    if '"./", "./index.html"' in swsrc:
        fail("sw.js precaches ./ AND ./index.html (duplicate document cache)")
    else:
        ok("sw.js precaches the document once")
    (ok if 'cache:"reload"' not in swsrc and "cache: \"reload\"" not in swsrc else fail)(
        "sw.js install does not force a second download (no cache:reload)")
    (ok if SWV >= 51 else fail)("sw key at v51+")
    n_pre = len(re.findall(r'rel="preload"', isrc))
    (ok if n_pre >= 2 else warn)("index.html preloads above-the-fold assets (%d)" % n_pre)
    (ok if 'rel="preconnect"' in isrc else warn)("index.html preconnects to the Google sign-in origin")
    (ok if 'as="font"' in isrc else warn)("brand fonts are preloaded")
    print("\n[12] v47 World-First Studio — Oral Examiner + Memory Palace")
    expath = os.path.join(DOCS, "exclusive.js")
    if not os.path.exists(expath):
        fail("docs/exclusive.js is missing")
    else:
        exsrc = open(expath, encoding="utf-8").read()
        for needle, why in (
            ("window.openMpOral", "oral examiner entry point"),
            ("window.openMpPalace", "memory palace entry point"),
            ("MP_EXCLUSIVE", "studio API surface"),
            ("function coverage", "shared mark-point coverage scorer"),
            ("speechSynthesis", "questions are spoken aloud (TTS)"),
            ("SpeechRecognition", "spoken answers via Web Speech API"),
            ("nssc_oral", "oral attempts logged on-device"),
            ("nssc_palaces", "palace results stored on-device"),
            ("ROOMS", "method-of-loci room list"),
            ("relaxed", "formula points get the relaxed-token fallback"),
        ):
            (ok if needle in exsrc else fail)("exclusive.js: %s" % why)
    (ok if '"./exclusive.js"' in swsrc else fail)("service worker precaches exclusive.js (offline studio)")
    (ok if SWV >= 52 else fail)("sw cache key bumped to v52+")
    (ok if "loadExclusive" in usrc else fail)("upgrade.js lazy-loads the studio (no cost until opened)")
    (ok if "mpOralOpen" in usrc and "mpPalOpen" in usrc else fail)("hub rows wire both studio doors")
    (ok if re.search(r"var V = (4[7-9]|[5-9]\d|\d{3,})", usrc) else fail)("upgrade.js version bumped to 47+ (what's-new fires)")
    cssrc = open(os.path.join(DOCS, "upgrade.css"), encoding="utf-8").read()
    (ok if ".mp-exclusive" in cssrc else fail)("upgrade.css carries self-contained studio overlay styles")

    print("\n[13] v48 Recall Arena + Forgetting-Curve Autopilot")
    if os.path.exists(expath):
        for needle, why in (
            ("window.openMpArena", "recall arena entry point"),
            ("window.openMpAutopilot", "autopilot entry point"),
            ("recordStudyEvent", "every studio result feeds the scheduler"),
            ("nssc_arena", "blurt results stored on-device"),
            ("nssc_autopilot", "Ebbinghaus schedule stored on-device"),
            ("nssc_auto_events", "study-event log (capped)"),
            ("[1, 3, 7, 14, 30]", "review intervals 1/3/7/14/30 days"),
            ("seedAutopilot", "existing oral+palace history is imported once"),
            ("svg", "forgetting curve drawn as inline SVG (no assets)"),
        ):
            (ok if needle in exsrc else fail)("exclusive.js: %s" % why)
    (ok if "mpArenaOpen" in usrc and "mpAutoOpen" in usrc else fail)("hub rows wire arena + autopilot")
    (ok if re.search(r"var V = (4[8-9]|[5-9]\d)", usrc) else fail)("upgrade.js version bumped to 48+")
    (ok if SWV >= 53 else fail)("sw cache key bumped to v53+")
    (ok if ".mp-ex-due" in cssrc and ".mp-ex-curve" in cssrc else fail)("studio styles extended for due list + curve")

    print("\n[14] v49 Prestige — membership card + WhatsApp activation contact")
    (ok if "wa.me/2348056787685" in isrc else fail)("lock screen carries the WhatsApp activation contact")
    (ok if "08056787685" in isrc else fail)("lock screen shows the number in local format")
    (ok if "PRESTIGE EDITION" in isrc else fail)("lock screen declares the Prestige Edition")
    (ok if "mpPrestigeCard" in usrc else fail)("hub renders the gold membership card")
    (ok if "ax.name = name" in usrc else fail)("the member's name is stamped on the activation record")
    (ok if "wa.me/2348056787685" in usrc else fail)("App Centre carries the WhatsApp contact too")
    (ok if "Ledger-verified" in usrc and "Provisional" in usrc else fail)("the card states the license honestly (verified/provisional)")
    (ok if re.search(r"var V = (49|[5-9]\d)", usrc) else fail)("upgrade.js version bumped to 49+")
    (ok if ".mp-prestige" in cssrc and ".mp-pres-contact" in cssrc else fail)("prestige styles are self-contained in upgrade.css")
    (ok if SWV >= 54 else fail)("sw cache key bumped to v54+")

    print("\n[15] v50 Exam Command Center — heatmap + generated study plan")
    if os.path.exists(expath):
        for needle, why in (
            ("window.openMpCommand", "command center entry point"),
            ("nssc_exam", "exam date stored on-device"),
            ("nssc_plan", "generated plan stored on-device"),
            ("genPlan", "day-by-day plan generator"),
            ("[1, 3, 7]", "Ebbinghaus re-reviews at +1/+3/+7 days"),
            ("hm-bad", "mastery heatmap classes"),
            ("mp-printing", "print stylesheet hook"),
            ("weakest known first", "weakest known topics scheduled first"),
        ):
            (ok if needle in exsrc else fail)("exclusive.js: %s" % why)
    (ok if "mpCmdOpen" in usrc else fail)("hub row wires the command center")
    (ok if re.search(r"var V = ([5-9]\d|\d{3,})", usrc) else fail)("upgrade.js version bumped to 50+")
    (ok if SWV >= 55 else fail)("sw cache key bumped to v55+")
    (ok if ".mp-hm-grid" in cssrc and "@media print" in cssrc else fail)("heatmap + print styles in upgrade.css")

    print("\n[16] v51 'Why MAMSS PREP' prospectus page")
    wpath = os.path.join(DOCS, "why.html")
    if not os.path.exists(wpath):
        fail("docs/why.html is missing")
    else:
        wsrc = open(wpath, encoding="utf-8").read()
        (ok if "wa.me/2348056787685" in wsrc else fail)("why.html: WhatsApp activation CTA")
        (ok if 'property="og:image"' in wsrc and "social-preview.png" in wsrc else fail)("why.html: shareable OG image tag")
        (ok if "issued, not sold" in wsrc.lower() else fail)("why.html: the positioning line")
        (ok if wsrc.count("world-first") + wsrc.count("rare") >= 4 else fail)("why.html: the five tools are presented")
        (ok if "Khan Academy" in wsrc and "Anki" in wsrc else fail)("why.html: honest global audit table")
        (ok if "stylesheet" not in wsrc.split("<style")[0].split("</head>")[0].replace('<link rel="icon"','') or 'href="http' not in wsrc else fail)("why.html: self-contained (no external css/js)")
    (ok if "mpLockWhy" in isrc and 'href="why.html"' in isrc else fail)("lock screen links to the prospectus")
    (ok if "mpWhyLink" in usrc else fail)("App Centre links to the prospectus")
    (ok if '"./why.html"' in swsrc else fail)("sw.js precaches why.html (offline share)")
    sm = os.path.join(DOCS, "sitemap.xml")
    (ok if os.path.exists(sm) and "why.html" in open(sm, encoding="utf-8").read() else fail)("sitemap lists why.html")
    (ok if re.search(r"var V = (5[3-9]|[6-9]\d|\d{3,})", usrc) else fail)("upgrade.js version bumped to 53+")
    (ok if re.search(r'"-v(5[8-9]|[6-9]\d)"', swsrc) else fail)("sw cache key bumped to v58+")

    print("\n[17] v52 WAEC-standard question bank")
    fixer = os.path.join(ROOT, "tools", "waec_fix.py")
    auditor = os.path.join(ROOT, "tools", "waec_audit.py")
    (ok if os.path.exists(fixer) else fail)("tools/waec_fix.py present (the surgical fixer)")
    (ok if os.path.exists(auditor) else fail)("tools/waec_audit.py present (the regression linter)")
    r = subprocess.run([sys.executable, auditor, "--quiet"], capture_output=True, text=True)
    (ok if r.returncode == 0 else fail)(
        "waec_audit CLEAN (hash, format contract, all defect families, bank-raw mirror, edits record)"
        if r.returncode == 0 else
        "waec_audit FAILED: " + (r.stdout + r.stderr).strip().splitlines()[-1][:120])
    bsrc = open(os.path.join(DOCS, "bank.js"), encoding="utf-8").read()
    (ok if re.search(r'QUIZ_HASH="[0-9a-f]{64}"', bsrc) else fail)("bank.js carries a 64-hex QUIZ_HASH")
    esrc = open(os.path.join(DOCS, "quiz", "edits.json"), encoding="utf-8").read()
    (ok if "NOT associated with" in esrc and "best describes" in esrc else fail)(
        "edits.json holds the WAEC rewrite record")

    print("\n[18] v53 Adaptive Engine (item 1 of the school's roadmap)")
    for needle, label in [
        ("var ADAPT_GAP=[0,1,2,4,7,14,30]", "Leitner interval schedule"),
        ("function adaptStore()", "adaptive store with lossless migration"),
        ("function adaptUpdate()", "per-submit topic box/pace update"),
        ("function adaptRank(", "weakness ranker (accuracy + box + overdue + pace)"),
        ("adaptTagQuiz(),recordTopicStats(),adaptUpdate()", "submit-chain hook (tags real topics)"),
        ("weighted to your weakest topics", "Daily Challenge weighted toast"),
        ("memory box ", "AI Coach shows the memory box"),
        ("Speed drill", "AI Coach pace suggestion"),
    ]:
        (ok if needle in isrc else fail)("index.html: " + label)
    (ok if isrc.count("adaptRank(") >= 4 else fail)("adaptRank is wired into daily + coach (>=4 call sites)")
    (ok if "nssc_adaptive_" in isrc else fail)("adaptive data keyed per profile (nssc_adaptive_<uid>)")
    (ok if re.search(r"var V = (5[3-9]|[6-9]\d|\d{3,})", usrc) else fail)("upgrade.js V=53+ (Adaptive Engine)")
    (ok if "Adaptive Engine" in usrc else fail)("whats-new announces the Adaptive Engine")

    print("\n[19] v54 Live CBT Hall (teacher-posted real-time exams)")
    codesrc = open(os.path.join(DOCS, "codes.js"), encoding="utf-8").read()
    cbtsrc_path = os.path.join(DOCS, "cbt.js")
    (ok if os.path.exists(cbtsrc_path) else fail)("docs/cbt.js present")
    cbtsrc = open(cbtsrc_path, encoding="utf-8").read() if os.path.exists(cbtsrc_path) else ""
    studysrc = open(os.path.join(DOCS, "ui", "study.js"), encoding="utf-8").read()
    atelier = open(os.path.join(DOCS, "ui", "atelier.css"), encoding="utf-8").read()
    schema = open(os.path.join(ROOT, "tools", "cbt_schema.sql"), encoding="utf-8").read() \
        if os.path.exists(os.path.join(ROOT, "tools", "cbt_schema.sql")) else ""
    issuer = open(os.path.join(ROOT, "tools", "issue_codes.py"), encoding="utf-8").read()

    # --- codes.js: true batch ranges + teacher batch, 500 legacy hashes untouched ---
    (ok if "batchRanges:[[0,120],[120,500],[500,510]]" in codesrc else fail)("codes.js: batchRanges maps the 3 batches by index")
    (ok if '"TEACHER-1"' in codesrc else fail)("codes.js: TEACHER-1 batch registered")
    (ok if "count:510" in codesrc else fail)("codes.js: count 510 (500 student + 10 teacher)")
    (ok if len(re.findall(r'"[0-9a-f]{64}"', codesrc)) == 510 else fail)("codes.js: exactly 510 salted hashes")
    (ok if re.search(r'ledger:\{url:"https://[^"]+\.supabase\.co",key:"sb_publishable_', codesrc) else fail)("codes.js: ledger config intact (CBT reuses it — no new secrets)")
    (ok if not re.search(r'"[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}"', codesrc) else fail)("codes.js: no plaintext slip strings (XXXX-XXXX)")

    # --- upgrade.js: role stamping + API ---
    (ok if VP >= 54 and "Live CBT Hall" in usrc and "Live CBT Cameras" in usrc else fail)("upgrade.js: V=54+ shipped (Live CBT Hall + Cameras entries retained)")
    (ok if "function batchOf(h)" in usrc and "CODES.batchRanges" in usrc else fail)("upgrade.js: batchOf() resolves the TRUE batch via batchRanges")
    (ok if usrc.count("role: roleOfHash(h)") == 3 else fail)("upgrade.js: all 3 nssc_act stamps carry role (got %d)" % usrc.count("role: roleOfHash(h)"))
    (ok if "batch: batchOf(h) }])" in usrc else fail)("upgrade.js: ledger claim posts the true batch")
    (ok if "teacher: function ()" in usrc and "device: deviceId" in usrc else fail)("upgrade.js: MAMSS_ACT exposes teacher() + device()")
    (ok if "Live CBT Hall" in usrc and "6-character session code" in usrc else fail)("whats-new announces the Live CBT Hall")

    # --- cbt.js: the hall itself ---
    (ok if "window.MAMSS_CBT" in cbtsrc else fail)("cbt.js: exports MAMSS_CBT")
    (ok if "MAMSS_CODES.ledger" in cbtsrc or "MAMSS_CODES && window.MAMSS_CODES.ledger" in cbtsrc else fail)("cbt.js: backend config comes from the existing ledger (no new keys)")
    for t in ("cbt_sessions", "cbt_attempts", "cbt_answers"):
        (ok if t in cbtsrc else fail)("cbt.js: uses table " + t)
    (ok if "realtime/v1/websocket" in cbtsrc and "phx_join" in cbtsrc else fail)("cbt.js: Supabase Realtime broadcast client (Phoenix protocol)")
    (ok if "POLL_MS = 2500" in cbtsrc and "__CBT_FORCE_POLL" in cbtsrc else fail)("cbt.js: 2.5 s polling backbone + test hook")
    (ok if "ends_at" in cbtsrc and "deadlineLeft" in cbtsrc else fail)("cbt.js: deadline derives from the server row (refresh cannot reset)")
    (ok if "INTEGRITY_LIMIT = 5" in cbtsrc and "INTEGRITY_GRACE_MS = 1200" in cbtsrc else fail)("cbt.js: forgiving integrity (1.2 s grace, auto-submit at 5)")
    (ok if '"copy", "cut", "contextmenu"' in cbtsrc and "id.readable" in cbtsrc else fail)("cbt.js: copy-block on questions, lifted for Readable a11y mode")
    (ok if "status === 409" in cbtsrc else fail)("cbt.js: 409 handled (duplicate session code / attempt / answer)")
    (ok if "being set up" in cbtsrc and "PGRST205" in cbtsrc else fail)("cbt.js: degrades to a 'being set up' card before the SQL is run")
    (ok if "gradePaper" in cbtsrc else fail)("cbt.js: results page re-grades from server rows (client score is not trusted)")
    r = subprocess.run(["node", "--check", cbtsrc_path], capture_output=True, text=True)
    (ok if r.returncode == 0 else fail)("cbt.js: node --check clean")

    # --- wiring ---
    (ok if 'id="viewCbt"' in isrc and 'id="cbtRoot"' in isrc else fail)("index.html: viewCbt section + cbtRoot host")
    (ok if 'data-view="cbt" href="#viewCbt"' in isrc else fail)("index.html: desktop nav link")
    (ok if 'data-view="cbt" href="#cbt"' in isrc else fail)("index.html: mobile dock link")
    (ok if 'cbt: "Live CBT Hall"' in studysrc else fail)("study.js: titles whitelist includes cbt")
    (ok if 'load("cbt.js")' in studysrc and "MAMSS_CBT.mount()" in studysrc else fail)("study.js: navigate() lazy-loads + mounts the hall")
    (ok if SWV >= 59 else fail)("sw.js: cache bumped to -v59+")
    (ok if '"./cbt.js"' in swsrc else fail)("sw.js: cbt.js precached")
    (ok if dockcols(atelier) >= 5 else fail)("atelier.css: mobile dock widened to 5+ tabs (%d now)" % dockcols(atelier))

    # --- schema + issuer ---
    (ok if all(t in schema for t in ("create table if not exists public.cbt_sessions", "create table if not exists public.cbt_attempts", "create table if not exists public.cbt_answers")) else fail)("cbt_schema.sql: the 3 tables")
    (ok if "primary key (session_code, device_id)" in schema and "primary key (session_code, device_id, q_idx)" in schema else fail)("cbt_schema.sql: PKs enforce one-attempt + no-going-back")
    (ok if "cbt_session_stamp" in schema and "cbt_attempt_stamp" in schema else fail)("cbt_schema.sql: server-authoritative time triggers")
    (ok if schema.count("enable row level security") == 3 else fail)("cbt_schema.sql: RLS on all 3 tables")
    (ok if "for delete" not in schema else fail)("cbt_schema.sql: no delete policies (rows are permanent)")
    (ok if "supabase_realtime" in schema else fail)("cbt_schema.sql: realtime publication")
    (ok if "--seed-ranges" in issuer and "batchRanges" in issuer else fail)("issue_codes.py: maintains batchRanges (--seed-ranges migration)")

    print("\n[20] v55 Live CBT Cameras (webcam monitoring, ephemeral by design)")
    (ok if VP >= 55 and "Live CBT Cameras" in usrc else fail)("upgrade.js: V=55+ with the Live CBT Cameras entry retained")
    (ok if "Live CBT Cameras" in usrc and "never recorded and never stored" in usrc else fail)("whats-new announces the cameras with the privacy promise")
    _cvm = re.search(r'var VERSION = "(\d+)"', cbtsrc)
    CBTVER = int(_cvm.group(1)) if _cvm else 0
    (ok if CBTVER >= 55 else fail)("cbt.js: VERSION 55+ (%d now)" % CBTVER)
    (ok if "getUserMedia" in cbtsrc and "facingMode: \"user\"" in cbtsrc and "audio: false" in cbtsrc else fail)("cbt.js: video-only getUserMedia (front camera, no audio)")
    (ok if "__CBT_WS_URL" in cbtsrc and "__CBT_CAM_MS" in cbtsrc else fail)("cbt.js: WS-URL + frame-interval test hooks")
    (ok if "CAM_INTERVAL = 12000" in cbtsrc else fail)("cbt.js: one snapshot every 12 s")
    (ok if "if (document.hidden) return;" in cbtsrc else fail)("cbt.js: hidden tabs broadcast nothing (integrity log covers that window)")
    (ok if "26000" in cbtsrc and "192, 144, 0.4" in cbtsrc else fail)("cbt.js: adaptive downscale keeps frames under the realtime message cap")
    (ok if all(x in cbtsrc for x in ('stampWebcam("on")', 'stampWebcam(denied ? "denied" : "unavailable")', 'stampWebcam("skipped")')) else fail)("cbt.js: attempt row records only a status word (on/denied/unavailable/skipped)")
    (ok if "renderCamGate" in cbtsrc and "camProceed" in cbtsrc else fail)("cbt.js: required mode gates the runner behind the CAMERA CHECK")
    (ok if "never recorded and never stored" in cbtsrc and "see yourself here first" in cbtsrc else fail)("cbt.js: gate states the plain-language privacy promise + self-preview")
    (ok if cbtsrc.count("stopCam()") >= 4 else fail)("cbt.js: camera stopped at submit, finish, leave and tab-reset (%d stopCam sites)" % cbtsrc.count("stopCam()"))
    (ok if "cbtWebcam" in cbtsrc and "Webcam monitoring" in cbtsrc else fail)("cbt.js: teacher chooses off/optional/required per paper")
    (ok if "webcam: d.webcam" in cbtsrc else fail)("cbt.js: goLive persists settings.webcam")
    (ok if "camFrames" in cbtsrc and "updateCams" in cbtsrc and "cbtCams" in cbtsrc else fail)("cbt.js: monitor renders live camera tiles")
    (ok if cbtsrc.count("camCell(") >= 2 else fail)("cbt.js: webcam status shown on roster AND results")
    (ok if "cam: function ()" in cbtsrc and "cams: function ()" in cbtsrc else fail)("cbt.js: _test cam hooks")
    (ok if "webcam       text not null default ''" in schema else fail)("cbt_schema.sql: attempts carry the webcam status column")
    (ok if "add column if not exists webcam" in schema else fail)("cbt_schema.sql: one-line migration for early v54 adopters")
    (ok if SWV >= 60 else fail)("sw.js: cache bumped to -v60+")
    r = subprocess.run(["node", "--check", cbtsrc_path], capture_output=True, text=True)
    (ok if r.returncode == 0 else fail)("cbt.js: node --check clean (v55)")

    print("\n[21] v56 Cloud Sync (Supabase, Google ID token, lossless merge)")
    syncp = os.path.join(DOCS, "sync.js")
    (ok if os.path.exists(syncp) else fail)("docs/sync.js exists")
    syncsrc = open(syncp, encoding="utf-8").read() if os.path.exists(syncp) else ""
    studysrc = open(os.path.join(DOCS, "ui", "study.js"), encoding="utf-8").read()
    atsrc = open(os.path.join(DOCS, "ui", "atelier.css"), encoding="utf-8").read()
    sschema_p = os.path.join(ROOT, "tools", "sync_schema.sql")
    (ok if os.path.exists(sschema_p) else fail)("tools/sync_schema.sql exists")
    sschema = open(sschema_p, encoding="utf-8").read() if os.path.exists(sschema_p) else ""
    (ok if 'var VERSION = "56"' in syncsrc else fail)("sync.js: VERSION 56")
    (ok if all(x in syncsrc for x in ("boot: boot", "mount: mount", "onCred: onCred", "detach: function", "_test:")) else fail)("sync.js: public surface (boot/mount/onCred/detach/_test)")
    (ok if "SYNC_STATIC" in syncsrc and "SYNC_PREFIX" in syncsrc else fail)("sync.js: explicit allowlist (static keys + prefix families)")
    (ok if all(('"%s"' % k) in syncsrc.split("NEVER_EXACT = [")[1].split("];")[0] for k in ("nssc_act", "nssc_act_used", "nssc_devid", "nssc_user", "nssc_gcred")) else fail)("sync.js: never-list hard-blocks activation + identity keys")
    (ok if 'NEVER_PREFIX = ["nssc_sync_", "nssc_mp_"' in syncsrc else fail)("sync.js: never-list covers sync's own state + UI one-shots")
    (ok if syncsrc.index("NEVER_EXACT.indexOf(k)") < syncsrc.index("SYNC_STATIC.indexOf(k)") else fail)("sync.js: never-list is checked BEFORE the allowlist (belt & braces)")
    (ok if '"nssc_act"' not in syncsrc.split("SYNC_STATIC = [")[1].split("];")[0] else fail)("sync.js: allowlist itself contains no activation key")
    (ok if "grant_type=id_token" in syncsrc and "grant_type=refresh_token" in syncsrc else fail)("sync.js: Supabase ID-token sign-in + refresh flow (no new SDK)")
    (ok if "/rest/v1/user_sync" in syncsrc and "&rev=eq." in syncsrc else fail)("sync.js: pushes with optimistic locking (rev=eq.N)")
    (ok if "23505" in syncsrc else fail)("sync.js: handles the duplicate-row race (POST 409 → PATCH path)")
    (ok if "function localChanged()" in syncsrc and "function flushDeferred()" in syncsrc else fail)("sync.js: change detection + deferred-apply queue")
    (ok if 'dataset.view === "practice"' in syncsrc else fail)("sync.js: never applies cloud data mid-practice")
    (ok if "Math.max(a, b)" in syncsrc and "unionArr" in syncsrc and "!!(a || b)" in syncsrc else fail)("sync.js: lossless merge (numbers max, arrays union, booleans OR)")
    (ok if "function wipeCloud()" in syncsrc and "keys: {}" in syncsrc else fail)("sync.js: explicit cloud wipe pushes an EMPTY blob (rows can't be deleted)")
    (ok if "2800000" in syncsrc else fail)("sync.js: blob size guard below the DB check constraint")
    (ok if 'id="viewSync"' in isrc and 'id="syncRoot"' in isrc and 'id="syncTitle"' in isrc else fail)("index.html: Cloud Sync view section")
    (ok if 'data-view="sync" href="#viewSync"' in isrc else fail)("index.html: sidebar nav entry")
    (ok if 'data-view="sync" href="#sync"' in isrc else fail)("index.html: mobile dock entry")
    (ok if 'symbol id="i-cloud"' in isrc else fail)("index.html: cloud sprite icon")
    (ok if 'store.set("nssc_gcred",{jwt:t.credential' in isrc else fail)("index.html: sign-in stores the raw Google credential for sync")
    (ok if "MAMSS_SYNC.onCred&&MAMSS_SYNC.onCred(t.credential)" in isrc else fail)("index.html: sign-in notifies Cloud Sync (silent connect)")
    (ok if "MAMSS_SYNC.detach&&MAMSS_SYNC.detach()" in isrc and isrc.count('store.del("nssc_gcred")') == 2 else fail)("index.html: app sign-out detaches sync + clears the credential")
    (ok if 'sync: "Cloud Sync",' in studysrc else fail)("study.js: titles include sync")
    (ok if 'if (view === "sync")' in studysrc and 'await load("sync.js")' in studysrc else fail)("study.js: lazy-loads + mounts sync.js for the tab")
    (ok if "MAMSS_SYNC.boot()" in studysrc else fail)("study.js: background boot at startup (silent, guests unaffected)")
    (ok if dockcols(atsrc) >= 6 else fail)("atelier.css: dock widened to 6 columns (Cloud Sync tab)")
    (ok if VP >= 56 and "Cloud Sync" in usrc else fail)("upgrade.js: V=56+ with the Cloud Sync entry retained")
    (ok if "What leaves it: a progress summary your school&#39;s dashboard can read" in usrc else fail)("upgrade.js: whats-new tagline is honest about uploads now (v62 wording)")
    (ok if "activation code is NEVER uploaded" in usrc else fail)("upgrade.js: v56 entry states the activation guarantee")
    (ok if SWV >= 61 else fail)("sw.js: cache bumped to -v61+")
    (ok if '"./sync.js"' in swsrc else fail)("sw.js: sync.js precached")
    (ok if "create table if not exists public.user_sync" in sschema else fail)("sync_schema.sql: user_sync table")
    (ok if "uid        uuid primary key references auth.users" in sschema else fail)("sync_schema.sql: row keyed to the Supabase Auth user")
    (ok if sschema.count("uid = (select auth.uid())") == 4 and "to authenticated" in sschema else fail)("sync_schema.sql: owner-only RLS on select/insert/update (authenticated)")
    (ok if "for delete" not in sschema else fail)("sync_schema.sql: no delete policy (history cannot be erased)")
    (ok if "3000000" in sschema else fail)("sync_schema.sql: blob size check constraint (3 MB)")
    (ok if "648029341991-3onmssrflm9jqvmjbjtsl1ebag4k9afi" in sschema and "Authorized Client IDs" in sschema else fail)("sync_schema.sql: dashboard step documented with the site's own client ID (no secret)")
    (ok if "new.rev <= old.rev" in sschema else fail)("sync_schema.sql: trigger refuses a backwards rev")
    r = subprocess.run(["node", "--check", syncp], capture_output=True, text=True)
    (ok if r.returncode == 0 else fail)("sync.js: node --check clean (v56)")

    print("\n[22] v57 School Dashboard (whole-school aggregates for teachers)")
    (ok if CBTVER >= 57 else fail)("cbt.js: VERSION 57+")
    (ok if "function renderSchool()" in cbtsrc and "function schoolStats(" in cbtsrc and "function schoolFetch()" in cbtsrc else fail)("cbt.js: dashboard render + pure aggregator + fetch")
    (ok if 'data-ctab="school">4 · School</button>' in cbtsrc else fail)("cbt.js: fourth console tab (4 · School)")
    (ok if 'else if (cons.tab === "school") renderSchool();' in cbtsrc and 'if (cons.tab !== "school") dashStop();' in cbtsrc else fail)("cbt.js: dispatch + timer hygiene on tab switch")
    (ok if "dashStop();" in cbtsrc.split("function mount()")[1].split("function ")[0] else fail)("cbt.js: mount() stops the dashboard timer")
    (ok if "30000" in cbtsrc and "refreshes itself every 30 s" in cbtsrc else fail)("cbt.js: 30 s auto-refresh while the tab is open")
    (ok if "code_redemptions?select=batch,redeemed_at" in cbtsrc else fail)("cbt.js: activation roll-out reads the ledger (batch + date only — no names, no hashes)")
    (ok if "function batchSizes()" in cbtsrc and "batchRanges" in cbtsrc else fail)("cbt.js: batch totals from MAMSS_CODES (510 = 120+380+10)")
    (ok if "Since v62 every activated device publishes a progress report" in cbtsrc and "Cloud Sync blob never leave" in cbtsrc else fail)("cbt.js: honest v62 note (report published, Cloud Sync blob never aggregated)")
    (ok if "data-dash-open" in cbtsrc and 'cons.tab = "results"' in cbtsrc else fail)("cbt.js: one-click drill-down into the existing per-paper results")
    (ok if "cbtDashCsv" in cbtsrc and "cbtDashWa" in cbtsrc and "mamss-school-dashboard.csv" in cbtsrc else fail)("cbt.js: whole-school CSV export + WhatsApp summary")
    (ok if cbtsrc.count("cp.catch") + cbtsrc.count("ci.catch") >= 3 else fail)("cbt.js: clipboard promise rejections handled (page-error fix, 3 sites)")
    (ok if ".cbt-hbar{" in cbtsrc and ".cbt-chip{" in cbtsrc else fail)("cbt.js: dashboard CSS (horizontal bars + stat chips)")
    (ok if "schoolStats: schoolStats" in cbtsrc and "dash: function ()" in cbtsrc else fail)("cbt.js: _test hooks for the aggregator")
    (ok if "being set up" in cbtsrc.split("function renderSchool")[1][:4000] else fail)("cbt.js: missing tables degrade to the setup note")
    (ok if VP >= 57 and "School Dashboard" in usrc else fail)("upgrade.js: app version 57+ (School Dashboard shipped)")
    (ok if "School Dashboard" in usrc and "activation roll-out" in usrc else fail)("upgrade.js: whats-new entry for the dashboard")
    (ok if SWV >= 62 else fail)("sw.js: cache bumped to -v62+")
    r = subprocess.run(["node", "--check", cbtsrc_path], capture_output=True, text=True)
    (ok if r.returncode == 0 else fail)("cbt.js: node --check clean (v57)")

    print("\n[23] v58 Question Pipeline (teachers feed questions in bulk; bank stays hash-locked)")
    (ok if CBTVER >= 58 else fail)("cbt.js: VERSION 58+")
    (ok if VP >= 58 and "Question Pipeline" in usrc else fail)("upgrade.js: V58+ \"Question Pipeline\" + whats-new entry")
    (ok if SWV >= 63 else fail)("sw.js: cache bumped to -v63+")
    (ok if 'data-ctab="pipeline">5 \u00b7 Pipeline</button>' in cbtsrc else fail)("cbt.js: fifth console tab (5 \u00b7 Pipeline)")
    (ok if 'else if (cons.tab === "pipeline") renderPipeline();' in cbtsrc else fail)("cbt.js: console dispatch")
    (ok if all(("function " + f) in cbtsrc for f in ("renderPipeline", "drawPipeline", "plSubmitHtml", "plReviewHtml", "plPoolHtml", "plWire", "plCheckRun", "plSendRun", "plReview", "plAddToDraft", "fetchQueue", "plValidate", "plParseDelim", "plRowsFromText", "plAnswerIdx", "plCtx", "plSay", "plSubTabs")) else fail)("cbt.js: all pipeline functions present")
    (ok if "question_queue?select=*" in cbtsrc and '"question_queue", { method: "POST"' in cbtsrc and "question_queue?id=eq." in cbtsrc else fail)("cbt.js: queue REST — GET list, POST bulk send, PATCH review")
    (ok if all(t in cbtsrc for t in ("SS1, SS2 or SS3", "A-D or 0-3", "options must be distinct", "all four options are required", "the stem is too short", "the stem is too long (1000 characters max)", "explanation is too long (600 characters max)")) else fail)("cbt.js: validator enforces the v54 rules + taxonomy + length caps")
    (ok if "already in the school queue" in cbtsrc and "already on your draft paper" in cbtsrc and "bank already contains this stem" in cbtsrc else fail)("cbt.js: triple duplicate guard (draft = error, queue = error, bank = warning)")
    (ok if cbtsrc.count("MECH_WARN.forEach") >= 2 else fail)("cbt.js: WAEC mechanics checker reused by the bulk validator")
    (ok if cbtsrc.count("determine|state|list|define") >= 2 else fail)("cbt.js: auto-punctuation rule reused (What\u2026 \u2192 ?, statement \u2192 .)")
    (ok if '"school" ? "school pool"' in cbtsrc and 'src: "school"' in cbtsrc else fail)("cbt.js: pool questions join drafts tagged src \"school\" and render as \"school pool\"")
    (ok if "question pipeline is <b>being set up</b>" in cbtsrc and "pipeline_schema.sql" in cbtsrc else fail)("cbt.js: missing table degrades to the honest setup note")
    (ok if "hash-locked" in cbtsrc else fail)("cbt.js: UI states the national bank is never touched")
    (ok if 'accept=".csv,.json,.txt"' in cbtsrc and "readAsText" in cbtsrc else fail)("cbt.js: file upload path (.csv/.json/.txt via FileReader)")
    (ok if "Why is this being rejected" in cbtsrc and "reviewed_by: me().name" in cbtsrc else fail)("cbt.js: rejections keep an audit note + reviewer stamp")
    (ok if "plValidate: plValidate" in cbtsrc and "plRowsFromText: plRowsFromText" in cbtsrc and "pipeline: function ()" in cbtsrc else fail)("cbt.js: _test hooks for parser + validator + state")
    pq = open(os.path.join(ROOT, "tools", "pipeline_schema.sql"), encoding="utf-8").read() \
        if os.path.exists(os.path.join(ROOT, "tools", "pipeline_schema.sql")) else ""
    (ok if "create table if not exists public.question_queue" in pq and "enable row level security" in pq else fail)("pipeline_schema.sql: table + RLS")
    (ok if all(t in pq for t in ('check (status in (\'pending\',\'approved\',\'rejected\'))', "check (cls in ('SS1','SS2','SS3'))", "jsonb_array_length(o) = 4", "check (a between 0 and 3)")) else fail)("pipeline_schema.sql: DB-level constraints mirror the client validator")
    (ok if pq.count("create policy") == 3 and "for delete" not in pq and "grant select, insert, update" in pq and "question_queue_status_idx" in pq else fail)("pipeline_schema.sql: read/insert/update policies (no delete \u2014 audit trail), grants, status index")
    mock = open(os.path.join(ROOT, "tools", "cbtmock.js"), encoding="utf-8").read() \
        if os.path.exists(os.path.join(ROOT, "tools", "cbtmock.js")) else ""
    (ok if "/rest/v1/question_queue" in mock else fail)("tools/cbtmock.js: question_queue mirror (GET/POST/PATCH)")

    print("\n[24] v59 Access & Speed (a11y + performance pass — zero axe violations)")
    (ok if VP >= 59 and "Access & Speed" in usrc else fail)("upgrade.js: V59+ \"Access & Speed\" + whats-new entry")
    (ok if SWV >= 64 else fail)("sw.js: cache bumped to -v64+")
    (ok if CBTVER >= 59 else fail)("cbt.js: VERSION 59+")
    idxsrc = open(idx_path, encoding="utf-8").read()
    (ok if 'class="mp-skip" href="#workspace"' in idxsrc and ".mp-skip:focus{left:0}" in idxsrc else fail)("index.html: skip link → #workspace, visible on focus")
    (ok if "color:#fff!important" in idxsrc else fail)("index.html: skip-link colors locked against the redesign's global link styles")
    (ok if 'rel="preconnect" href="https://mrhbuxsfhtqguxkxfczv.supabase.co"' in idxsrc else fail)("index.html: preconnect to the school Supabase origin (faster first live/sync handshake)")
    (ok if ".cbt-card h2,.cbt-card h3{" in cbtsrc and ".cbt-vh{" in cbtsrc else fail)("cbt.js: h2 styled like h3 + visually-hidden utility")
    (ok if '<h2><svg class="mp-ico" aria-hidden="true"><use href="#i-bolt"></use></svg> Live CBT Hall</h2>' in cbtsrc and '<h2><svg class="mp-ico" aria-hidden="true"><use href="#i-grid"></use></svg> Teacher console</h2>' in cbtsrc else fail)("cbt.js: view-root headings promoted to h2 (hall + console), engraved icons not emoji")
    (ok if "<th></th>" not in cbtsrc and cbtsrc.count('class="cbt-vh"') >= 3 else fail)("cbt.js: no empty table headers left (visually-hidden action labels)")
    (ok if all(('for="%s"' % i) in cbtsrc for i in ("cbtSubject", "cbtTopic", "cbtDuration", "cbtWebcam", "cbtCount", "cbtSched")) else fail)("cbt.js: six builder labels programmatically associated")
    (ok if 'id="plFile" accept=".csv,.json,.txt" aria-label=' in cbtsrc and 'id="plText" aria-label=' in cbtsrc and 'id="cbtDraftTitle" aria-label=' in cbtsrc else fail)("cbt.js: aria-labels on title/file/textarea inputs")
    (ok if cbtsrc.count('role="status"') >= 4 else fail)("cbt.js: feedback regions announce politely (join/draw/new-question/pipeline)")
    synsrc = open(os.path.join(DOCS, "sync.js"), encoding="utf-8").read()
    (ok if ".syn-card h2,.syn-card h3{" in synsrc and "<h2>Your progress lives on this device.</h2>" in synsrc else fail)("sync.js: first sync cards promoted to h2, CSS parity")
    schsrc = open(os.path.join(DOCS, "ui", "school.js"), encoding="utf-8").read()
    (ok if 'land.id = "mssWaLand"' in schsrc and 'aria-label", "School help"' in schsrc and "land.appendChild(a)" in schsrc else fail)("school.js: floating WhatsApp help wrapped in a named <aside> landmark")
    (ok if "lastFocus" in usrc and '"Escape"' in usrc and "fok.focus()" in usrc else fail)("upgrade.js: What's-new — Escape closes, focus starts on Start studying, focus restored after close")
    f404 = open(os.path.join(DOCS, "404.html"), encoding="utf-8").read()
    (ok if "--mut:#6b5839" in f404 and "<main>" in f404 and "</main>" in f404 else fail)("404.html: sunlight-readable muted text (4.5:1+) + <main> landmark")
    whysrc = open(os.path.join(DOCS, "why.html"), encoding="utf-8").read()
    (ok if "</header>\n<main>" in whysrc and "</main>\n<footer>" in whysrc else fail)("why.html: content wrapped in <main> between header and footer")
    (ok if os.path.exists(os.path.join(ROOT, "tools", "a11ytest.js")) else fail)("tools/a11ytest.js: the v59 suite is mirrored")

    # ── §25 · v60 "Any Screen" — responsive pass ──────────────────────────────
    (ok if VP >= 60 and "Any Screen" in usrc else fail)("upgrade.js: V=60+ \"Any Screen\" whats-new entry")
    (ok if SWV >= 65 else fail)("sw.js: cache bumped to -v65+")
    (ok if CBTVER >= 60 else fail)("cbt.js: VERSION 60+")
    (ok if ".cbt-table{display:block;width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;contain:layout style}" in cbtsrc else fail)("cbt.js: ≤720 tables scroll in-card with layout containment (Chrome leaks inner-table overflow into document scrollWidth)")
    (ok if ".cbt-row input[type=file]{flex:1 1 100%;min-width:0;max-width:100%;min-height:38px}" in cbtsrc else fail)("cbt.js: file inputs own the row and shrink below intrinsic minimum")
    (ok if '".cbt-row input[type=file]{min-height:32px}"' in cbtsrc else fail)("cbt.js: base 32px floor for file inputs (tablet range)")
    (ok if ".cbt-inp,select.cbt-inp{min-width:0;width:100%}" in cbtsrc else fail)("cbt.js: ≤720 inputs fill block wrappers (datetime-local min-content no longer forces overflow)")
    (ok if "flex:1;min-width:0;max-width:100%" in cbtsrc else fail)("cbt.js: base .cbt-inp flex-shrink guards")
    (ok if ".cbt-card code{overflow-wrap:anywhere;word-break:break-word}" in cbtsrc else fail)("cbt.js: long code/CSV snippets wrap anywhere")
    (ok if ".cbt-row input[type=checkbox]{width:20px;height:20px;flex:none;accent-color:#002147}" in cbtsrc else fail)("cbt.js: 20px brand-accent checkboxes")
    atsrc = open(os.path.join(DOCS, "ui", "atelier.css"), encoding="utf-8").read()
    (ok if ".goal-edit{min-height:34px;padding:6px 2px}" in atsrc and ".pin-tool{width:38px;height:38px}" in atsrc and ".tool-search input{min-height:32px}" in atsrc else fail)("atelier.css: ≤600px thumb-target floor (goal edit, pin tools, tool search)")
    (ok if "atelier.css?v=48" in idxsrc else fail)("index.html: atelier.css cache-busted to v48")
    (ok if "#closeSidebar{min-width:32px;min-height:32px}" in atsrc and "#quickQuery{min-height:32px}" in atsrc else fail)("atelier.css: tablet-range tap floor (drawer close 32px, quick search 32px)")
    (ok if "table{display:block;width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;contain:layout style}" in whysrc and "footer a,.note a{display:inline-block;padding:8px 0}" in whysrc else fail)("why.html: ≤700px contained table scroll + link tap padding")
    (ok if os.path.exists(os.path.join(ROOT, "tools", "responsetest.js")) else fail)("tools/responsetest.js: the v60 suite is mirrored")

    # ── §28 · v63 "Anywhere" — offline excellence ────────────────────
    (ok if '-v68' in swsrc and 'NAV_TIMEOUT_MS' in swsrc and 'stale-while-revalidate' in swsrc else fail)("sw.js: v68 SWR assets + raced navigations with timeout")
    at2 = open(ROOT + '/docs/ui/atelier.js', encoding='utf-8').read()
    (ok if 'mpNetStrip' in at2 and 'updatefound' in at2 and 'navigator.storage.persist' in at2 else fail)("atelier.js: offline strip, SW update notice, storage persistence")
    prg2 = open(ROOT + '/docs/ui/progress-up.js', encoding='utf-8').read()
    (ok if '"online", function () { tick(false); }' in prg2 else fail)("progress-up.js: files queued report when connectivity returns")
    (ok if '.mp-net-strip{' in atsrc else fail)("atelier.css: network status strip styles")
    (ok if 'navigator.webdriver' in prg2 and '__MP_TEST_REPORT_OK__' in prg2 else fail)("progress-up.js: automation browsers never file reports unless a suite opts in")

    # ── §27 · v62 "The Open Book" — school-visible progress reports ────────
    psrc = open(ROOT + '/docs/ui/progress-up.js', encoding='utf-8').read()
    (ok if '/class_progress' in psrc and 'window.MAMSS_PROGRESS' in psrc and 'mamss-prg-v62' in psrc else fail)("progress-up.js: reporter module (class_progress upsert, test hook, salt)")
    (ok if 'MAMSS_ACT.activated' in psrc and '"locked"' in psrc else fail)("progress-up.js: fail-closed (never reports from a locked device)")
    (ok if 'resolution=merge-duplicates' in psrc else fail)("progress-up.js: upsert via merge-duplicates prefer")
    qsrc = open(ROOT + '/tools/progress_schema.sql', encoding='utf-8').read()
    (ok if 'create table if not exists public.class_progress' in qsrc else fail)("progress_schema.sql: class_progress table")
    (ok if 'for delete' not in qsrc else fail)("progress_schema.sql: no delete policy (append-only history)")
    (ok if 'class_progress_blob_size' in qsrc else fail)("progress_schema.sql: blob size ceiling")
    (ok if 'cbtProgPanel' in cbtsrc and 'function progStats(rows)' in cbtsrc and 'progCsv' in cbtsrc else fail)("cbt.js: class-progress panel, pure aggregator + CSV")
    (ok if 'ui/progress-up.js' in idxsrc and 'prg-school-line' in idxsrc else fail)("index.html: reporter script tag + student transparency line")
    (ok if VP >= 62 and "The Open Book" in usrc and "The Finishing Pass" in usrc else fail)("upgrade.js: V=62 \"The Open Book\" entry (v61 entry retained)")
    (ok if 'MAMSS_PROGRESS_WAKE' in usrc else fail)("upgrade.js: wake hook starts the reporter after unlock")
    (ok if '"./ui/progress-up.js"' in swsrc and '-v68' in swsrc else fail)("sw.js: precache reporter + cache -v68")
    (ok if '.prg-chip{' in atsrc and '.prg-drill{' in atsrc else fail)("atelier.css: v62 panel styles")

    # ── §26 · v61 "The Finishing Pass" ───────────────────────────────────────
    (ok if VP >= 61 and "The Finishing Pass" in usrc else fail)("upgrade.js: V=61+ \"The Finishing Pass\" whats-new entry")
    (ok if SWV >= 66 else fail)("sw.js: cache bumped to -v66+")
    (ok if CBTVER >= 61 else fail)("cbt.js: VERSION 61+")
    (ok if 'id="i-crest"' in idxsrc and 'id="i-key"' in idxsrc else fail)("index.html: crest + key glyphs added to the owned sprite")
    (ok if "mp-lock-crest" in idxsrc and idxsrc.count("\U0001f510") == 0 else fail)("index.html: gate crest is the engraved svg, lock emoji gone")
    (ok if "Four thousand WAEC-standard questions" in idxsrc else fail)("index.html: overview subhead is specific copy, not filler")
    (ok if "The paper path" in idxsrc and ">1. Choose your class<" not in idxsrc else fail)("index.html: practice crumb speaks the studio voice")
    (ok if "atelier.css?v=48" in idxsrc else fail)("index.html: atelier.css cache-busted to v48")
    (ok if 'id="cbtBoard"' in cbtsrc and "The hall is quiet." in cbtsrc and "cbt-quiet-steps" in cbtsrc and "fillBoard()" in cbtsrc else fail)("cbt.js: hall board — live now / next scheduled / designed quiet state")
    (ok if "<h2>\U0001f3eb" not in cbtsrc and "<h3>\U0001f393" not in cbtsrc and "<h3>\U0001f558" not in cbtsrc and "<h3>\U0001f4cb" not in cbtsrc else fail)("cbt.js: no emoji left in console/hall headings")
    studysrc = open(os.path.join(DOCS, "ui", "study.js"), encoding="utf-8").read()
    (ok if "toolLegend" in studysrc and "The paper path \u00b7 class" in studysrc else fail)("study.js: toolkit pin legend + studio-voice practice crumbs")
    (ok if ".mp-lock-card label{text-align:center}" in atsrc and ".stepbar .s.on{background:var(--s-ink,#002147)}" in atsrc and "@keyframes mpRise" in atsrc and "prefers-reduced-motion" in atsrc and "#classTabs .lvl" in atsrc and "rgba(201,162,39,.08) !important" in atsrc else fail)("atelier.css: v61 finishing layer (gate axis, stepper, gold level chips, motion tokens + reduced-motion guard)")
    (ok if ".tool-card{min-height:176px" in atsrc and "rgba(201,162,39,.12)!important" in atsrc else fail)("atelier.css: level toolkit shelf with one brand-true tint")
    (ok if "font-family:Caslon" in whysrc and "background:#0e3b2e" in whysrc and 'class="rare"' not in whysrc and "rare-note" in whysrc and "display:block;margin:0 0 6px}" in whysrc else fail)("why.html: Caslon wordmark, ink-green CTA, single world-first footnote, kicker on its own line")

    print("\n" + "=" * 46)
    print("  %d passed · %d warnings · %d failures" % (OK, WARN, FAIL))
    if FAIL:
        print("  \033[31mDO NOT DEPLOY — fix the failures above.\033[0m\n")
        return 1
    print("  \033[32mClear to deploy.\033[0m\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
