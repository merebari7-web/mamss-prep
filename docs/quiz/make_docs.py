# -*- coding: utf-8 -*-
"""Build printable exam papers: for each class (SS1/SS2/SS3) x 13 subjects -> a 100-question
paper with answer key, in DOCX and PDF. Also a 100-question mixed paper per class."""
import os, sys, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from registry import REGISTRY, SUBJECTS, question_bank

from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

GREEN = RGBColor(0x00, 0x62, 0x3C)
DARK = RGBColor(0x1A, 0x2B, 0x22)
LETTERS = ["A", "B", "C", "D"]
OUT = "quiz/papers"
CLASS_META = {
    "SS1": ("SS ONE (SS 1)", "Foundation level"),
    "SS2": ("SS TWO (SS 2)", "Intermediate level"),
    "SS3": ("SS THREE (SS 3)", "WAEC / Exam level"),
}

# ---------------- DOCX ----------------
def add_page_number(footer_para):
    run = footer_para.add_run()
    for tag, text in (("w:fldChar", "begin"), ("w:instrText", "PAGE"), ("w:fldChar", "end")):
        el = OxmlElement(tag)
        if tag == "w:instrText":
            el.text = text
        run._r.append(el)

def _add_rich(par, text, size=None):
    import re
    for part in re.split(r"(<u>.*?</u>)", text):
        if not part:
            continue
        if part.startswith("<u>"):
            r = par.add_run(part[3:-4]); r.underline = True
        else:
            r = par.add_run(part)
        if size:
            r.font.size = size

def make_docx(cls, title_sub, questions, path):
    doc = Document()
    st = doc.styles["Normal"]; st.font.name = "Calibri"; st.font.size = Pt(10.5)
    st.paragraph_format.space_after = Pt(4)
    for s in doc.sections:
        s.top_margin, s.bottom_margin = Cm(1.8), Cm(1.6)
        s.left_margin, s.right_margin = Cm(2.0), Cm(2.0)
    fp = doc.sections[0].footer.paragraphs[0]
    fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = fp.add_run(f"NSSC QUIZ · {cls} · {title_sub} · Page "); r.font.size = Pt(8.5); r.font.color.rgb = GREEN
    add_page_number(fp)

    for txt, size, bold, color in [("FEDERAL REPUBLIC OF NIGERIA", 9, True, GREEN),
                                   ("SENIOR SECONDARY SCHOOL CHALLENGE QUIZ", 16, True, DARK),
                                   (f"{CLASS_META[cls][0]} — {title_sub.upper()} EXAMINATION", 13, True, GREEN),
                                   (f"100 Objective Questions · {CLASS_META[cls][1]} · Time allowed: 60 minutes", 9.5, False, None)]:
        p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(txt); r.font.size = Pt(size); r.bold = bold
        if color: r.font.color.rgb = color
        if size == 9.5: r.italic = True

    t = doc.add_table(rows=3, cols=4); t.style = "Table Grid"; t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, row in enumerate([("Name of Student:", "", "Class:", cls),
                             ("School:", "", "Date:", "____________"),
                             ("Subject:", title_sub, "Time Allowed:", "60 Minutes")]):
        for j, txt in enumerate(row):
            c = t.cell(i, j); c.text = ""
            run = c.paragraphs[0].add_run(txt); run.font.size = Pt(10)
            if j in (0, 2): run.bold = True
    doc.add_paragraph()

    p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("INSTRUCTIONS TO CANDIDATES"); r.bold = True; r.font.size = Pt(11); r.font.color.rgb = GREEN
    for ins in ["This paper contains 100 objective (multiple-choice) questions.",
                "Answer ALL questions. Each question has four options lettered A to D.",
                "Choose the correct option and shade its letter on the answer sheet provided.",
                "Each correct question carries 1 mark. There is NO penalty for wrong answers.",
                "Do not cheat or consult your neighbours. Examination malpractice is a serious offence.",
                "Rough work may be done on the question paper, but the answers must be on the answer sheet."]:
        par = doc.add_paragraph(style="List Bullet")
        run = par.add_run(ins); run.font.size = Pt(10)
    doc.add_paragraph()

    p = doc.add_paragraph()
    r = p.add_run(f"SECTION 1 — {title_sub.upper()}"); r.bold = True; r.font.size = Pt(11.5); r.font.color.rgb = GREEN
    doc.add_paragraph().paragraph_format.space_after = Pt(0)

    for n, q in enumerate(questions, 1):
        p = doc.add_paragraph(); p.paragraph_format.space_before = Pt(5); p.paragraph_format.keep_with_next = True
        r = p.add_run(f"{n}. "); r.bold = True
        _add_rich(p, q["q"])
        for letter, opt in zip(LETTERS, q["o"]):
            par = doc.add_paragraph()
            par.paragraph_format.left_indent = Cm(1.0); par.paragraph_format.space_after = Pt(1)
            par.paragraph_format.keep_with_next = True
            rr = par.add_run(f"{letter}. "); rr.font.size = Pt(10)
            _add_rich(par, opt, Pt(10))

    doc.add_page_break()
    p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run(f"ANSWER KEY — {cls} {title_sub.upper()}"); r.bold = True; r.font.size = Pt(14); r.font.color.rgb = GREEN
    p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("(For teachers / examiners only — remove before giving the paper to students)")
    r.italic = True; r.font.size = Pt(9)
    doc.add_paragraph()
    table = doc.add_table(rows=21, cols=10); table.style = "Table Grid"
    for k in range(5):
        for c2 in (0, 1):
            cell = table.cell(0, k * 2 + c2); par = cell.paragraphs[0]; par.alignment = WD_ALIGN_PARAGRAPH.CENTER
            run = par.add_run("No." if c2 == 0 else "Ans"); run.bold = True; run.font.size = Pt(9)
    for i in range(20):
        for k in range(5):
            n = i * 5 + k + 1
            for c2 in (0, 1):
                cell = table.cell(i + 1, k * 2 + c2); par = cell.paragraphs[0]; par.alignment = WD_ALIGN_PARAGRAPH.CENTER
                run = par.add_run(str(n) if c2 == 0 else LETTERS[questions[n - 1]["a"]])
                run.font.size = Pt(9)
    doc.add_paragraph()
    p = doc.add_paragraph()
    p.add_run("Marking guide: 1 mark per question · 100 marks total · 75%+ = Distinction (A1) · 60–74% = Very Good (B2/B3) · 50–59% = Credit (C4–C6)").font.size = Pt(9)
    doc.save(path)

