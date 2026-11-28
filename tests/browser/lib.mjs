// Shared helpers for the Fileutilo browser tests (Playwright + Chromium).
//
// The app is served at https://app.test/ — an https origin like the real site — straight from web/index.html.
// Libraries that the app normally downloads from cdn.jsdelivr.net / unpkg.com are handled by LIB_MODE:
//   LIB_MODE=local  (default) answer them from node_modules; any library not installed is "unavailable"
//   LIB_MODE=online let them go to the real CDNs (needs internet; every library is then available)
// Every request the page makes is recorded, so tests can inspect network traffic.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, '../..');
export const FX = path.join(here, 'fixtures');
export const OUT = path.join(here, 'out');
fs.mkdirSync(OUT, { recursive: true });
export const CANARY = 'FUCANARY7f3a9q';
export const LIB_MODE = process.env.LIB_MODE || 'local';

async function loadPlaywright() {
  const tries = [() => import('playwright'), () => import('/opt/npm-tools/node_modules/playwright/index.mjs')];
  for (const t of tries) { try { return await t(); } catch {} }
  throw new Error('Playwright not found: run  npm i -D playwright && npx playwright install chromium');
}
export const pw = await loadPlaywright();

// Where each CDN file can be found in node_modules (path relative to a node_modules folder).
const LIB_FILES = [
  ['/pdf-lib@', 'pdf-lib/dist/pdf-lib.min.js', 'PDFLib'],
  ['/jszip@', 'jszip/dist/jszip.min.js', 'JSZip'],
  ['/pptxgenjs@', 'pptxgenjs/dist/pptxgen.bundle.js', 'PptxGenJS'],
  ['legacy/build/pdf.worker.min.mjs', 'pdfjs-dist/legacy/build/pdf.worker.min.mjs', 'pdfjsWorker'],
  ['legacy/build/pdf.min.mjs', 'pdfjs-dist/legacy/build/pdf.min.mjs', 'pdfjsLib'],
  ['/js-yaml@', 'js-yaml/dist/js-yaml.min.js', 'jsyaml'],
  ['/mammoth@', 'mammoth/mammoth.browser.min.js', 'mammoth'],
  ['/xlsx@', 'xlsx/dist/xlsx.full.min.js', 'XLSX'],
  ['/html2pdf.js@', 'html2pdf.js/dist/html2pdf.bundle.min.js', 'html2pdf'],
  ['/heic2any@', 'heic2any/dist/heic2any.min.js', 'heic2any'],
  ['/@jsquash/avif@', '@jsquash/avif/encode.js', 'jsquashAvif'],
];
const NM_DIRS = [path.join(ROOT, 'node_modules'), '/opt/npm-tools/node_modules', '/opt/npm-tools/node_modules/markdownlint-cli/node_modules'];
const localFile = rel => NM_DIRS.map(d => path.join(d, rel)).find(f => fs.existsSync(f));
export const LOCAL = LIB_FILES.map(([key, rel, name]) => ({ key, name, file: localFile(rel) }));
/** true if the named library (e.g. 'XLSX', 'mammoth') can be loaded in this test run */
export const hasLib = name => LIB_MODE === 'online' || !!(LOCAL.find(l => l.name === name) || {}).file;

const APP_HTML = () => fs.readFileSync(process.env.APP_HTML || path.join(ROOT, 'web/index.html'), 'utf8');
const CDN = /^https:\/\/(cdn\.jsdelivr\.net|unpkg\.com)\//;

/**
 * Opens the app in a fresh browser context.
 * opts: viewport, device (Playwright device name), config (object merged into FILEUTILO_CONFIG),
 *       blockCdn (fail every CDN request), extraRoutes [[urlSubstring, filePath]], hasTouch,
 *       noVendor (as if web/vendor/ were empty), vendorMissing [path parts that 404], vendorHang (manifest never answers)
 */
