#!/usr/bin/env python3
# v20 "AI Coach — Suggested for you, desktop-responsive" — shell CSS pack +
# SW cache-key bump. Assertion-guarded + idempotent (no quote-hunting).
import os

HERE = os.path.dirname(os.path.abspath(__file__))
TPL = os.path.join(HERE, "template.html")
SW = os.path.join(HERE, "..", "sw.js")
UI = os.path.join(HERE, "_v20_ui.css")

# 1. shell
tpl = open(TPL, encoding="utf-8").read()
assert '<style id="v19ui">' in tpl, "v19ui block missing — run v19 patch chain first"
if '<style id="v20ui">' not in tpl:
    ui = open(UI, encoding="utf-8").read()
    block = "\n<!-- v20 AI Coach desktop-responsive (source: quiz/_v20_ui.css) -->\n<style id=\"v20ui\">\n" + ui + "</style>\n"
    assert tpl.count("</head>") == 1, "head anchor ambiguous"
    tpl = tpl.replace("</head>", block + "</head>", 1)
    open(TPL, "w", encoding="utf-8").write(tpl)
    print("ok shell v20 style block")
else:
    print("shell v20 already present — skipped")

# 2. service worker
sw = open(SW, encoding="utf-8").read()
if '"-v20"' in sw:
    print("sw already -v20 — skipped")
else:
    assert sw.count('"-v19"') == 1, "sw -v19 literal ambiguous/missing"
    sw = sw.replace('"-v19"', '"-v20"', 1)
    marker = "/* v19 — all-device"
    assert marker in sw, "v19 comment marker missing"
    sw = sw.replace(marker,
        "/* v20 — AI Coach suggested-for-you desktop layout: generous 2-column grid >=1024px with centred, never-squeezed action buttons */; " + marker, 1)
    open(SW, "w", encoding="utf-8").write(sw)
    print("ok sw -v20")
