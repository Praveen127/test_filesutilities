# Fileutilo 16.1.4: an "Open-source licences" page (/licenses), linked quietly from the footer and the terms.
# It lists each library with its version, licence and source, carries the LGPL notice for the HEIC converter and the
# SheetJS attribution, and links the full licence texts (web/legal/*.txt). The build marks it noindex and leaves it
# out of the sitemap. Run after apply_v1613_wordmark.py.
import pathlib
P = pathlib.Path(__file__).resolve().parent.parent / 'web' / 'index.html'
s = P.read_text(encoding='utf-8')
if '<section id="licenses"' in s:
    raise SystemExit('already applied')

def rep(a, b, n=1):
    global s
    c = s.count(a)
    assert c == n, (c, a[:110])
    s = s.replace(a, b)

rep("const PAGE_IDS=['pricing','privacy','terms','refunds','for-business'];",
    "const PAGE_IDS=['pricing','privacy','terms','refunds','for-business','licenses'];")
rep("const PAGES=['pricing','privacy','terms','refunds','for-business'];",
    "const PAGES=['pricing','privacy','terms','refunds','for-business','licenses'];")

# name, version, licence (text, file), source, what it includes
LIBS = [
    ('pdf-lib', '1.17.1', 'MIT', 'MIT', 'https://github.com/Hopding/pdf-lib', ''),
    ('PDF.js (pdfjs-dist)', '6.2.108', 'Apache-2.0', 'Apache-2.0', 'https://github.com/mozilla/pdf.js', ''),
    ('JSZip', '3.10.1', 'MIT (dual-licensed MIT or GPL-3.0; used under MIT)', 'MIT', 'https://github.com/Stuk/jszip', ''),
    ('SheetJS Community Edition', '0.20.3', 'Apache-2.0', 'Apache-2.0', 'https://git.sheetjs.com/sheetjs/sheetjs', ''),
    ('mammoth', '1.8.0', 'BSD-2-Clause', 'BSD-2-Clause', 'https://github.com/mwilliamson/mammoth.js', ''),
    ('html2pdf.js', '0.10.1', 'MIT', 'MIT', 'https://github.com/eKoopmans/html2pdf.js', 'Includes jsPDF and html2canvas (MIT).'),
    ('PptxGenJS', '3.12.0', 'MIT', 'MIT', 'https://github.com/gitbrent/PptxGenJS', ''),
    ('Tesseract.js', '5.1.1', 'Apache-2.0', 'Apache-2.0', 'https://github.com/naptha/tesseract.js',
     'Includes the Tesseract OCR engine (Apache-2.0) and Leptonica (BSD-2-Clause style). English language data from '
     '<a href="https://github.com/tesseract-ocr/tessdata" rel="noopener">tessdata</a> (Apache-2.0).'),
    ('heic2any', '0.0.4', 'MIT', 'MIT', 'https://github.com/alexcorvi/heic2any',
     'Includes libheif and libde265 (LGPL-3.0); see the notice below.'),
    ('jSquash AVIF', '2.1.1', 'Apache-2.0', 'Apache-2.0', 'https://github.com/jamsinclair/jSquash',
     'Includes libavif and libaom (BSD-2-Clause; libaom also under the AOMedia Patent License 1.0).'),
    ('js-yaml', '4.1.0', 'MIT', 'MIT', 'https://github.com/nodeca/js-yaml', ''),
    ('supabase-js', '2.104.1', 'MIT', 'MIT', 'https://github.com/supabase/supabase-js', ''),
]
rows = ''.join(
    f'<tr><td><b>{n}</b>{f"<br><small>{inc}</small>" if inc else ""}</td><td>{v}</td>'
    f'<td><a href="legal/{f}.txt">{l}</a></td><td><a href="{src}" rel="noopener">Source</a></td></tr>'
    for n, v, l, f, src, inc in LIBS)

