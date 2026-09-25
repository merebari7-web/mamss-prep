#!/usr/bin/env python3
"""waec_audit.py — regression linter for the WAEC-standard question bank.

Re-runnable after ANY future bank edit. Exits non-zero on:
  * bank.js failing its own QUIZ_HASH integrity contract
  * format-contract violations (4 blocks, 13 subjects, 3 classes x 1300,
    7 fields/question, 4 non-empty options, answer index 0-3)
  * any defect family fixed by the v52 WAEC pass reappearing:
      F1 ordinal typos            ("3th term")
      F2 missing end punctuation  (interrogative/imperative stems)
      F3 "NOT a/an <topic>" template stems + "is not a X; it is a Y." explanations
      F6 article agreement        ("a oxygen", "an utility", acronyms exempt)
      F7 ungrammatical definition stems ("is a metals?", "is a photosynthesis?")
  * bank-raw.js payload != decoded bank.js text (rescue-file drift)
  * docs/quiz/edits.json invalid, or missing the merged WAEC edit record

Usage:  python3 tools/waec_audit.py [--quiet] [--json]
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
M, W = "\x01", "\x02"

# ---- F7 curated list (from waec_fix.py): X values that must never appear as
# "Which of the following is a/an X?" — they need the "best describes" form.
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
# F6 vowel-start words that take "an" (acronyms are exempt from the rule)
VOWEL_ART = ("oxygen", "aluminium", "iron", "acid", "angle", "atom", "element",
             "energy", "equation", "ion", "isotope", "integer", "umbrella",
             "orange", "apple", "eye", "ear", "egg", "ice", "oil", "oxide",
             "hour", "honesty")
YOO_ART = ("utility", "unit", "uniform", "university", "European", "user")

fails, infos = [], []


def fail(msg):
    fails.append(msg)


def info(msg):
    infos.append(msg)


def audit():
    # ---- bank.js: constants + integrity -----------------------------------
    src = open(os.path.join(DOCS, "bank.js"), encoding="utf-8").read()
    mb = re.search(r'QUIZ_B64="([^"]+)"', src)
    mh = re.search(r'QUIZ_HASH="([0-9a-f]{64})"', src)
    if not mb or not mh:
        fail("bank.js: QUIZ_B64/QUIZ_HASH constants not found")
        return
    text = zlib.decompress(base64.b64decode(mb.group(1))).decode("utf-8")
    actual = hashlib.sha256(text.encode("utf-8")).hexdigest()
    if actual != mh.group(1):
        fail("bank.js: decoded text sha256 != QUIZ_HASH (%s…)" % actual[:16])
        return
    info("QUIZ_HASH verified: %s…" % actual[:16])

    # ---- format contract ---------------------------------------------------
    blocks = text.split(W)
    if len(blocks) != 4:
        fail("format: expected 4 blocks, got %d" % len(blocks))
        return
    subjects = blocks[0].split(M)
    if len(subjects) != 13:
        fail("format: expected 13 subjects, got %d" % len(subjects))
    total = 0
    for b in blocks[1:]:
        f = b.split(M)
        name, body = f[0], f[1:]
        if len(body) % 7:
            fail("format: %s body not a multiple of 7 fields" % name)
            continue
        n = len(body) // 7
        total += n
        if n != 1300:
            fail("format: %s has %d questions (expected 1300)" % (name, n))
        for i in range(n):
            q = body[i * 7:i * 7 + 7]
            if not q[0].strip() or any(not o.strip() for o in q[1:5]):
                fail("format: %s q%d has empty stem/option" % (name, i))
            if q[5] not in ("0", "1", "2", "3"):
                fail("format: %s q%d answer index out of range: %r" % (name, i, q[5]))
    info("format contract OK: 3900 questions parsed" if total == 3900
         else "format: total %d questions" % total)

    # ---- defect-family scans ------------------------------------------------
    d = {"ordinal": 0, "punct": 0, "not-tpl": 0, "expl-tpl": 0, "article": 0, "pos-def": 0}
    seen = {"not-assoc": 0, "best-desc": 0, "expl-assoc": 0}
    end_ok = '.?!:;\u2026\u201d"\''   # mirrors waec_fix.py fix_punct allow-set exactly (incl. U+201D)
    for b in blocks[1:]:
        f = b.split(M)
        body = f[1:]
        for i in range(len(body) // 7):
            q = body[i * 7:i * 7 + 7]
            stem, expl = q[0], q[6]
            if re.search(r"\b(1th|2th|3th|4rd)\b", stem + " " + expl):
                d["ordinal"] += 1
            if stem[-1:] not in end_ok:
                d["punct"] += 1
            if re.match(r"^Which of the following is NOT (a|an) [a-z]", stem):
                d["not-tpl"] += 1
            if re.search(r"\bis not a [a-z]+; it is a [a-z]+\.", expl):
                d["expl-tpl"] += 1
            blob = stem + " " + " ".join(q[1:5]) + " " + expl
            if re.search(r"\ba (%s)\b" % "|".join(VOWEL_ART), blob) or \
               re.search(r"\ban (%s)\b" % "|".join(YOO_ART), blob):
                d["article"] += 1
            mp = re.match(r"^Which of the following is (?:a|an) (.+)\?$", stem)
            if mp and mp.group(1) in REWRITE_POS:
                d["pos-def"] += 1
            if "NOT associated with" in stem:
                seen["not-assoc"] += 1
            if stem.startswith("Which of the following best describes "):
                seen["best-desc"] += 1
            if "is not associated with" in expl:
                seen["expl-assoc"] += 1
    for k, v in d.items():
        if v:
            fail("defect family %r: %d hits remain" % (k, v))
        else:
            info("defect family %r: clean" % k)
    # fix presence (informational counts from the v52 pass)
    if seen["not-assoc"] < 149:
        fail("expected >=149 'NOT associated with' stems, found %d" % seen["not-assoc"])
    if seen["best-desc"] < 51:
        fail("expected >=51 'best describes' stems, found %d" % seen["best-desc"])
    if seen["expl-assoc"] < 147:
        fail("expected >=147 rewritten explanations, found %d" % seen["expl-assoc"])
    info("fixes present: %d NOT-associated stems, %d best-describes stems, %d rewritten explanations"
         % (seen["not-assoc"], seen["best-desc"], seen["expl-assoc"]))

    # ---- bank-raw.js rescue file must mirror the bank exactly ---------------
    raw = open(os.path.join(DOCS, "bank-raw.js"), encoding="utf-8").read()
    mr = re.search(r'__BANK_RAW_TXT\s*=\s*"((?:[^"\\]|\\.)*)"', raw)
    if not mr:
        fail("bank-raw.js: __BANK_RAW_TXT payload not found")
    else:
        payload = json.loads('"%s"' % mr.group(1))
        if payload != text:
            fail("bank-raw.js: payload differs from decoded bank.js text")
        else:
            info("bank-raw.js payload identical to bank.js text")

    # ---- edits.json durable record ------------------------------------------
    try:
        eds = json.load(open(os.path.join(DOCS, "quiz", "edits.json"), encoding="utf-8"))
        nfix = sum(len(v.get("fix", {})) for v in eds.values())
        if nfix < 247:
            fail("edits.json: expected >=247 fix entries, found %d" % nfix)
        else:
            info("edits.json: %d fix entries across %d class|subject keys" % (nfix, len(eds)))
    except Exception as e:
        fail("edits.json unreadable: %s" % e)

    # ---- live wiring: index.html loads bank.js (and not the workshop) --------
    idx = open(os.path.join(DOCS, "index.html"), encoding="utf-8").read()
    if '<script src="bank.js"' not in idx:
        fail("index.html no longer loads bank.js")
    else:
        info("index.html loads bank.js")
    # Live lazy-loads from quiz/ are legitimate redesign assets (notes_data.js,
    # notes_app.js, syllabus_data.js). What must NEVER be wired into the live
    # page are the generation-workshop artifacts (old template app, build/gen scripts).
    if re.search(r'(src|href)="quiz/(template|build|gen_|engine|bank_edit)', idx):
        fail("index.html loads quiz-workshop build artifacts")
    else:
        info("index.html: no workshop build artifacts wired in")


def main():
    global DOCS
    quiet = "--quiet" in sys.argv
    asjson = "--json" in sys.argv
    for a in sys.argv[1:]:
        if not a.startswith("--"):
            DOCS = a          # audit an alternate docs dir (negative-test support)
    audit()
    if asjson:
        print(json.dumps({"failures": fails, "info": infos}, indent=1))
    elif not quiet:
        print("WAEC bank audit")
        for m in infos:
            print("  ok   %s" % m)
        for m in fails:
            print("  FAIL %s" % m)
    result = "%d failures" % len(fails)
    if quiet or asjson:
        print("waec_audit: %s" % result)
    else:
        print("waec_audit: %s" % ("CLEAN" if not fails else result))
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
