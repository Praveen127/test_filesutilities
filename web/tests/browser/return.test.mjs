// COMING BACK: favourites, recent activity, result previews, keyboard shortcuts, quick open,
// and the installable app working offline (service worker, tested on a real local web server).
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { pw, open, ROOT, FX, check, skip, summary } from './lib.mjs';

const fx = (...n) => n;   // t.add takes fixture names
let t = await open({});
const p = t.page;
const vis = () => p.evaluate(() => [...document.querySelectorAll('main>section')].filter(s => !s.hidden).map(s => s.id).join());

// ---------- favourites ----------
await t.go('pdf-merge');
const star = '#pdf-merge .favbtn';
check(await p.$eval(star, b => b.getAttribute('aria-pressed') === 'false' && /Add Merge PDF to favourites/.test(b.getAttribute('aria-label'))), 'each tool has a labelled “Add to favourites” button');
await p.click(star);
check(await p.$eval(star, b => b.getAttribute('aria-pressed')) === 'true', 'clicking it marks the tool as a favourite (aria-pressed)');
await t.go('home');
check(await p.evaluate(() => !document.getElementById('mine').hidden && [...document.querySelectorAll('#mine .mtile')].map(a => a.textContent.trim()).includes('Merge PDF')), 'favourites appear on the home page');
await p.reload(); await p.waitForTimeout(500);
check(await p.evaluate(() => [...document.querySelectorAll('#mine .mtile')].some(a => a.getAttribute('href') === '/merge-pdf')), 'favourites are remembered after a reload, and link to the tool');
await p.click('#mine .mtile'); await p.waitForTimeout(300);
check((await vis()) === 'pdf-merge', 'a favourite opens its tool', await vis());

// ---------- recent activity + result preview ----------
await t.add('pdf-merge', fx('canary.pdf', 'canary.pdf'));
await p.keyboard.press('Control+Enter');
await p.waitForSelector('#pdf-merge .rlist li', { timeout: 60000 });
check(true, 'Ctrl+Enter runs the open tool');
check(await p.$('#pdf-merge .rlist [data-prev]') !== null, 'results have a Preview button');
await p.click('#pdf-merge .rlist [data-prev]');
await p.waitForFunction(() => document.querySelectorAll('#prevDlg .pv-page').length >= 1, null, { timeout: 30000 });
check(await p.evaluate(() => { const d = document.getElementById('prevDlg'); const c = d.querySelector('.pv-page'); return d.open && c.width > 100 && /merged\.pdf/.test(d.querySelector('#pvTitle').textContent) && /page/.test(d.querySelector('.pv-body').textContent); }),
  'PDF results preview as rendered pages, inside the browser');
const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 20000 }), p.click('#prevDlg .pv-dl')]);
check(dl.suggestedFilename() === 'merged.pdf', 'Download works from the preview', dl.suggestedFilename());
await p.keyboard.press('Escape');
check(await p.evaluate(() => !document.getElementById('prevDlg').open), 'Esc closes the preview');
await t.go('home');
const rec = await p.evaluate(() => [...document.querySelectorAll('#mine .mine-recent li')].map(li => li.textContent.replace(/\s+/g, ' ').trim()));
check(rec.length === 1 && /Merge PDF/.test(rec[0]) && /just now/.test(rec[0]) && await p.$eval('#mine .mine-recent .mtile', a => a.getAttribute('href')) === '/merge-pdf', 'recent activity shows the tool as a tile, with when it was used, linking to the tool', rec.join(' | '));
const stored = await p.evaluate(() => localStorage.getItem('fu_recent'));
check(stored && !/FUCANARY/i.test(stored) && JSON.parse(stored)[0].o[0] === 'merged.pdf', 'recent activity keeps only names and counts — never file contents', stored && stored.slice(0, 90));

