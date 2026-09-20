# -*- coding: utf-8 -*-
"""#52 Class-ready: full-term practice pack generator.

For each class (SS1/SS2/SS3) builds a printable full-term pack:
  00-TERM-PLAN.pdf      — 12-week revision plan (subjects, mocks, exam week)
  01-PACK-MENU.pdf      — what's inside + printing tips
  papers/     — 13 subject papers (100 questions + answer key)
  worksheets/ — topic worksheets (10 questions + answer key) per topic
  notes/      — formula/fact notes per subject (all topics)
and zips it as packs/SS<n>-full-term-practice-pack.zip

Run:  python3 quiz/make_pack.py
"""
import os, re, sys, zipfile, shutil
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from registry import REGISTRY, question_bank
from make_docs import make_pdf, clean
from notes import NOTES
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer,
                                Table, TableStyle, PageBreak)
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT

HERE = os.path.dirname(os.path.abspath(__file__))
TPL = os.path.join(HERE, "template.html")
OUTROOT = "packs"
CLASSES = ["SS1", "SS2", "SS3"]
CLASS_TAG = {"SS1": "Foundation level", "SS2": "Intermediate level", "SS3": "WAEC / Exam level"}
GREEN = colors.HexColor("#00623C")
GOLD = colors.HexColor("#B98A45")
INK = colors.HexColor("#1A2B22")

# ---------- extract TOPICS (name → keywords) from the app template ----------
def _match(s, op, cl, start):
    """bracket-match: s[start] must be op; returns index of matching cl."""
    assert s[start] in op, s[start:start + 30]
    depth = 0
    for i in range(start, len(s)):
        c = s[i]
        if c in op:
            depth += 1
        elif c in cl:
            depth -= 1
            if depth == 0:
                return i
    raise ValueError("unbalanced brackets at %d" % start)

def parse_topics():
    src = open(TPL, encoding="utf-8").read()
    i = src.index("TOPICS=")
    j = _match(src, "{", "}", src.index("{", i))
    raw = src[i:j + 1]
    topics = {}
    for subj in [name for name, _m, _s in REGISTRY]:
        k = raw.find('"%s":[' % subj)
        if k < 0:
            k = raw.find('%s:[' % subj)
        if k < 0:
            topics[subj] = []
            continue
        end = _match(raw, "[", "]", raw.index("[", k))
        body = raw[raw.index("[", k):end]
        tops = []
        p = 0
        while True:
            q = body.find('["', p)
            if q < 0:
                break
            close = _match(body, "[", "]", q)
            pair = body[q:close + 1]
            name = None
            qq = body.find(chr(34), q)
            q2 = body.find(chr(34), qq + 1) if qq >= 0 else -1
            if qq >= 0 and q2 > qq:
                name = body[qq + 1:q2]
                tin = body.find('[', q2)
                tend = _match(body, '[', ']', tin) if tin >= 0 else q2
                if name and tend > q2:
                    tops.append((name, [k.strip(chr(34)) for k in re.findall(chr(34) + '([^' + chr(34) + ']+)' + chr(34), body[tin:tend + 1])]))
            p = close + 1
        topics[subj] = tops
    return topics

# ---------- styles ----------
S = {}
def _mk():
    S["h1"] = ParagraphStyle("h1", fontName="DJS-B", fontSize=18, leading=23, textColor=GREEN, alignment=TA_CENTER, spaceAfter=6)
    S["h2"] = ParagraphStyle("h2", fontName="DJS-B", fontSize=13, leading=17, textColor=GOLD, spaceBefore=10, spaceAfter=4)
    S["body"] = ParagraphStyle("body", fontName="DJS", fontSize=10, leading=14, textColor=INK)
    S["small"] = ParagraphStyle("small", fontName="DJS", fontSize=8.5, leading=11.5, textColor=colors.HexColor("#555"),
                                alignment=TA_CENTER)
    S["q"] = ParagraphStyle("q", fontName="DJS", fontSize=9.5, leading=13, textColor=INK, spaceBefore=5)
    S["opt"] = ParagraphStyle("opt", fontName="DJS", fontSize=9, leading=12, leftIndent=14, textColor=INK)
    S["note"] = ParagraphStyle("note", fontName="DJS", fontSize=9.5, leading=13.5, textColor=INK,
                               spaceAfter=6, leftIndent=0)
_mk()

