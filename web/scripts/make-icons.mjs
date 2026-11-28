// Draws the app icons and the link-preview image into web/static-navy/ from one logo definition, so every place the
// logo appears matches the header (blue gradient #5b97ff → #2f6fed, white lines, coral dot #ff6f59).
// The PNGs are committed, so this only needs running when the logo or the share image changes.
// Run: node scripts/make-icons.mjs        (needs Playwright: npm install && npx playwright install chromium;
//      the share image uses the Outfit and Inter fonts if they're installed, otherwise the nearest sans-serif)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'web', 'static-navy');
const GRAD = '<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5b97ff"/><stop offset="1" stop-color="#2f6fed"/></linearGradient>';
const GLYPH = '<path d="M4 7h10M4 12h16M4 17h7" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><circle cx="18" cy="7" r="2.4" fill="#ff6f59"/>';
// glyph: the 24-unit drawing; box = how much of the icon it spans (0.75 = same as the favicon)
const icon = ({ rounded, box }) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs>${GRAD}</defs>`
  + `<rect width="64" height="64" rx="${rounded ? 16 : 0}" fill="url(#g)"/>`
  + `<g transform="translate(${32 - 32 * box} ${32 - 32 * box}) scale(${64 * box / 24})">${GLYPH}</g></svg>`;

const ICONS = [
  // installed app / desktop: the rounded tile on a transparent background, exactly like the favicon
  ['icon-192.png', 192, icon({ rounded: true, box: 0.75 })],
  ['icon-512.png', 512, icon({ rounded: true, box: 0.75 })],
  // Android adaptive icons: full-bleed blue, lines inside the centre safe zone (the phone cuts its own shape)
  ['icon-maskable-192.png', 192, icon({ rounded: false, box: 0.6 })],
  ['icon-maskable-512.png', 512, icon({ rounded: false, box: 0.6 })],
  // iPhone / iPad home screen: full-bleed blue; iOS rounds the corners itself
  ['apple-touch-icon.png', 180, icon({ rounded: false, box: 0.75 })],
];

const OG = `<!doctype html><html><head><meta charset="utf-8"><style>
*{margin:0;box-sizing:border-box}body{width:1200px;height:630px;overflow:hidden;font-family:Inter,system-ui,sans-serif;color:#fff;
background:radial-gradient(900px 500px at 92% 0%,#24407e 0%,rgba(36,64,126,0) 60%),linear-gradient(160deg,#121c38,#0e1630)}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:40px 40px}
.w{position:absolute;left:80px;top:72px;right:80px}
.b{display:flex;align-items:center;gap:22px}.b img{width:84px;height:84px;filter:drop-shadow(0 10px 24px rgba(47,111,237,.45))}
.b span{font:700 44px Outfit,Inter,sans-serif;letter-spacing:-.01em;color:#c7d8ff}
h1{margin-top:66px;font:700 66px/1.08 Outfit,Inter,sans-serif;letter-spacing:-.02em}
h2{margin-top:22px;font:600 44px/1.15 Outfit,Inter,sans-serif;color:#9cc0ff;letter-spacing:-.01em}h2 em{font-style:normal;color:#ff8a78}
p{margin-top:30px;font-size:28px;color:#c6d0e6}
ul{position:absolute;left:80px;bottom:62px;display:flex;gap:44px;list-style:none;font:500 24px Inter,sans-serif;color:#e8edf8}
li:before{content:'✓ ';color:#9cc0ff}
</style></head><body><div class="grid"></div><div class="w">
<div class="b"><img src="data:image/svg+xml;base64,${Buffer.from(icon({ rounded: true, box: 0.75 })).toString('base64')}"><span>Fileutilo</span></div>
<h1>Free PDF, image, Word and<br>other Office tools</h1>
<h2>Your files <em>never leave</em> your device.</h2>
</div><ul><li>No uploads</li><li>No installation</li><li>www.fileutilo.com</li></ul></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, size, svg] of ICONS) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  await page.screenshot({ path: path.join(OUT, name), omitBackground: true });
  console.log('✓', name);
}
fs.writeFileSync(path.join(OUT, 'favicon.svg'), icon({ rounded: true, box: 0.75 }));
console.log('✓ favicon.svg');
await page.setViewportSize({ width: 1200, height: 630 });
await page.setContent(OG); await page.waitForTimeout(300);
await page.screenshot({ path: path.join(OUT, 'og-image.png') });
console.log('✓ og-image.png');
await browser.close();