SECTION = f'''<section id="licenses" hidden class="legal"><h2>Open-source licences</h2><p class="note">Last updated: <span class="l-date">28 November 2026</span></p>
<p>Fileutilo’s tools run in your browser using the open-source software below. We use each one unchanged, and each file keeps its own copyright notice. Our thanks to their authors.</p>
<div class="lic-wrap"><table class="lic"><thead><tr><th>Software</th><th>Version</th><th>Licence</th><th>Source code</th></tr></thead><tbody>{rows}</tbody></table></div>
<h3>GNU LGPL notice (HEIC photo converter)</h3><p>The HEIC converter includes <a href="https://github.com/strukturag/libheif" rel="noopener">libheif</a> and <a href="https://github.com/strukturag/libde265" rel="noopener">libde265</a>, which are covered by the <a href="legal/LGPL-3.0.txt">GNU Lesser General Public License, version 3</a>, which builds on the <a href="legal/GPL-3.0.txt">GNU General Public License, version 3</a>. You can get their source code from the links above. Fileutilo loads them as a separate, unmodified file (heic2any {LIBS[8][1]}), so you can replace it with your own build of the same libraries.</p>
<h3>SheetJS notice</h3><pre class="lic-pre">SheetJS Community Edition -- https://sheetjs.com/

Copyright (C) 2012-present SheetJS LLC

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.</pre>
<h3>Licence texts</h3><ul><li><a href="legal/Apache-2.0.txt">Apache License 2.0</a></li><li><a href="legal/MIT.txt">MIT License</a></li><li><a href="legal/BSD-2-Clause.txt">BSD 2-Clause License</a></li><li><a href="legal/LGPL-3.0.txt">GNU LGPL 3.0</a> and <a href="legal/GPL-3.0.txt">GNU GPL 3.0</a></li></ul>
<h3>Fonts</h3><p>Inter, Inter Tight, Outfit and JetBrains Mono, served by Google Fonts under the <a href="https://openfontlicense.org/" rel="noopener">SIL Open Font License 1.1</a>.</p>
<h3>Questions</h3><p><a class="l-mail" href="mailto:support@fileutilo.com">support@fileutilo.com</a></p></section>
'''
rep('<h3>How to ask</h3><p>Email <a class="l-mail" href="mailto:support@fileutilo.com">support@fileutilo.com</a> from your account email with the payment date and amount.</p></section>\n',
    '<h3>How to ask</h3><p>Email <a class="l-mail" href="mailto:support@fileutilo.com">support@fileutilo.com</a> from your account email with the payment date and amount.</p></section>\n' + SECTION)
# terms: point to it (SheetJS recommends linking the list from the terms)
rep('<h3>Law and disputes</h3><p>These terms are governed by the laws of India.',
    '<h3>Open-source software</h3><p>Fileutilo uses open-source software under its own licences. See <a href="licenses">Open-source licences</a>.</p>\n<h3>Law and disputes</h3><p>These terms are governed by the laws of India.')
# footer: small link next to the version
rep('<span class="fver" title="Fileutilo version">v<span data-fu-ver>dev</span></span>',
    '<span class="fver" title="Fileutilo version">v<span data-fu-ver>dev</span></span> · <a class="flic" href="licenses">Open-source licences</a>')
# styles, outside every @media block (first </head> is the page's own)
i = s.index('</head>'); assert i < s.index('<body')
CSS = ('<style>/*licenses-v1614*/footer .flic{color:inherit;opacity:.75;font-size:12px}footer .flic:hover{opacity:1}'
       '.lic-wrap{overflow-x:auto}.lic{border-collapse:collapse;width:100%;font-size:14px;margin:8px 0 4px}'
       '.lic th,.lic td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top}'
       '.lic th{font-size:12px;text-transform:uppercase;letter-spacing:.04em;opacity:.75}.lic small{opacity:.8}.lic a{display:inline-block;min-height:24px;line-height:24px;min-width:24px}'
       '.lic-pre{white-space:pre-wrap;font:12px/1.5 "JetBrains Mono",monospace;background:light-dark(#f4f2ee,#22211e);'
       'padding:12px 14px;border-radius:8px;overflow-x:auto}</style>\n')
s = s[:i] + CSS + s[i:]
P.write_text(s, encoding='utf-8')
print('open-source licences page added')
