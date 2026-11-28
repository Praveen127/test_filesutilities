import { fileURLToPath } from 'node:url';
// MOBILE: emulates phones and a tablet (screen size, pixel density, touch, mobile browser) and checks every screen:
//  - nothing is wider than the screen (no sideways scrolling) on any tool or page
//  - buttons and links are big enough to tap (at least 24×24 px, WCAG 2.2; most should be 44×44)
//  - text stays readable (no body text under 12 px)
//  - the category menu, a full tool run, the converter and the sign-in window all work with touch
import fs from 'node:fs';
import path from 'node:path';
import { open, check, summary, OUT, FX } from './lib.mjs';
import { DRIVERS } from './drivers.mjs';

const DEVICES = ['iPhone SE', 'iPhone 13', 'Pixel 7', 'Galaxy S9+', 'iPad Mini', 'iPhone 13 landscape'];
const shots = path.join(OUT, 'mobile'); fs.mkdirSync(shots, { recursive: true });
const ROUTES = ['home', ...DRIVERS.map(d => d.id), 'pricing', 'privacy', 'terms', 'refunds', 'for-business'];

for (const dev of DEVICES) {
  const t = await open({ device: dev, config: { supabaseUrl: 'https://proj.supabase.co', supabaseAnonKey: 'anon' },
    extraRoutes: [['supabase-js@2', path.join(path.dirname(fileURLToPath(import.meta.url)), 'mocks/mock-supabase.js')]] });
  const vw = t.page.viewportSize().width;
  const overflow = [], tiny = [], small = [], smallText = [], clipped = [];
  for (const r of ROUTES) {
    await t.go(r); await t.page.waitForTimeout(150);
    const m = await t.page.evaluate(() => {
      const W = innerWidth, wide = document.documentElement.scrollWidth > W + 1;
      const offenders = wide ? [...document.querySelectorAll('main *')].filter(e => { const b = e.getBoundingClientRect(); return b.width && b.right > W + 1 && getComputedStyle(e).position !== 'fixed' && !e.closest('[hidden],dialog:not([open]),.scrollx,pre,table,.subnav,nav'); }).slice(0, 3).map(e => e.tagName + '.' + e.className) : [];
      const vis = e => { const b = e.getBoundingClientRect(); const s = getComputedStyle(e); return b.width > 0 && b.height > 0 && s.visibility !== 'hidden' && !e.closest('[hidden],dialog:not([open])'); };
      const targets = [...document.querySelectorAll('main button, main a[href], main select, main input:not([type=file]):not([type=hidden]), header button, header a, .hero button, .hero a')].filter(vis).filter(e => !e.closest('p,li,.note,.msg'));
      const box = e => (e.closest('label') || e).getBoundingClientRect();   // a checkbox/radio's target is its whole label
      const tiny = targets.filter(e => { const b = box(e); return b.width < 24 || b.height < 24; }).map(e => (e.getAttribute('aria-label') || e.textContent || e.className).trim().slice(0, 20));
      const small = targets.filter(e => { const b = box(e); return b.width < 43.5 || b.height < 43.5; }).length;
      const smallText = [...document.querySelectorAll('main p, main li, main label, main td')].filter(vis).filter(e => parseFloat(getComputedStyle(e).fontSize) < 12).map(e => e.textContent.trim().slice(0, 20));
      const clipped = [...document.querySelectorAll('main button, main .sw, main .fi, main a.btn, main .tag')].filter(vis).filter(e => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible' || (e.classList.contains('sw') && e.scrollWidth > e.clientWidth + 1)).map(e => e.textContent.trim().slice(0, 16));
      return { wide, offenders, tiny, small, n: targets.length, smallText, clipped };
    });
    if (m.wide) overflow.push(r + (m.offenders.length ? ` (${m.offenders.join(',')})` : ''));
    if (m.tiny.length) tiny.push(`${r}: ${m.tiny.slice(0, 3).join(' / ')}`);
    small.push(m.small / Math.max(1, m.n));
    if (m.smallText.length) smallText.push(`${r}: ${m.smallText[0]}`);
    if (m.clipped.length) clipped.push(`${r}: ${m.clipped.slice(0, 4).join(' / ')}`);
  }
  check(!overflow.length, `${dev} (${vw}px): no sideways scrolling on any of ${ROUTES.length} screens`, overflow.join('; '));
  check(!tiny.length, `${dev}: every button/link is at least 24×24 px`, tiny.slice(0, 4).join('; '));
  const pct = Math.round(100 * (1 - small.reduce((a, b) => a + b, 0) / small.length));
  check(pct >= 85, `${dev}: most tap targets are 44×44 px or larger`, `${pct}% of buttons/links`);
  check(!smallText.length, `${dev}: no body text smaller than 12 px`, smallText.slice(0, 3).join('; '));
  check(!clipped.length, `${dev}: no cut-off button or label text`, clipped.slice(0, 4).join('; '));

  // category menu by touch
  // Home tab back to the home page, then a home-page tile to a tool — both by touch
  await t.go('pdf-merge'); await t.page.tap('#t-cat-home'); await t.page.waitForTimeout(250);
  const atHome = await t.page.evaluate(() => location.pathname === '/' && !document.getElementById('home').hidden);
  await t.page.locator('#tools .tcw[data-k="img-convert"] a').scrollIntoViewIfNeeded(); await t.page.tap('#tools .tcw[data-k="img-convert"] a'); await t.page.waitForTimeout(250);
  check(atHome && await t.page.evaluate(() => location.pathname === '/image-converter' && !document.getElementById('img-convert').hidden), `${dev}: Home tab and tool tiles work by tap`, await t.page.evaluate(() => location.pathname));
  // full tool run by touch
  await t.go('pdf-merge'); await t.add('pdf-merge', ['canary.pdf', 'canary.pdf']);
  await t.page.tap('#pdf-merge .run'); await t.page.waitForSelector('#pdf-merge .rlist li', { timeout: 60000 });
  const btn = await t.page.$('#pdf-merge [data-get]'); const bb = await btn.boundingBox();
  check(bb && bb.x >= 0 && bb.x + bb.width <= vw + 1, `${dev}: merge PDFs by tap; download button on screen`);
  await t.page.screenshot({ path: path.join(shots, `${dev.replace(/\W+/g, '_')}-merge.png`), fullPage: true });
  // converter
  await t.go('convert'); await t.page.setInputFiles('#cfile', path.join(FX, 'canary.txt')); await t.page.tap('.chip[data-f="pdf"]');
  await t.page.waitForSelector('#jobs [data-dl]', { timeout: 60000 });
  check(true, `${dev}: converter turns a text file into a PDF`);
  await t.page.screenshot({ path: path.join(shots, `${dev.replace(/\W+/g, '_')}-convert.png`), fullPage: false });
  // sign-in window fits the screen
  await t.page.tap('#acctBtn'); await t.page.waitForSelector('#authDlg[open]');
  const d = await t.page.$eval('#authDlg', e => { const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, top: b.top, h: b.height, H: innerHeight, sh: e.scrollHeight, ch: e.clientHeight, ov: getComputedStyle(e).overflowY }; });
  check(d.l >= 0 && d.r <= vw + 1 && (d.h <= d.H || d.ov !== 'visible'), `${dev}: sign-in window fits (or scrolls) on screen`, JSON.stringify(d));
  await t.page.screenshot({ path: path.join(shots, `${dev.replace(/\W+/g, '_')}-signin.png`) });
  await t.page.keyboard.press('Escape');
  await t.go('pricing'); await t.page.screenshot({ path: path.join(shots, `${dev.replace(/\W+/g, '_')}-pricing.png`), fullPage: true });
  check(!t.errors.length, `${dev}: no script errors`, t.errors.join(' / '));
  await t.close();
}
summary('mobile');