export async function open(opts = {}) {
  const browser = await pw.chromium.launch();
  const dev = opts.device ? pw.devices[opts.device] : {};
  const ctx = await browser.newContext({ ...dev, acceptDownloads: true, serviceWorkers: 'block', ...(opts.viewport ? { viewport: opts.viewport } : {}), ...(opts.hasTouch ? { hasTouch: true } : {}), ...(opts.colorScheme ? { colorScheme: opts.colorScheme } : {}) });
  let html = APP_HTML();
  if (opts.config) html = html.replace('/*config-overrides*/', `Object.assign(window.FILEUTILO_CONFIG, ${JSON.stringify(opts.config)});`);
  const requests = [];
  const state = { blockCdn: !!opts.blockCdn };
  ctx.on('request', r => { let body = null; try { body = r.postDataBuffer(); } catch {} requests.push({ url: r.url(), method: r.method(), type: r.resourceType(), body, headers: r.headers() }); });
  await ctx.route('**/*', async route => {
    const u = route.request().url();
    if (u.startsWith('https://app.test/')) {
      const p = new URL(u).pathname;
      if (p === '/' || p === '/index.html' || /^\/[a-z0-9-]+$/.test(p)) return route.fulfill({ body: html, contentType: 'text/html; charset=utf-8' });
      if (p === '/config.js') return route.fulfill({ body: 'window.FILEUTILO_CONFIG = {};', contentType: 'text/javascript' });
      if (p === '/_vercel/insights/script.js') return route.fulfill({ path: path.join(here, 'mocks/mock-vercel-insights.js'), contentType: 'text/javascript' });
      if (p === '/_vercel/insights/view') return route.fulfill({ status: 200, body: 'OK' });
      // libraries on fileutilo.com itself (web/vendor/, filled by scripts/vendor-libs.mjs); opts.noVendor hides them
      if (p.startsWith('/vendor/')) {
        const f = path.join(ROOT, 'web', decodeURIComponent(p));
        if (opts.noVendor || (opts.vendorMissing || []).some(x => p.includes(x)) || !f.startsWith(path.join(ROOT, 'web', 'vendor')) || !fs.existsSync(f)) return route.fulfill({ status: 404, body: 'not found' });
        if (opts.vendorHang && p === '/vendor/manifest.json') { await new Promise(r => setTimeout(r, 60000)); return route.abort('timedout').catch(() => {}); }
        return route.fulfill({ path: f, contentType: /\.m?js$/.test(f) ? 'text/javascript' : /\.json$/.test(f) ? 'application/json' : 'application/octet-stream' });
      }
      return route.fulfill({ status: 404, body: 'not found' });
    }
    for (const [k, f] of opts.extraRoutes || []) if (u.includes(k)) return route.fulfill({ path: f, contentType: 'text/javascript', headers: { 'Access-Control-Allow-Origin': '*' } });
    if (CDN.test(u)) {
      if (state.blockCdn || (state.blockHost && state.blockHost.test(u))) return route.abort('internetdisconnected');
      if (state.hang) { await new Promise(r => setTimeout(r, 120000)); return route.abort('timedout').catch(() => {}); }
      if (LIB_MODE === 'online') return route.continue();
      const hit = LOCAL.find(l => u.includes(l.key));
      if (hit && hit.file) return route.fulfill({ path: hit.file, contentType: 'text/javascript', headers: { 'Access-Control-Allow-Origin': '*' } });
      return route.abort('blockedbyclient');
    }
    if (LIB_MODE === 'online' && !/^https:\/\/(app\.test|[a-z0-9-]+\.supabase\.co|checkout\.razorpay\.com)/.test(u)) return route.continue();
    return route.abort('blockedbyclient');
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_|net::|Failed to load resource|library load failed|status of 404/.test(m.text())) errors.push('console: ' + m.text()); });
  if (opts.init) await page.addInitScript(opts.init);
  await page.goto('https://app.test/' + (opts.hash ? '#' + opts.hash : ''));
  await page.waitForTimeout(300);
  const t = {
    browser, ctx, page, requests, errors, state,
    async go(hash) { await page.evaluate(h => { location.hash = h; }, hash); await page.waitForTimeout(250); },
    async add(sec, files) { await page.setInputFiles(`#${sec} .drop input`, files.map(f => path.join(FX, f))); await page.waitForTimeout(400); },
    async run(sec, ms = 90000) { await page.click(`#${sec} .run`); await waitDone(page, sec, ms); },
    async result(sec) { return page.$eval('#' + sec, s => ((s.querySelector('.side .msg') || {}).textContent || '') + ' | ' + [...s.querySelectorAll('.rlist li')].map(l => l.innerText.replace(/\s+/g, ' ')).join(' || ')); },
    async downloads(sec) { const out = []; for (const b of await page.$$(`#${sec} [data-get]`)) out.push(await download(page, () => b.click())); return out; },
    async close() { await browser.close(); },
  };
  return t;
}
export async function waitDone(page, sec, ms = 90000) {
  await page.waitForFunction(s => { const el = document.getElementById(s); const busy = el.querySelector('.tprog:not([hidden])');
    const res = el.querySelector('.tout').innerHTML.trim() || (el.querySelector('.side .msg') || {}).textContent; return !busy && res && res.trim(); }, sec, { timeout: ms });
}
export async function download(page, click) {
  const [d] = await Promise.all([page.waitForEvent('download', { timeout: 90000 }), click()]);
  const p = path.join(OUT, d.suggestedFilename()); await d.saveAs(p); return p;
}

// ---- tiny test runner with a summary ----
const results = [];
export function check(cond, name, detail = '') { detail = String(detail).replace(/\s+/g, ' ').slice(0, 220); results.push({ ok: !!cond, name, detail }); console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); return !!cond; }
export function skip(name, why) { why = String(why).replace(/\s+/g, ' '); results.push({ ok: null, name, detail: why }); console.log(`SKIP  ${name}  — ${why}`); }
export function summary(label) {
  const p = results.filter(r => r.ok === true).length, f = results.filter(r => r.ok === false).length, s = results.filter(r => r.ok === null).length;
  console.log(`\n${label}: ${p} passed, ${f} failed, ${s} skipped`);
  fs.writeFileSync(path.join(OUT, label.replace(/\W+/g, '_') + '.json'), JSON.stringify(results.map(({ body, ...r }) => r), null, 1));
  if (f) process.exitCode = 1;
  return { p, f, s };
}
