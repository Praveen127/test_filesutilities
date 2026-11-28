import { fileURLToPath } from 'node:url';
// FORMAT REGRESSION: converts every sample document into every output format, and runs the PDF, image and
// document tools, then has independent software check each result (validate_formats.py: pypdf/qpdf/pdftotext,
// python-docx, odfpy, python-pptx, openpyxl, Pillow, LibreOffice):
//  - the file opens / is valid
//  - the text, headings, lists and tables of the original are still there
//  - tool-specific promises hold (page counts, encryption, removed metadata, image sizes…)
// Measurements are compared with baselines/formats.json so later changes that lose content are caught.
// Update the baseline after an intentional change with:  UPDATE_BASELINE=1 node tests/browser/formats.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { open, check, skip, summary, hasLib, download, OUT, FX } from './lib.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(OUT, 'formats'); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
const manifest = [];
const t = await open();

// ---------- 1. converter: every input × every output ----------
const INPUTS = { 'canary.txt': [], 'canary.html': [], 'canary.pdf': ['pdfjsLib'], 'canary.docx': ['mammoth'], 'canary.odt': ['JSZip'], 'canary.rtf': [],
  'canary.doc': ['XLSX'], 'canary.pptx': ['JSZip'], 'canary.xlsx': ['XLSX'], 'canary.ods': ['XLSX'], 'canary.csv': ['XLSX'] };
const OUT_LIBS = { docx: ['JSZip'], odt: ['JSZip'], pdf: ['PDFLib'], xlsx: ['XLSX'], xls: ['XLSX'], pptx: ['PptxGenJS'] };
await t.go('convert');
let targets = null;
for (const [inp, libs] of Object.entries(INPUTS)) {
  if (!libs.every(hasLib)) { skip(`convert ${inp} → all formats`, `needs ${libs.join(', ')} (not installed offline) — run with LIB_MODE=online`); continue; }
  await t.page.reload(); await t.go('convert');
  await t.page.setInputFiles('#cfile', path.join(FX, inp));
  await t.page.waitForFunction(() => /choose a format|Could not read/i.test((document.querySelector('#jobs .stt') || {}).textContent || ''), null, { timeout: 60000 });
  const st = await t.page.textContent('#jobs .stt');
  if (!check(!/Could not read/.test(st), `read ${inp}`, st)) continue;
  if (!targets) targets = await t.page.$$eval('#jobs select[data-to] option', e => e.map(x => x.value).filter(Boolean));
  for (const to of targets) {
    if (!(OUT_LIBS[to] || []).every(hasLib)) { skip(`convert ${inp} → ${to}`, `needs ${(OUT_LIBS[to] || []).join(', ')} offline`); continue; }
    await t.page.selectOption('#jobs select[data-to]', to);
    await t.page.waitForFunction(() => /ready|Failed/.test(document.querySelector('#jobs .stt').textContent), null, { timeout: 90000 });
    const s = await t.page.textContent('#jobs .stt');
    if (/Failed/.test(s)) { check(false, `convert ${inp} → ${to}`, s); continue; }
    const f = await download(t.page, () => t.page.click('#jobs [data-dl]'));
    const dest = path.join(dir, `${inp.replace('.', '_')}__${to}.${to}`); fs.renameSync(f, dest);
    manifest.push({ name: `convert ${inp} → ${to}`, file: dest, check: 'convert', src: inp, fmt: to });
  }
}

