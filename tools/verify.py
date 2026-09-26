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
    (ok if re.search(r"var V = 5[3-9]", usrc) else fail)("upgrade.js V=53+ (Adaptive Engine)")
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
    (ok if re.search(r"var V = 5[4-9]", usrc) and 'NAME = "Live CBT Cameras"' in usrc and "Live CBT Hall" in usrc else fail)("upgrade.js: V=54+ shipped (Live CBT Hall entry retained, now Live CBT Cameras)")
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
    (ok if "repeat(5, minmax(0, 1fr))" in atelier else fail)("atelier.css: mobile dock widened to 5 tabs")

    # --- schema + issuer ---
    (ok if all(t in schema for t in ("create table if not exists public.cbt_sessions", "create table if not exists public.cbt_attempts", "create table if not exists public.cbt_answers")) else fail)("cbt_schema.sql: the 3 tables")
    (ok if "primary key (session_code, device_id)" in schema and "primary key (session_code, device_id, q_idx)" in schema else fail)("cbt_schema.sql: PKs enforce one-attempt + no-going-back")
    (ok if "cbt_session_stamp" in schema and "cbt_attempt_stamp" in schema else fail)("cbt_schema.sql: server-authoritative time triggers")
    (ok if schema.count("enable row level security") == 3 else fail)("cbt_schema.sql: RLS on all 3 tables")
    (ok if "for delete" not in schema else fail)("cbt_schema.sql: no delete policies (rows are permanent)")
    (ok if "supabase_realtime" in schema else fail)("cbt_schema.sql: realtime publication")
    (ok if "--seed-ranges" in issuer and "batchRanges" in issuer else fail)("issue_codes.py: maintains batchRanges (--seed-ranges migration)")

    print("\n[20] v55 Live CBT Cameras (webcam monitoring, ephemeral by design)")
    (ok if 'var V = 55, NAME = "Live CBT Cameras"' in usrc else fail)("upgrade.js: V=55 NAME=Live CBT Cameras")
    (ok if "Live CBT Cameras" in usrc and "never recorded and never stored" in usrc else fail)("whats-new announces the cameras with the privacy promise")
    (ok if 'var VERSION = "55"' in cbtsrc else fail)("cbt.js: VERSION 55")
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
    (ok if '"-v60"' in swsrc else fail)("sw.js: cache bumped to -v60")
    r = subprocess.run(["node", "--check", cbtsrc_path], capture_output=True, text=True)
    (ok if r.returncode == 0 else fail)("cbt.js: node --check clean (v55)")

    print("\n" + "=" * 46)
    print("  %d passed · %d warnings · %d failures" % (OK, WARN, FAIL))
    if FAIL:
        print("  \033[31mDO NOT DEPLOY — fix the failures above.\033[0m\n")
        return 1
    print("  \033[32mClear to deploy.\033[0m\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
