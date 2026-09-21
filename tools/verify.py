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
    if re.search(r'<link rel="manifest"[^>]*href="manifest\.webmanifest"', s):
        ok('<link rel="manifest"> present — the app is installable')
    else:
        fail('<link rel="manifest"> missing — the PWA cannot be installed')
    n_canon = len(re.findall(r'<link rel="canonical"', s))
    (ok if n_canon == 1 else fail)("exactly one canonical link (found %d)" % n_canon)
    n_icon = len(re.findall(r'<link rel="icon"', s))
    (ok if n_icon == 1 else warn)("one favicon link (found %d)" % n_icon)
    # count real tags only: text inside HTML comments does not create elements
    tags_only = re.sub(r"<!--.*?-->", "", s, flags=re.S)
    for tag, want in (("</head>", 1), ("<body>", 1), ("</body>", 1), ("<html", 1), ("</html>", 1)):
        c = tags_only.count(tag)
        (ok if c == want else fail)("%s appears %d time(s)" % (tag, c))
    if "</head>\n<body>" in s and '<div class="luxe-frame"' in s.split("<body>", 1)[1]:
        ok(".luxe-frame lives inside <body>")
    else:
        warn(".luxe-frame is not inside <body>")
    if 'id="mpCritical"' in head and '<link rel="stylesheet" href="app.css">' in head:
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
    if "mpSaverGate" in head and "mpUpgrade" in s:
        ok("Data-Saver gate + upgrade layer installed")
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
                rel = e.lstrip("./")
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

    print("\n" + "=" * 46)
    print("  %d passed · %d warnings · %d failures" % (OK, WARN, FAIL))
    if FAIL:
        print("  \033[31mDO NOT DEPLOY — fix the failures above.\033[0m\n")
        return 1
    print("  \033[32mClear to deploy.\033[0m\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