// ---------- 2. tools ----------
let runNo = 0;
async function tool(id, files, setup, checks) {
  await t.page.reload(); await t.go(id); await t.add(id, files); if (setup) await setup(); await t.run(id);
  const outs = await t.downloads(id);
  if (!check(outs.length, `${id} produces output`, await t.result(id))) return;
  outs.forEach((f, i) => { const dest = path.join(dir, `tool_${String(++runNo).padStart(3, '0')}_${id}_${i}_${path.basename(f)}`); fs.renameSync(f, dest); const c = checks(i, f); manifest.push({ name: `${id}${c.label ? ' (' + c.label + ')' : ''}: ${path.basename(f)}`, file: dest, ...c }); });
}
const P = s => t.page.fill(...s);
if (hasLib('PDFLib')) {
  await tool('pdf-merge', ['canary.pdf', 'canary.pdf'], null, () => ({ check: 'pdf', pages: 6, text: ['Page 1', 'Page 3'] }));
  await tool('pdf-split', ['canary.pdf'], () => P(['#pdf-split .o-ranges', '1, 3']), () => ({ check: 'pdf', pages: 2, text: ['Page 1', 'Page 3'], notText: ['Page 2'] }));
  await tool('pdf-compress', ['canary.pdf'], null, () => ({ check: 'pdf', pages: 3, text: ['Body text on page 2'] }));
  await tool('pdf-protect', ['canary.pdf'], async () => { await P(['#pdf-protect .o-pw', 'kalaburagi']); await P(['#pdf-protect .o-pw2', 'kalaburagi']); },
    () => ({ check: 'pdf', pages: 3, password: 'kalaburagi', encrypted: 'AES-256', text: ['Page 2'] }));
  await tool('pdf-unlock', ['canary-locked.pdf'], () => P(['#pdf-unlock .o-pw', 'user1']), () => ({ check: 'pdf', pages: 3, encrypted: false, text: ['Page 1'] }));
  await tool('pdf-stamp', ['canary.pdf'], null, () => ({ check: 'pdf', pages: 3, text: ['Page 2', '2 of 3'] }));
  await tool('img-to-pdf', ['canary.png', 'canary.jpg'], null, () => ({ check: 'pdf', pages: 2, images: 2 }));
  if (hasLib('pdfjsLib')) {
    await tool('pdf-organize', ['canary.pdf'], async () => { await t.page.waitForFunction(() => document.querySelectorAll('#pdf-organize .thumb canvas').length === 3, null, { timeout: 30000 });
      await t.page.click('#pdf-organize .thumb[data-n="2"] [data-a="d"]'); await t.page.click('#pdf-organize .o-rev'); }, () => ({ check: 'pdf', pages: 2, firstPageText: 'Page 3', notText: ['Page 2'] }));
    await tool('pdf-to-img', ['canary.pdf'], null, () => ({ check: 'image', format: 'PNG', minWidth: 1000 }));
  }
}
await tool('img-convert', ['canary.png'], () => t.page.selectOption('#img-convert .o-f', 'jpg'), () => ({ check: 'image', format: 'JPEG', width: 640, height: 360 }));
await tool('img-convert', ['canary.jpg'], () => t.page.selectOption('#img-convert .o-f', 'webp'), () => ({ check: 'image', format: 'WEBP', width: 640, height: 360 }));
await tool('img-resize', ['canary.jpg'], () => t.page.click('#img-resize [data-p="50"]'), () => ({ check: 'image', format: 'JPEG', maxBytes: 50 * 1024, label: 'under 50 KB' }));
await tool('img-resize', ['canary.png'], () => t.page.click('#img-resize [data-p="w1080"]'), () => ({ check: 'image', width: 1080, height: 608, label: '1080 px wide' }));
// ---------- image formats: every input type → PNG, and a transparent PNG → every output type ----------
const IMG_IN = { 'img.gif': 6, 'img.webp': 1.5, 'img.avif': 6, 'img.bmp': 1.5, 'img.ico': 1.5, 'img-none.tif': 1.5, 'img-lzw.tif': 1.5, 'img-deflate.tif': 1.5,
  'img-packbits.tif': 1.5, 'img-gray.tif': 1.5, 'img-palette.tif': 1.5, 'img.svg': null };
for (const [f, maxDiff] of Object.entries(IMG_IN))
  await tool('img-convert', [f], () => t.page.selectOption('#img-convert .o-f', 'png'), () => ({ check: 'imgcmp', format: 'PNG', ref: path.join(FX, f), maxDiff, label: `open ${f}` }));
