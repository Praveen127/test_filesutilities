// POWERPOINT TOOLS: PDF to PowerPoint, Compress, Slides to images, Extract images, Merge, Text & notes — plus the new task pages.
// Every result is checked outside the browser: python-pptx, the package's own references and content types, LibreOffice, pdf.js.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { open, FX, OUT, check, summary, waitDone, download } from './lib.mjs';
let pdfjs; try { pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs'); } catch { pdfjs = await import('/opt/npm-tools/node_modules/pdfjs-dist/legacy/build/pdf.mjs'); }
const here = path.dirname(new URL(import.meta.url).pathname);
const py = (...a) => JSON.parse(execFileSync('python3', [path.join(here, 'validate_ppt.py'), ...a], { encoding: 'utf8', timeout: 300000 }));
const clean = i => !i.broken_rels.length && !i.missing_ct.length && !i.dup_ids.length;
const pdfPages = async f => (await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(f)), isEvalSupported: false }).promise).numPages;

const t = await open({ viewport: { width: 1400, height: 1000 } }); const p = t.page;
const runGet = async (sec, files, setup) => { await t.go(sec); await t.add(sec, files); if (setup) await setup(); await t.run(sec, 240000); return t.downloads(sec); };

// ---------------- Slide text & speaker notes ----------------
let [txt] = await runGet('ppt-text', ['deck-a.pptx']);
let s = fs.readFileSync(txt, 'utf8');
check(/Slide 1: Quarterly Review FUPPTA/.test(s) && /Revenue up 18 percent/.test(s) && /New customers in Bengaluru/.test(s), 'Text: slide titles and bullets come out in order', s.slice(0, 120));
check(/Notes: Mention the Bengaluru team NOTEA2/.test(s), 'Text: speaker notes are included');
check(/Kalaburagi\t1200\t9%/.test(s), 'Text: tables come out as rows');
check(s.indexOf('Highlights') < s.indexOf('Big photo') && s.indexOf('Big photo') < s.indexOf('Shapes and a table'), 'Text: slides follow the presentation order');
await p.selectOption('#ppt-text .o-f', 'md'); await p.check('#ppt-text .o-h'); await p.click('#ppt-text .run'); await waitDone(p, 'ppt-text', 60000);
const [md] = await t.downloads('ppt-text'); s = fs.readFileSync(md, 'utf8');
check(/^# deck-a/m.test(s) && /## Slide 2 — Highlights/.test(s) && /> \*\*Notes:\*\* Mention/.test(s) && /\| City \| Users \| Growth \|/.test(s), 'Text: Markdown has headings, notes as quotes and a table', md);
check(!/Hidden backup slide/.test(s), 'Text: “Skip hidden slides” leaves the hidden slide out');

// ---------------- Extract images ----------------
const imgs = await runGet('ppt-images', ['deck-a.pptx']);
const orig = py('info', path.join(FX, 'deck-a.pptx'));
check(imgs.length === 2 && imgs.some(f => f.endsWith('.jpg')) && imgs.some(f => f.endsWith('.png')), 'Images: both pictures are saved in their own formats', imgs.map(f => path.basename(f)).join(', '));
const sizes = imgs.map(f => fs.statSync(f).size).sort((a, b) => a - b);
const zipSizes = execFileSync('python3', ['-c', `import zipfile;z=zipfile.ZipFile('${path.join(FX, 'deck-a.pptx')}');print(sorted(z.getinfo(n).file_size for n in z.namelist() if n.startswith('ppt/media/')))`], { encoding: 'utf8' }).trim();
check(JSON.stringify(sizes) === zipSizes.replace(/\s/g, ''), 'Images: files are byte-for-byte the originals (no re-encoding)', sizes + ' vs ' + zipSizes);

// ---------------- Compress ----------------
const [cmp] = await runGet('ppt-compress', ['deck-a.pptx']);
const ci = py('info', cmp);
check(ci.size < orig.size * 0.5, 'Compress: the presentation gets much smaller', `${(orig.size / 1e6).toFixed(1)} MB → ${(ci.size / 1e6).toFixed(1)} MB`);
check(clean(ci), 'Compress: every internal reference and content type is intact', JSON.stringify([ci.broken_rels, ci.missing_ct, ci.dup_ids]).slice(0, 200));
check(ci.slides.length === 5 && ci.slides[2].pics === 2 && ci.slides[1].notes.includes('NOTEA2'), 'Compress: slides, pictures and notes are all still there');
check(ci.media.some(m => /image2\.jpeg$/.test(m)) && !ci.media.some(m => /image2\.png$/.test(m)), 'Compress: a big photo saved as PNG becomes JPG', ci.media.join(', '));
const cr = py('render', cmp, path.join(OUT, 'lo'));
check(cr.ok && cr.pages === 4, 'Compress: LibreOffice opens and renders the compressed file', JSON.stringify(cr).slice(0, 160));
const rt = await p.$eval('#ppt-compress .rlist', e => e.innerText);
check(/MB → .*−\d+%/.test(rt), 'Compress: the result shows before and after sizes', rt.replace(/\s+/g, ' ').slice(0, 120));

// ---------------- Merge ----------------
const [mg] = await runGet('ppt-merge', ['deck-a.pptx', 'deck-b.pptx', 'deck-c.pptx'], async () => { await p.fill('#ppt-merge .o-name', 'all-decks'); });
const mi = py('info', mg);
check(path.basename(mg) === 'all-decks.pptx', 'Merge: uses the file name you type', path.basename(mg));
check(mi.slides.length === 8, 'Merge: all slides of the three decks are in one file', mi.slides.length);
check(mi.slides[0].text.includes('FUPPTA') && mi.slides[5].text.includes('FUPPTB') && mi.slides[7].text.includes('FUPPTC'), 'Merge: slides keep the order of the files');
check(clean(mi), 'Merge: every internal reference, content type and ID is valid', JSON.stringify([mi.broken_rels, mi.missing_ct, mi.dup_ids]).slice(0, 240));
check(mi.masters === 3, 'Merge: each presentation keeps its own design (3 slide masters)', mi.masters);
check(mi.slides[6].pics === 1 && mi.slides[1].notes.includes('NOTEA2') && !mi.slides[5].notes.includes('NOTEB1'), 'Merge: pictures come along; notes of later decks are dropped as the page says');
check(mi.slides[4].hidden, 'Merge: a hidden slide stays hidden');
const mr = py('render', mg, path.join(OUT, 'lo'));
check(mr.ok && mr.pages === 7, 'Merge: LibreOffice opens and renders the merged deck (7 visible slides)', JSON.stringify(mr).slice(0, 160));
await p.check('#ppt-merge [name=pm-d][value=first]'); await p.click('#ppt-merge .run'); await waitDone(p, 'ppt-merge', 120000);
const [mg2] = await t.downloads('ppt-merge'); const mi2 = py('info', mg2);
check(mi2.slides.length === 8 && mi2.masters === 1 && clean(mi2), 'Merge: “Use the first presentation’s design” leaves one design for all slides', `${mi2.slides.length} slides, ${mi2.masters} master(s)`);
check(mi2.slides[5].layout === 'Title Slide', 'Merge: slides are matched to the first deck’s layout of the same kind', mi2.slides[5].layout);

// ---------------- Slides to images ----------------
const shots = await runGet('ppt-to-img', ['deck-a.pptx']);
check(shots.length === 5 && shots.every(f => f.endsWith('.jpg')), 'To JPG: one picture per slide', shots.map(f => path.basename(f)).join(', '));
const dims = JSON.parse(execFileSync('python3', ['-c', `import json,sys;from PIL import Image,ImageStat;print(json.dumps([[*Image.open(f).size,ImageStat.Stat(Image.open(f).convert('L')).stddev[0]] for f in sys.argv[1:]]))`, ...shots], { encoding: 'utf8' }));
check(dims.every(d => d[0] === 1920 && d[1] === 1080), 'To JPG: Full HD pictures with the slide’s 16:9 shape', JSON.stringify(dims.map(d => d.slice(0, 2))));
check(dims.every(d => d[2] > 8), 'To JPG: every slide has visible content (not blank)', dims.map(d => d[2].toFixed(1)).join(', '));
for (const f of shots) fs.copyFileSync(f, path.join(OUT, 'render-' + path.basename(f)));
await p.selectOption('#ppt-to-img .o-f', 'pdf'); await p.fill('#ppt-to-img .o-r', '2-4'); await p.click('#ppt-to-img .run'); await waitDone(p, 'ppt-to-img', 120000);
const [sp] = await t.downloads('ppt-to-img');
check(sp.endsWith('.pdf') && await pdfPages(sp) === 3, 'To JPG: PDF option with a slide range gives one page per chosen slide', path.basename(sp));
await p.fill('#ppt-to-img .o-r', '9'); await p.click('#ppt-to-img .run'); await waitDone(p, 'ppt-to-img', 60000);
check(/No slides in that range/.test(await p.$eval('#ppt-to-img .side .msg', e => e.textContent)), 'To JPG: a slide number past the end gets a clear message');

// ---------------- PDF to PowerPoint ----------------
const [pp] = await runGet('pdf-to-ppt', ['canary.pdf']);
const pi = py('info', pp); const np = await pdfPages(path.join(FX, 'canary.pdf'));
check(pi.slides.length === np && pi.slides.every(x => x.pics === 1), 'PDF to PowerPoint: one slide per page, each with the page as a picture', `${pi.slides.length} slides for ${np} pages`);
check(pi.slides[0].notes.length > 20 && clean(pi), 'PDF to PowerPoint: the page text is in the speaker notes; the file is valid', pi.slides[0].notes.slice(0, 60));
const pr = py('render', pp, path.join(OUT, 'lo'));
check(pr.ok && pr.pages === np, 'PDF to PowerPoint: LibreOffice opens the result', JSON.stringify(pr).slice(0, 120));
await p.check('#pdf-to-ppt [name=pp-m][value=text]');
check(await p.$eval('#pdf-to-ppt .o-qf', e => e.hidden), 'PDF to PowerPoint: picture options hide in editable-text mode');
await p.click('#pdf-to-ppt .run'); await waitDone(p, 'pdf-to-ppt', 120000);
const [pt] = await t.downloads('pdf-to-ppt'); const pti = py('info', pt);
check(pti.slides.length >= 2 && pti.slides.some(x => x.text.length > 30) && clean(pti), 'PDF to PowerPoint: editable mode makes text slides', `${pti.slides.length} slides`);
await p.$$eval('#pdf-to-ppt .flist [data-rm]', b => b.forEach(x => x.click())); await t.add('pdf-to-ppt', ['canary-locked.pdf']); await p.check('#pdf-to-ppt [name=pp-m][value=look]');
await p.click('#pdf-to-ppt .run'); await waitDone(p, 'pdf-to-ppt', 60000);
check(/password-protected — unlock it first/.test(await p.$eval('#pdf-to-ppt .side .msg', e => e.textContent)), 'PDF to PowerPoint: a locked PDF gets a clear message');
// ---------------- wrong files get a clear message ----------------
await t.go('ppt-compress'); await p.setInputFiles('#ppt-compress .drop input', [path.join(FX, 'canary.docx')]); await p.waitForTimeout(300);
check(/not a supported file type/.test(await p.$eval('#ppt-compress .side .msg', e => e.textContent)), 'A Word file dropped on Compress PowerPoint is refused with a message');

// ---------------- the new task pages open the right tool with the right setting ----------------
const pageCheck = async (key, sec, fn, label) => { await t.go(key); await p.waitForTimeout(300); const ok = await p.evaluate(([s, f]) => !document.getElementById(s).hidden && new Function('return ' + f)(), [sec, fn]); check(ok, label); };
await pageCheck('compress-image-to-50kb', 'img-resize', "document.querySelector('#img-resize .o-kb').value==='50'", 'Task page /compress-image-to-50kb opens the image compressor set to 50 KB');
await pageCheck('compress-image-to-20kb', 'img-resize', "document.querySelector('#img-resize .o-kb').value==='20'", 'Task page /compress-image-to-20kb sets 20 KB');
await pageCheck('compress-pdf-to-100kb', 'pdf-compress', "document.querySelector('#pdf-compress .o-kb').value==='100'", 'Task page /compress-pdf-to-100kb sets 100 KB');
await pageCheck('png-to-jpg', 'img-convert', "document.querySelector('#img-convert .o-f').value==='jpg'", 'Task page /png-to-jpg picks JPG');
await pageCheck('jpg-to-png', 'img-convert', "document.querySelector('#img-convert .o-f').value==='png'", 'Task page /jpg-to-png picks PNG');
await pageCheck('image-to-pdf', 'img-to-pdf', 'true', 'Task page /image-to-pdf opens Images to PDF');
await pageCheck('ppt-to-pptx', 'convert', "document.querySelector('#tgts .chip[data-f=\"pptx\"]').getAttribute('aria-pressed')==='true'", 'Task page /ppt-to-pptx opens the converter with PPTX chosen');
await pageCheck('pdf-to-powerpoint', 'pdf-to-ppt', 'true', 'Address /pdf-to-powerpoint opens PDF to PowerPoint');

check(!t.errors.length, 'No script errors on the page', t.errors.join(' | ').slice(0, 300));
await t.close();
summary('PowerPoint tools');
