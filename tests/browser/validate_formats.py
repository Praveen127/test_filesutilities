"""Independent checks for files produced by the browser tests (see formats.test.mjs).

Reads a manifest of {name, file, check, ...} entries and prints a JSON list of
{name, ok, problems, summary, features}. Nothing here shares code with the app:
files are opened with pypdf/qpdf/pdftotext, python-docx, odfpy, python-pptx, openpyxl,
Pillow and LibreOffice.
"""
import json, os, re, subprocess, sys, tempfile, zipfile, collections

CANARY = "FUCANARY7f3a9q"
DOC_PHRASES = ["Quarterly report", "Highlights", "Revenue up 12%", "Two new tools", "every region", "Kalaburagi", "Growth", "5400", "15%", CANARY]
SRC = {
    "canary.txt": dict(text=["Kalaburagi is a city", "Second paragraph line", CANARY]),
    "canary.html": dict(text=["Heading", "bold", "One", "Two", "Alpha", "Beta", "101", "202", CANARY], headings=1, tables=1, lists=2),
    "canary.pdf": dict(text=["Page 1", "Page 2", "Page 3", "Body text on page 2", CANARY]),
    "canary.docx": dict(text=DOC_PHRASES, headings=2, tables=1, lists=3),
    "canary.odt": dict(text=DOC_PHRASES, headings=2, tables=1, lists=3),
    "canary.rtf": dict(text=DOC_PHRASES),
    "canary.doc": dict(text=DOC_PHRASES, tables=1),
    "canary.pptx": dict(text=["Slide 1 title", "Slide 3 title", "Point A", "Point B", CANARY]),
    "canary.xlsx": dict(text=["Month", "Jan", "Mar", "99.5", "Kalaburagi", "Karnataka", CANARY], tables=1),
    "canary.ods": dict(text=["Month", "Jan", "Mar", "99.5", "Kalaburagi", "Karnataka", CANARY], tables=1),
    "canary.csv": dict(text=["Asha", "Kalaburagi", "Bengaluru", CANARY], tables=1),
}
# which kinds of structure each output format can carry
CARRIES = {"docx": {"headings", "tables", "lists"}, "odt": {"headings", "tables", "lists"}, "html": {"headings", "tables", "lists"},
           "rtf": {"tables"}, "doc": {"tables"}, "xlsx": {"tables"}, "xls": {"tables"}}

def sh(*a, **k):
    return subprocess.run(a, capture_output=True, text=True, **k)

def norm(s):
    return re.sub(r"\s+", " ", s.replace(" ", " ")).strip()

def soffice(src, fmt):
    out = tempfile.mkdtemp()
    r = sh("soffice", "--headless", "--convert-to", fmt, "--outdir", out, src, timeout=180)
    files = [os.path.join(out, f) for f in os.listdir(out)]
    return files[0] if files else None

# ---------- readers: return (text, features, problems)
def read_pdf(path, password=None):
    from pypdf import PdfReader
    f, p = {}, []
    chk = sh("qpdf", "--check", *( [f"--password={password}"] if password else []), path)
    if chk.returncode not in (0, 3): p.append("qpdf --check failed: " + (chk.stdout + chk.stderr)[-200:])
    r = PdfReader(path)
    f["encrypted"] = r.is_encrypted
    if r.is_encrypted: r.decrypt(password or "")
    f["pages"] = len(r.pages)
    txt = sh("pdftotext", *( ["-upw", password] if password else []), path, "-").stdout
    pages = txt.split("\f")
    f["first_page_text"] = norm(pages[0])[:200] if pages else ""
    imgs = sh("pdfimages", *( ["-upw", password] if password else []), "-list", path).stdout.strip().splitlines()[2:]
    f["images"] = len(imgs)
    return txt, f, p

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

def ooxml_problems(path):
    """Structural checks Word is strict about but LibreOffice/python-docx forgive."""
    from lxml import etree
    p = []
    root = etree.fromstring(zipfile.ZipFile(path).read("word/document.xml"))
    for tbl in root.iter(W + "tbl"):
        grid = tbl.find(W + "tblGrid")
        if grid is None: p.append("table without tblGrid"); continue
        if (grid.text or "").strip() or any((c.tail or "").strip() for c in grid): p.append("stray text inside tblGrid")
        cols = len(grid.findall(W + "gridCol"))
        widest = max((len(tr.findall(W + "tc")) for tr in tbl.findall(W + "tr")), default=0)
        if cols != widest: p.append(f"table grid has {cols} columns but rows have {widest}")
    for t in root.iter(W + "t"):
        if t.getparent().tag != W + "r": p.append("w:t outside a run"); break
    return sorted(set(p))

