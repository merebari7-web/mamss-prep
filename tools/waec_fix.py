# -*- coding: utf-8 -*-
"""v52 — WAEC-standard pass over the live question bank (docs/bank.js).

Surgical, deterministic, auditable. NEVER runs quiz/build.py (it would emit the
old template over the live redesign). Instead:

  1. decode bank.js (QUIZ_B64 → zlib → packed text; verify QUIZ_HASH)
  2. parse the engine's exact contract:  subjects \x02 SS1..SS3, 7 fields/question
  3. prove a byte-identical round-trip BEFORE changing anything
  4. apply the WAEC-standard fixes:
       F1  ordinal suffixes        ("3th term"  -> "3rd term")
       F2  stem end punctuation    (interrogatives get "?", imperatives get ".",
                                    completion stems ending ":" keep the colon)
       F3  template grammar        ("is NOT a waves?" -> "is NOT associated with
                                    Waves?"; explanations likewise, with proper
                                    topic capitalisation recovered from RNOTES)
       F5  field whitespace trims
  5. re-serialise, re-hash (sha256), recompress (zlib level 9), rewrite ONLY the
     two constants in bank.js; regenerate bank-raw.js around the new text
  6. mirror every content change into quiz/edits.json (the canonical record
     build.py applies), merging with the entries already there

Usage:  python3 tools/waec_fix.py            # dry run: report only
        python3 tools/waec_fix.py --apply    # write bank.js, bank-raw.js, edits.json
"""
import base64
import hashlib
import json
import os
import re
import sys
import zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(ROOT, "docs")
BANK = os.path.join(DOCS, "bank.js")
BANK_RAW = os.path.join(DOCS, "bank-raw.js")
EDITS = os.path.join(DOCS, "quiz", "edits.json")
M, W = "\x01", "\x02"

# ----------------------------------------------------------------- load/parse
src = open(BANK, encoding="utf-8").read()
b64_old = re.search(r'QUIZ_B64="([^"]+)"', src).group(1)
hash_old = re.search(r'QUIZ_HASH="([0-9a-f]{64})"', src).group(1)
text = zlib.decompress(base64.b64decode(b64_old)).decode("utf-8")
assert hashlib.sha256(text.encode("utf-8")).hexdigest() == hash_old, "existing bank fails its own hash!"

blocks = text.split(W)
subjects = blocks[0].split(M)
assert len(blocks) == 4 and len(subjects) == 13

classes = []          # [(name, [ [stem,o1,o2,o3,o4,idx,expl], ... ])]
for b in blocks[1:]:
    f = b.split(M)
    name, body = f[0], f[1:]
    assert len(body) % 7 == 0, name
    classes.append((name, [body[i:i + 7] for i in range(0, len(body), 7)]))

def serialise(subjs, cls):
    out = M.join(subjs)
    for name, qs in cls:
        out += W + name + M + M.join(x for q in qs for x in q)
    return out

assert serialise(subjects, classes) == text, "round-trip is not byte-identical — abort"

# ------------------------------------------------- proper topic names (RNOTES)
idx_src = open(os.path.join(DOCS, "index.html"), encoding="utf-8").read()
i = idx_src.index("RNOTES")
j = idx_src.index("{", i)
depth, k = 0, j
while k < len(idx_src):
    c = idx_src[k]
    if c == "{":
        depth += 1
    elif c == "}":
        depth -= 1
        if depth == 0:
            break
    k += 1
rnotes_lit = idx_src[j:k + 1]
TOPIC_PROPER = {}
for t in re.findall(r'[{,]\s*"([^"]+)"\s*:', rnotes_lit):
    TOPIC_PROPER.setdefault(t.lower().replace("&", "and").strip(), t)

def proper(x):
    key = x.strip().lower()
    if key in TOPIC_PROPER:
        return TOPIC_PROPER[key]
    if key.replace("&", "and") in TOPIC_PROPER:
        return TOPIC_PROPER[key.replace("&", "and")]
    return x[:1].upper() + x[1:]

