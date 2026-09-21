#!/usr/bin/env python3
"""
MAMSS Prep — v43 "Ascension" upgrade build script.

Transforms docs/index.html in place (idempotent) and emits the new static assets.
Run from the repo root:   python3 tools/build_upgrade.py

What it does
  1. Repairs the broken <head> (malformed meta that swallowed <link rel="manifest">,
     duplicate canonical, duplicate favicon).
  2. Extracts every inline <style> block in <head> into docs/app.css (same order,
     so the cascade is byte-for-byte identical) and leaves a small critical-CSS
     subset inline so first paint is styled even if app.css is slow/absent.
  3. Adds resource hints (preconnect / preload for the 133 KB question bank).
  4. Makes bank.js non-render-blocking (defer) — the app already re-boots on the
     "quizbank-updated" event, so this is safe.
  5. Installs the Data-Saver gate (head, before the lazy module loaders).
  6. Installs the v43 upgrade layer (upgrade.css + upgrade.js) using the same
     lazy, boot-safe loader convention the rest of the app uses.
  7. Moves the decorative .luxe-frame div inside <body> (valid HTML).
  8. Refreshes the JSON-LD structured data.
  9. Generates docs/bank-raw.js — an uncompressed copy of the question bank that is
     fetched ONLY by browsers without DecompressionStream, so the bank can never
     fail to decode.

Nothing else in the 4,167-question app is touched.
"""
import base64
import json
import os
import re
import sys
import zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(ROOT, "docs")
HTML = os.path.join(DOCS, "index.html")

BUILD_VERSION = "43"
BUILD_STAMP = "v43.0 Ascension upgrade"

CHANGES = []


def note(msg):
    CHANGES.append(msg)
    print("  • " + msg)


# --------------------------------------------------------------------------- #
# critical CSS: the minimum needed for a styled first paint
# --------------------------------------------------------------------------- #
CRITICAL_LAYOUT = """
/* critical layout subset — full sheet in app.css */
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);
font-family:system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
line-height:1.5;min-height:100vh;overflow-x:hidden}
.wrap{width:100%;max-width:1060px;margin:0 auto;padding:0 18px}
.hidden{display:none!important}
.nav{position:sticky;top:0;z-index:60;display:flex;align-items:center;gap:10px;
margin:0 auto;padding:10px 18px;background:var(--card);border-bottom:1px solid var(--card-border)}
.brand{display:flex;align-items:center;gap:10px;font-weight:800}
.spacer{flex:1}
.icon-btn{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;
border:1px solid var(--card-border);border-radius:11px;background:var(--chip-bg);color:var(--ink);
font-size:1rem;line-height:1}
.card{position:relative;margin:16px 0;padding:20px;background:var(--card);
border:1px solid var(--card-border);border-radius:18px}
.hero{position:relative;padding:34px 20px 60px;color:var(--hero-ink);background:var(--hero-grad);overflow:hidden}
h1,h2,h3{margin:0 0 8px;line-height:1.2}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:11px 18px;
border:1px solid var(--card-border);border-radius:12px;background:var(--chip-bg);color:var(--ink);
font:inherit;font-weight:700}
.btn-primary{background:var(--green);border-color:var(--green);color:#fff}
#gateOverlay{position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;
padding:18px;background:var(--bg);overflow:auto}
#gateOverlay.hidden{display:none}
.gate-card{width:100%;max-width:420px;padding:26px;background:var(--card-solid);
border:1px solid var(--card-border);border-radius:20px}
.input{width:100%;padding:12px;margin:6px 0;border:1px solid var(--card-border);
border-radius:12px;background:var(--chip-bg);color:var(--ink);font:inherit}
#toast{position:fixed;left:50%;bottom:26px;z-index:400;transform:translateX(-50%);
max-width:min(92vw,520px);padding:12px 18px;border-radius:14px;background:var(--card-solid);
color:var(--ink);opacity:0;pointer-events:none}
.skip-link{position:absolute;left:-9999px}
.skip-link:focus{left:12px;top:12px;z-index:500;padding:10px 14px;background:var(--card-solid);
border:1px solid var(--card-border);border-radius:10px}
/* Data Saver essentials live here too, so they apply before upgrade.css arrives */
html.data-saver #aurora,html.data-saver #confetti,html.data-saver #heroFx,
html.data-saver #heroSun,html.data-saver .hero3d,html.data-saver .cube-scene,
html.data-saver .hero .blob,html.data-saver .hero .rays,html.data-saver .luxe-frame{display:none!important}
html.data-saver *,html.data-saver *::before,html.data-saver *::after{
animation-duration:.001ms!important;animation-iteration-count:1!important;
transition-duration:.001ms!important}
html.data-saver .card,html.data-saver .modal,html.data-saver .nav,html.data-saver .stat{
backdrop-filter:none!important;-webkit-backdrop-filter:none!important;box-shadow:none!important}
"""