def read_docx(path):
    from docx import Document
    d = Document(path); f = {}
    paras = d.paragraphs
    f["headings"] = sum(1 for x in paras if x.style is not None and re.match(r"(Heading|Title)", x.style.name or "") and x.text.strip())
    f["lists"] = sum(1 for x in paras if x.text.strip() and ((x.style is not None and "List" in (x.style.name or "")) or x._p.pPr is not None and x._p.pPr.numPr is not None))
    f["tables"] = len(d.tables)
    txt = "\n".join([x.text for x in paras] + [c.text for tb in d.tables for row in tb.rows for c in row.cells])
    return txt, f, ooxml_problems(path)

def read_odt(path):
    from odf.opendocument import load
    from odf import text as T, table as TB, teletype
    d = load(path)
    f = {"headings": len(d.getElementsByType(T.H)), "tables": len(d.getElementsByType(TB.Table)), "lists": len(d.getElementsByType(T.ListItem))}
    txt = "\n".join(teletype.extractText(e) for e in d.getElementsByType(T.H) + d.getElementsByType(T.P))
    return txt, f, []

def read_html(path):
    import lxml.html
    doc = lxml.html.fromstring(open(path, "rb").read())
    f = {"headings": len(doc.xpath("//h1|//h2|//h3|//h4|//h5|//h6")), "tables": len(doc.xpath("//table")), "lists": len(doc.xpath("//li"))}
    for bad in doc.xpath("//script|//style"): bad.drop_tree()
    return doc.text_content(), f, []

def read_ps(path):
    data = open(path, "rb").read().decode("latin1"); p = []
    if not data.startswith("%!PS-Adobe-3.0"): p.append("missing %!PS-Adobe-3.0 header")
    m = re.search(r"%%Pages: (\d+)", data); pages = int(m.group(1)) if m else 0
    shows = len(re.findall(r"\bshowpage\b", data))
    if not pages or shows < pages: p.append(f"%%Pages {pages} but {shows} showpage")
    if "%%EOF" not in data: p.append("missing %%EOF")
    strings = re.findall(r"\(((?:\\.|[^\\)])*)\)", data)
    txt = "\n".join(re.sub(r"\\(.)", r"\1", s) for s in strings)
    return txt, {"pages": pages}, p

def read_pptx(path):
    from pptx import Presentation
    pr = Presentation(path); txt = []
    for s in pr.slides:
        for sh_ in s.shapes:
            if sh_.has_text_frame: txt.append(sh_.text_frame.text)
            if getattr(sh_, "has_table", False) and sh_.has_table:
                txt += [c.text for r in sh_.table.rows for c in r.cells]
    return "\n".join(txt), {"slides": len(pr.slides)}, []

def read_xlsx(path):
    from openpyxl import load_workbook
    wb = load_workbook(path, data_only=True); vals = []; cells = 0
    for ws in wb.worksheets:
        for row in ws.iter_rows(values_only=True):
            for v in row:
                if v is not None: vals.append(str(v)); cells += 1
    return "\n".join(vals), {"sheets": len(wb.worksheets), "cells": cells, "tables": len(wb.worksheets) if cells else 0}, []

def read_any(path, fmt, password=None):
    if fmt == "pdf": return read_pdf(path, password)
    if fmt == "docx": return read_docx(path)
    if fmt == "odt": return read_odt(path)
    if fmt == "html": return read_html(path)
    if fmt == "txt": return open(path, encoding="utf-8").read(), {}, []
    if fmt == "ps": return read_ps(path)
    if fmt == "pptx": return read_pptx(path)
    if fmt == "xlsx": return read_xlsx(path)
    if fmt in ("rtf", "doc"):   # opened by LibreOffice, then read as Word
        conv = soffice(path, "docx")
        if not conv: return "", {}, [f"LibreOffice could not open the {fmt}"]
        t, f, p = read_docx(conv); return t, {"tables": f["tables"]}, p
    if fmt == "xls":
        conv = soffice(path, "xlsx")
        if not conv: return "", {}, ["LibreOffice could not open the xls"]
        return read_xlsx(conv)
    raise ValueError(fmt)

def libreoffice_opens(path):
    return soffice(path, "pdf") is not None

