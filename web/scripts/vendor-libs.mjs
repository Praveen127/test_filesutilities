#!/usr/bin/env node
// Fileutilo 16.1 — puts the tool libraries on fileutilo.com itself.
//
// Run once on a computer with internet (and again only when a version below changes):
//     node scripts/vendor-libs.mjs              download what's missing into web/vendor/, check, write the manifest
//     node scripts/vendor-libs.mjs --verify     check every file against web/vendor/vendor-lock.json, download nothing
//     node scripts/vendor-libs.mjs --local DIR  copy libraries from a node_modules folder when it has the exact version
// Then build as usual (node scripts/build-site.mjs): web/vendor/ is copied into site-navy/vendor/.
//
// The page loads each library from fileutilo.com/vendor/ first and falls back to the public CDNs, so a missing
// file never breaks a tool. Only files listed in vendor/manifest.json are tried, so nothing 404s.
// Every file's SHA-256 is recorded in vendor-lock.json the first time it is downloaded; later runs refuse a file
// whose content has changed, so nothing can change underneath you.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'web', 'vendor');
const LOCK = path.join(OUT, 'vendor-lock.json');
const MANIFEST = path.join(OUT, 'manifest.json');

const JSD = (pkg, ver, f) => `https://cdn.jsdelivr.net/npm/${pkg}@${ver}/${f}`;
const UNPKG = (pkg, ver, f) => `https://unpkg.com/${pkg}@${ver}/${f}`;
// global name in the page → package, exact version, files (the first one is what the page loads)
const LIBS = {
  PDFLib:    { pkg: 'pdf-lib', ver: '1.17.1', files: ['dist/pdf-lib.min.js'] },
  pdfjsLib:  { pkg: 'pdfjs-dist', ver: '6.2.108', files: ['legacy/build/pdf.min.mjs', 'legacy/build/pdf.worker.min.mjs'] },
  JSZip:     { pkg: 'jszip', ver: '3.10.1', files: ['dist/jszip.min.js'] },
  mammoth:   { pkg: 'mammoth', ver: '1.8.0', files: ['mammoth.browser.min.js'] },
  html2pdf:  { pkg: 'html2pdf.js', ver: '0.10.1', files: ['dist/html2pdf.bundle.min.js'] },
  // SheetJS publishes current versions only on its own CDN (the npm registry stops at 0.18.5)
  XLSX:      { pkg: 'xlsx', ver: '0.20.3', files: ['dist/xlsx.full.min.js'],
               urls: (ver, f) => [`https://cdn.sheetjs.com/xlsx-${ver}/package/${f}`] },
  PptxGenJS: { pkg: 'pptxgenjs', ver: '3.12.0', files: ['dist/pptxgen.bundle.js'] },
  Tesseract: { pkg: 'tesseract.js', ver: '5.1.1', files: ['dist/tesseract.min.js', 'dist/worker.min.js'] },
  heic2any:  { pkg: 'heic2any', ver: '0.0.4', files: ['dist/heic2any.min.js'] },
  jsyaml:    { pkg: 'js-yaml', ver: '4.1.0', files: ['dist/js-yaml.min.js'] },
  supabase:  { pkg: '@supabase/supabase-js', ver: '2.104.1', files: ['dist/umd/supabase.js'] },
  // jSquash AVIF stays on the CDNs: its module imports other packages by CDN address.
};
const TESS_CORE_FILES = ['tesseract-core-simd-lstm.wasm.js', 'tesseract-core-lstm.wasm.js', 'tesseract-core-relaxedsimd-lstm.wasm.js',
  'tesseract-core-simd.wasm.js', 'tesseract-core.wasm.js', 'tesseract-core-relaxedsimd.wasm.js'];
const TESS_CORE_REQUIRED = ['tesseract-core-simd-lstm.wasm.js', 'tesseract-core-lstm.wasm.js'];
const TESS_LANG = ['https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz',
  'https://tessdata.projectnaptha.com/4.0.0_best_int/eng.traineddata.gz', 'https://tessdata.projectnaptha.com/4.0.0/eng.traineddata.gz'];

const args = process.argv.slice(2);
const VERIFY = args.includes('--verify');
const LOCAL = args.includes('--local') ? path.resolve(args[args.indexOf('--local') + 1] || 'node_modules') : null;
const lock = fs.existsSync(LOCK) ? JSON.parse(fs.readFileSync(LOCK, 'utf8')) : {};
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
let problems = 0;

async function get(urls) {
  let last;
  for (const u of urls) {
    try {
      const r = await fetch(u, { redirect: 'follow' });
      if (!r.ok) { last = `${u} → HTTP ${r.status}`; continue; }
      return { buf: Buffer.from(await r.arrayBuffer()), from: u };
    } catch (e) { last = `${u} → ${e.message}`; }
  }
  throw new Error(last || 'no address to try');
}