def first_rule(css: str, selector: str) -> str:
    """Return the first `selector{...}` block verbatim (brace-balanced)."""
    i = css.find(selector + "{")
    if i < 0:
        return ""
    depth, j = 0, i + len(selector)
    while j < len(css):
        if css[j] == "{":
            depth += 1
        elif css[j] == "}":
            depth -= 1
            if depth == 0:
                return css[i : j + 1]
        j += 1
    return ""


# --------------------------------------------------------------------------- #
def main():
    with open(HTML, encoding="utf-8") as fh:
        src = fh.read()
    original_len = len(src)
    idempotent = "app.css" in src and 'id="mpUpgrade"' in src
    if idempotent:
        print("! index.html already looks upgraded — rebuilding from a clean copy is safer.")
        print("  (restore docs/index.html from git first:  git checkout -- docs/index.html)")
        return 2

    # ---------------------------------------------------------------- 1. head
    broken = (
        '<meta name="apple-mobile-web-app-title" content="Study App"'
        '<link rel="manifest" href="manifest.webmanifest">'
        '<link rel="apple-touch-icon" href="apple-touch-icon.png">'
    )
    fixed = (
        '<meta name="apple-mobile-web-app-title" content="MAMSS Prep">\n'
        '<meta name="apple-mobile-web-app-capable" content="yes">\n'
        '<link rel="manifest" href="manifest.webmanifest">\n'
        '<link rel="apple-touch-icon" href="apple-touch-icon.png">'
    )
    if broken in src:
        src = src.replace(broken, fixed, 1)
        note("FIXED malformed <meta> that swallowed <link rel=\"manifest\"> — the PWA is now installable")
    else:
        print("  ! manifest meta pattern not found (already fixed?)")

    # duplicate favicon (generic green "Q") — keep the MAMSS crest
    q_icon = re.search(
        r'<link rel="icon" href="data:image/svg\+xml,<svg[^"]*?%23008751.*?</svg>">\n?', src, re.S
    )
    if q_icon:
        src = src[: q_icon.start()] + src[q_icon.end() :]
        note("removed duplicate generic-Q favicon (the MAMSS crest now wins)")

    # duplicate canonical
    parts = src.split('<link rel="canonical" href="https://merebari7-web.github.io/mamss-prep/">')
    if len(parts) > 2:
        src = parts[0] + '<link rel="canonical" href="https://merebari7-web.github.io/mamss-prep/">' + "".join(parts[1:])
        note("removed duplicate <link rel=canonical>")

    # ------------------------------------------------------- 2. extract CSS
    head_end = src.find("</head>")
    head = src[:head_end]
    blocks = list(re.finditer(r"(<style[^>]*>)(.*?)(</style>)", head, re.S))
    if not blocks:
        print("  ! no inline <style> found — aborting"); return 3

    css_out = [
        "/* ===================================================================\n"
        "   MAMSS PREP — app.css\n"
        "   Extracted verbatim from the inline <style> blocks of index.html by\n"
        "   tools/build_upgrade.py. Order preserved exactly, so the cascade is\n"
        "   identical to the previous inline build. Do not hand-edit: edit the\n"
        "   source CSS in docs/quiz/_v1*_*.css / _v2*_*.css and re-run the build.\n"
        "   =================================================================== */\n"
    ]
    css_bytes = 0
    for n, m in enumerate(blocks):
        # carry the explanatory comment that precedes each block into the sheet
        pre = head[max(0, m.start() - 260) : m.start()]
        cm = re.findall(r"<!--(.*?)-->", pre, re.S)
        if cm:
            css_out.append("\n/* ---- " + " ".join(cm[-1].split())[:200] + " ---- */")
        attrs = m.group(1)[len("<style") : -1].strip()
        if attrs:
            css_out.append("\n/* <style %s> */" % attrs)
        css_out.append(m.group(2))
        css_bytes += len(m.group(2))

    app_css = "\n".join(css_out)
    with open(os.path.join(DOCS, "app.css"), "w", encoding="utf-8") as fh:
        fh.write(app_css)
    note("extracted %s chars of inline CSS from %d <style> blocks → docs/app.css" % (f"{css_bytes:,}", len(blocks)))

    # critical CSS = theme variables (verbatim) + small layout subset
    crit = (
        "<style id=\"mpCritical\">"
        + first_rule(app_css, ":root")
        + first_rule(app_css, '[data-theme="dark"]')
        + first_rule(app_css, "[data-theme=dark]")
        + CRITICAL_LAYOUT
        + "</style>"
    )
    note("inlined %d chars of critical CSS (theme variables + first-paint layout)" % len(crit))

    # replace the first block with the link + critical CSS, drop the rest.
    # NB: rebuild in a single pass — splicing with the original offsets after the
    # first replacement would shift every later index and cut the wrong bytes.
    first = blocks[0]
    replacement = (
        '<!-- v43.0 styles: critical subset inline, full sheet external & cacheable -->\n'
        '<link rel="stylesheet" href="app.css">\n'
        + crit
    )
    out, pos = [], 0
    for i, m in enumerate(blocks):
        out.append(head[pos:m.start()])
        if i == 0:
            out.append(replacement)
        pos = m.end()
    out.append(head[pos:])
    new_head = "".join(out)

    # the extraction must be exact: nothing dropped, nothing duplicated
    for m in blocks:
        if m.group(2) not in app_css:
            print("  ! a CSS block is missing from app.css — aborting without writing")
            return 6
    kept = re.findall(r"(<style[^>]*>)(.*?)(</style>)", new_head, re.S)
    if len(kept) != 1 or kept[0][1] != re.search(r"<style id=\"mpCritical\">(.*?)</style>", replacement, re.S).group(1):
        print("  ! CSS extraction sanity check FAILED — aborting without writing")
        return 4
    removed = sum(len(m.group(0)) for m in blocks)   # contents AND their <style> tags
    if len(new_head) != len(head) - removed + len(replacement):
        print("  ! head length mismatch (%d vs %d) — aborting"
              % (len(new_head), len(head) - removed + len(replacement)))
        return 5

    src = new_head + src[head_end:]
    note("index.html: %s → %s chars (%.0f%% smaller before compression)"
         % (f"{original_len:,}", f"{len(src):,}", 100 * (1 - len(src) / original_len)))

    # --------------------------------------------------- 3. resource hints
    hints = (
        '<link rel="preconnect" href="https://accounts.google.com" crossorigin>\n'
        '<link rel="dns-prefetch" href="https://accounts.google.com">\n'
        '<!-- the 133 KB question bank is discovered late in the document; preload it in parallel -->\n'
        '<link rel="preload" href="bank.js" as="script">\n'
    )
    anchor = '<link rel="stylesheet" href="app.css">'
    src = src.replace(anchor, hints + anchor, 1)
    note("added preconnect/dns-prefetch (Google Identity) + preload for bank.js")

    # ------------------------------- 4b. service worker registration scope
    sw_old = '0===location.protocol.indexOf("https")'
    sw_new = (r'(/^https:$/.test(location.protocol)||'
              r'/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname))')
    if sw_old in src:
        src = src.replace(sw_old, sw_new, 1)
        note("service worker now also registers on localhost/127.0.0.1 (valid secure contexts), "
             "so the offline app can be developed and tested locally")

    # ------------------------------------------- 4. bank.js non-blocking
    if '<script src="bank.js"></script>' in src:
        src = src.replace(
            '<script src="bank.js"></script>',
            '<script src="bank.js" defer></script>',
            1,
        )
        note("bank.js now defers (app already re-boots on the quizbank-updated event)")

    # ------------------------------------------------- 5. Data-Saver gate
    saver = r"""<!-- v43.0 Data Saver gate — runs before the lazy module loaders.
     Off by default: when off this script does nothing at all. When on (user choice,
     or navigator.connection.saveData / 2G) it flags the document element with the
     class "data-saver" and pauses the purely decorative heavy modules; upgrade.js
     offers to load any of them on demand. -->
<script id="mpSaverGate">(function(){try{
var on=false,auto=false,c=navigator.connection||navigator.mozConnection||navigator.webkitConnection||{};
try{on=JSON.parse(localStorage.getItem("nssc_saver")||"null")===true}catch(e){}
if(!on&&(c.saveData===true||/^(slow-)?2g$/.test(c.effectiveType||""))){on=true;auto=true}
if(!on)return;
var d=document.documentElement;d.classList.add("data-saver");
if(auto)d.classList.add("data-saver-auto");
window.MAMSS_SAVER=auto?"auto":true;
var HEAVY={"quiz/scroll3d.js":1,"quiz/holo.js":1,"quiz/reels.js":1,"quiz/boost.js":1,
"quiz/aura.js":1,"quiz/studio.js":1,"quiz/_arc_app.js":1,"quiz/_arc_data.js":1,"arcade.js":1};
window.MAMSS_HEAVY=HEAVY;window.MAMSS_SAVER_BLOCKED=[];
var orig=document.head.appendChild.bind(document.head);
document.head.appendChild=function(n){try{
if(n&&n.tagName==="SCRIPT"&&n.getAttribute&&n.getAttribute("src")){
var p=n.getAttribute("src").split("?")[0].replace(/^\.\//,"");
if(HEAVY[p]){window.MAMSS_SAVER_BLOCKED.push(p);return n}}}catch(e){}
return orig(n)};
}catch(e){}})();</script>
"""
    src = src.replace(anchor, saver + anchor, 1)
    note("installed the Data-Saver gate in <head> (inert unless enabled)")

    # ------------------------------------------- 6. upgrade layer loader
    loader = r"""
<!-- ============ v43.0 Ascension upgrade layer (source: upgrade.js, lazy, boot-safe) ============ -->
<link id="mpUpgradeCss" rel="stylesheet" href="upgrade.css" media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="upgrade.css"></noscript>
<script id="mpUpgrade">!function(){try{var c=document.createElement("script");
c.src="upgrade.js",c.async=!0,c.onerror=function(){},document.head.appendChild(c)}catch(c){}}();</script>
"""
    if "</body>" in src:
        src = src.replace("</body>", loader + "</body>", 1)
        note("installed the v43 upgrade layer loader before </body>")

    # --------------------------------------------- 7. luxe-frame into body
    bad_frame = '</head>\n<div class="luxe-frame" aria-hidden="true"></div>\n<body>'
    good_frame = '</head>\n<body>\n<div class="luxe-frame" aria-hidden="true"></div>'
    if bad_frame in src:
        src = src.replace(bad_frame, good_frame, 1)
        note("moved .luxe-frame inside <body> (it was between </head> and <body>)")

    # ------------------------------------------------- 8. JSON-LD refresh
    ld = re.search(r'<script type="application/ld\+json">(.*?)</script>', src, re.S)
    if ld:
        try:
            data = json.loads(ld.group(1))
            data["softwareVersion"] = BUILD_VERSION
            data["dateModified"] = "2026-09-21"
            data["featureList"] = [
                "4,167 explained practice questions across 27 subjects (SS1-SS3)",
                "WAEC / NECO / JAMB UTME examination simulator with auto-submit",
                "Adaptive engine that targets your weakest topics",
                "Offline-first installable app (works with no network)",
                "Data Saver mode for metered mobile connections",
                "Flashcards, rapid-fire sprints, spelling lab, mistake drill",
                "Lesson notes, curriculum atlas, formula vault, periodic table",
                "Scientific calculator, 3D molecule and shape labs",
                "Certificates, records hall, printable report card",
            ]
            data["author"] = {"@type": "Organization", "name": "Merebari Web",
                              "url": "https://github.com/merebari7-web"}
            data["softwareRequirements"] = "Any modern browser; installable as a PWA"
            data["screenshot"] = "https://merebari7-web.github.io/mamss-prep/social-preview.png"
            data["audience"] = {"@type": "EducationalAudience", "educationalRole": "student",
                                "suggestedMinAge": 13, "suggestedMaxAge": 19}
            data["educationalLevel"] = "Senior Secondary (SS1-SS3)"
            data["inLanguage"] = "en"
            src = src[: ld.start(1)] + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + src[ld.end(1) :]
            note("refreshed JSON-LD (softwareVersion, featureList, audience, educationalLevel)")
        except Exception as exc:  # pragma: no cover
            print("  ! JSON-LD refresh skipped: %s" % exc)

    with open(HTML, "w", encoding="utf-8") as fh:
        fh.write(src)

    # ------------------------------------------ 9. bank-raw.js (rescue copy)
    try:
        bank = open(os.path.join(DOCS, "bank.js"), encoding="utf-8").read()
        b64 = re.search(r'QUIZ_B64="([^"]+)"', bank).group(1)
        raw = zlib.decompress(base64.b64decode(b64)).decode("utf-8")
        out = ("/* MAMSS PREP — uncompressed question bank (rescue copy).\n"
               "   Fetched ONLY when the browser has no DecompressionStream, so the bank can\n"
               "   never fail to decode. Generated by tools/build_upgrade.py — do not edit.\n"
               "   Regenerate whenever bank.js changes. */\n"
               "window.__BANK_RAW_TXT=" + json.dumps(raw, ensure_ascii=False) + ";\n"
               "try{window.dispatchEvent(new Event(\"bankraw-ready\"))}catch(e){}\n")
        with open(os.path.join(DOCS, "bank-raw.js"), "w", encoding="utf-8") as fh:
            fh.write(out)
        gz = len(zlib.compress(out.encode("utf-8"), 9))
        note("generated docs/bank-raw.js (%s chars, ~%s KB gzipped) — decode rescue for old browsers"
             % (f"{len(raw):,}", f"{gz/1024:.0f}"))
    except Exception as exc:
        print("  ! bank-raw.js generation skipped: %s" % exc)

    print("\nBuild %s complete — %d changes." % (BUILD_STAMP, len(CHANGES)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