# ------------------------------------------------------------------- the fixes
def fix_ordinal(t):
    def rep(m):
        n, suf = int(m.group(1)), m.group(2)
        want = "th" if n % 100 in (11, 12, 13) else {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")
        return m.group(1) + want
    return re.sub(r"\b(\d+)(st|nd|rd|th)\b", rep, t)

INTERROG = re.compile(r"^(Which|What|Who|Whom|Whose|Where|When|Why|How|Is|Are|Was|Were|Do|Does|Did|Can|Could|Will|Would|Shall|Should|May|Might|Must)\b")

def fix_punct(stem):
    if stem[-1:] in ".?!:;…”\"'":
        return stem
    return stem + ("?" if INTERROG.match(stem) else ".")

STEM_TPL = re.compile(r"^Which of the following is NOT (?:a|an) (.+?)\?$")
EXPL_TPL = re.compile(r"^(.+?) is not (?:a|an) (.+?); it is (?:a|an) (.+?)\.$")

# F6 — article agreement: "a oxygen" -> "an oxygen", "an boy" -> "a boy".
# silent-h words take "an"; yoo-sound words (eu-/uni-/one-) keep "a".
AN_WORDS = re.compile(r"^(?:hour|honou?r|honest|heir)", re.I)
A_WORDS = re.compile(r"^(?:eu|one|uni|use|user|usual|utility|utensil)", re.I)

def fix_article(t):
    def acronym(w):
        return len(w) > 1 and w.isupper()          # USB, HIV, ATP: pronunciation unknown — never touch
    def to_an(m):
        w = m.group(1)
        if acronym(w):
            return m.group(0)
        return "an " + w if (w[0] in "aeiouAEIOU" or AN_WORDS.match(w)) and not A_WORDS.match(w) else m.group(0)
    def to_a(m):
        w = m.group(1)
        if acronym(w):
            return m.group(0)
        if A_WORDS.match(w) and not AN_WORDS.match(w):
            return "a " + w
        return ("a " + w) if (w[0] not in "aeiouAEIOU" and not AN_WORDS.match(w)) else m.group(0)
    t = re.sub(r"\ba ([A-Za-z]+)", lambda m: to_an(m), t)
    t = re.sub(r"\ban ([A-Za-z]+)", lambda m: to_a(m), t)
    return t

# F7 — "Which of the following is a <X>?" where X is plural/uncountable and the
# article is ungrammatical ("a metals?", "a photosynthesis?", "a money?").
# Curated from a full enumeration of the 1,065 definition stems — only genuinely
# broken X values are listed; "a board of directors", "a homologous series",
# "a concave lens", "a balance of payments" etc. are correct and stay untouched.
REWRITE_POS = {
    "checks and balances", "civic duties", "complementary goods", "constitutional rights",
    "context clues", "duties", "free and fair elections", "fundamental human rights",
    "goods", "hormones", "liabilities", "metalloids", "metals", "noble gases",
    "non-metals", "normal goods", "phonetics", "platelets", "pull factors", "rights",
    "robotics", "services", "similar figures", "simultaneous equations", "substitute goods",
    "swing voters", "trade winds", "trafficking in persons", "wages", "wants",
    "commerce", "democracy", "digestion", "foreign trade", "germination", "gravity",
    "honesty", "humus", "money", "photosynthesis", "public opinion", "respiration",
    "sovereignty", "trade", "transpiration", "weather", "United Nations",
}
POS_PREFIX = {"United Nations": "the United Nations"}
POS_STEM = re.compile(r"^Which of the following is (?:a|an) (.+)\?$")

report = {"ordinal": 0, "punct": 0, "stem-tpl": 0, "expl-tpl": 0, "article": 0,
          "pos-def": 0, "trim": 0}
samples = {k: [] for k in report}
changes = []   # (class, subject, orig_stem, {"q":..,"e":..})

def subject_of(cls_name, qi):
    # 1300 per class = 13 subjects x 100, packed in the subjects-list order
    return subjects[qi // 100]

for cname, qs in classes:
    for qi, q in enumerate(qs):
        orig_stem, orig_expl = q[0], q[6]
        for f in range(7):
            trimmed = q[f].strip()
            if trimmed != q[f]:
                q[f] = trimmed
                report["trim"] += 1
        for f in range(7):
            fixed = fix_ordinal(q[f])
            if fixed != q[f]:
                if f == 0 and len(samples["ordinal"]) < 5:
                    samples["ordinal"].append((q[f][:70], fixed[:70]))
                report["ordinal"] += 1
                q[f] = fixed
        for f in range(7):
            fixed = fix_article(q[f])
            if fixed != q[f]:
                if len(samples["article"]) < 6:
                    samples["article"].append((q[f][:70], fixed[:70]))
                report["article"] += 1
                q[f] = fixed
        mp = POS_STEM.match(q[0])
        if mp and mp.group(1) in REWRITE_POS:
            new_stem = "Which of the following best describes %s?" % POS_PREFIX.get(mp.group(1), mp.group(1))
            report["pos-def"] += 1
            if len(samples["pos-def"]) < 6:
                samples["pos-def"].append((q[0][:70], new_stem[:70]))
        else:
            new_stem = fix_punct(q[0])
        if new_stem != q[0]:
            if len(samples["punct"]) < 5:
                samples["punct"].append((q[0][:70], new_stem[:70]))
            report["punct"] += 1
            q[0] = new_stem
        m = STEM_TPL.match(q[0])
        if m:
            new = "Which of the following is NOT associated with %s?" % proper(m.group(1))
            if len(samples["stem-tpl"]) < 5:
                samples["stem-tpl"].append((q[0][:70], new[:70]))
            report["stem-tpl"] += 1
            q[0] = new
        m2 = EXPL_TPL.match(q[6])
        if m2:
            g1 = m2.group(1)[:1].upper() + m2.group(1)[1:]
            new = "%s is not associated with %s; it belongs to %s." % (g1, proper(m2.group(2)), proper(m2.group(3)))
            if len(samples["expl-tpl"]) < 5:
                samples["expl-tpl"].append((q[6][:70], new[:70]))
            report["expl-tpl"] += 1
            q[6] = new
        if q[0] != orig_stem or q[6] != orig_expl:
            patch = {}
            if q[0] != orig_stem:
                patch["q"] = q[0]
            if q[6] != orig_expl:
                patch["e"] = q[6]
            changes.append((cname, subject_of(cname, qi), orig_stem, patch))

# ------------------------------------------------------------------- rebuild
new_text = serialise(subjects, classes)
new_hash = hashlib.sha256(new_text.encode("utf-8")).hexdigest()
new_b64 = base64.b64encode(zlib.compress(new_text.encode("utf-8"), 9)).decode("ascii")

print("WAEC-standard pass — report")
print("  questions parsed          :", sum(len(qs) for _, qs in classes))
print("  round-trip before edits   : byte-identical OK")
for k in ("ordinal", "punct", "stem-tpl", "expl-tpl", "article", "pos-def", "trim"):
    print("  %-26s: %d" % (k + " fixes", report[k]))
    for a, b in samples[k][:3]:
        print("      - %r\n      + %r" % (a, b))
print("  questions changed         :", len(changes))
print("  new QUIZ_HASH             :", new_hash[:16], "…")
print("  text delta chars          :", len(new_text) - len(text))

if "--apply" not in sys.argv:
    print("\nDRY RUN — pass --apply to write bank.js, bank-raw.js and edits.json")
    sys.exit(0)

# bank.js: replace only the two constants
out = re.sub(r'QUIZ_B64="[^"]+"', 'QUIZ_B64="%s"' % new_b64, src, count=1)
out = re.sub(r'QUIZ_HASH="[0-9a-f]{64}"', 'QUIZ_HASH="%s"' % new_hash, out, count=1)
assert out != src and 'QUIZ_B64="%s"' % new_b64 in out and 'QUIZ_HASH="%s"' % new_hash in out
open(BANK, "w", encoding="utf-8").write(out)

# bank-raw.js: keep the exact wrapper, swap the payload string
raw_src = open(BANK_RAW, encoding="utf-8").read()
start = raw_src.index("window.__BANK_RAW_TXT=")
end = raw_src.index(";\n", start)
raw_out = raw_src[:start] + "window.__BANK_RAW_TXT=" + json.dumps(new_text, ensure_ascii=False) + raw_src[end:]
open(BANK_RAW, "w", encoding="utf-8").write(raw_out)

# edits.json: merge stem/expl patches under CLASS|Subject, keyed by ORIGINAL stem
edits = json.load(open(EDITS, encoding="utf-8")) if os.path.exists(EDITS) else {}
n_added = 0
for cname, subj, orig_stem, patch in changes:
    key = "%s|%s" % (cname, subj)
    node = edits.setdefault(key, {}).setdefault("fix", {}).setdefault(orig_stem, {})
    node.update(patch)
    n_added += 1
json.dump(edits, open(EDITS, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

print("\napplied: bank.js + bank-raw.js rewritten; %d edit entries merged into quiz/edits.json" % n_added)

# self-verify the written artefacts
chk = open(BANK, encoding="utf-8").read()
b64v = re.search(r'QUIZ_B64="([^"]+)"', chk).group(1)
hv = re.search(r'QUIZ_HASH="([0-9a-f]{64})"', chk).group(1)
tv = zlib.decompress(base64.b64decode(b64v)).decode("utf-8")
assert hashlib.sha256(tv.encode("utf-8")).hexdigest() == hv == new_hash, "written bank fails hash"
assert tv == new_text, "written text mismatch"
rawv = open(BANK_RAW, encoding="utf-8").read()
payload = json.loads(rawv[rawv.index("window.__BANK_RAW_TXT=") + len("window.__BANK_RAW_TXT="):rawv.index(";\n", rawv.index("window.__BANK_RAW_TXT="))])
assert payload == new_text, "bank-raw payload mismatch"
print("self-verify: bank.js hash OK · bank-raw.js payload identical · all good")
