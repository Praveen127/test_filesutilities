// Captures one real screenshot per tool page and task page, for the "How it works" section of each page.
// Usage: node scripts/build-site.mjs --brand navy && node scripts/capture-tools.mjs navy /path/to/demo-files [only-key ...]
// Needs Playwright and ImageMagick. Writes web/media-<brand>/tool-<address>.webp. Pages whose libraries aren't
// available offline are captured in their "files added" state; task pages without their own flow reuse the tool's.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pw, ROOT, LOCAL, waitDone } from '../tests/browser/lib.mjs';

const BRAND = process.argv[2] || 'navy', DEMO = process.argv[3] || '/home/claude/demofiles', ONLY = process.argv.slice(4);
const SITE = path.join(ROOT, 'site-' + BRAND), OUT = path.join(ROOT, 'web', 'media-' + BRAND);
const seo = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/seo.json'), 'utf8'));
const slug = k => seo.variants[k] ? k : seo.tools[k].slug;
fs.mkdirSync(OUT, { recursive: true });
const TMP = fs.mkdtempSync('/tmp/fu-tools-');
const f = (...n) => n.map(x => path.join(DEMO, x));

const FLOWS = {
  convert: async p => { await p.setInputFiles('#cfile', f('Team update.pptx', 'notes-v1.txt', 'page.html')); await p.click('#tgts .chip[data-f="pdf"]'); await jobs(p); },
  'pdf-to-word': async p => { await p.setInputFiles('#cfile', f('Annual-report.pdf')); await jobs(p); },
  'powerpoint-to-pdf': async p => { await p.setInputFiles('#cfile', f('Team update.pptx')); await jobs(p); },
  'pdf-merge': async p => add(p, 'pdf-merge', 'Invoice-March.pdf', 'Contract-signed.pdf', 'Annual-report.pdf'),
  'pdf-split': async p => { await add(p, 'pdf-split', 'Annual-report.pdf'); await p.fill('#pdf-split .o-ranges', '1, 3'); await run(p, 'pdf-split'); },
  'pdf-organize': async p => { await add(p, 'pdf-organize', 'Annual-report.pdf'); await p.waitForFunction(() => document.querySelectorAll('#pdf-organize .thumb canvas').length === 3, null, { timeout: 30000 }); },
  'pdf-compress': async p => { await add(p, 'pdf-compress', 'Annual-report.pdf'); await run(p, 'pdf-compress'); },
  'pdf-protect': async p => { await add(p, 'pdf-protect', 'Contract-signed.pdf'); await p.fill('#pdf-protect .o-pw', 'Strong-pass-26'); await p.fill('#pdf-protect .o-pw2', 'Strong-pass-26'); await run(p, 'pdf-protect'); },
  'pdf-unlock': async p => { await add(p, 'pdf-unlock', 'Bank-statement.pdf'); await p.fill('#pdf-unlock .o-pw', 'user1'); await run(p, 'pdf-unlock'); },
  'pdf-stamp': async p => { await add(p, 'pdf-stamp', 'Contract-signed.pdf'); await run(p, 'pdf-stamp'); },
  'pdf-ocr': async p => add(p, 'pdf-ocr', 'Receipt-scan.png'),
  'pdf-to-img': async p => { await add(p, 'pdf-to-img', 'Annual-report.pdf'); await run(p, 'pdf-to-img'); },
  'img-to-pdf': async p => { await add(p, 'img-to-pdf', 'IMG_2048.jpg', 'Signature.jpg'); await run(p, 'img-to-pdf'); },
  'img-convert': async p => { await add(p, 'img-convert', 'banner.webp', 'logo.png'); await p.selectOption('#img-convert .o-f', 'jpg'); await run(p, 'img-convert'); },
  'webp-to-jpg': async p => { await add(p, 'img-convert', 'banner.webp'); await run(p, 'img-convert'); },
  'img-resize': async p => { await add(p, 'img-resize', 'IMG_2048.jpg'); await p.click('#img-resize [data-p="50"]'); await run(p, 'img-resize'); },
  json: async p => { await p.setInputFiles('#jfile', f('order.json')); await p.waitForTimeout(500); await p.click('#jvTree'); },
  'json-compare': async p => { await p.setInputFiles('#json-compare .ja-file', f('order.json')); await p.setInputFiles('#json-compare .jb-file', f('order-v2.json')); await p.click('#json-compare .o-go'); },
  'json-query': async p => { await p.setInputFiles('#json-query .jq-file', f('order.json')); await p.fill('#json-query .o-path', '$..price'); await p.press('#json-query .o-path', 'Enter').catch(() => {}); },
  'data-convert': async p => { await p.waitForTimeout(600); },
  'csv-to-json': async p => { await p.setInputFiles('#data-convert .dc-file', f('customers.csv')); },
  'table-clean': async p => { await p.setInputFiles('#table-clean .o-f', f('customers.csv')); await p.waitForTimeout(600); await p.click('#table-clean [data-op="dedupe"]'); },
  hash: async p => { await p.fill('#hash .o-bt', 'Fileutilo'); await p.setInputFiles('#hash .o-hf', f('Annual-report.pdf')); await p.waitForTimeout(1500); },
  'word-merge': async p => { await add(p, 'word-merge', 'Quarterly report.docx', 'Appendix.docx'); await run(p, 'word-merge'); },
  'excel-combine': async p => add(p, 'excel-combine', 'Sales 2026.xlsx', 'Sales April.xlsx'),
  'find-replace': async p => { await add(p, 'find-replace', 'Quarterly report.docx', 'notes-v1.txt'); await p.fill('#find-replace .o-f', 'Kalaburagi'); await p.fill('#find-replace .o-r', 'Gulbarga'); await run(p, 'find-replace'); },
  'doc-stats': async p => { await add(p, 'doc-stats', 'Quarterly report.docx'); await run(p, 'doc-stats'); },
  metadata: async p => { await add(p, 'metadata', 'Quarterly report.docx', 'Contract-signed.pdf', 'Signature.jpg'); await run(p, 'metadata'); },
  diff: async p => { await p.setInputFiles('#fA', f('notes-v1.txt')); await p.setInputFiles('#fB', f('notes-v2.txt')); await p.waitForTimeout(1200); },
  'zip-create': async p => { await add(p, 'zip-create', 'Annual-report.pdf', 'logo.png', 'customers.csv'); await run(p, 'zip-create'); },
  'zip-open': async p => { await add(p, 'zip-open', 'Project files.zip'); await p.waitForSelector('#zip-open .zrow', { timeout: 30000 }); },
};
async function add(p, sec, ...names) { await p.setInputFiles(`#${sec} .drop input`, f(...names)); await p.waitForTimeout(700); }
async function run(p, sec) { await p.click(`#${sec} .run`); await Promise.race([waitDone(p, sec, 60000), p.waitForSelector(`#${sec} .rlist li`, { timeout: 60000 })]); await p.waitForTimeout(700); }
async function jobs(p) { await p.waitForFunction(() => { const li = [...document.querySelectorAll('#jobs li[data-id]')]; return li.length && li.every(l => l.querySelector('.st.okk,.st.err')); }, null, { timeout: 60000 }); await p.waitForTimeout(600); }

