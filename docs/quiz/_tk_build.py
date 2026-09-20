# Build quiz/toolkit.js = data (elements + formulas) + UI (tk_ui.js)
import json, io, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tk_elements import ELEMENTS
from tk_formulas import FORMULAS

zs = [e[0] for e in ELEMENTS]
assert len(ELEMENTS) == 118 and sorted(zs) == list(range(1, 119)), "elements invalid"
assert all(len(e) == 7 for e in ELEMENTS), "element field count"
for f in FORMULAS:
    assert len(f) == 5 and f[0] in ("Maths", "Physics", "Chemistry"), "formula invalid: %s" % (f,)

def js(rows): return json.dumps(rows, ensure_ascii=False, separators=(",", ":"))

data = ("/* v30 Scholar Toolkit — embedded data (built by _tk_build.py) */\n"
        "var ELEMS=" + js(ELEMENTS) + ";\n"
        "var FORMS=" + js(FORMULAS) + ";\n")
ui = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "tk_ui.js"), encoding="utf-8").read()
out = data + ui
open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "toolkit.js"), "w", encoding="utf-8").write(out)
print("toolkit.js: %d bytes | %d elements | %d formulas" % (len(out.encode("utf-8")), len(ELEMENTS), len(FORMULAS)))
