# Source of the landing-page tool grid and icons. Used once to write the home section into web/index.html.
ICON = {  # 24×24 line icons, stroke = currentColor
 'convert': '<path d="M14 3H7a2 2 0 0 0-2 2v6"/><path d="M14 3l5 5v3"/><path d="M14 3v5h5"/><path d="M5 15h14m-3-3 3 3-3 3"/><path d="M19 21H5m3-3-3 3 3 3" transform="translate(0 -3)"/>',
 'pdf-merge': '<rect x="3" y="3" width="8" height="10" rx="1.5"/><rect x="13" y="3" width="8" height="10" rx="1.5"/><path d="M7 13v2a3 3 0 0 0 3 3h4a3 3 0 0 0 3-3v-2"/><path d="M12 18v3m-2-2 2 2 2-2"/>',
 'pdf-split': '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M3 12h3m3 0h2m3 0h2m3 0h2" /><path d="M9 6h6M9 8.5h4"/><path d="M9 16h6M9 18.5h4"/>',
 'pdf-organize': '<rect x="3" y="3" width="7" height="8" rx="1.5"/><rect x="14" y="3" width="7" height="8" rx="1.5"/><rect x="3" y="13" width="7" height="8" rx="1.5"/><path d="M17.5 14.5a3.5 3.5 0 1 1-3 1.7"/><path d="M14 13.5v3h3"/>',
 'pdf-compress': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M12 10v4m-2-2 2 2 2-2"/><path d="M12 20v-3m-2 1.5 2-1.5 2 1.5" /><path d="M8 15.5h8"/>',
 'pdf-protect': '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.5" r="1.6"/>',
 'pdf-unlock': '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 7.6-1.7"/><path d="M12 14v3"/>',
 'pdf-stamp': '<path d="M9 13V9.5a3 3 0 1 1 6 0V13"/><path d="M4 13h16v3H4z"/><path d="M6 20h12"/>',
 'pdf-ocr': '<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M8 8h8M12 8v9"/>',
 'pdf-to-img': '<path d="M10 2H5a2 2 0 0 0-2 2v9"/><path d="M10 2l4 4h-4z"/><rect x="11" y="11" width="10" height="10" rx="2"/><path d="m11 19 3-3 2.5 2.5 1.5-1.5 3 3"/><circle cx="17.5" cy="14" r="1"/><path d="M3 17h5m-2-2 2 2-2 2"/>',
 'img-to-pdf': '<rect x="3" y="3" width="10" height="10" rx="2"/><path d="m3 11 3-3 2.5 2.5L10 9l3 3"/><path d="M18 11h-1a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3a2 2 0 0 0 2-2v-5z"/><path d="M8 17h5m-2-2 2 2-2 2" transform="translate(-2 0)"/>',
 'img-convert': '<rect x="3" y="3" width="18" height="14" rx="2"/><circle cx="8.5" cy="8" r="1.5"/><path d="m3 15 5-5 4 4 2-2 5 5"/><path d="M8 21h8m-2-2 2 2-2 2" transform="translate(0 -1)"/>',
 'img-resize': '<rect x="3" y="9" width="12" height="12" rx="2"/><path d="M14 3h7v7"/><path d="m21 3-7 7"/><path d="m3 18 4-4 4 4"/>',
 'json': '<path d="M8 3H7a2 2 0 0 0-2 2v4a2 2 0 0 1-2 2 2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h1"/><path d="M16 3h1a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2 2 2 0 0 0-2 2v4a2 2 0 0 1-2 2h-1"/><path d="M10 9h4m-4 3h4m-4 3h2"/>',
 'json-compare': '<path d="M6 3H5a2 2 0 0 0-2 2v4l-1 1 1 1v4a2 2 0 0 0 2 2h1"/><path d="M18 3h1a2 2 0 0 1 2 2v4l1 1-1 1v4a2 2 0 0 1-2 2h-1"/><path d="M12 3v18"/><path d="M7.5 9h2m5 0h2m-9.5 4h2m5 0h2"/>',
 'json-query': '<circle cx="10" cy="10" r="6.5"/><path d="m15 15 6 6"/><path d="M8.5 7.5c-.8 0-1 .5-1 1v.6l-.6.4.6.4v.6c0 .5.2 1 1 1m3-4c.8 0 1 .5 1 1v.6l.6.4-.6.4v.6c0 .5-.2 1-1 1"/>',
 'data-convert': '<rect x="3" y="3" width="18" height="11" rx="2"/><path d="M3 7.5h18M9 3v11M15 3v11"/><path d="M6 21h12m-3-3 3 3-3 3" transform="translate(0 -2)"/>',
 'table-clean': '<rect x="3" y="3" width="14" height="14" rx="2"/><path d="M3 8h14M8 3v14"/><path d="M19 13l.8 2.2L22 16l-2.2.8L19 19l-.8-2.2L16 16l2.2-.8z"/>',
 'hash': '<path d="M9 3 7 21M17 3l-2 18M4 8.5h17M3 15.5h17"/>',
 'word-merge': '<path d="M4 3h9l4 4v6"/><path d="M6.5 8 8 13l1.5-4 1.5 4L12.5 8"/><path d="M4 3v14a2 2 0 0 0 2 2h4"/><path d="M14 17h7m-3-3 3 3-3 3"/>',
 'excel-combine': '<rect x="3" y="3" width="12" height="12" rx="2"/><path d="M3 7.5h12M7.5 3v12"/><path d="M9 21h10a2 2 0 0 0 2-2V9"/><path d="M18 6h3"/>',
 'find-replace': '<circle cx="9" cy="9" r="5.5"/><path d="m13 13 3 3"/><path d="M14 20h7m-2.5-2.5L21 20l-2.5 2.5"/><path d="M7 9h4"/>',
 'doc-stats': '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
 'metadata': '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.5"/><path d="m14 14 4 4m0-4-4 4"/>',
 'diff': '<rect x="3" y="3" width="8" height="18" rx="2"/><rect x="13" y="3" width="8" height="18" rx="2"/><path d="M5.5 9h3M17 7.5v3M15.5 9h3"/><path d="M5.5 14h3m7 0h3"/>',
 'zip-create': '<path d="M21 8v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/>',
 'pdf-sign': '<path d="m14.5 4.5 5 5L9 20H4v-5z"/><path d="m12.5 6.5 5 5"/><path d="M15 21h6"/>',
 'pdf-edit': '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h3"/><path d="m8 9 1.5 1.5L12 8"/>',
 'pdf-redact': '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><rect x="8" y="11" width="8" height="2.6" fill="currentColor"/><rect x="8" y="15.5" width="5" height="2.6" fill="currentColor"/>',
 'exam-photo': '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2.2"/><path d="M5.5 16.5c.6-1.8 2-2.7 3.5-2.7s2.9.9 3.5 2.7M14.5 9h4M14.5 12.5h4M14.5 16h2.5"/>',
 'zip-open': '<path d="M21 9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9"/><path d="M3 9 6 3h12l3 6z"/><path d="M12 12v5m-2-2 2 2 2-2"/>',
}
BLURB = {
 'convert': 'Word, PDF, Excel, PowerPoint, ODT, RTF and more',
 'pdf-merge': 'Combine PDFs into one, in any order',
 'pdf-split': 'Extract pages or split by range',
 'pdf-organize': 'Reorder, rotate and delete pages',
 'pdf-compress': 'Shrink PDFs for email and uploads',
 'pdf-protect': 'Add an AES-256 password',
 'pdf-unlock': 'Remove a password you know',
 'pdf-stamp': 'Watermarks and page numbers',
 'pdf-ocr': 'Text from scans — Kannada, Hindi & more',
 'pdf-to-img': 'Save pages as JPG or PNG',
 'img-to-pdf': 'Photos and scans into one PDF',
 'img-convert': 'HEIC, WEBP, AVIF, PNG, JPG, ICO…',
 'img-resize': 'Fit 20 KB / 50 KB form limits',
 'json': 'Format, validate and repair',
 'json-compare': 'Differences by structure',
 'json-query': 'JSONPath tester, schema generator',
 'data-convert': 'CSV ⇄ JSON ⇄ Excel ⇄ XML ⇄ YAML',
 'table-clean': 'De-duplicate, trim, sort, filter',
 'hash': 'MD5, SHA-256 checksums and Base64',
 'word-merge': 'Join .docx files, keep formatting',
 'excel-combine': 'Merge workbooks and sheets',
 'find-replace': 'Replace text across many files',
 'doc-stats': 'Words, characters, reading time',
 'metadata': 'Strip author, edit history and GPS',
 'diff': 'Compare text, Word and PDF files',
 'zip-create': 'Pack files and folders',
 'zip-open': 'Look inside and extract',
 'pdf-sign': 'Draw, type or upload a signature',
 'pdf-edit': 'Fill forms, add text and ticks',
 'pdf-redact': 'Hide details, mask Aadhaar',
 'exam-photo': 'Exact px and KB for exam forms',
}
NAME = {
 'convert': 'Document converter', 'pdf-merge': 'Merge PDF', 'pdf-split': 'Split PDF', 'pdf-organize': 'Organize pages',
 'pdf-compress': 'Compress PDF', 'pdf-protect': 'Protect PDF', 'pdf-unlock': 'Unlock PDF', 'pdf-stamp': 'Watermark & numbers',
 'pdf-ocr': 'OCR', 'pdf-to-img': 'PDF to images', 'img-to-pdf': 'Images to PDF', 'img-convert': 'Image converter',
 'img-resize': 'Resize & compress', 'json': 'JSON formatter', 'json-compare': 'JSON compare', 'json-query': 'JSONPath & schema',
 'data-convert': 'Data converter', 'table-clean': 'Table cleaner', 'hash': 'Checksums & Base64', 'word-merge': 'Merge Word',
 'excel-combine': 'Combine Excel', 'find-replace': 'Find & replace', 'doc-stats': 'Word count', 'metadata': 'Remove metadata',
 'diff': 'Compare files', 'zip-create': 'Create ZIP', 'zip-open': 'Open ZIP',
 'pdf-sign': 'Sign PDF', 'pdf-edit': 'Edit & fill PDF', 'pdf-redact': 'Mask PDF & Aadhaar', 'exam-photo': 'Passport size photo & signature',
}
GROUPS = [
 ('pdf', 'PDF', 'c-pdf', ['pdf-merge', 'pdf-split', 'pdf-organize', 'pdf-compress', 'pdf-sign', 'pdf-edit', 'pdf-redact', 'pdf-protect', 'pdf-unlock', 'pdf-stamp', 'pdf-ocr', 'pdf-to-img', 'img-to-pdf']),
 ('conv', 'Convert & images', 'c-img', ['convert', 'img-convert', 'img-resize', 'exam-photo']),
 ('docs', 'Documents', 'c-doc', ['word-merge', 'excel-combine', 'find-replace', 'doc-stats', 'metadata']),
 ('data', 'Data & developer', 'c-data', ['json', 'json-compare', 'json-query', 'data-convert', 'table-clean', 'hash']),
 ('arch', 'Compare & archive', 'c-arch', ['diff', 'zip-create', 'zip-open']),
]
import json, pathlib
SLUG = {t: m['slug'] for t, m in json.load(open(pathlib.Path(__file__).resolve().parent.parent / 'web' / 'seo.json'))['tools'].items() if t != 'home'}
FREE = {'json', 'json-compare', 'json-query', 'data-convert', 'table-clean', 'hash', 'diff', 'zip-open', 'doc-stats'}

def svg(t, size=22):
    return f'<svg aria-hidden="true" width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">{ICON[t]}</svg>'

def grid():
    out = []
    for gid, gname, cls, tools in GROUPS:
        cards = ''.join(
            f'<a class="tcard {cls}" href="{SLUG[t]}"><span class="tico">{svg(t)}</span><span class="ttx"><b>{NAME[t]}'
            + (' <em class="tfree">No limit</em>' if t in FREE else '') + f'</b><small>{BLURB[t]}</small></span></a>' for t in tools)
        out.append(f'<div class="tgroup"><h3>{gname} <span>{len(tools)}</span></h3><div class="tgrid">{cards}</div></div>')
    return '\n'.join(out)
