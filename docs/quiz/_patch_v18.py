#!/usr/bin/env python3
# v18 "Aurum" — first-class upgrade pass: glass hero plates + gold numerals,
# premium toast & keycap chips, launcher pulse, ambient aurum glows (shell);
# liquid-gold progress shimmer, pill chips, gradient KPIs, question-plate glow
# (arcade); gold question chips + refined selects (edu); breathing focus ring +
# floating trophy + score pills (labs). SW cache key bump. All assertion-guarded.
import sys

def js_esc(css):
    out = css.replace("\\", "\\\\").replace('"', '\\"')
    return out.replace("\n", "\\n")

def walk_chain_end(src, anchor):
    """Index of the ';' terminating a concatenation of string literals that
    starts at src[anchor] (first quote). Walks literals + '+' only, so it can
    never pierce into unrelated code (the old quote-hunt broke on toast calls)."""
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

# ---------------- 1. shell ----------------
tpl = open("quiz/template.html", encoding="utf-8").read()
assert tpl.count("</head>") == 1, "head anchor"
if tpl.count('<style id="v18ui">') == 0:
    ui = open("quiz/_v18_ui.css", encoding="utf-8").read()
    block = "\n<!-- v18 Aurum first-class upgrade (source: quiz/_v18_ui.css) -->\n<style id=\"v18ui\">\n" + ui + "</style>\n"
    tpl = tpl.replace("</head>", block + "</head>", 1)
    open("quiz/template.html", "w", encoding="utf-8").write(tpl)
    print("ok shell v18 style block")
else:
    print("shell v18 already present — skipped")

# ---------------- 2. arcade ----------------
app = open("quiz/_arc_app.js", encoding="utf-8").read()
if "auFlow" not in app:
    app = append_to_css_chain(app, "var CSS =",
                              open("quiz/_v18_arc.css", encoding="utf-8").read(), "arcade")
    open("quiz/_arc_app.js", "w", encoding="utf-8").write(app)
    print("ok arcade v18 CSS appended")
else:
    print("arcade v18 already present — skipped")

# ---------------- 3. edu ----------------
edu = open("edu.js", encoding="utf-8").read()
if ".edu-sel{border:1.5px solid rgba(201,162,39,.5)" not in edu:
    anchor = "DOC.head.appendChild(c);"
    assert edu.count(anchor) == 1, "edu anchor"
    edu = append_to_css_chain(edu, "c.textContent =", open("quiz/_v18_edu.css", encoding="utf-8").read(), "edu")
    open("edu.js", "w", encoding="utf-8").write(edu)
    print("ok edu v18 CSS appended")
else:
    print("edu v18 already present — skipped")

# ---------------- 4. labs ----------------
labs = open("labs.js", encoding="utf-8").read()
if "lxBreath" not in labs:
    labs = append_to_css_chain(labs, "css.textContent =",
                               open("quiz/_v18_labs.css", encoding="utf-8").read(), "labs")
    open("labs.js", "w", encoding="utf-8").write(labs)
    print("ok labs v18 CSS appended")
else:
    print("labs v18 already present — skipped")

# ---------------- 5. sw ----------------
sw = open("sw.js", encoding="utf-8").read()
old_v = 'const NSS_V = "nssc-v20260907" + "-v17"; /* v17 — Lumina II: shell button/control states + touch-hover suppression, AI Coach small-screen hardening, Study Arcade deep refresh (answer feedback, floating medallions, gold HUD), Exam-Room Labs + Teaching Suite polish. Bump per release (runtime cache key). */'
if sw.count(old_v) == 1:
    sw = sw.replace(old_v, 'const NSS_V = "nssc-v20260907" + "-v18"; /* v18 — Aurum first-class upgrade: glass hero stat plates + gold numerals, premium toast/keycap chips, launcher pulse ring, liquid-gold progress shimmer, gold question chips, breathing focus ring, ambient aurum glows. Bump per release (runtime cache key). */', 1)
    open("sw.js", "w", encoding="utf-8").write(sw)
    print("ok sw NSS_V -v18")
else:
    print("sw already -v18 — skipped")
print("ALL v18 PATCHES APPLIED")