const IMG_OUT = { jpg: ['JPEG', 6], png: ['PNG', 0.5], webp: ['WEBP', 6], avif: ['AVIF', 8], gif: ['GIF', 12], bmp: ['BMP', 0.5], tiff: ['TIFF', 0.5], ico: ['ICO', 3], svg: ['SVG', 0.5] };
for (const [fmt, [pil, maxDiff]] of Object.entries(IMG_OUT)) {
  await t.page.reload(); await t.go('img-convert');
  const disabled = await t.page.$eval(`#img-convert .o-f option[value="${fmt}"]`, o => o.disabled ? o.textContent : '');
  if (disabled) { skip(`img-convert → ${fmt}`, disabled.trim()); continue; }
  if (fmt === 'avif' && !(await t.page.evaluate(() => new Promise(r => { const c = document.createElement('canvas'); c.width = c.height = 2; c.toBlob(b => r(!!b && b.type === 'image/avif'), 'image/avif'); }))) && !hasLib('jsquashAvif')) { skip('img-convert → avif', 'this browser needs the AVIF encoder (jSquash), not installed offline — run with LIB_MODE=online'); continue; }
  await tool('img-convert', ['img-alpha.png'], () => t.page.selectOption('#img-convert .o-f', fmt), () => ({ check: 'imgcmp', format: pil, ref: path.join(FX, 'img-alpha.png'), maxDiff, alpha: !['jpg', 'bmp'].includes(fmt), label: `save as ${fmt}` }));
}
check(!(await t.page.$('#img-convert .o-f option[value="heic"]')), 'HEIC is not offered as an output (browsers can’t create it)');

if (hasLib('JSZip')) {
  await tool('word-merge', ['canary.docx', 'canary2.docx'], null, () => ({ check: 'docx', text: ['Quarterly report', 'Appendix', 'Revenue up 12%'], tables: 1, headingsAtLeast: 3 }));
  await tool('find-replace', ['canary.docx'], async () => { await P(['#find-replace .o-f', 'Kalaburagi']); await P(['#find-replace .o-r', 'Gulbarga']); },
    () => ({ check: 'docx', text: ['Gulbarga', '5400'], notText: ['Kalaburagi'], tables: 1 }));
  await tool('zip-create', ['canary.txt', 'canary.png', 'canary.pdf'], null, () => ({ check: 'zip', names: ['canary.txt', 'canary.png', 'canary.pdf'] }));
  if (hasLib('PDFLib')) await tool('metadata', ['canary.docx', 'canary.pdf', 'canary.jpg'], null, i => ({ check: 'clean', kind: ['docx', 'pdf', 'jpg'][i] }));
}
await t.close();

// ---------- 3. independent validation ----------
fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 1));
let res;
try { res = JSON.parse(execFileSync('python3', [path.join(here, 'validate_formats.py'), path.join(dir, 'manifest.json')], { maxBuffer: 1 << 26 }).toString()); }
catch (e) { console.error(e.stdout?.toString(), e.stderr?.toString()); throw e; }
const baseFile = path.join(here, 'baselines/formats.json');
const base = fs.existsSync(baseFile) ? JSON.parse(fs.readFileSync(baseFile, 'utf8')) : {};
const update = process.env.UPDATE_BASELINE === '1' || !fs.existsSync(baseFile);
for (const r of res) {
  check(r.ok, r.name, r.problems.length ? r.problems.join('; ') : r.summary);
  const b = base[r.name];
  if (b && r.ok && !update) {
    const lost = Object.keys(b).filter(k => typeof b[k] === 'number' && (r.features[k] ?? 0) < b[k] * (k === 'words' || k === 'chars' ? 0.9 : 1));
    check(!lost.length, `${r.name}: no regression vs baseline`, lost.map(k => `${k} ${b[k]} → ${r.features[k]}`).join(', ') || 'matches baseline');
  }
}
if (update) { const nb = { ...base }; for (const r of res) if (r.ok) nb[r.name] = r.features; fs.mkdirSync(path.dirname(baseFile), { recursive: true }); fs.writeFileSync(baseFile, JSON.stringify(nb, null, 1)); console.log('baseline written:', baseFile); }
summary('formats');
