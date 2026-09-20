#!/usr/bin/env python3
# v25.0 "NERDC Lesson Notes" — shell: floating launcher + lazy loader for the
# lesson-notes library (quiz/notes_data.js + quiz/notes_app.js) + SW cache-key
# bump. Assertion-guarded and idempotent.
import os

HERE = os.path.dirname(os.path.abspath(__file__))
TPL = os.path.join(HERE, "template.html")
SW = os.path.join(HERE, "..", "sw.js")

MARKER = "<!-- builder markers: LIVING GOLD-DUST"
BLOCK = (
    '\n<!-- v25.0 NERDC Lesson Notes launcher (source: quiz/_patch_v25.py) -->\n'
    '<script>window.notes=function(){var a=arguments;if(window.NT&&NT.open)return NT.open.apply(NT,a);'
    'if(!window.__ntW)window.__ntW=[];window.__ntW.push(function(){try{NT.open.apply(NT,a)}catch(e){}});'
    'if(window.__ntL)return;window.__ntL=1;var s=document.createElement("script");s.src="quiz/notes_data.js";s.async=1;'
    's.onload=function(){var s2=document.createElement("script");s2.src="quiz/notes_app.js";s2.async=1;'
    's2.onload=function(){delete window.__ntL;var w=(window.__ntW||[]).splice(0);'
    'for(var i=0;i<w.length;i++){try{w[i]()}catch(e){}}};'
    's2.onerror=function(){delete window.__ntL;try{toast("Lesson Notes need one online visit to load","📖")}catch(e){}};'
    'document.head.appendChild(s2)};s.onerror=function(){delete window.__ntL;'
    'try{toast("Lesson Notes need one online visit to load","📖")}catch(e){}};document.head.appendChild(s)};'
    'if(!document.getElementById("ntLaunch")){var x=document.createElement("button");x.id="ntLaunch";'
    'x.className="edu-launcher";x.type="button";x.title="Open the NERDC Lesson Notes";'
    'x.setAttribute("aria-label","Open the NERDC Lesson Notes");'
    'x.innerHTML=\'<span class="edu-launch-ico">📖</span><span class="edu-launch-txt">Notes</span>\';'
    'x.onclick=function(){window.notes()};x.style.top="calc(62px + env(safe-area-inset-top))";'
    'document.body.appendChild(x)}</script>\n'
)

tpl = open(TPL, encoding="utf-8").read()
assert MARKER in tpl, "builder-marker anchor missing"
if "window.notes=function" not in tpl:
    assert tpl.count(MARKER) == 1, "marker ambiguous"
    tpl = tpl.replace(MARKER, BLOCK + MARKER, 1)
    open(TPL, "w", encoding="utf-8").write(tpl)
    print("ok shell notes loader + launcher")
else:
    print("shell notes already present — skipped")

sw = open(SW, encoding="utf-8").read()
if '"-v25"' in sw:
    print("sw already -v25 — skipped")
else:
    assert sw.count('"-v24"') == 1, "sw -v24 literal ambiguous/missing"
    sw = sw.replace('"-v24"', '"-v25"', 1)
    marker = "/* v24 — aurum polish layer"
    assert sw.count(marker) == 1, "v24 comment marker missing"
    sw = sw.replace(marker,
        "/* v25 — NERDC Lesson Notes: Primary (Basic 1-6) + Secondary curriculum module, full 8-part lesson notes, scheme-of-work generator, role dashboards and author mode (lazy quiz/notes_data.js + notes_app.js) */; " + marker, 1)
    open(SW, "w", encoding="utf-8").write(sw)
    print("ok sw -v25")