def check(e):
    p, f = [], {}
    path = e["file"]
    if not os.path.exists(path) or os.path.getsize(path) == 0: return False, ["file missing or empty"], "", {}
    kind = e["check"]
    if kind == "convert":
        fmt, src = e["fmt"], SRC[e["src"]]
        txt, f, p = read_any(path, fmt)
        t = norm(txt)
        missing = [s for s in src["text"] if s.lower() not in t.lower()]
        if missing: p.append("missing text: " + ", ".join(missing))
        for k in ("headings", "tables", "lists"):
            if k in src and k in CARRIES.get(fmt, set()) and f.get(k, 0) < src[k]:
                p.append(f"{k}: expected ≥{src[k]}, found {f.get(k, 0)}")
        if fmt in ("docx", "odt", "rtf", "doc", "pptx"):
            # what a person actually sees: render with LibreOffice and look for the text on the page
            pdf = soffice(path, "pdf")
            if not pdf: p.append("LibreOffice cannot open it")
            else:
                shown = norm(sh("pdftotext", pdf, "-").stdout)
                hidden = [s for s in src["text"] if s.lower() in t.lower() and s.lower() not in shown.lower()]
                if hidden: p.append("in the file but not visible when opened: " + ", ".join(hidden))
        elif fmt in ("xlsx",) and not libreoffice_opens(path): p.append("LibreOffice cannot open it")
        f["words"] = len(t.split()); f["chars"] = len(t)
        f["coverage"] = round(1 - len(missing) / len(src["text"]), 3)
        return not p, p, f"{f['words']} words, " + ", ".join(f"{k} {v}" for k, v in f.items() if k in ("headings", "tables", "lists", "pages", "slides", "sheets")), f
    if kind == "pdf":
        txt, f, p = read_pdf(path, e.get("password"))
        t = norm(txt)
        if "pages" in e and f["pages"] != e["pages"]: p.append(f"pages {f['pages']} ≠ {e['pages']}")
        for s in e.get("text", []):
            if s not in t: p.append(f"missing text '{s}'")
        for s in e.get("notText", []):
            if s in t: p.append(f"should not contain '{s}'")
        if "firstPageText" in e and e["firstPageText"] not in f["first_page_text"]: p.append(f"first page should show '{e['firstPageText']}'")
        if "images" in e and f["images"] < e["images"]: p.append(f"images {f['images']} < {e['images']}")
        if e.get("encrypted") is False and f["encrypted"]: p.append("still encrypted")
        if e.get("encrypted") == "AES-256":
            enc = sh("qpdf", "--show-encryption", f"--password={e['password']}", path).stdout
            if "AESv3" not in enc and "aes-256" not in enc.lower(): p.append("not AES-256: " + enc[:120])
            nopw = sh("qpdf", "--check", path)
            if nopw.returncode == 0: p.append("opens without the password")
        f["words"] = len(t.split())
        return not p, p, f"{f['pages']} pages, {f['words']} words" + (", AES-256" if e.get("encrypted") == "AES-256" else ""), {k: v for k, v in f.items() if isinstance(v, (int, float)) and not isinstance(v, bool)}
    if kind == "image":
        from PIL import Image
        im = Image.open(path); im.load()
        f = {"width": im.width, "height": im.height}
        if "format" in e and im.format != e["format"]: p.append(f"format {im.format} ≠ {e['format']}")
        if "maxBytes" in e and os.path.getsize(path) > e["maxBytes"]: p.append(f"{os.path.getsize(path)} bytes > {e['maxBytes']}")
        for k in ("width", "height"):
            if k in e and abs(f[k] - e[k]) > 1: p.append(f"{k} {f[k]} ≠ {e[k]}")
        if "minWidth" in e and im.width < e["minWidth"]: p.append(f"width {im.width} < {e['minWidth']}")
        return not p, p, f"{im.format} {im.width}×{im.height}, {os.path.getsize(path) // 1024} KB", f
    if kind == "imgcmp":
        from PIL import Image, ImageChops, ImageStat
        import base64, io
        if e["format"] == "SVG":
            svg = open(path, encoding="utf-8").read()
            if "<svg" not in svg: p.append("not an SVG file")
            m = re.search(r'data:image/png;base64,([A-Za-z0-9+/=]+)', svg)
            if not m: return False, ["no embedded picture"], "", {}
            im = Image.open(io.BytesIO(base64.b64decode(m.group(1))))
        else:
            im = Image.open(path)
            if im.format != e["format"]: p.append(f"format {im.format} ≠ {e['format']}")
            if im.format == "ICO":
                sizes = sorted(im.info.get("sizes", []) or im.ico.sizes())
                f["icon_sizes"] = len(sizes)
                if (16, 16) not in sizes or (32, 32) not in sizes: p.append(f"icon sizes {sizes}")
                im = im.ico.getimage(max(sizes)); im.format = "ICO"
        im.load(); im = im.convert("RGBA")
        if e["ref"].endswith(".svg"):
            ref = None
            if im.size != (320, 200): p.append(f"size {im.size}")
            c = im.getpixel((160, 100)); b = im.getpixel((10, 10))
            if c[:3] != (255, 255, 255) or abs(b[2] - 214) > 3: p.append(f"SVG rendered wrong: centre {c}, corner {b}")
            return not p, p, f"SVG rendered {im.size[0]}×{im.size[1]}", {"width": im.size[0]}
        ref = Image.open(e["ref"]); ref.load()
        if ref.format == "ICO": ref = ref.ico.getimage(max(ref.ico.sizes()))
        ref = ref.convert("RGBA")
        if e["format"] == "ICO" and im.size != ref.size:   # icons are square: the picture is scaled to fit and centred
            k = im.size[0] / max(ref.size); fit = ref.resize((round(ref.size[0] * k), round(ref.size[1] * k)), Image.LANCZOS)
            sq = Image.new("RGBA", im.size, (0, 0, 0, 0)); sq.paste(fit, ((im.size[0] - fit.size[0]) // 2, (im.size[1] - fit.size[1]) // 2)); ref = sq
        if im.size != ref.size: p.append(f"size {im.size} ≠ {ref.size}"); return False, p, "", {}
        # compare colour where the reference is opaque; check transparency survives where it should
        mask = ref.getchannel("A").point(lambda a: 255 if a == 255 else 0)
        diff = ImageChops.difference(im.convert("RGB"), ref.convert("RGB"))
        st = ImageStat.Stat(diff, mask); mean = sum(st.mean) / 3
        f["mean_diff"] = round(mean, 2)
        if e.get("maxDiff") is not None and mean > e["maxDiff"]: p.append(f"colours differ by {mean:.1f} on average (allowed {e['maxDiff']})")
        if e.get("alpha"):
            a_ref, a_out = ref.getchannel("A"), im.getchannel("A")
            corner = a_out.getpixel((5, 5)); centre = a_out.getpixel((im.size[0] // 2, im.size[1] // 2))
            if corner > 20 or centre < 235: p.append(f"transparency lost (corner alpha {corner}, centre {centre})")
        return not p, p, f"{im.size[0]}×{im.size[1]}, colour difference {mean:.2f}" + (f", {f['icon_sizes']} icon sizes" if "icon_sizes" in f else ""), {k: v for k, v in f.items() if k != "mean_diff"}
    if kind == "docx":
        txt, f, p = read_docx(path); t = norm(txt)
        for s in e.get("text", []):
            if s not in t: p.append(f"missing '{s}'")
        for s in e.get("notText", []):
            if s in t: p.append(f"still contains '{s}'")
        if f["tables"] < e.get("tables", 0): p.append(f"tables {f['tables']}")
        if f["headings"] < e.get("headingsAtLeast", 0): p.append(f"headings {f['headings']}")
        if not libreoffice_opens(path): p.append("LibreOffice cannot open it")
        f["words"] = len(t.split())
        return not p, p, f"{f['words']} words, {f['headings']} headings, {f['tables']} tables", f
    if kind == "zip":
        z = zipfile.ZipFile(path); bad = z.testzip(); names = z.namelist()
        if bad: p.append("corrupt entry " + bad)
        miss = [n for n in e["names"] if n not in names]
        if miss: p.append("missing " + ", ".join(miss))
        return not p, p, f"{len(names)} files, CRC ok", {"files": len(names)}
    if kind == "clean":
        k = e["kind"]
        if k == "docx":
            from docx import Document
            cp = Document(path).core_properties
            if (cp.author or "").strip() or CANARY in (cp.title or ""): p.append(f"author/title still present: {cp.author!r} {cp.title!r}")
            if not libreoffice_opens(path): p.append("LibreOffice cannot open it")
        elif k == "pdf":
            from pypdf import PdfReader
            r = PdfReader(path); m = r.metadata or {}
            if any(v and "Asha" in str(v) for v in m.values()): p.append("PDF info still has author: " + str(dict(m)))
            xmp = open(path, "rb").read()
            if b"Asha Patil" in xmp: p.append("author still in XMP/stream")
            if len(r.pages) != 3: p.append("pages changed")
        elif k == "jpg":
            from PIL import Image
            ex = Image.open(path).getexif()
            if ex.get(0x013B) or ex.get(0x010E): p.append("EXIF artist/description still present")
        return not p, p, f"{k}: personal metadata removed", {}
    return False, [f"unknown check {kind}"], "", {}

def main():
    entries = json.load(open(sys.argv[1]))
    out = []
    for e in entries:
        try:
            ok, problems, summary, feats = check(e)
        except Exception as ex:
            ok, problems, summary, feats = False, [f"could not open: {type(ex).__name__}: {ex}"], "", {}
        out.append({"name": e["name"], "ok": ok, "problems": problems, "summary": summary, "features": feats})
    print(json.dumps(out))

if __name__ == "__main__":
    main()
