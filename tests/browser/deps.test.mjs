// LIBRARY FAILURES: the app downloads its document engines (pdf.js, pdf-lib, JSZip, …) from public CDNs the first
// time a tool needs them. This checks what happens when that download fails, hangs, or comes from the backup CDN:
//  - every tool shows a plain-language message instead of hanging or failing silently
//  - the Run button comes back, the files stay in the list, and running again works once the network is back
//  - when cdn.jsdelivr.net is blocked, libraries load from unpkg.com instead
//  - a download that never finishes gives up after the time limit
import path from 'node:path';
import { open, check, skip, summary, hasLib, FX } from './lib.mjs';
import { DRIVERS } from './drivers.mjs';

const FRIENDLY = /Couldn’t download the|appear to be offline/;
const msgOf = (t, id) => t.page.$eval('#' + id, s => ((s.querySelector('.side .msg') || {}).textContent || '') + ((s.querySelector('.tout') || {}).textContent || '') + ((s.querySelector('.dco') || {}).value || '') + ((s.querySelector('.o-info') || {}).textContent || ''));
const withLibs = DRIVERS.filter(d => d.libs.length && !d.libs.includes('Tesseract') && d.libs.every(hasLib));

// 1) CDN blocked → friendly error, then retry succeeds
let t = await open({ init: 'window.FU_LIB_TIMEOUT=8000' });
for (const d of withLibs) {
  if (d.id === 'convert') continue;
  t.state.blockCdn = true;
  await t.page.reload(); await t.page.waitForTimeout(200);
  let err = '';
  try { await d.run(t); } catch (e) { err = e.message; }
  const m = await msgOf(t, d.id).catch(() => '');
  const runBtn = await t.page.$(`#${d.id} .run`);
  const enabled = runBtn ? await runBtn.isEnabled() : true;
  const busy = await t.page.$(`#${d.id} .tprog:not([hidden])`);
  check(FRIENDLY.test(m) && enabled && !busy, `${d.id}: clear message when its library can’t be downloaded`, (m.match(FRIENDLY) ? m.slice(m.search(FRIENDLY), m.search(FRIENDLY) + 70) : (err || m).slice(0, 120)));
  t.state.blockCdn = false;
  if (!runBtn) { let r = ''; try { r = await d.run(t); } catch (e) { r = 'ERROR ' + e.message; } check(!FRIENDLY.test(r) && !/^ERROR/.test(r), `${d.id}: works when tried again after the network is back`, String(r).slice(0, 80)); }
  if (runBtn) { await t.run(d.id); const r = await t.result(d.id) + await t.page.$eval(`#${d.id} .tout`, e => e.innerText); check(/Download|ready|rows|words/i.test(r) && !FRIENDLY.test(r), `${d.id}: works when run again after the network is back`, r.slice(0, 80)); }
}
// converter: failed read shows "Try again", which works once the CDN is reachable
t.state.blockCdn = true; await t.page.reload(); await t.go('convert');
await t.page.setInputFiles('#cfile', path.join(FX, 'canary.pdf').split(','));
await t.page.waitForSelector('#jobs [data-retry]', { timeout: 30000 });
const st = await t.page.textContent('#jobs .stt');
check(FRIENDLY.test(st), 'converter: clear message and a Try again button when the PDF reader can’t load', st.slice(0, 90));
t.state.blockCdn = false; await t.page.click('#jobs [data-retry]');
await t.page.waitForFunction(() => /choose a format|ready/i.test(document.querySelector('#jobs .stt').textContent), null, { timeout: 30000 });
check(true, 'converter: Try again reads the file once the network is back', await t.page.textContent('#jobs .stt'));
check(!t.errors.length, 'no script errors during failures', t.errors.join(' / '));
await t.close();

// 2) jsDelivr blocked → backup CDN (unpkg.com) is used
t = await open();
t.state.blockHost = /cdn\.jsdelivr\.net/;
const merge = DRIVERS.find(d => d.id === 'pdf-merge');
const out = await merge.run(t);
const via = t.requests.filter(r => /unpkg\.com/.test(r.url)).map(r => r.url.replace(/^https:\/\/unpkg\.com\/([^/]+).*/, '$1'));
check(/Download/.test(out) && via.length, 'falls back to unpkg.com when cdn.jsdelivr.net is blocked', via.join(', '));
const toImg = DRIVERS.find(d => d.id === 'pdf-to-img');
const out2 = await toImg.run(t);
const worker = t.requests.find(r => /unpkg\.com.*pdf\.worker/.test(r.url));
check(/Download/.test(out2) && worker, 'pdf.js worker also comes from the backup CDN', worker ? 'unpkg pdf.worker loaded' : out2.slice(0, 80));
await t.close();

// 3) hanging download → gives up after the time limit with a message
t = await open({ init: 'window.FU_LIB_TIMEOUT=2500' });
t.state.hang = true;
const t0 = Date.now();
await t.go('pdf-merge'); await t.add('pdf-merge', ['canary.pdf', 'canary.pdf']); await t.page.click('#pdf-merge .run');
await t.page.waitForFunction(() => /Couldn’t download/.test(document.querySelector('#pdf-merge .side .msg').textContent), null, { timeout: 30000 });
check(Date.now() - t0 < 15000, 'a download that never finishes stops after the time limit (both CDNs tried)', `${((Date.now() - t0) / 1000).toFixed(1)} s with a 2.5 s limit per CDN`);
await t.close();

// 4) device offline → says so
t = await open();
t.state.blockCdn = true; await t.ctx.setOffline(true);
await t.go('pdf-merge'); await t.add('pdf-merge', ['canary.pdf', 'canary.pdf']); await t.page.click('#pdf-merge .run');
await t.page.waitForFunction(() => /offline/.test(document.querySelector('#pdf-merge .side .msg').textContent), null, { timeout: 30000 });
check(true, 'tells the user they’re offline', (await t.page.textContent('#pdf-merge .side .msg')).slice(0, 90));
await t.ctx.setOffline(false); await t.close();
if (!hasLib('XLSX')) skip('Excel / Word-reader / OCR library failures', 'those libraries aren’t installed locally — run with LIB_MODE=online');
summary('library failures');
