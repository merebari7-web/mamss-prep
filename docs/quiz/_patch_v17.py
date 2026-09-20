#!/usr/bin/env python3
# v17 "Lumina II" — second, deeper UI/graphics pass: shell button/control
# states + touch-hover suppression + AI Coach small-screen hardening; Study
# Arcade deep refresh (header chrome, floating medallions, answer feedback
# pop/shake, gold HUD, calc glass, stats KPIs); Exam-Room Labs polish; Teaching
# Suite refinement; SW cache key bump. All assertion-guarded.
import sys

def js_esc(css):
    out = css.replace("\\", "\\\\").replace('"', '\\"')
    return out.replace("\n", "\\n")

def append_to_css_chain(src, marker, css, what):
    """Append `+ "css"` to the nearest JS string chain ending just before `marker`."""
    k = src.index(marker)
    q = src.rindex('"', 0, k)
    semi = src.index(";", q)
    assert src[semi:semi + 1] == ";", what + " semi"
    src = src[:semi] + '\n    + "' + js_esc(css) + '"' + src[semi:]
    return src

# ---------------- 1. shell: v17 style block ----------------
tpl = open("quiz/template.html", encoding="utf-8").read()
assert tpl.count("</head>") == 1, "head anchor"
assert tpl.count('<style id="v17ui">') == 0, "v17 already present"
ui = open("quiz/_v17_ui.css", encoding="utf-8").read()
block = "\n<!-- v17 Lumina II design refresh (source: quiz/_v17_ui.css) -->\n<style id=\"v17ui\">\n" + ui + "</style>\n"
tpl = tpl.replace("</head>", block + "</head>", 1)
open("quiz/template.html", "w", encoding="utf-8").write(tpl)
print("ok shell v17 style block")

# ---------------- 2. arcade: append to CSS chain ----------------
app = open("quiz/_arc_app.js", encoding="utf-8").read()
if "arcMfloat" not in app:
    app = append_to_css_chain(app, "/* ---------- boot ---------- */",
                              open("quiz/_v17_arc.css", encoding="utf-8").read(), "arcade")
    open("quiz/_arc_app.js", "w", encoding="utf-8").write(app)
    print("ok arcade v17 CSS appended")
else:
    print("arcade v17 already present — skipped")

# ---------------- 3. edu: append to CSS chain ----------------
edu = open("edu.js", encoding="utf-8").read()
if "v17" not in edu and "x" + "arcMfloat" not in edu:
    anchor = "DOC.head.appendChild(c);"
    assert edu.count(anchor) == 1, "edu anchor"
    edu = append_to_css_chain(edu, anchor, open("quiz/_v17_edu.css", encoding="utf-8").read(), "edu")
    open("edu.js", "w", encoding="utf-8").write(edu)
    print("ok edu v17 CSS appended")
else:
    print("edu v17 already present — skipped")

# ---------------- 4. labs: append to CSS chain ----------------
labs = open("labs.js", encoding="utf-8").read()
if "lxShake" not in labs:
    labs = append_to_css_chain(labs, "document.head.appendChild(css);",
                               open("quiz/_v17_labs.css", encoding="utf-8").read(), "labs")
    open("labs.js", "w", encoding="utf-8").write(labs)
    print("ok labs v17 CSS appended")
else:
    print("labs v17 already present — skipped")

# ---------------- 5. sw cache key ----------------
sw = open("sw.js", encoding="utf-8").read()
old_v = 'const NSS_V = "nssc-v20260907" + "-v16"; /* v16 — Lumina UI refresh: design system (buttons, cards, gold sheen, scrollbar), premium AI Coach suggestion cards, Study Arcade + Teaching Suite polish. Bump per release (runtime cache key). */'
assert sw.count(old_v) == 1, "sw anchor " + str(sw.count(old_v))
sw = sw.replace(old_v, 'const NSS_V = "nssc-v20260907" + "-v17"; /* v17 — Lumina II: shell button/control states + touch-hover suppression, AI Coach small-screen hardening, Study Arcade deep refresh (answer feedback, floating medallions, gold HUD), Exam-Room Labs + Teaching Suite polish. Bump per release (runtime cache key). */', 1)
open("sw.js", "w", encoding="utf-8").write(sw)
print("ok sw NSS_V -v17")
print("ALL v17 PATCHES APPLIED")