def doc_base(path, title, head=None):
    doc = BaseDocTemplate(path, pagesize=A4, leftMargin=1.8*cm, rightMargin=1.8*cm,
                          topMargin=1.6*cm, bottomMargin=1.5*cm,
                          title=title, author="My Personal Study App")
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="f")
    def footer(canv, d):
        canv.saveState(); canv.setFont("DJS", 8); canv.setFillColor(GREEN)
        canv.drawCentredString(A4[0]/2, 0.9*cm, "MY PERSONAL STUDY APP · NSSC PRACTICE PACK · %s" % title)
        canv.drawRightString(A4[0]-1.8*cm, 0.9*cm, "Page %d" % canv.getPageNumber())
        canv.restoreState()
    doc.addPageTemplates([PageTemplate(id="p", frames=[frame], onPage=footer)])
    return doc

def header(story):
    story.append(Paragraph("FEDERAL REPUBLIC OF NIGERIA", S["small"]))
    story.append(Paragraph("SENIOR SECONDARY PRACTICE PACK — MY PERSONAL STUDY APP", S["h1"]))
    story.append(Paragraph("300 questions per subject area · full-term revision · answer keys for teachers", S["small"]))
    story.append(Spacer(1, 10))

def term_plan(cls, topics):
    """12-week revision plan for one class."""
    plan = [("Week 1", "English Language — Grammar & Vocabulary"), ("Week 2", "English Language — Comprehension & Oral"),
            ("Week 3", "Mathematics — Number & Algebra"), ("Week 4", "Mathematics — Geometry, Mensuration & Graphs"),
            ("Week 5", "Biology + Chemistry — Cell biology, atoms & reactions"),
            ("Week 6", "Physics + Agricultural Science — Mechanics, waves, soil & crops"),
            ("Week 7", "Economics + Commerce — Markets, money and business"),
            ("Week 8", "Government + Civic Education — Democracy and the Nigerian state"),
            ("Week 9", "Literature + Geography — Poetry, prose, maps and the environment"),
            ("Week 10", "Computer Studies + weak-topic review (use your app report)"),
            ("Week 11", "MOCK EXAM — sit the mixed 100-question papers, timed"),
            ("Week 12", "Revision — notes packs + worksheets, then rest before exams")]
    rows = [["Week", "Focus", "Resources in this pack"]]
    for i, (wk, focus) in enumerate(plan):
        res = "papers/ + notes/" if i < 10 else ("worksheets/ + papers/" if i == 10 else "notes/ + worksheets/")
        rows.append([wk, focus, res])
    tbl = Table(rows, colWidths=[2.2*cm, 9.2*cm, 6.0*cm])
    tbl.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), "DJS"), ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("BACKGROUND", (0, 0), (-1, 0), GREEN), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "DJS-B"), ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#BBB08E")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"), ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#FBF7EC")),
    ]))
    return tbl

