#!/usr/bin/env python3
# v19 "All-Device Responsive" pass — shell + arcade + edu + labs packs and
# SW cache key bump. Uses the hardened chain walker (never quote-hunts).
import sys

def js_esc(css):
    out = css.replace("\\", "\\\\").replace('"', '\\"')
    return out.replace("\n", "\\n")

def walk_chain_end(src, anchor):
    j = anchor
    while j < len(src) and src[j] in " \t\n\r": j += 1
    while True:
        assert src[j] == '"', "expected quote at %d" % j
        j += 1
        while j < len(src):
            c = src[j]
            if c == "\\": j += 2; continue
            if c == '"': j += 1; break
            j += 1
        while j < len(src) and src[j] in " \t\n\r": j += 1
        if j < len(src) and src[j] == "+":
            j += 1
            while j < len(src) and src[j] in " \t\n\r": j += 1
            while j + 1 < len(src) and src[j] == "/" and src[j + 1] == "*":
                j += 2
                while j + 1 < len(src) and not (src[j] == "*" and src[j + 1] == "/"):
                    j += 1
                j += 2
                while j < len(src) and src[j] in " \t\n\r": j += 1
            while j + 1 < len(src) and src[j] == "/" and src[j + 1] == "/":
                j += 2
                while j < len(src) and src[j] not in "\n": j += 1
                while j < len(src) and src[j] in " \t\n\r": j += 1
            continue
        break
    assert src[j] == ";", "expected ; at %d" % j
    return j

def append_to_css_chain(src, var_anchor, css, what):
    k = src.index(var_anchor)
    anchor = src.index("=", k) + 1
    semi = walk_chain_end(src, anchor)
    return src[:semi] + '\n    + "' + js_esc(css) + '"' + src[semi:]

# 1. shell
tpl = open("quiz/template.html", encoding="utf-8").read()
if tpl.count('<style id="v19ui">') == 0:
    ui = open("quiz/_v19_ui.css", encoding="utf-8").read()
    block = "\n<!-- v19 all-device responsiveness (source: quiz/_v19_ui.css) -->\n<style id=\"v19ui\">\n" + ui + "</style>\n"
    tpl = tpl.replace("</head>", block + "</head>", 1)
    open("quiz/template.html", "w", encoding="utf-8").write(tpl)
    print("ok shell v19 style block")
else:
    print("shell v19 already present — skipped")

# 2. arcade
app = open("quiz/_arc_app.js", encoding="utf-8").read()
if "v19" not in app or "max-height:560px" not in app:
    app = append_to_css_chain(app, "var CSS =", open("quiz/_v19_arc.css", encoding="utf-8").read(), "arcade")
    open("quiz/_arc_app.js", "w", encoding="utf-8").write(app)
    print("ok arcade v19 CSS appended")
else:
    print("arcade v19 already present — skipped")

# 3. edu
edu = open("edu.js", encoding="utf-8").read()
if "v19" not in edu or "edu-body{padding-bottom" not in edu:
    edu = append_to_css_chain(edu, "c.textContent =", open("quiz/_v19_edu.css", encoding="utf-8").read(), "edu")
    open("edu.js", "w", encoding="utf-8").write(edu)
    print("ok edu v19 CSS appended")
else:
    print("edu v19 already present — skipped")

# 4. labs
labs = open("labs.js", encoding="utf-8").read()
if "v19" not in labs or "lx-modal{max-height:100dvh" not in labs:
    labs = append_to_css_chain(labs, "css.textContent =", open("quiz/_v19_labs.css", encoding="utf-8").read(), "labs")
    open("labs.js", "w", encoding="utf-8").write(labs)
    print("ok labs v19 CSS appended")
else:
    print("labs v19 already present — skipped")

# 5. sw
sw = open("sw.js", encoding="utf-8").read()
old_v = sw[sw.index('const NSS_V = '):sw.index(';', sw.index('const NSS_V = '))]
if "-v19" not in old_v:
    new_v = 'const NSS_V = "nssc-v20260907" + "-v19"; /* v19 — all-device responsiveness: 280px plan-grid fix, hero3d decor containment, iOS zoom-on-focus fix (16px touch inputs), landscape-phone modals, safe-area padding, ultra-wide layout, 21-viewport audit. */'
    sw = sw.replace(old_v, new_v, 1)
    open("sw.js", "w", encoding="utf-8").write(sw)
    print("ok sw NSS_V -v19")
else:
    print("sw already -v19 — skipped")
print("ALL v19 PATCHES APPLIED")