// rel: path under vendor/. Returns true when the file is in place and matches the lock.
async function place(rel, urls, { required = true, localFile = null } = {}) {
  const dest = path.join(OUT, rel);
  if (fs.existsSync(dest)) {
    const b = fs.readFileSync(dest), h = sha(b), want = lock[rel];
    if (want && want.sha256 !== h) { console.error(`✗ ${rel}: content differs from vendor-lock.json — delete it to download again`); problems++; return false; }
    if (!want) lock[rel] = { sha256: h, bytes: b.length, from: 'existing file' };
    console.log(`✓ ${rel}`);
    return true;
  }
  if (VERIFY) { if (required) { console.error(`✗ ${rel}: missing`); problems++; } return false; }
  let got = null;
  if (localFile && fs.existsSync(localFile)) got = { buf: fs.readFileSync(localFile), from: 'local ' + localFile };
  else {
    try { got = await get(urls); }
    catch (e) { if (required) { console.error(`✗ ${rel}: ${e.message}`); problems++; } else console.log(`· ${rel}: not available (optional)`); return false; }
  }
  const h = sha(got.buf), want = lock[rel];
  if (want && want.sha256 !== h) { console.error(`✗ ${rel}: downloaded file differs from vendor-lock.json (${got.from}) — not saved`); problems++; return false; }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, got.buf);
  lock[rel] = { sha256: h, bytes: got.buf.length, from: got.from };
  console.log(`↓ ${rel}  (${(got.buf.length / 1024).toFixed(0)} KB from ${got.from})`);
  return true;
}

function localPkg(pkg, ver) {
  if (!LOCAL) return null;
  const dir = path.join(LOCAL, pkg);
  try { return JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).version === ver ? dir : null; } catch { return null; }
}

fs.mkdirSync(OUT, { recursive: true });
const manifest = { note: 'Written by scripts/vendor-libs.mjs. The page loads these from fileutilo.com before trying the CDNs.', libs: {} };

for (const [name, L] of Object.entries(LIBS)) {
  const local = localPkg(L.pkg, L.ver);
  let all = true;
  for (const f of L.files) {
    const rel = `${L.pkg}@${L.ver}/${f}`;
    const urls = L.urls ? L.urls(L.ver, f) : [JSD(L.pkg, L.ver, f), UNPKG(L.pkg, L.ver, f)];
    if (!await place(rel, urls, { localFile: local && path.join(local, f) })) all = false;
  }
  if (all) manifest.libs[name] = `vendor/${L.pkg}@${L.ver}/${L.files[0]}`;
}

// OCR: worker, engine (WebAssembly) and English language data
if (manifest.libs.Tesseract) {
  let coreVer = null;
  try {
    const pkgJson = LOCAL && localPkg('tesseract.js', LIBS.Tesseract.ver)
      ? fs.readFileSync(path.join(localPkg('tesseract.js', LIBS.Tesseract.ver), 'package.json'))
      : (await get([JSD('tesseract.js', LIBS.Tesseract.ver, 'package.json'), UNPKG('tesseract.js', LIBS.Tesseract.ver, 'package.json')])).buf;
    coreVer = String(JSON.parse(pkgJson).dependencies['tesseract.js-core'] || '').replace(/^[^\d]*/, '');
  } catch (e) {
    const prev = Object.keys(lock).find(k => k.startsWith('tesseract.js-core@'));
    coreVer = prev ? prev.split('@')[1].split('/')[0] : null;
  }
  let coreOk = !!coreVer;
  if (coreVer) for (const f of TESS_CORE_FILES) {
    const ok = await place(`tesseract.js-core@${coreVer}/${f}`, [JSD('tesseract.js-core', coreVer, f), UNPKG('tesseract.js-core', coreVer, f)],
      { required: TESS_CORE_REQUIRED.includes(f) });
    if (!ok && TESS_CORE_REQUIRED.includes(f)) coreOk = false;
  } else { console.error('✗ tesseract.js-core: could not work out its version'); problems++; }
  const langOk = await place('tessdata/eng.traineddata.gz', TESS_LANG);
  if (coreOk && langOk) manifest.tesseract = {
    workerPath: `vendor/tesseract.js@${LIBS.Tesseract.ver}/dist/worker.min.js`,
    corePath: `vendor/tesseract.js-core@${coreVer}/`, langPath: 'vendor/tessdata' };
}

const ordered = Object.fromEntries(Object.keys(lock).sort().map(k => [k, lock[k]]));
fs.writeFileSync(LOCK, JSON.stringify(ordered, null, 1) + '\n');
fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + '\n');
const n = Object.keys(manifest.libs).length, total = Object.keys(LIBS).length;
console.log(`\n${n} of ${total} libraries on fileutilo.com${manifest.tesseract ? ', plus OCR engine and English data' : ''}. ` +
  (problems ? `${problems} problem(s) above — those keep loading from the CDNs.` : 'All checked against vendor-lock.json.'));
process.exitCode = problems && VERIFY ? 1 : 0;
