# -*- coding: utf-8 -*-
"""#85 Batch-edit the bank safely — regenerate a subject without touching its neighbours.

The bank is generated (13 subject generators x 3 classes). This tool lets you fix
questions (typos, wrong keys, weak explanations) via a small JSON edits file and
rebuild, while guaranteeing that every subject you did NOT touch stays byte-identical.

Commands
--------
python3 quiz/bank_edit.py --init          # record the current clean manifest
python3 quiz/bank_edit.py --check         # regenerate; verify unedited subjects == manifest
python3 quiz/bank_edit.py --apply quiz/edits/Biology-SS3.json
                                          # validate + apply edits + rebuild + verify

Edits file format (keys: "CLASS|Subject"):
{
  "SS3|Biology": {
    "fix": {
      "Which organelle produces ATP?": { "e": "Mitochondria — the site of aerobic respiration.", "a": 0 }
    }
  }
}
Every edited question is matched by its exact stem; options/explanations may be replaced.
"""
import json, os, sys, hashlib

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from registry import REGISTRY, question_bank

CLASSES = ["SS1", "SS2", "SS3"]
EDITS = os.path.join(HERE, "edits.json")
MANIFEST = os.path.join(HERE, "bank_manifest.json")
CLS_NAMES = {0: "SS1", 1: "SS2", 2: "SS3"}

def bank():
    """All questions, keyed 'CLASS|Subject' -> list of {q,o,a,e} (with s)."""
    out = {}
    for idx in range(3):
        for name, mod, seed in REGISTRY:
            out["%s|%s" % (CLS_NAMES[idx], name)] = question_bank(idx)[name]
    return out

def subj_hash(qs):
    return hashlib.sha256(json.dumps([[q["q"], q["o"], q["a"], q["e"]] for q in qs],
                                     ensure_ascii=False, sort_keys=True).encode("utf-8")).hexdigest()

def manifest_of(b):
    return {k: subj_hash(v) for k, v in b.items()}

def load_edits(path=EDITS):
    if not os.path.exists(path):
        return {}
    e = json.load(open(path, encoding="utf-8"))
    assert isinstance(e, dict), "edits must be an object"
    for key, val in e.items():
        assert "|" in key and key.split("|")[0] in CLASSES, "bad key %s" % key
        assert isinstance(val, dict) and "fix" in val, "key %s needs {\"fix\": {...}}" % key
    return e

def apply_edits(b, edits):
    touched = []
    for key, spec in edits.items():
        qs = b.get(key)
        assert qs, "unknown subject %s" % key
        fix = spec["fix"]
        by_stem = {q["q"]: q for q in qs}
        for stem, patch in fix.items():
            q = by_stem.get(stem)
            assert q, "%s: stem not found: %s" % (key, stem[:60])
            for f in patch:
                assert f in ("q", "o", "a", "e"), "%s: bad field %s" % (key, f)
                if f == "o":
                    assert len(patch["o"]) == 4 and all(isinstance(x, str) and x for x in patch["o"]), key
                if f == "a":
                    assert patch["a"] in (0, 1, 2, 3), key
                if f in ("q", "e"):
                    assert isinstance(patch[f], str) and patch[f].strip(), key
                q[f] = patch[f]
        touched.append(key)
    return touched

def validate(b):
    for key, qs in b.items():
        assert len(qs) == 100, "%s: %d" % (key, len(qs))
        assert len(set(q["q"] for q in qs)) == 100, "%s: duplicate stems" % key
        for q in qs:
            assert len(q["o"]) == 4 and 0 <= q["a"] <= 3 and q["q"] and q["e"], key

def cmd_init():
    b = bank(); validate(b)
    m = manifest_of(b)
    json.dump(m, open(MANIFEST, "w", encoding="utf-8"), indent=0, sort_keys=True)
    print("manifest recorded: %d subjects" % len(m))

def cmd_check():
    b = bank(); validate(b)
    edits = load_edits()
    touched = set(apply_edits(b, edits))
    man = json.load(open(MANIFEST, encoding="utf-8"))
    drift = [k for k in b if k not in touched and man.get(k) != subj_hash(b[k])]
    if drift:
        print("DRIFT in unedited subjects (generator changed):", drift)
        sys.exit(1)
    print("check OK: %d subjects, %d edited, unedited byte-identical to manifest"
          % (len(b), len(touched)))

def cmd_apply(path):
    edits = load_edits(path)
    assert edits, "edits file is empty"
    b = bank(); validate(b)
    touched = apply_edits(b, edits)
    validate(b)
    print("edits OK: %d subject(s) touched: %s" % (len(touched), ", ".join(touched)))
    # mirror into quiz/edits.json then rebuild via the normal pipeline
    json.dump(edits, open(EDITS, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    os.system("python3 %s && node %s" % (os.path.join(HERE, "build.py"),
                                         os.path.join(HERE, "minify.js")))
    cmd_check()
    print("apply complete — bank rebuilt with edits; neighbours verified untouched")

if __name__ == "__main__":
    if "--init" in sys.argv: cmd_init()
    elif "--check" in sys.argv: cmd_check()
    elif "--apply" in sys.argv:
        assert len(sys.argv) == 3, "usage: --apply <edits.json>"
        cmd_apply(sys.argv[2])
    else:
        print(__doc__)