# ---------------- PDF ----------------
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER

pdfmetrics.registerFont(TTFont("DJS", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"))
pdfmetrics.registerFont(TTFont("DJS-B", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"))
pdfmetrics.registerFontFamily("DJS", normal="DJS", bold="DJS-B", italic="DJS", boldItalic="DJS-B")
GREEN_RGB = colors.HexColor("#00623C"); DARK_RGB = colors.HexColor("#1A2B22"); GREY_RGB = colors.HexColor("#555555")

S = {
    "small": ParagraphStyle("small", fontName="DJS", fontSize=8.5, leading=11, alignment=TA_CENTER, textColor=GREY_RGB),
    "big": ParagraphStyle("big", fontName="DJS-B", fontSize=16, leading=20, alignment=TA_CENTER, textColor=DARK_RGB, spaceAfter=2),
    "title": ParagraphStyle("title", fontName="DJS-B", fontSize=13, leading=17, alignment=TA_CENTER, textColor=GREEN_RGB, spaceAfter=2),
    "inst": ParagraphStyle("inst", fontName="DJS-B", fontSize=11, leading=14, alignment=TA_CENTER, textColor=GREEN_RGB, spaceBefore=8, spaceAfter=4),
    "bullet": ParagraphStyle("bullet", fontName="DJS", fontSize=9.5, leading=13, leftIndent=14, bulletIndent=3, spaceAfter=2),
    "sec": ParagraphStyle("sec", fontName="DJS-B", fontSize=11, leading=14, textColor=GREEN_RGB, spaceBefore=11, spaceAfter=2),
    "q": ParagraphStyle("q", fontName="DJS", fontSize=10, leading=13.5, spaceBefore=5),
    "opt": ParagraphStyle("opt", fontName="DJS", fontSize=9.5, leading=12.5, leftIndent=18, spaceAfter=1),
    "keyh": ParagraphStyle("keyh", fontName="DJS-B", fontSize=14, leading=18, alignment=TA_CENTER, textColor=GREEN_RGB, spaceAfter=3),
    "cell": ParagraphStyle("cell", fontName="DJS", fontSize=8.5, leading=10.5, alignment=TA_CENTER),
}

def _esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def clean(t):
    import re
    def keep_u(m):
        return "<u>" + _esc(m.group(1)) + "</u>"
    return re.sub(r"<u>(.*?)</u>", keep_u, t)

def make_pdf(cls, title_sub, questions, path):
    doc = BaseDocTemplate(path, pagesize=A4, leftMargin=2 * cm, rightMargin=2 * cm,
                          topMargin=1.7 * cm, bottomMargin=1.6 * cm, title=f"NSSC {cls} {title_sub}")
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="f")
    doc.addPageTemplates([PageTemplate(id="main", frames=[frame],
                                       onPage=lambda c, d: (c.saveState(), c.setFont("DJS", 8),
                                                            c.setFillColor(GREEN_RGB),
                                                            c.drawCentredString(A4[0] / 2, 1.1 * cm,
                                                                                 f"NSSC QUIZ · {cls} · {title_sub} · Page {d.page}"),
                                                            c.restoreState()))])
    story = [Paragraph("FEDERAL REPUBLIC OF NIGERIA", S["small"]),
             Paragraph("SENIOR SECONDARY SCHOOL CHALLENGE QUIZ", S["big"]),
             Paragraph(f"{CLASS_META[cls][0]} — {title_sub.upper()} EXAMINATION", S["title"]),
             Paragraph(f"100 Objective Questions · {CLASS_META[cls][1]} · Time allowed: 60 minutes", S["small"]),
             Spacer(1, 8)]
    data = [["Name of Student:", "", "Class:", cls],
            ["School:", "", "Date:", "____________"],
            ["Subject:", title_sub, "Time Allowed:", "60 Minutes"]]
    t = Table(data, colWidths=[4.6 * cm, 4.6 * cm, 3.4 * cm, 4.4 * cm])
    t.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.6, colors.HexColor("#9BBBA9")),
                           ("FONTNAME", (0, 0), (-1, -1), "DJS"), ("FONTNAME", (0, 0), (0, -1), "DJS-B"),
                           ("FONTNAME", (2, 0), (2, -1), "DJS-B"), ("FONTSIZE", (0, 0), (-1, -1), 9),
                           ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("TOPPADDING", (0, 0), (-1, -1), 4),
                           ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
    story += [t, Paragraph("INSTRUCTIONS TO CANDIDATES", S["inst"])]
    for ins in ["This paper contains 100 objective (multiple-choice) questions.",
                "Answer ALL questions. Each question has four options lettered A to D.",
                "Choose the correct option and shade its letter on the answer sheet provided.",
                "Each correct question carries 1 mark. There is NO penalty for wrong answers.",
                "Do not cheat or consult your neighbours. Examination malpractice is a serious offence.",
                "Rough work may be done on the question paper, but the answers must be on the answer sheet."]:
        story.append(Paragraph(clean(ins), S["bullet"], bulletText="•"))
    story += [Spacer(1, 8), Paragraph(f"SECTION 1 — {title_sub.upper()}", S["sec"])]
    for n, q in enumerate(questions, 1):
        story.append(Paragraph(f"{n}. {clean(q['q'])}", S["q"]))
        for letter, opt in zip(LETTERS, q["o"]):
            story.append(Paragraph(f"{letter}. {clean(opt)}", S["opt"]))
    story.append(PageBreak())
    story.append(Paragraph(f"ANSWER KEY — {cls} {title_sub.upper()}", S["keyh"]))
    story.append(Paragraph("(For teachers / examiners only — remove before giving the paper to students)", S["small"]))
    story.append(Spacer(1, 8))
    rows = []
    for i in range(20):
        cells = []
        for k in range(5):
            n = i * 5 + k + 1
            cells.append(Paragraph(str(n), S["cell"]))
            cells.append(Paragraph(LETTERS[questions[n - 1]["a"]], S["cell"]))
        rows.append(cells)
    key = Table([[Paragraph(h, S["cell"]) for h in ["No.", "Ans"] * 5]] + rows,
                colWidths=[1.5 * cm, 1.5 * cm] * 5, repeatRows=1)
    key.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#9BBBA9")),
                             ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E4F0EA")),
                             ("FONTNAME", (0, 0), (-1, 0), "DJS-B"), ("TOPPADDING", (0, 0), (-1, -1), 3),
                             ("BOTTOMPADDING", (0, 0), (-1, -1), 3)]))
    story += [key, Spacer(1, 8),
              Paragraph("Marking guide: 1 mark per question · 100 marks total · 75%+ = Distinction (A1) · 60–74% = Very Good (B2/B3) · 50–59% = Credit (C4–C6)", S["small"])]
    doc.build(story)

# ---------------- MAIN ----------------
if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for idx, cls in enumerate(["SS1", "SS2", "SS3"]):
        bank = question_bank(idx)
        for name, mod, seed in REGISTRY:
            qs = bank[name]
            safe = name.replace(" ", "_")
            print(f"  {cls} — {name} ...", end=" ", flush=True)
            make_docx(cls, name, qs, f"{OUT}/{cls}_{safe}_exam_paper.docx")
            make_pdf(cls, name, qs, f"{OUT}/{cls}_{safe}_exam_paper.pdf")
            print("done")
        # mixed paper: 100 sampled from the whole class pool
        pool = [q for name, _, _ in REGISTRY for q in bank[name]]
        rng = random.Random(100 + idx)
        mixed = rng.sample(pool, 100)
        make_docx(cls, "All Subjects (Mixed)", mixed, f"{OUT}/{cls}_mixed_exam_paper.docx")
        make_pdf(cls, "All Subjects (Mixed)", mixed, f"{OUT}/{cls}_mixed_exam_paper.pdf")
        print(f"  {cls} mixed done")
    print("\nAll printable papers built in quiz/papers/")
