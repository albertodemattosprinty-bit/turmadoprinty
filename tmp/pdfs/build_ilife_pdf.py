from pathlib import Path
import re

from reportlab.lib.colors import HexColor, white
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Image,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
)
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "output" / "pdf" / "iLife_Raio_X_Funcionalidades.md"
OUTPUT = ROOT / "output" / "pdf" / "iLife_Raio_X_Funcionalidades.pdf"
LOGO = ROOT / "public" / "200" / "images" / "ilife-mindsetplan-home.png"

PAGE_W, PAGE_H = A4
NAVY = HexColor("#102A43")
BLUE = HexColor("#2563EB")
CYAN = HexColor("#21B6D7")
INK = HexColor("#243B53")
MUTED = HexColor("#627D98")
LIGHT = HexColor("#EAF2FF")
PALE = HexColor("#F6F9FC")


def register_fonts():
    candidates = [
        ("SegoeUI", Path("C:/Windows/Fonts/segoeui.ttf")),
        ("SegoeUI-Bold", Path("C:/Windows/Fonts/seguisb.ttf")),
    ]
    for name, path in candidates:
        if path.exists():
            pdfmetrics.registerFont(TTFont(name, str(path)))
    return (
        "SegoeUI" if "SegoeUI" in pdfmetrics.getRegisteredFontNames() else "Helvetica",
        "SegoeUI-Bold" if "SegoeUI-Bold" in pdfmetrics.getRegisteredFontNames() else "Helvetica-Bold",
    )


FONT, FONT_BOLD = register_fonts()


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(PALE)
    canvas.rect(0, 0, PAGE_W, 13 * mm, stroke=0, fill=1)
    canvas.setStrokeColor(LIGHT)
    canvas.line(18 * mm, 13 * mm, PAGE_W - 18 * mm, 13 * mm)
    canvas.setFont(FONT, 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(18 * mm, 7 * mm, "iLife MindsetPlan  |  Raio X de funcionalidades")
    canvas.drawRightString(PAGE_W - 18 * mm, 7 * mm, f"{doc.page}")
    canvas.restoreState()


class NumberedDocTemplate(BaseDocTemplate):
    pass


doc = NumberedDocTemplate(
    str(OUTPUT),
    pagesize=A4,
    rightMargin=18 * mm,
    leftMargin=18 * mm,
    topMargin=18 * mm,
    bottomMargin=19 * mm,
    title="iLife MindsetPlan - Raio X de funcionalidades",
    author="iLife MindsetPlan",
    subject="Apresentação institucional para usuários finais",
)

frame = Frame(
    doc.leftMargin,
    doc.bottomMargin,
    doc.width,
    doc.height,
    leftPadding=0,
    bottomPadding=0,
    rightPadding=0,
    topPadding=0,
)
doc.addPageTemplates([PageTemplate(id="content", frames=[frame], onPage=footer)])

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name="CoverBrand", fontName=FONT_BOLD, fontSize=14, leading=18,
    textColor=CYAN, alignment=TA_CENTER, spaceAfter=5 * mm,
))
styles.add(ParagraphStyle(
    name="CoverTitle", fontName=FONT_BOLD, fontSize=30, leading=34,
    textColor=NAVY, alignment=TA_CENTER, spaceAfter=5 * mm,
))
styles.add(ParagraphStyle(
    name="CoverSub", fontName=FONT, fontSize=13, leading=19,
    textColor=MUTED, alignment=TA_CENTER, spaceAfter=8 * mm,
))
styles.add(ParagraphStyle(
    name="H1x", fontName=FONT_BOLD, fontSize=17, leading=21,
    textColor=NAVY, spaceBefore=5 * mm, spaceAfter=2.5 * mm,
    keepWithNext=True,
))
styles.add(ParagraphStyle(
    name="Bodyx", fontName=FONT, fontSize=9.5, leading=14,
    textColor=INK, alignment=TA_LEFT, spaceAfter=2.8 * mm,
))
styles.add(ParagraphStyle(
    name="Notex", fontName=FONT, fontSize=8.5, leading=12.5,
    textColor=MUTED, backColor=PALE, borderColor=LIGHT, borderWidth=0.8,
    borderPadding=8, spaceBefore=4 * mm, spaceAfter=3 * mm,
))
styles.add(ParagraphStyle(
    name="Quote", fontName=FONT_BOLD, fontSize=15, leading=21,
    textColor=BLUE, alignment=TA_CENTER, leftIndent=13 * mm,
    rightIndent=13 * mm, spaceBefore=8 * mm, spaceAfter=8 * mm,
))


def inline_markup(text):
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    text = text.replace("&", "&amp;")
    text = text.replace("&amp;lt;", "&lt;").replace("&amp;gt;", "&gt;")
    text = text.replace("<b>", "<b>").replace("</b>", "</b>")
    return text


raw = SOURCE.read_text(encoding="utf-8")
lines = raw.splitlines()
story = []

if LOGO.exists():
    img = Image(str(LOGO), width=78 * mm, height=78 * mm)
    img.hAlign = "CENTER"
    story.extend([Spacer(1, 21 * mm), img, Spacer(1, 6 * mm)])
else:
    story.append(Spacer(1, 44 * mm))

story.append(Paragraph("iLIFE MINDSETPLAN", styles["CoverBrand"]))
story.append(Paragraph("Raio X de funcionalidades", styles["CoverTitle"]))
story.append(Paragraph(
    "Experiência atual, 12 aspectos de vida e visão de expansão",
    styles["CoverSub"],
))
story.append(Spacer(1, 4 * mm))
story.append(Paragraph(
    "Um sistema pessoal para transformar intenção em ações, missões, equilíbrio e clareza.",
    styles["Quote"],
))
story.append(Spacer(1, 12 * mm))
story.append(Paragraph(
    "Documento institucional para usuários finais<br/>Produto /200",
    styles["CoverSub"],
))
story.append(PageBreak())

paragraph_buffer = []


def flush_paragraph():
    if not paragraph_buffer:
        return
    text = " ".join(part.strip() for part in paragraph_buffer).strip()
    paragraph_buffer.clear()
    if text:
        story.append(Paragraph(inline_markup(text), styles["Bodyx"]))


for line in lines:
    stripped = line.strip()
    if not stripped:
        flush_paragraph()
        continue
    if stripped.startswith("# "):
        continue
    if stripped.startswith("## "):
        continue
    if stripped.startswith("**Documento institucional"):
        continue
    if stripped == "---":
        flush_paragraph()
        story.append(Spacer(1, 4 * mm))
        continue
    if stripped.startswith("### "):
        flush_paragraph()
        heading = stripped[4:].strip()
        story.append(Paragraph(inline_markup(heading), styles["H1x"]))
        continue
    if stripped.startswith("**Nota de transparência:**"):
        flush_paragraph()
        story.append(Paragraph(inline_markup(stripped), styles["Notex"]))
        continue
    paragraph_buffer.append(stripped)

flush_paragraph()
doc.build(story)
print(OUTPUT)