def build_pack(cls_idx):
    cls = CLASSES[cls_idx]
    bank = question_bank(cls_idx)          # subj -> [ {s,q,o,a,e,t?}, ... ]
    topics = parse_topics()
    out = os.path.join(OUTROOT, "%s-full-term-practice-pack" % cls)
    shutil.rmtree(out, ignore_errors=True)
    for sub in ("papers", "worksheets", "notes"):
        os.makedirs(os.path.join(out, sub), exist_ok=True)

    # ---- term plan ----
    doc = doc_base(os.path.join(out, "00-TERM-PLAN.pdf"), "%s TERM PLAN" % cls)
    st = []; header(st)
    st.append(Paragraph("%s · %s · Full-Term Revision Plan" % (cls, CLASS_TAG[cls]), S["h2"]))
    st.append(Paragraph("Work through one week at a time. Sit one subject paper per week from "
                        "papers/, then use the matching notes/ cards to repair what you missed. "
                        "Leave week 11 for the timed mock and week 12 for light revision only.", S["body"]))
    st.append(Spacer(1, 8))
    st.append(term_plan(cls, topics))
    st.append(Spacer(1, 12))
    st.append(Paragraph("How to use the worksheets", S["h2"]))
    st.append(Paragraph("Each worksheet is 10 questions on ONE topic, with the answer key on the last page. "
                        "Answer them without notes first — marking your own work honestly is the fastest way to find gaps. "
                        "Anything you get wrong: read the matching notes/ card, then re-answer from memory two days later.", S["body"]))
    doc.build(st)

    # ---- pack menu ----
    doc = doc_base(os.path.join(out, "01-PACK-MENU.pdf"), "%s PACK MENU" % cls)
    st = []; header(st)
    st.append(Paragraph("%s Full-Term Practice Pack — contents" % cls, S["h2"]))
    for sub, desc in [("papers", "100-question exam papers with answer key (13 subjects)"),
                      ("worksheets", "10-question topic worksheets with answer keys"),
                      ("notes", "Formula & fact cards for every topic in the syllabus")]:
        n = len(os.listdir(os.path.join(out, sub)))
        st.append(Paragraph("<b>%s/</b> — %d files · %s" % (sub, n, desc), S["body"]))
        st.append(Spacer(1, 5))
    st.append(Spacer(1, 8))
    st.append(Paragraph("Printing tips", S["h2"]))
    for tip in ["Print papers double-sided, one paper per student.",
                "Keep the final answer-key pages separate for marking.",
                "Students: one paper per week, then the matching notes — never study notes first.",
                "Week 11 mock should be timed: 100 questions in 60 minutes."]:
        st.append(Paragraph("• " + tip, S["body"]))
    doc.build(st)

    # ---- papers ----
    for name, mod, seed in REGISTRY:
        qs = bank[name]
        make_pdf(cls, name, qs, os.path.join(out, "papers", "%s-%s.pdf" % (cls, name.replace(" ", "_"))))

    # ---- worksheets (10 per topic) ----
    LETTERS = "ABCD"
    for name, mod, seed in REGISTRY:
        tops = topics.get(name, [])
        for tname, kws in tops:
            pool = [q for q in bank[name] if any(k in q["q"].lower() for k in kws)]
            if len(pool) < 10:
                pool = bank[name][:]
            picked = pool[:10]
            path = os.path.join(out, "worksheets", "%s-%s-%s.pdf" % (cls, name.replace(" ", "_"),
                                                                     tname.replace(" ", "_").replace("&", "and")))
            doc = doc_base(path, "%s %s worksheet" % (cls, tname))
            st = []; header(st)
            st.append(Paragraph("%s · %s — %s (worksheet)" % (cls, name, tname), S["h2"]))
            st.append(Paragraph("10 questions · answer key on the last page · My Personal Study App", S["small"]))
            st.append(Spacer(1, 6))
            for n, q in enumerate(picked, 1):
                st.append(Paragraph("<b>%d.</b> %s" % (n, clean(q["q"])), S["q"]))
                for letter, opt in zip(LETTERS, q["o"]):
                    st.append(Paragraph("%s. %s" % (letter, clean(opt)), S["opt"]))
            st.append(PageBreak())
            st.append(Paragraph("ANSWER KEY — %s %s" % (cls, tname), S["h2"]))
            st.append(Paragraph("(For teachers — remove before giving to students)", S["small"]))
            st.append(Spacer(1, 6))
            for n, q in enumerate(picked, 1):
                st.append(Paragraph("<b>%d.</b> %s — %s" % (n, LETTERS[q["a"]], clean(q["e"])[:100]), S["q"]))
            doc.build(st)

    # ---- notes ----
    for name in NOTES:
        path = os.path.join(out, "notes", "%s-%s-notes.pdf" % (cls, name.replace(" ", "_")))
        doc = doc_base(path, "%s %s notes" % (cls, name))
        st = []; header(st)
        st.append(Paragraph("%s · %s — subject notes" % (cls, name), S["h2"]))
        st.append(Paragraph("Formula & fact cards for every topic. Read one card at a time — then cover it and recall it aloud.", S["small"]))
        st.append(Spacer(1, 8))
        for tname, txt in NOTES[name].items():
            st.append(Paragraph("<b>%s</b> — %s" % (tname, clean(txt)), S["note"]))
            st.append(Spacer(1, 4))
        doc.build(st)

    # ---- zip ----
    zpath = os.path.join(OUTROOT, "%s-full-term-practice-pack.zip" % cls)
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as z:
        for root, _dirs, files in os.walk(out):
            for f in sorted(files):
                full = os.path.join(root, f)
                z.write(full, os.path.relpath(full, OUTROOT))
    total = sum(len(files) for _r, _d, files in os.walk(out))
    print("%s pack: %d files -> %s (%.1f MB)" % (cls, total, zpath, os.path.getsize(zpath) / 1e6))
    return zpath

if __name__ == "__main__":
    os.makedirs(OUTROOT, exist_ok=True)
    for i in range(3):
        build_pack(i)
    print("done")
