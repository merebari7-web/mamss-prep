# -*- coding: utf-8 -*-
"""Build the website:
1. Generate 3,900 questions (13 subjects x 3 classes x 100) from the generator modules.
2. Serialize compactly: {"subj":[13 subject names], "classes":[[cls,[[q,o,a,e]x1300]x3]}.
3. Emit index.html — the APP script first (so the page shell always boots and can
   show a visible error), then the bank as a directly embedded JS literal that
   parses synchronously in every browser (no decompression step at all).

The result is a single self-contained file (~1.6 MB on disk, ~220 KiB gzipped over
the wire). No external dependencies.
"""
import json, os, sys, re, zlib, base64, hashlib

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from registry import REGISTRY, question_bank
from notes import NOTES

CLASSES = ["SS1", "SS2", "SS3"]

def extract_topics(template):
    """Pull the app's TOPICS map out of template.html and cross-check NOTES."""
    i = re.search(r"TOPICS\s*=", template).start()
    j = template.index("{", i)
    depth, k = 0, j
    while k < len(template):
        if template[k] == "{": depth += 1
        elif template[k] == "}":
            depth -= 1
            if depth == 0: break
        k += 1
    raw = template[j:k + 1]
    try:
        data = json.loads(raw)             # TOPICS is JSON-shaped by construction
    except Exception:
        return None                        # minified form (js object literal) — skip cross-check
    assert set(NOTES) == set(data), f"notes subjects {set(NOTES) ^ set(data)}"
    for subj, topics in data.items():
        names = [t[0] for t in topics]
        assert set(NOTES[subj]) == set(names), f"{subj}: {set(NOTES[subj]) ^ set(names)}"
        for tp in names:
            assert len(NOTES[subj][tp]) > 40, f"card too thin: {subj}/{tp}"
    return data

def build_data():
    """Compact form: [[class, [[s, q, o, a, e] x100] x13] x3] (keeps s for validation)."""
    data = []
    for idx, cls in enumerate(CLASSES):
        bank = question_bank(idx)
        qs = []
        for name, mod, seed in REGISTRY:
            qs.extend(bank[name])
        data.append([cls, [[q["s"], q["q"], q["o"], q["a"], q["e"]] for q in qs]])
    return data

def validate(data):
    assert len(data) == 3, f"classes: {len(data)}"
    for cls, qs in data:
        assert len(qs) == 1300, f"{cls}: {len(qs)}"
        subs = {}
        for q in qs:
            assert len(q[2]) == 4 and 0 <= q[3] <= 3 and q[1] and q[4] and q[0]
            subs[q[0]] = subs.get(q[0], 0) + 1
        assert all(v == 100 for v in subs.values()), f"{cls}: {subs}"
        assert len(set(q[1] for q in qs)) == 1300, f"{cls}: duplicate stems"

def pack(data):
    """Strip the per-question subject (derivable from position) into a shared list."""
    subj = [name for name, _, _ in REGISTRY]
    classes = [[cls, [[q[1], q[2], q[3], q[4]] for q in qs]] for cls, qs in data]
    return {"subj": subj, "classes": classes}

# ---- delimiter-packed wire form (smaller + faster than JSON, and it also
#      skips JSON's quote/brace overhead before compression) ----
C1, C2 = "\x01", "\x02"   # field / record separators; verified absent from bank text

def pack_packed(payload):
    parts = [C1.join(payload["subj"])]
    for cls, qs in payload["classes"]:
        f = [cls]
        for q in qs:
            f += [q[0], q[1][0], q[1][1], q[1][2], q[1][3], str(q[2]), q[3]]
        parts.append(C1.join(f))
    return C2.join(parts)

def unpack_packed(s):
    parts = s.split(C2)
    assert len(parts) == 4, f"classes blocks: {len(parts)}"
    names = parts[0].split(C1)
    classes = []
    for pi in range(1, 4):
        fs = parts[pi].split(C1)
        assert len(fs) == 1 + 1300 * 7, f"fields: {len(fs)}"
        qs = []
        for i in range(1300):
            b = 1 + i * 7
            qs.append([fs[b], [fs[b + 1], fs[b + 2], fs[b + 3], fs[b + 4]], int(fs[b + 5]), fs[b + 6]])
        classes.append([fs[0], qs])
    return {"subj": names, "classes": classes}

