#!/usr/bin/env python3
# v16 "Lumina" UI pass: design-system CSS into the shell, AI Coach premium
# cards (medallion icons, Top Pick, stagger), Study Arcade refresh,
# Teaching Suite polish, SW cache key bump. All assertion-guarded.
import sys

def must(s, old, tag, count=1):
    c = s.count(old)
    if c != count:
        print("ABORT %s: %s anchors=%d" % (tag, tag, c)); sys.exit(1)
    return s.replace(old, old, 1)

def js_esc(css):
    out = css.replace("\\", "\\\\").replace('"', '\\"')
    return out.replace("\n", "\\n")

# ---------------- 1. shell: v16 style block ----------------
tpl = open("quiz/template.html", encoding="utf-8").read()
assert tpl.count("</head>") == 1, "head anchor " + str(tpl.count("</head>"))
assert tpl.count("<style id=\"v16ui\">") == 0, "v16 block already present"
ui = open("quiz/_v16_ui.css", encoding="utf-8").read()
block = "\n<!-- v16 Lumina design system (source: quiz/_v16_ui.css) -->\n<style id=\"v16ui\">\n" + ui + "</style>\n"
tpl = tpl.replace("</head>", block + "</head>", 1)
print("ok shell v16 style block")

# ---------------- 2. AI Coach: premium cards ----------------
old = 't.innerHTML=e.map(function(t){return\'<div class="ai-it"><span class="ai-ico">\'+t.ico+\'</span><div class="ai-main"><b>\'+esc(t.txt)+"</b><small>"+esc(t.sub)+"</small><em>"+esc(t.why)+\'</em></div><button class="btn btn-gold ai-go" onclick="\'+t.fn+\'">\'+esc(t.btn)+"</button></div>"}).join("")'
assert tpl.count(old) == 1, "renderAi anchor " + str(tpl.count(old))
new = ('t.innerHTML=e.map(function(x,i){var H={"🎯":14,"📚":38,"🔁":212,"🏆":46,"📝":158,"⚡":40,"🧠":268,"⏰":4,"🚀":196,"📈":140,"🖨":92,"💡":46,"🏅":46,"🔥":18,"💪":346,"🌙":228,"🎓":262,"🧭":200,"✅":140,"📖":38},h=H[x.ico]||42;'
      'return\'<div class="ai-it\'+(0===i?" ai-top":"")+\'" style="--ih:\'+h+\';--i:\'+i+\'"><span class="ai-ico">\'+x.ico+\'</span><div class="ai-main"><b>\'+esc(x.txt)+"</b><small>"+esc(x.sub)+"</small><em>"+esc(x.why)+\'</em></div><button class="btn btn-gold ai-go" onclick="\'+x.fn+\'">\'+esc(x.btn)+"</button></div>"}).join("")')
tpl = tpl.replace(old, new, 1)
print("ok coach renderAi premium cards")
open("quiz/template.html", "w", encoding="utf-8").write(tpl)

# ---------------- 3. arcade: v16 CSS appended to its CSS string ----------------
app = open("quiz/_arc_app.js", encoding="utf-8").read()
boot = app.index("/* ---------- boot ---------- */")
quote = app.rindex('"', 0, boot)            # closing quote of the CSS chain
semi = app.index(";", quote)                # statement terminator
assert app[semi:semi + 6].startswith(";"), app[semi:semi + 6]
arc_css = open("quiz/_v16_arc.css", encoding="utf-8").read()
if "arcIn" not in app:
    app = app[:semi] + '\n    + "' + js_esc(arc_css) + '"' + app[semi:]
    print("ok arcade v16 CSS appended")
else:
    print("arcade v16 already present — skipped")
open("quiz/_arc_app.js", "w", encoding="utf-8").write(app)

# ---------------- 4. edu: v16 CSS appended to injectCss ----------------
edu = open("edu.js", encoding="utf-8").read()
if ".edu-modal{box-shadow:0 44px 92px" not in edu:
    append_anchor = "DOC.head.appendChild(c);"
    assert edu.count(append_anchor) == 1, "edu append anchor"
    q = edu.rindex('"', 0, edu.index(append_anchor))
    s2 = edu.index(";", q)
    edu_css = open("quiz/_v16_edu.css", encoding="utf-8").read()
    edu = edu[:s2] + ' + "' + js_esc(edu_css) + '"' + edu[s2:]
    print("ok edu v16 CSS appended")
else:
    print("edu v16 already present — skipped")
open("edu.js", "w", encoding="utf-8").write(edu)

# ---------------- 5. sw cache key ----------------
sw = open("sw.js", encoding="utf-8").read()
old_v = 'const NSS_V = "nssc-v20260907" + "-v15"; /* v15 — complete SS1–SS3 curriculum library: 684-topic term-by-term syllabus index and 19-subject lesson-note + question library (quiz/syllabus_data.js, quiz/curr_data.js). */'
assert sw.count(old_v) == 1, "sw anchor " + str(sw.count(old_v))
sw = sw.replace(old_v, 'const NSS_V = "nssc-v20260907" + "-v16"; /* v16 — Lumina UI refresh: design system (buttons, cards, gold sheen, scrollbar), premium AI Coach suggestion cards, Study Arcade + Teaching Suite polish. Bump per release (runtime cache key). */', 1)
open("sw.js", "w", encoding="utf-8").write(sw)
print("ok sw NSS_V -v16")
print("ALL v16 PATCHES APPLIED")
