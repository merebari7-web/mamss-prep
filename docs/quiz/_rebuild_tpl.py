# -*- coding: utf-8 -*-
"""One-shot: reconstruct quiz/template.html from the COMMITTED index.html + bank.js.
Run from the repo root while the working tree holds the pristine committed files."""
import re, os, shutil

def valspan(txt, name):
    """Return (start, end) of the quoted value after `name=`, including the quotes."""
    i = txt.index(name + "=")
    q = txt.index('"', i)
    e = txt.index('"', q + 1)
    return q, e + 1

def main():
    assert os.path.exists("bank.js") and os.path.exists("index.html")
    src = open("index.html", encoding="utf-8").read()
    bank = open("bank.js", encoding="utf-8").read()
    print("bank bytes:", len(bank.encode("utf-8")), "| index bytes:", len(src.encode("utf-8")))

    q1, e1 = valspan(bank, "QUIZ_B64")
    q2, e2 = valspan(bank, "QUIZ_HASH")
    print("b64 span:", e1 - q1, "| hash span:", e2 - q2)
    assert e1 - q1 > 100000, "b64 span too small"
    assert e2 - q2 == 66, "hash span should be 64 hex + 2 quotes"

    inner = bank[:q1] + "/* __DATA__ */" + bank[e1:q2] + "/* __HASH__ */" + bank[e2:]
    for probe in ("const QUIZ_B64=/* __DATA__ */", "QUIZ_HASH=/* __HASH__ */"):
        print("probe", repr(probe[:34]), "->", probe in inner)
    # helper text for templating (moved out of payload line) is fine as-is

    block = "<!--BANK_BLOCK_START--><script>\n" + inner + "\n</script><!--BANK_BLOCK_END-->"
    tag = '<script src="bank.js"></script>'
    assert src.count(tag) == 1, "src tag count %d" % src.count(tag)
    tpl = src.replace(tag, tag + "\n" + block, 1)
    i = tpl.find("<script>")
    assert i > 0
    tpl = tpl[:i + 8] + "\n/* ================= CONFIG */" + tpl[i + 8:]

    old = "quiz/template.html"
    if os.path.exists(old):
        shutil.copy(old, old + ".bak")
    open(old, "w", encoding="utf-8").write(tpl)
    print("template written:", len(tpl.encode("utf-8")), "bytes | placeholders:",
          tpl.count("/* __DATA__ */"), tpl.count("/* __HASH__ */"), "| rnotes:", tpl.count("RNOTES"))

if __name__ == "__main__":
    main()
