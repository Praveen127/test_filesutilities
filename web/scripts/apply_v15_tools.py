# Fileutilo 15, step 1: adds the PowerPoint tools and the new task pages to web/index.html.
# Safe to run once on a Fileutilo 14 index.html (each change checks it applies exactly once).
import json, pathlib, re
ROOT = pathlib.Path(__file__).resolve().parent.parent
P = ROOT / 'web' / 'index.html'
s = P.read_text(encoding='utf-8')
if '/*ppt-tools:start*/' in s:
    raise SystemExit('already applied')

def rep(a, b, n=1):
    global s
    c = s.count(a)
    assert c == n, (c, a[:100])
    s = s.replace(a, b)

# 1. the tools themselves, before the accounts module
code = (ROOT / 'scripts' / 'parts' / 'ppt_tools.js').read_text(encoding='utf-8')
anchor = '/* =====================================================================\n   ACCOUNTS & PLANS'
rep(anchor, code + '\n\n' + anchor)

# 2. a PowerPoint category in the header navigation, after Images
img_cat = "{id:'img',name:'Images',sub:'Convert, resize, passport photos',tools:['img-convert','img-resize','exam-photo'],ic:'<rect x=\"3\" y=\"4\" width=\"18\" height=\"16\" rx=\"2\"/><circle cx=\"9\" cy=\"10\" r=\"2\"/><path d=\"m21 16-5-5-9 9\"/>'},"
rep(img_cat, img_cat + "\n  {id:'slides',name:'PowerPoint',sub:'Compress, convert, merge',tools:['pdf-to-ppt','ppt-compress','ppt-to-img','ppt-images','ppt-merge','ppt-text'],ic:'<path d=\"M5 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z\"/><path d=\"M12 16v4M8 20h8\"/>'},")

# 3. short names (sub-navigation)
rep("diff:'File diff','zip-create':'Create ZIP','zip-open':'Open ZIP'};",
    "diff:'File diff','zip-create':'Create ZIP','zip-open':'Open ZIP',\n  'pdf-to-ppt':'PDF to PowerPoint','ppt-compress':'Compress','ppt-to-img':'Slides to images','ppt-images':'Extract images','ppt-merge':'Merge','ppt-text':'Text & notes'};")

# 4. addresses
NEW_SLUGS = {'pdf-to-ppt': 'pdf-to-powerpoint', 'ppt-compress': 'compress-powerpoint', 'ppt-to-img': 'powerpoint-to-jpg',
             'ppt-images': 'extract-images-from-powerpoint', 'ppt-merge': 'merge-powerpoint', 'ppt-text': 'powerpoint-text-and-notes'}
m = re.search(r'const SLUGS=(\{[^}]*\});', s)
slugs = json.loads(m.group(1)); slugs.update(NEW_SLUGS)
s = s[:m.start(1)] + json.dumps(slugs, separators=(',', ':')) + s[m.end(1):]
NEW_VARS = {'ppt-to-pptx': ['convert', 'pptx'], 'powerpoint-to-pdf': ['ppt-to-img', 'pdf'],
            'compress-image-to-50kb': ['img-resize', '50'], 'compress-image-to-20kb': ['img-resize', '20'], 'compress-image-to-100kb': ['img-resize', '100'],
            'compress-pdf-to-100kb': ['pdf-compress', '100'], 'compress-pdf-to-500kb': ['pdf-compress', '500'],
            'png-to-jpg': ['img-convert', 'jpg'], 'jpg-to-png': ['img-convert', 'png'], 'image-to-pdf': ['img-to-pdf', '']}
m = re.search(r'const VARIANTS=(\{.*?\});\n', s)
vs = json.loads(m.group(1)); vs.update(NEW_VARS)
s = s[:m.start(1)] + json.dumps(vs, separators=(',', ':')) + s[m.end(1):]

