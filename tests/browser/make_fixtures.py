"""Creates the test files used by the browser tests.

Every file contains the marker text CANARY, so the privacy test can prove that
no part of any file leaves the browser. Run:  python3 tests/browser/make_fixtures.py
Needs: pip install python-docx openpyxl python-pptx pillow pypdf ; LibreOffice (soffice) and qpdf on PATH.
"""
import os, sys, json, shutil, subprocess, zipfile, io
from docx import Document
from openpyxl import Workbook
from pptx import Presentation
from pptx.util import Inches, Pt
from PIL import Image, ImageDraw, PngImagePlugin

CANARY = "FUCANARY7f3a9q"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixtures")
os.makedirs(OUT, exist_ok=True)
p = lambda n: os.path.join(OUT, n)

# --- Word: heading, paragraphs with bold/italic, a list, a table
d = Document()
d.core_properties.author = "Asha Patil"; d.core_properties.title = f"Report {CANARY}"
d.add_heading("Quarterly report", 1)
para = d.add_paragraph("Kalaburagi Labs grew in "); para.add_run("every region").bold = True; para.add_run(f". Marker {CANARY}.")
d.add_heading("Highlights", 2)
for t in ["Revenue up 12%", "Two new tools", "Faster PDF engine"]:
    d.add_paragraph(t, style="List Bullet")
tb = d.add_table(rows=3, cols=3)
for r, row in enumerate([["City", "Users", "Growth"], ["Kalaburagi", "1200", "8%"], ["Bengaluru", "5400", "15%"]]):
    for c, v in enumerate(row): tb.cell(r, c).text = v
d.add_paragraph("Second page starts after this paragraph.")
d.save(p("canary.docx"))

d2 = Document(); d2.add_heading("Appendix", 1); d2.add_paragraph(f"Extra notes for the merge test {CANARY}."); d2.save(p("canary2.docx"))

# --- Excel: two sheets with numbers, dates and text
wb = Workbook(); ws = wb.active; ws.title = "Sales"
ws.append(["Month", "Units", "Price", "Note"])
for i, m in enumerate(["Jan", "Feb", "Mar"]): ws.append([m, 10 + i, 99.5 + i, CANARY if i == 0 else "ok"])
ws2 = wb.create_sheet("Cities"); ws2.append(["City", "State"]); ws2.append(["Kalaburagi", "Karnataka"])
wb.save(p("canary.xlsx"))
wb2 = Workbook(); w = wb2.active; w.title = "Sales"; w.append(["Month", "Units", "Price", "Note"]); w.append(["Apr", 13, 102.5, "ok"]); wb2.save(p("canary2.xlsx"))

# --- PowerPoint: 3 slides with title + bullets
pr = Presentation()
for i in range(3):
    s = pr.slides.add_slide(pr.slide_layouts[1]); s.shapes.title.text = f"Slide {i+1} title"
    s.placeholders[1].text_frame.text = f"Point A {CANARY}" if i == 0 else "Point A"
    s.placeholders[1].text_frame.add_paragraph().text = "Point B"
pr.save(p("canary.pptx"))

# --- Text, HTML, CSV, JSON
open(p("canary.txt"), "w").write(f"Title line\n\nKalaburagi is a city in Karnataka. Marker {CANARY}.\nSecond paragraph line.\n")
open(p("canary-b.txt"), "w").write(f"Title line\n\nKalaburagi is a big city in Karnataka. Marker {CANARY}.\nA new third line.\n")
open(p("canary.html"), "w").write(f"<!doctype html><html><head><title>Doc {CANARY}</title></head><body><h1>Heading</h1><p>Para with <b>bold</b> {CANARY}</p><ul><li>One</li><li>Two</li></ul><table><tr><th>Alpha</th><th>Beta</th></tr><tr><td>101</td><td>202</td></tr></table></body></html>")
open(p("canary.csv"), "w").write(f"name,city,code\nAsha,Kalaburagi,{CANARY}\nRavi,Bengaluru,X2\nRavi,Bengaluru,X2\n")
json.dump({"order": {"id": 7, "note": CANARY, "items": [{"sku": "A1", "price": 120}, {"sku": "B2", "price": 80}]}}, open(p("canary.json"), "w"), indent=2)
json.dump({"order": {"id": 7, "note": CANARY, "items": [{"sku": "A1", "price": 125}]}}, open(p("canary-b.json"), "w"), indent=2)