await t.go('img-convert'); await t.add('img-convert', fx('canary.jpg')); await p.selectOption('#img-convert .o-f', 'png');
await t.run('img-convert');
await p.click('#img-convert .rlist [data-prev]');
await p.waitForFunction(() => { const i = document.querySelector('#prevDlg .pv-img'); return i && i.naturalWidth > 0; }, null, { timeout: 15000 }).catch(() => {});
check(await p.evaluate(() => { const i = document.querySelector('#prevDlg .pv-img'); return !!i && i.naturalWidth > 0 && /Preview of/.test(i.alt); }), 'image results preview as images, with alt text');
await p.keyboard.press('Escape');
await t.go('find-replace'); await t.add('find-replace', fx('canary.txt'));
await p.fill('#find-replace .o-f', 'Kalaburagi'); await p.fill('#find-replace .o-r', 'Gulbarga'); await t.run('find-replace');
await p.click('#find-replace .rlist [data-prev]'); await p.waitForTimeout(400);
check(await p.evaluate(() => /Gulbarga/.test((document.querySelector('#prevDlg .pv-text') || {}).textContent || '')), 'text results preview as text');
await p.keyboard.press('Escape');

await t.go('home');
await p.click('#mine .mine-clear'); await p.waitForTimeout(200);
check(await p.evaluate(() => !localStorage.getItem('fu_recent') && document.querySelectorAll('#mine .mine-recent .mtile').length === 0), '“Clear” removes recent activity');
await p.check('#mine .mine-off'); await t.go('pdf-merge');
await t.add('pdf-merge', fx('canary.pdf', 'canary.pdf')); await t.run('pdf-merge');
check(await p.evaluate(() => !localStorage.getItem('fu_recent')), 'with recent activity turned off, nothing is recorded');
await t.go('home'); await p.uncheck('#mine .mine-off');

// ---------- keyboard: quick open and shortcuts ----------
await p.keyboard.press('/');
check(await p.evaluate(() => document.getElementById('cmdDlg').open && document.activeElement.id === 'cmdIn'), '“/” opens the quick-open search with the cursor in it');
const empty = await p.$$eval('#cmdList li[data-k]', l => l.map(x => x.dataset.k));
check(empty[0] === 'pdf-merge', 'with an empty search it starts with your favourites and recent tools', empty.slice(0, 4).join());
await p.keyboard.type('compres');
check(await p.evaluate(() => { const i = document.getElementById('cmdIn'); const a = document.getElementById(i.getAttribute('aria-activedescendant'));
  return i.getAttribute('role') === 'combobox' && a && a.getAttribute('aria-selected') === 'true' && /Compress/.test(a.textContent); }), 'typing filters the list; the highlighted option is announced to screen readers');
await p.keyboard.press('Enter'); await p.waitForTimeout(300);
check(await p.evaluate(() => location.pathname) === '/compress-pdf' && (await vis()) === 'pdf-compress', 'Enter opens the tool', await p.evaluate(() => location.pathname));
await p.keyboard.press('Control+k'); await p.keyboard.type('heic');
await p.keyboard.press('Enter'); await p.waitForTimeout(300);
check(await p.evaluate(() => location.pathname) === '/heic-to-jpg', 'Ctrl+K works too, and finds task pages (HEIC to JPG)');
const [chooser] = await Promise.all([p.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null), p.keyboard.press('o')]);
check(!!chooser, '“O” opens the file picker of the open tool');
await p.keyboard.press('f');
check(await p.evaluate(() => JSON.parse(localStorage.getItem('fu_favs')).includes('heic-to-jpg')), '“F” adds the open tool or task page to favourites');
await p.keyboard.press('?');
check(await p.evaluate(() => document.getElementById('keysDlg').open), '“?” lists the keyboard shortcuts');
await p.keyboard.press('Escape');
await p.keyboard.press('h'); await p.waitForTimeout(200);
check((await vis()) === 'home', '“H” goes to the home page');
await t.go('pdf-merge'); await p.focus('#pdf-merge .o-name'); await p.keyboard.type('h/?');
check(await p.evaluate(() => document.getElementById('pdf-merge').hidden === false && !document.querySelector('dialog[open]') && document.querySelector('#pdf-merge .o-name').value.includes('h/?')),
  'shortcuts never fire while typing in a box');
