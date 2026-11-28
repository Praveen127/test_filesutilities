// LIBRARIES FROM FILEUTILO.COM (16.1): web/vendor/ first, the public CDNs as backup, nothing breaks either way.
import path from 'node:path';
import fs from 'node:fs';
import { open, FX, check, summary, ROOT } from './lib.mjs';
const MAN = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/vendor/manifest.json'), 'utf8'));
const cdn = r => /cdn\.jsdelivr\.net|unpkg\.com/.test(r.url);
const own = r => r.url.startsWith('https://app.test/vendor/');
const merge = async t => { await t.add('pdf-merge', ['canary.pdf', 'canary.pdf']); await t.run('pdf-merge'); return t.page.$$eval('#pdf-merge .tout [data-get]', a => a.length); };
const go = async (t, u) => { await t.page.goto('https://app.test' + u); await t.page.waitForTimeout(300); };

check(!!MAN.libs.PDFLib && !!MAN.libs.pdfjsLib, 'The manifest lists the PDF editor and PDF reader', Object.keys(MAN.libs).join(', '));

let t = await open(); await go(t, '/merge-pdf');
check(await merge(t) === 1, 'Vendored: Merge PDF works');
const pdfLibReq = t.requests.filter(r => /pdf-lib/.test(r.url));
check(pdfLibReq.length && pdfLibReq.every(own), 'Vendored: the PDF editor comes from fileutilo.com, not a CDN', pdfLibReq.map(r => r.url).join(' '));
check(t.requests.filter(r => /vendor\/manifest\.json/.test(r.url)).length === 1, 'The manifest is read once per visit');
await t.close();

t = await open(); await go(t, '/pdf-to-jpg');
await t.add('pdf-to-img', ['canary.pdf']); await t.run('pdf-to-img');
const pdfjs = t.requests.filter(r => /pdfjs-dist/.test(r.url));
check(await t.page.$$eval('#pdf-to-img .tout [data-get]', a => a.length) > 0 && pdfjs.length >= 2 && pdfjs.every(own),
  'Vendored: the PDF reader and its worker both come from fileutilo.com', pdfjs.map(r => r.url.split('/').slice(-1)[0]).join(' '));
await t.close();

t = await open({ blockCdn: true }); await go(t, '/merge-pdf');
check(await merge(t) === 1, 'Company network that blocks the CDNs: vendored tools still work');
await t.close();

t = await open({ noVendor: true }); await go(t, '/merge-pdf');
check(await merge(t) === 1 && t.requests.some(r => cdn(r) && /pdf-lib/.test(r.url)) && !t.requests.some(r => /vendor\/pdf-lib/.test(r.url)),
  'No vendored files: the page goes straight to the CDN (no wasted requests)');
await t.close();

t = await open({ vendorMissing: ['pdf-lib'] }); await go(t, '/merge-pdf');
check(await merge(t) === 1 && t.requests.some(r => cdn(r) && /pdf-lib/.test(r.url)), 'A listed file missing on the server: falls back to the CDN');
await t.close();

t = await open({ vendorHang: true }); await go(t, '/merge-pdf');
const t0 = Date.now(); const n = await merge(t);
check(n === 1 && Date.now() - t0 < 20000, 'Manifest never answers: tools still work from the CDN after a short wait', `${Date.now() - t0} ms`);
await t.close();

t = await open({ blockCdn: true, vendorMissing: ['pdf-lib'] }); await go(t, '/merge-pdf');
await t.add('pdf-merge', ['canary.pdf', 'canary.pdf']); await t.page.click('#pdf-merge button.run'); await t.page.waitForTimeout(2500);
const said = await t.page.evaluate(() => [...document.querySelectorAll('#pdf-merge .msg, #gmsg')].map(e => e.textContent).join(' '));
check(/Couldn’t download the PDF editor from fileutilo\.com or its backup servers/.test(said), 'Everything blocked: a plain message that names fileutilo.com', said.slice(0, 160));
await t.close();

const src = fs.readFileSync(path.join(ROOT, 'web/index.html'), 'utf8');
check(/supabase-js@\d+\.\d+\.\d+\/dist\/umd\/supabase\.js/.test(src) && !/supabase-js@2\//.test(src), 'Supabase is pinned to an exact version');
check(src.includes('cdn.sheetjs.com/xlsx-0.20.3/') && !src.includes('xlsx@0.18.5'), 'SheetJS is 0.20.3 from SheetJS’s own CDN');
summary('Libraries from fileutilo.com');
