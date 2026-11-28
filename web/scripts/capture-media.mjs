// Captures the landing-page screenshots and the demo video from the built site, for one brand.
// Usage: node scripts/build-site.mjs --brand navy --out site-navy && node scripts/capture-media.mjs navy /path/to/demo-files
// Needs Playwright (dev dependency) and ffmpeg. Writes web/media-<brand>/.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pw, ROOT, LOCAL } from '../tests/browser/lib.mjs';

const BRAND = process.argv[2] || 'navy', DEMO = process.argv[3] || '/tmp/demo';
const SITE = path.join(ROOT, 'site-' + BRAND), OUT = path.join(ROOT, 'web', 'media-' + BRAND);
fs.mkdirSync(OUT, { recursive: true });
const TMP = fs.mkdtempSync('/tmp/fu-media-');

async function context(browser, opts) {
  const ctx = await browser.newContext(opts);
  await ctx.route('**/*', r => {
    const u = new URL(r.request().url());
    if (u.host === 'www.fileutilo.com') {
      let f = u.pathname === '/' ? 'index.html' : u.pathname.slice(1); if (!f.includes('.')) f += '.html';
      const p = path.join(SITE, f); return fs.existsSync(p) ? r.fulfill({ path: p }) : r.fulfill({ status: 404, body: '' });
    }
    if (/fonts\.(googleapis|gstatic)/.test(u.host)) return r.continue();
    const hit = LOCAL.find(l => u.href.includes(l.key));
    if (hit && hit.file) return r.fulfill({ path: hit.file, contentType: 'text/javascript', headers: { 'Access-Control-Allow-Origin': '*' } });
    return r.abort('blockedbyclient');
  });
  return ctx;
}
const tidy = page => page.addStyleTag({ content: '#gmsg{display:none!important} .acctbar{display:none!important} .seo-about{display:none!important}' });
const toTool = async (page, id) => {
  await page.goto('https://www.fileutilo.com/' + id); await page.waitForTimeout(900); await tidy(page);
  await page.evaluate(id => { const s = document.getElementById(id); window.scrollTo(0, s.getBoundingClientRect().top + scrollY - 18); }, id);
};

const browser = await pw.chromium.launch();
// ---------- screenshots ----------
{
  const ctx = await context(browser, { viewport: { width: 1200, height: 760 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const shot = async name => { await page.waitForTimeout(500); await page.screenshot({ path: path.join(TMP, name + '.png') }); };
  await toTool(page, 'pdf-merge');
  await page.setInputFiles('#pdf-merge .drop input', ['Invoice-March.pdf', 'Contract-signed.pdf', 'Receipt-0421.pdf'].map(f => path.join(DEMO, f)));
  await page.waitForTimeout(1200); await shot('shot-merge');
  await toTool(page, 'convert');
  await page.setInputFiles('#cfile', ['Quarterly report.docx', 'Budget 2026.xlsx', 'Brochure.pdf'].map(f => path.join(DEMO, f)));
  await page.waitForTimeout(1500); await shot('shot-convert');
  await toTool(page, 'json'); await page.waitForTimeout(600); await shot('shot-json');
  await ctx.close();
}
// ---------- demo video (img-resize: photo → under 50 KB) ----------
{
  const ctxStart = Date.now();
  const ctx = await context(browser, { viewport: { width: 1000, height: 625 }, deviceScaleFactor: 1, recordVideo: { dir: TMP, size: { width: 1000, height: 625 } } });
  const page = await ctx.newPage();
  await toTool(page, 'img-resize');
  await page.addStyleTag({ content: '#fcur{position:fixed;z-index:9999;left:0;top:0;width:22px;height:22px;border-radius:50%;background:rgba(255,111,89,.85);box-shadow:0 0 0 6px rgba(255,111,89,.25);pointer-events:none;transition:transform .6s cubic-bezier(.3,.7,.3,1),opacity .2s;transform:translate(820px,560px)}' });
  await page.evaluate(() => { const c = document.createElement('div'); c.id = 'fcur'; document.body.appendChild(c); });
  const point = async sel => {
    const b = await page.locator(sel).first().boundingBox();
    await page.evaluate(([x, y]) => { document.getElementById('fcur').style.transform = `translate(${x}px,${y}px)`; }, [b.x + b.width / 2 - 11, b.y + b.height / 2 - 11]);
    await page.waitForTimeout(750);
  };
  const t0 = Date.now();
  await page.waitForTimeout(700);
  await point('#img-resize .drop'); await page.setInputFiles('#img-resize .drop input', path.join(DEMO, 'IMG_2048.jpg')); await page.waitForTimeout(1300);
  await point('#img-resize button:has-text("Photo")'); await page.locator('#img-resize button:has-text("Photo")').first().click(); await page.waitForTimeout(900);
  await point('#img-resize .run'); await page.click('#img-resize .run');
  await page.waitForSelector('#img-resize .rlist li', { timeout: 20000 });
  await page.waitForTimeout(300);
  await page.evaluate(() => { const r = document.querySelector('#img-resize .rlist'); const b = r.getBoundingClientRect(); if (b.bottom > innerHeight - 20) window.scrollBy({ top: b.bottom - innerHeight + 60, behavior: 'smooth' }); });
  await page.waitForTimeout(900);
  await point('#img-resize .rlist li button:has-text("Download")');
  await page.waitForTimeout(2600);
  const end = Date.now();
  const video = await page.video().path();
  await ctx.close();
  const src = video;
  const ss = ((t0 - ctxStart) / 1000).toFixed(2);           // skip the page-load part of the recording
  const to = ((end - ctxStart) / 1000).toFixed(2);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', ss, '-to', to, '-i', src, '-an', '-vf', 'fps=24,scale=1000:-2', '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '40', '-row-mt', '1', path.join(OUT, 'demo.webm')]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', ss, '-to', to, '-i', src, '-an', '-vf', 'fps=24,scale=1000:-2,format=yuv420p', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28', '-movflags', '+faststart', path.join(OUT, 'demo.mp4')]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-sseof', '-1', '-i', path.join(OUT, 'demo.mp4'), '-frames:v', '1', path.join(TMP, 'poster.png')]);
  execFileSync('convert', [path.join(TMP, 'poster.png'), '-quality', '80', path.join(OUT, 'demo-poster.webp')]);
}
await browser.close();
for (const n of ['shot-merge', 'shot-convert', 'shot-json']) execFileSync('convert', [path.join(TMP, n + '.png'), '-quality', '82', path.join(OUT, n + '.webp')]);
for (const f of fs.readdirSync(OUT)) console.log(f.padEnd(18), (fs.statSync(path.join(OUT, f)).size / 1024).toFixed(0) + ' KB');