def unpack(payload):
    out = []
    for cls, qs in payload["classes"]:
        out.append([
            [payload["subj"][i // 100], q[0], q[1], q[2], q[3]] for i, q in enumerate(qs)
        ])
    return out

def apply_edits(data):
    """#85 safe batch-edit: quiz/edits.json patches question fields by exact stem.
    Keys are 'CLASS|Subject' (e.g. 'SS3|Biology'); unedited subjects are untouched,
    and bank_edit.py --check verifies neighbours byte-identical via the manifest."""
    ep = os.path.join(HERE, "edits.json")
    if not os.path.exists(ep):
        return
    edits = json.load(open(ep, encoding="utf-8"))
    assert isinstance(edits, dict)
    by_subj = {}
    for idx, cls in enumerate(CLASSES):
        names = [name for name, _, _ in REGISTRY]
        start = idx * 1300
        for si, name in enumerate(names):
            by_subj["%s|%s" % (cls, name)] = (data[idx][1][si * 100:(si + 1) * 100], start + si * 100)
    for key, spec in edits.items():
        qs, _ = by_subj[key]  # qs is a live view slice -> mutation lands in data
        fix = spec["fix"]
        by_stem = {q[1]: q for q in qs}
        for stem, patch in fix.items():
            q = by_stem.get(stem)
            assert q, "%s: stem not found: %s" % (key, stem[:60])
            if "q" in patch: q[1] = patch["q"]
            if "o" in patch: q[2] = patch["o"]
            if "a" in patch: q[3] = patch["a"]
            if "e" in patch: q[4] = patch["e"]
        print("bank edit applied: %s (%d question(s))" % (key, len(fix)))
    validate(data)


def main():
    data = build_data()
    validate(data)
    apply_edits(data)

    payload = pack(data)
    # ---- wire form: delimiter-packed -> deflate -> base64 ----
    packed_text = pack_packed(payload)
    packed = packed_text.encode("utf-8")
    try:
        from zopfli.zlib import compress as zopfli_zlib
        z = zopfli_zlib(packed)
    except Exception:
        raise SystemExit("zopfli is required for a deterministic bank build - pip install zopfli")
    b64 = base64.b64encode(z).decode("ascii")

    # Self-verify: the packed form must round-trip to the validated full data
    back = unpack_packed(packed_text)
    assert back["subj"] == payload["subj"] and back["classes"] == payload["classes"], "packed round-trip mismatch"
    back2 = unpack(json.loads(json.dumps(payload, ensure_ascii=False, separators=(",", ":"))))
    assert back2 == [ [q for q in qs] for _, qs in data ], "unpack round-trip mismatch"
    for cls, cls_qs in back["classes"]:
        assert len(cls_qs) == 1300
        for q in cls_qs:
            assert len(q) == 4 and q[2] in (0, 1, 2, 3) and q[0] and q[3], (cls, q[0][:40])
    # separator characters must never appear inside the bank text itself
    for s2 in payload["subj"]:
        assert not any(ord(c) < 32 for c in s2)
    for cls, qs in payload["classes"]:
        assert not any(ord(c) < 32 for c in cls)
        for q in qs:
            for f in [q[0]] + q[1] + [q[3]]:
                assert not any(ord(c) < 32 for c in f), "bank text contains a separator character"
    print(f"packed round-trip OK: {len(packed_text):,} B -> zlib {len(z):,} B -> b64 {len(b64):,} B")

    tpl = open(os.path.join(HERE, "template.html"), encoding="utf-8").read()
    extract_topics(tpl)
    assert "/* __DATA__ */" in tpl and "/* __HASH__ */" in tpl and "/* __PAKO__ */" not in tpl
    hash_hex = hashlib.sha256(packed).hexdigest()
    # ---- split build: the bank ships as a sibling asset (bank.js) ----
    m = re.search(r"<!--BANK_BLOCK_START--><script>.*?</script><!--BANK_BLOCK_END-->", tpl, re.S)
    assert m, "bank block markers not found in template"
    inner = m.group(0)
    inner = inner[len("<!--BANK_BLOCK_START--><script>"):-len("</script><!--BANK_BLOCK_END-->")]
    bank_js = inner.replace("/* __DATA__ */", '"' + b64 + '"').replace("/* __HASH__ */", '"' + hash_hex + '"')
    assert "/* __DATA__ */" not in bank_js and "/* __HASH__ */" not in bank_js
    out = tpl.replace(m.group(0), "")
    assert '<script src="bank.js"></script>' in out, "bank.js script tag missing"
    with open("bank.js", "w", encoding="utf-8") as f:
        f.write(bank_js.strip("\n"))

    # revision notes ride as app JS — but only if the template does not already
    # carry its own (v8+ guarded builds supply notes elsewhere); never dupe data.
    assert "</body>" in out
    if "REVISION NOTES DATA" not in out and "RNOTES" not in out:
        rnotes_js = "const RNOTES = " + json.dumps(NOTES, ensure_ascii=False, separators=(",", ":")) + ";"
        out = out.replace("</body>", '<script>/* REVISION NOTES DATA */' + rnotes_js + "</script>\n</body>", 1)

    # make sure the app script really comes BEFORE the payload blob
    app_at = out.index("/* ================= CONFIG")
    assert app_at < out.index('<script src="bank.js"></script>')
    # cosmetic cleanup so an unchanged build reproduces the committed artifact
    out = out.replace("/* ================= CONFIG */", "", 1)
    out = out.replace('<script src="bank.js"></script>\n\n', '<script src="bank.js"></script>\n')
    data_at = out.index('<script src="bank.js"></script>')
    assert app_at < data_at, "app script must precede the bank asset"

    with open("index.html", "w", encoding="utf-8") as f:
        f.write(out)
    with open(os.path.join(HERE, "_raw_check.json"), "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(HERE, "_packed_check.txt"), "w", encoding="utf-8") as f:
        f.write(packed_text)

    # companion service worker (offline/install-free re-open)
    sw_path = os.path.join(HERE, "sw.js")
    if not os.path.exists(sw_path):
        sw_path = os.path.join(HERE, "..", "sw.js")
    sw_src = open(sw_path, encoding="utf-8").read()
    with open("sw.js", "w", encoding="utf-8") as f:
        f.write(sw_src)

    sha = hashlib.sha256(out.encode("utf-8")).hexdigest()
    print(f"bank wire form: packed {len(packed):,} B -> zlib {len(z):,} B -> b64 {len(b64):,} B")
    print(f"index.html: {len(out.encode('utf-8')):,} bytes | sha256: {sha}")
    print(f"verify: python -> {'OK' if unpack_packed(packed_text) == payload else 'FAIL'}")

if __name__ == "__main__":
    main()