const browser = await pw.chromium.launch();
// a fresh browser profile per page, so the free daily-task counter never gets in the way
async function newCtx() { const ctx = await browser.newContext({ viewport: { width: 1200, height: 760 }, deviceScaleFactor: 1 });
await ctx.route('**/*', r => {
  const u = new URL(r.request().url());
  if (u.host === 'www.fileutilo.com') { let n = u.pathname === '/' ? 'index.html' : u.pathname.slice(1); if (!n.includes('.')) n += '.html';
    const fp = path.join(SITE, n); return fs.existsSync(fp) ? r.fulfill({ path: fp }) : r.fulfill({ status: 404, body: '' }); }
  if (/fonts\.(googleapis|gstatic)/.test(u.host)) return r.continue();
  const hit = LOCAL.find(l => u.href.includes(l.key));
  if (hit && hit.file) return r.fulfill({ path: hit.file, contentType: 'text/javascript', headers: { 'Access-Control-Allow-Origin': '*' } });
  return r.abort('blockedbyclient');
}); return ctx; }
const done = [], failed = [];
const dimsFile = path.join(OUT, 'shots.json');
const dims = fs.existsSync(dimsFile) ? JSON.parse(fs.readFileSync(dimsFile, 'utf8')) : {};
for (const [k, flow] of Object.entries(FLOWS)) {
  if (ONLY.length && !ONLY.includes(k)) continue;
  const ctx = await newCtx(); const page = await ctx.newPage();
  try {
    await page.goto('https://www.fileutilo.com/' + slug(k)); await page.waitForTimeout(700);
    await page.addStyleTag({ content: '#gmsg,.acctbar,.seo-about,.adslot{display:none!important}' });
    const sec = seo.variants[k] ? seo.variants[k].tool : k;
    await flow(page);
    // capture the tool itself: from its top edge, as tall as the tool (at most 1100 px)
    const box = await page.evaluate(s => { const el = document.getElementById(s); const r = el.getBoundingClientRect(); return { y: r.top + scrollY, h: r.height }; }, sec);
    const h = Math.min(1100, Math.ceil(box.h) + 24);
    await page.setViewportSize({ width: 1200, height: Math.max(760, h) });
    await page.evaluate(y => window.scrollTo(0, y - 12), box.y); await page.waitForTimeout(400);
    const png = path.join(TMP, k + '.png');
    await page.screenshot({ path: png, clip: { x: 0, y: 0, width: 1200, height: h } });
    dims[`tool-${slug(k)}.webp`] = [1200, h];
    execFileSync('convert', [png, '-quality', '80', path.join(OUT, `tool-${slug(k)}.webp`)]);
    done.push(k);
  } catch (e) { failed.push(k + ': ' + e.message.split('\n')[0]); }
  await ctx.close();
}
await browser.close();
fs.writeFileSync(dimsFile, JSON.stringify(dims, null, 1));
console.log(`captured ${done.length}: ${done.join(', ')}`);
if (failed.length) console.log('FAILED:\n  ' + failed.join('\n  '));