# --- Images: PNG with a text chunk, JPEG with EXIF-like comment
img = Image.new("RGB", (640, 360), "white"); g = ImageDraw.Draw(img)
g.text((20, 20), f"Hello Kalaburagi {CANARY}", fill="black"); g.rectangle([20, 80, 300, 200], fill="#2b6cd6")
meta = PngImagePlugin.PngInfo(); meta.add_text("Comment", CANARY)
img.save(p("canary.png"), pnginfo=meta)
exif = Image.Exif(); exif[0x010E] = CANARY; exif[0x013B] = "Asha Patil"   # ImageDescription, Artist
img.save(p("canary.jpg"), quality=90, exif=exif)

# --- images for the image converter: a photo-like gradient with a transparent corner, in many formats
from PIL import ImageFilter
ph = Image.new("RGBA", (320, 200))
px = ph.load()
for y in range(200):
    for x in range(320):
        px[x, y] = (int(255 * x / 319), int(255 * y / 199), 160, 0 if (x < 40 and y < 40) else 255)
gd = ImageDraw.Draw(ph); gd.ellipse([120, 50, 220, 150], fill=(250, 250, 250, 255)); gd.text((130, 90), "Fileutilo", fill=(20, 20, 20, 255))
ph.save(p("img-alpha.png"))
rgb = ph.convert("RGB")
rgb.save(p("img.gif"))                           # GIF (palette)
ph.save(p("img.webp"), lossless=True)
ph.save(p("img.avif"), quality=95)
rgb.save(p("img.bmp"))
ph.save(p("img.ico"), sizes=[(16, 16), (32, 32), (64, 64)])
rgb.save(p("img-none.tif"), compression="raw")
rgb.save(p("img-lzw.tif"), compression="tiff_lzw")
ph.save(p("img-deflate.tif"), compression="tiff_adobe_deflate")
rgb.save(p("img-packbits.tif"), compression="packbits")
rgb.convert("L").save(p("img-gray.tif"), compression="tiff_lzw")
rgb.convert("P", palette=Image.ADAPTIVE).save(p("img-palette.tif"))
open(p("img.svg"), "w").write('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200"><rect width="320" height="200" fill="#2b6cd6"/><circle cx="160" cy="100" r="60" fill="#ffffff"/></svg>')

# --- PDF (3 pages, real text) via LibreOffice, plus a password-protected copy
tmp = p("_pdfsrc"); os.makedirs(tmp, exist_ok=True)
pd = Document()
for i in range(3):
    pd.add_heading(f"Page {i+1}", 1); pd.add_paragraph(f"Body text on page {i+1}. {CANARY}")
    if i < 2: pd.add_page_break()
pd.core_properties.author = "Asha Patil"; pd.save(os.path.join(tmp, "canary.docx"))
subprocess.run(["soffice", "--headless", "--convert-to", "pdf", "--outdir", OUT, os.path.join(tmp, "canary.docx")], check=True, capture_output=True)
for fmt in ["odt", "rtf", "doc"]:
    subprocess.run(["soffice", "--headless", "--convert-to", fmt, "--outdir", OUT, p("canary.docx")], check=True, capture_output=True)
subprocess.run(["soffice", "--headless", "--convert-to", "ods", "--outdir", OUT, p("canary.xlsx")], check=True, capture_output=True)
shutil.rmtree(tmp)
subprocess.run(["qpdf", "--encrypt", "user1", "owner1", "256", "--", p("canary.pdf"), p("canary-locked.pdf")], check=True)

# --- ZIP
with zipfile.ZipFile(p("canary.zip"), "w", zipfile.ZIP_DEFLATED) as z:
    z.write(p("canary.txt"), "canary.txt"); z.write(p("canary.png"), "img/canary.png")
print("fixtures in", OUT, sorted(os.listdir(OUT)))
