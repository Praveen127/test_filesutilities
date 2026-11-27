# Independent checks for PowerPoint outputs: python-pptx, the package's own references, and LibreOffice.
# usage: python3 validate_ppt.py info FILE.pptx   |   python3 validate_ppt.py render FILE.pptx OUTDIR
import json, sys, zipfile, posixpath, subprocess, re, pathlib
from lxml import etree

def info(path):
    z = zipfile.ZipFile(path); names = set(z.namelist()); out = {'broken_rels': [], 'missing_ct': [], 'dup_ids': []}
    ct = etree.fromstring(z.read('[Content_Types].xml'))
    over = {e.get('PartName').lower() for e in ct if e.tag.endswith('Override')}
    defs = {e.get('Extension').lower() for e in ct if e.tag.endswith('Default')}
    for n in names:
        if n.endswith('/') : continue
        if not ('/' + n.lower() in over or n.rsplit('.', 1)[-1].lower() in defs): out['missing_ct'].append(n)
        if n.endswith('.rels'):
            base = posixpath.dirname(posixpath.dirname(n))
            for r in etree.fromstring(z.read(n)):
                if r.get('TargetMode') == 'External': continue
                t = r.get('Target'); p = t[1:] if t.startswith('/') else posixpath.normpath(posixpath.join(base, t))
                if p not in names: out['broken_rels'].append(f'{n} -> {t}')
    for n in over:
        if n[1:] not in {x.lower() for x in names}: out['missing_ct'].append('override without part: ' + n)
    pres = etree.fromstring(z.read('ppt/presentation.xml'))
    ns = {'p': 'http://schemas.openxmlformats.org/presentationml/2006/main'}
    ids = [e.get('id') for e in pres.iterfind('.//p:sldId', ns)]
    big = [e.get('id') for e in pres.iterfind('.//p:sldMasterId', ns)]
    for n in names:
        if re.match(r'ppt/slideMasters/[^/]+\.xml$', n): big += [e.get('id') for e in etree.fromstring(z.read(n)).iterfind('.//p:sldLayoutId', ns)]
    for lst in (ids, big):
        seen = set()
        for i in lst:
            if i in seen: out['dup_ids'].append(i)
            seen.add(i)
    from pptx import Presentation
    p = Presentation(path); slides = []
    for s in p.slides:
        txt = ' | '.join(sh.text_frame.text for sh in s.shapes if sh.has_text_frame and sh.text_frame.text.strip())
        for sh in s.shapes:
            if sh.has_table: txt += ' | ' + ' '.join(c.text for r in sh.table.rows for c in r.cells)
        notes = s.notes_slide.notes_text_frame.text if s.has_notes_slide else ''
        pics = sum(1 for sh in s.shapes if sh.shape_type == 13)
        slides.append({'text': txt, 'notes': notes, 'pics': pics, 'layout': s.slide_layout.name, 'hidden': s._element.get('show') == '0'})
    out.update(slides=slides, masters=len(p.slide_masters), media=sorted(n for n in names if n.startswith('ppt/media/')),
               size=pathlib.Path(path).stat().st_size, width=p.slide_width, height=p.slide_height)
    return out

def render(path, outdir):
    pathlib.Path(outdir).mkdir(parents=True, exist_ok=True)
    r = subprocess.run(['soffice', '--headless', '--convert-to', 'pdf', '--outdir', outdir, path], capture_output=True, text=True, timeout=240)
    pdf = pathlib.Path(outdir) / (pathlib.Path(path).stem + '.pdf')
    if not pdf.exists(): return {'ok': False, 'err': (r.stderr or r.stdout)[-400:]}
    from pypdf import PdfReader
    return {'ok': True, 'pages': len(PdfReader(str(pdf)).pages), 'pdf': str(pdf)}

if __name__ == '__main__':
    cmd = sys.argv[1]
    print(json.dumps(info(sys.argv[2]) if cmd == 'info' else render(sys.argv[2], sys.argv[3])))
