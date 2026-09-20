#!/usr/bin/env python3
# Repairs the arcade.js source: the v16/v17/v18 arcade CSS packs were appended
# at the wrong anchor (inside the lesson() toast call — the append helper
# grabbed the last quote before the boot comment, which belonged to the toast
# string) so they never reached the runtime stylesheet. This fixes lesson()
# back to a plain toast and then re-appends the three packs at the TRUE end of
# the `var CSS = "..." + "..."` chain by walking the concatenation.
import re, sys

def walk_chain_end(src, anchor):
    """anchor is the index just past 'var CSS ='; returns index of the ';' that
    terminates the concatenation (string-literal walk)."""
    j = anchor
    while j < len(src) and src[j] in " \t\n\r": j += 1
    if src[j] != '"':
        raise ValueError("chain does not start with a quote at %d" % j)
    while True:
        # skip a string literal
        assert src[j] == '"', "expected quote at %d" % j
        j += 1
        while j < len(src):
            c = src[j]
            if c == "\\":
                j += 2; continue
            if c == '"':
                j += 1; break
            j += 1
        while j < len(src) and src[j] in " \t\n\r": j += 1
        if j < len(src) and src[j] == "+":
            j += 1
            while j < len(src) and src[j] in " \t\n\r": j += 1
            continue
        break
    assert src[j] == ";", "expected ; at %d (%r)" % (j, src[j:j + 20])
    return j

CSS_HEADER = "/* v16/v17/v18 Lumina + Aurum arcade packs (re-appended by quiz/_fix_arc_css.py) */\n"

def js_esc(css):
    out = css.replace("\\", "\\\\").replace('"', '\\"')
    return out.replace("\n", "\\n")

p = "quiz/_arc_app.js"
s = open(p, encoding="utf-8").read()

# ---- 1. repair lesson() toast ----
pat = re.compile(r'toast\("Lesson notes are loading — tap the Teaching Suite button", "📘"\)[\s\S]*?\n  \}', re.M)
m = pat.search(s)
if not m:
    print("lesson() toast already clean — not a repo copy?"); sys.exit(1)
s = s[:m.start()] + 'toast("Lesson notes are loading — tap the Teaching Suite button", "📘");\n  }' + s[m.end():]
print("ok lesson() toast repaired")

# ---- 2. append the three packs at the true chain end ----
anchor = s.index('var CSS =') + len('var CSS =')
j = walk_chain_end(s, anchor)
print("css chain end found at", j, "| tail before ;:", repr(s[j - 40:j]))
packs = [open("quiz/_v16_arc.css", encoding="utf-8").read(),
         open("quiz/_v17_arc.css", encoding="utf-8").read(),
         open("quiz/_v18_arc.css", encoding="utf-8").read()]
ins = ""
for css in packs:
    ins += '\n    + "' + js_esc(css) + '"'
s = s[:j] + ins + s[j:]
open(p, "w", encoding="utf-8").write(s)
print("ok 3 packs appended at true chain end")

# ---- 3. verify ----
import subprocess
r = subprocess.run(["node", "-e", """
const fs=require('fs');
function extract(src){
  const i=src.indexOf('var CSS ='); if(i<0) return null;
  let j=src.indexOf('=',i)+1;
  while(j<src.length && /\\s/.test(src[j])) j++;
  let css='';
  while(j<src.length){
    if(src[j]==='"'){ j++; let st='';
      while(j<src.length){ const c=src[j];
        if(c==='\\\\'){ st+=src[j+1]; j+=2; continue; }
        if(c==='"'){ j++; break; }
        st+=c; j++; }
      css+=st;
      while(j<src.length && /\\s/.test(src[j])) j++;
      if(src[j]==='+'){ j++; while(j<src.length && /\\s/.test(src[j])) j++; continue; }
      break;
    } else break;
  }
  return css;
}
const c=extract(fs.readFileSync('quiz/_arc_app.js','utf8'));
console.log('chain len:', c.length, '| arcIn:', c.includes('arcIn'), '| arcMfloat:', c.includes('arcMfloat'), '| auFlow:', c.includes('auFlow'));
"""], capture_output=True, text=True)
print(r.stdout.strip() or r.stderr.strip())
subprocess.run(["node", "--check", p], check=True)
print("node --check OK")