check(!t.errors.length, 'no script errors', t.errors.join(' | '));
await t.close();

// ---------- installable app, offline (real local web server, service worker on) ----------
const SITE = path.join(ROOT, process.env.SITE_DIR || 'site-navy');
if (!fs.existsSync(path.join(SITE, 'sw.js'))) skip('installable app and offline use', 'site not built — run node scripts/build-site.mjs');
else {
  const TYPES = { html: 'text/html; charset=utf-8', js: 'text/javascript', png: 'image/png', ico: 'image/x-icon', svg: 'image/svg+xml', webp: 'image/webp', webmanifest: 'application/manifest+json', json: 'application/json', xml: 'application/xml', txt: 'text/plain' };
  const srv = http.createServer((req, res) => {
    let f = decodeURIComponent(new URL(req.url, 'http://x').pathname).slice(1) || 'index.html';
    if (!f.includes('.') && fs.existsSync(path.join(SITE, f + '.html'))) f += '.html';
    const fp = path.join(SITE, f);
    if (!fp.startsWith(SITE) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404, { 'content-type': 'text/html' }); return res.end(fs.readFileSync(path.join(SITE, '404.html'))); }
    res.writeHead(200, { 'content-type': TYPES[f.split('.').pop()] || 'application/octet-stream' }); res.end(fs.readFileSync(fp));
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const origin = `http://localhost:${srv.address().port}`;
  const browser = await pw.chromium.launch();
  const ctx = await browser.newContext({ serviceWorkers: 'allow' });
  await ctx.route(/^https:\/\//, r => r.abort());   // no internet in this test: only the local site
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(origin + '/');
  const ready = await pg.evaluate(() => Promise.race([navigator.serviceWorker.ready.then(r => r.active ? r.active.state : 'none'), new Promise(r => setTimeout(() => r('timeout'), 8000))]));
  check(ready === 'activated' || ready === 'activating', 'the service worker installs (makes the app installable and offline-capable)', ready);
  const man = await pg.evaluate(async () => { const l = document.querySelector('link[rel=manifest]'); const m = await (await fetch(l.href)).json(); return m; });
  check(man.display === 'standalone' && man.icons.some(i => i.sizes === '512x512') && man.icons.some(i => i.sizes === '192x192') && man.start_url && man.shortcuts.length >= 3,
    'the web app manifest has what browsers need to offer “Install” (name, icons, standalone, start URL, shortcuts)');
  await pg.reload(); await pg.waitForTimeout(500);
  check(await pg.evaluate(() => !!navigator.serviceWorker.controller), 'after the first visit the page is served through the service worker');
  await pg.goto(origin + '/json-formatter'); await pg.waitForTimeout(600);
  await ctx.setOffline(true);
  await pg.goto(origin + '/json-formatter').catch(() => {}); await pg.waitForTimeout(800);
  check(await pg.evaluate(() => /JSON Formatter/.test(document.title) && !document.getElementById('json').hidden), 'offline: a page visited before still opens', await pg.title());
  await pg.fill('#jin', '{"offline":true,"n":[1,2]}').catch(() => {}); await pg.waitForTimeout(500);
  check(await pg.evaluate(() => /"offline": true/.test((document.querySelector('#json .jout, #jout, #json pre') || {}).textContent || document.getElementById('json').innerText)), 'offline: the JSON formatter still works');
  await pg.goto(origin + '/merge-pdf').catch(() => {}); await pg.waitForTimeout(800);
  check(await pg.evaluate(() => !document.getElementById('pdf-merge').hidden), 'offline: a page never visited still opens its tool (from the saved app)');
  check(!errs.length, 'no script errors in the installed app', errs.join(' | '));
  await ctx.setOffline(false); await browser.close(); srv.close();
}
summary('coming back');