# 5. presets for the new task pages
rep("'pdf-redact':()=>{const a=document.querySelector('#pdf-redact .rd-aad');if(a)a.classList.add('hl')},'pdf-edit':()=>{}};",
    "'pdf-redact':()=>{const a=document.querySelector('#pdf-redact .rd-aad');if(a)a.classList.add('hl')},'pdf-edit':()=>{},\n"
    "  'img-resize':v=>{const b=document.querySelector(`#img-resize .chips2 [data-p=\"${v}\"]`);if(b)b.click()},\n  'ppt-to-img':v=>setSel('#ppt-to-img .o-f',v)};")

# 6. search entries (command palette and the home search box)
m = re.search(r'const PAL=(\[.*?\]);   //', s)
pal = json.loads(m.group(1))
for e in pal:
    if e[0] == 'convert':
        e[1] = 'Word, PowerPoint & Excel converter'; e[2] = 'To and from PDF — also PPT, DOC, XLS, ODT, RTF'
        e[3] = e[3] + ' powerpoint ppt pptx slides presentation word docx excel xlsx'
    if e[0] == 'pdf-redact': e[3] += ' aadhaar hide'
    if e[0] == 'exam-photo': e[3] += ' passport signature exam'
pal += [
    ['pdf-to-ppt', 'PDF to PowerPoint', 'Turn PDF pages into slides', 'pdf to powerpoint ppt pptx slides presentation convert pdf to ppt'],
    ['ppt-compress', 'Compress PowerPoint', 'Shrink big decks for email and uploads', 'compress powerpoint ppt pptx reduce size slides presentation'],
    ['ppt-to-img', 'PowerPoint to JPG', 'Save every slide as an image', 'powerpoint to jpg png image ppt pptx slides export pictures pdf'],
    ['ppt-images', 'Extract images from PowerPoint', 'Get every picture out of a deck', 'extract images powerpoint ppt pptx pictures photos media word excel'],
    ['ppt-merge', 'Merge PowerPoint', 'Combine several decks into one', 'merge powerpoint combine ppt pptx presentations slides join'],
    ['ppt-text', 'Slide text & speaker notes', 'Copy all text and notes from a deck', 'powerpoint text speaker notes ppt pptx extract copy slides transcript'],
]
s = s[:m.start(1)] + json.dumps(pal, ensure_ascii=False, separators=(',', ':')) + s[m.end(1):]

NEWPAL = [["ppt-to-pptx", "PPT to PPTX", "Rescue text from old .ppt files", "ppt to pptx convert old powerpoint 97 2003 upgrade"], ["compress-image-to-50kb", "Compress image to 50 KB", "Photos under 50 KB for forms", "compress image to 50 kb jpg photo under 50kb resize reduce"], ["compress-image-to-20kb", "Compress image to 20 KB", "Signatures under 20 KB", "compress image to 20 kb signature photo under 20kb"], ["compress-image-to-100kb", "Compress image to 100 KB", "Any picture under 100 KB", "compress image to 100 kb jpg photo under 100kb"], ["compress-pdf-to-100kb", "Compress PDF to 100 KB", "PDFs under a 100 KB limit", "compress pdf to 100 kb reduce pdf size under 100kb"], ["compress-pdf-to-500kb", "Compress PDF to 500 KB", "PDFs under a 500 KB limit", "compress pdf to 500 kb reduce pdf size under 500kb"], ["png-to-jpg", "PNG to JPG", "Smaller files that open everywhere", "png to jpg jpeg convert image"], ["jpg-to-png", "JPG to PNG", "PNG for editors and upload forms", "jpg to png jpeg convert image"], ["image-to-pdf", "Image to PDF", "Photos and scans into one PDF", "image to pdf photo picture png jpg heic convert"]]
m = re.search(r'const PAL=(\[.*?\]);   //', s)
pal = json.loads(m.group(1))
for e in pal:
    if e[0] == 'powerpoint-to-pdf': e[2] = 'Slides as a PDF that looks the same'
pal += [x for x in NEWPAL if x[0] not in {e[0] for e in pal}]
s = s[:m.start(1)] + json.dumps(pal, ensure_ascii=False, separators=(',', ':')) + s[m.end(1):]

P.write_text(s, encoding='utf-8')
print('PowerPoint tools and task pages added;', len(slugs), 'tools,', len(vs), 'task pages')
