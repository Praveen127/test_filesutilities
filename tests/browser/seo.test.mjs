// SEO & SITE BUILD: the upload-ready site/ folder — one page per tool with its own title, description,
// canonical address, share image and structured data; real-address navigation; old #links; 404s;
// sitemap/robots/icons; and Google Analytics events that never contain file names.
// Serves site/ the way Vercel does with cleanUrls (/pdf-merge → pdf-merge.html). Run `node scripts/build-site.mjs` first.
import fs from 'node:fs';
import path from 'node:path';
import { pw, ROOT, FX, LOCAL, check, summary } from './lib.mjs';

const SITE = path.join(ROOT, process.env.SITE_DIR || 'site-navy');
if (!fs.existsSync(path.join(SITE, 'index.html'))) { console.log('site/ not built — run: node scripts/build-site.mjs'); process.exit(1); }
const seo = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/seo.json'), 'utf8'));
const TYPES = { html: 'text/html; charset=utf-8', js: 'text/javascript', png: 'image/png', ico: 'image/x-icon', svg: 'image/svg+xml', xml: 'application/xml', txt: 'text/plain', json: 'application/json', webmanifest: 'application/manifest+json' };

function resolve(p) {        // Vercel cleanUrls behaviour
  if (p === '/' ) return ['index.html', 200];
  const f = p.replace(/^\//, '');
  if (/^[a-z0-9-]+$/.test(f) && fs.existsSync(path.join(SITE, f + '.html'))) return [f + '.html', 200];
  if (f && !f.endsWith('.html') && fs.existsSync(path.join(SITE, f))) return [f, 200];
  return ['404.html', 404];
}

const browser = await pw.chromium.launch();
async function openSite(first, { config = null } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const gaHits = [];
  await ctx.route('**/*', async route => {
    const u = new URL(route.request().url());
    if (u.host === 'www.fileutilo.com') {
      const [f, status] = resolve(u.pathname);
      let body = fs.readFileSync(path.join(SITE, f));
      if (f === 'config.js' && config) body = Buffer.from(body.toString() + `\nObject.assign(window.FILEUTILO_CONFIG, ${JSON.stringify(config)});`);
      return route.fulfill({ status, body, contentType: TYPES[f.split('.').pop()] || 'application/octet-stream' });
    }
    if (u.host === 'www.googletagmanager.com') { gaHits.push(u.href); return route.fulfill({ body: '/* gtag stub */', contentType: 'text/javascript' }); }
    const hit = LOCAL.find(l => u.href.includes(l.key));
    if (hit && hit.file) return route.fulfill({ path: hit.file, contentType: 'text/javascript', headers: { 'Access-Control-Allow-Origin': '*' } });
    return route.abort('blockedbyclient');
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const resp = await page.goto('https://www.fileutilo.com' + first);
  await page.waitForTimeout(350);
  return { ctx, page, errors, resp, gaHits };
}
const info = page => page.evaluate(() => {
  const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => { try { return JSON.parse(s.textContent); } catch { return 'BAD'; } });
  const vis = [...document.querySelectorAll('main > section')].filter(s => !s.hidden).map(s => s.id);
  const about = [...document.querySelectorAll('.seo-about')].filter(a => !a.hidden).map(a => a.dataset.route);
  return { path: location.pathname + location.hash, title: document.title, desc: document.querySelector('meta[name=description]').content,
    canon: (document.querySelector('link[rel=canonical]') || {}).href || null, ogUrl: document.querySelector('meta[property="og:url"]').content,
    h1: document.querySelector('.hero h1').textContent, ld, vis, about, robots: (document.querySelector('meta[name=robots]') || {}).content || null };
});

// ---------- 1. every page renders with its own metadata ----------
const ids = ['home', ...Object.keys(seo.tools).filter(t => t !== 'home'), ...Object.keys(seo.pages)];
const bad = [];
let t = await openSite('/');
for (const id of ids) {
  const url = id === 'home' ? '/' : '/' + id;
  await t.page.goto('https://www.fileutilo.com' + url); await t.page.waitForTimeout(150);
  const m = seo.tools[id] || seo.pages[id], i = await info(t.page);
  const want = 'https://www.fileutilo.com' + url;
  const problems = [];
  if (i.path !== url) problems.push('address ' + i.path);
  if (i.title !== m.title) problems.push('title');
  if (i.desc !== m.description) problems.push('description');
  if (i.canon !== want || i.ogUrl !== want) problems.push('canonical');
  if (!i.vis.includes(id)) problems.push('section hidden: ' + i.vis);
  if (i.ld.includes('BAD') || !i.ld.length) problems.push('structured data');
  if (seo.tools[id] && id !== 'home' && !i.h1.startsWith(m.h1)) problems.push('h1 ' + i.h1);
  if (seo.tools[id] && id !== 'home' && !i.about.includes(id)) problems.push('help text hidden');
  if (m.title.length > 70) problems.push('title too long (' + m.title.length + ')');
  if (m.description.length > 170) problems.push('description too long (' + m.description.length + ')');
  if (problems.length) bad.push(id + ': ' + problems.join(', '));
}
check(!bad.length, `all ${ids.length} pages have their own title, description, canonical, h1, structured data and visible content`, bad.slice(0, 4).join(' | '));
const titles = ids.map(id => (seo.tools[id] || seo.pages[id]).title), descs = ids.map(id => (seo.tools[id] || seo.pages[id]).description);
check(new Set(titles).size === titles.length && new Set(descs).size === descs.length, 'titles and descriptions are unique');
check(!t.errors.length, 'no script errors on any page', t.errors.slice(0, 3).join(' | '));
const raw = fs.readFileSync(path.join(SITE, 'pdf-merge.html'), 'utf8');
check(raw.includes('<title>Merge PDF Files Online') && raw.includes('class="seo-about" data-route="pdf-merge"') && raw.includes('"@type":"WebApplication"'),
  'help text, title and structured data are in the HTML itself (visible to crawlers and link previews without JavaScript)');
await t.ctx.close();

// ---------- 2. navigation uses real addresses ----------
t = await openSite('/pdf-merge');
await t.page.click('#t-cat-img'); await t.page.waitForTimeout(250);
let i = await info(t.page);
check(i.path === '/img-convert' && i.vis.includes('img-convert') && i.title === seo.tools['img-convert'].title && i.h1.startsWith(seo.tools['img-convert'].h1) && !i.about.length,
  'clicking a menu link changes the address, title and heading without reloading', JSON.stringify([i.path, i.title.slice(0, 30), i.about]));
check(await t.page.evaluate(() => document.querySelector('#t-cat-pdf').getAttribute('href')) === '/pdf-merge', 'menu links are real addresses that crawlers can follow');
await t.page.goBack(); await t.page.waitForTimeout(250); i = await info(t.page);
check(i.path === '/pdf-merge' && i.vis.includes('pdf-merge') && i.about.includes('pdf-merge') && i.title === seo.tools['pdf-merge'].title, 'Back button returns to the previous tool', i.path);
await t.page.goForward(); await t.page.waitForTimeout(250); i = await info(t.page);
check(i.path === '/img-convert' && i.vis.includes('img-convert'), 'Forward button works', i.path);
await t.page.click('footer a[href="/pricing"]'); await t.page.waitForTimeout(250); i = await info(t.page);
check(i.path === '/pricing' && i.vis.includes('pricing') && i.title === seo.pages.pricing.title, 'footer link opens the pricing page', i.path);
await t.page.click('footer .tool-links a[href="/zip-open"]'); await t.page.waitForTimeout(250); i = await info(t.page);
check(i.path === '/zip-open' && i.vis.includes('zip-open'), 'footer "all tools" links work', i.path);
await t.page.click('.brand, .hero-cta').catch(() => {});
await t.page.evaluate(() => document.querySelector('.hero-cta').click()); await t.page.waitForTimeout(250); i = await info(t.page);
check(i.path === '/' && i.vis.includes('home') && i.h1.startsWith('Your files. Your device.'), '"Explore all tools" goes home and restores the home heading', i.path + ' ' + i.h1);
const n = await t.page.evaluate(() => document.querySelectorAll('footer .tool-links a').length);
check(n === 27, 'footer lists all 27 tools', n);
await t.ctx.close();

// ---------- 3. old #links and unknown addresses ----------
t = await openSite('/#pdf-split'); i = await info(t.page);
check(i.path === '/pdf-split' && i.vis.includes('pdf-split'), 'old links like /#pdf-split still open the tool and switch to /pdf-split', i.path);
await t.page.evaluate(() => { location.hash = '#json'; }); await t.page.waitForTimeout(250); i = await info(t.page);
check(i.path === '/json' && i.vis.includes('json'), 'in-page #links still work', i.path);
await t.ctx.close();
t = await openSite('/no-such-page'); i = await info(t.page);
check(t.resp.status() === 404 && i.vis.includes('home') && i.robots === 'noindex' && i.path === '/', 'unknown addresses return 404 (not indexed) and show the home page', `${t.resp.status()} ${i.path} ${i.robots}`);
await t.ctx.close();

// ---------- 4. sitemap, robots, icons, share image ----------
const sm = fs.readFileSync(path.join(SITE, 'sitemap.xml'), 'utf8');
const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
check(locs.length === ids.length && locs.every(l => l.startsWith('https://www.fileutilo.com/')) && !locs.some(l => l.includes('#')), `sitemap lists all ${ids.length} pages`, locs.length);
check(/Sitemap: https:\/\/www\.fileutilo\.com\/sitemap\.xml/.test(fs.readFileSync(path.join(SITE, 'robots.txt'), 'utf8')), 'robots.txt allows crawling and points to the sitemap');
const man = JSON.parse(fs.readFileSync(path.join(SITE, 'site.webmanifest'), 'utf8'));
const pngSize = f => { const b = fs.readFileSync(path.join(SITE, f)); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
check(man.icons.every(ic => fs.existsSync(path.join(SITE, ic.src.slice(1)))) && pngSize('icon-512.png').join() === '512,512' && pngSize('apple-touch-icon.png').join() === '180,180',
  'app icons and manifest are present');
check(pngSize('og-image.png').join() === '1200,630', 'share image is 1200×630');
const ico = fs.readFileSync(path.join(SITE, 'favicon.ico'));
check(ico.readUInt16LE(2) === 1 && ico.readUInt16LE(4) >= 2, 'favicon.ico has several sizes', ico.readUInt16LE(4));
const vj = JSON.parse(fs.readFileSync(path.join(SITE, 'vercel.json'), 'utf8'));
check(vj.cleanUrls === true, 'vercel.json serves /pdf-merge from pdf-merge.html');

// ---------- 5. Google Analytics: off by default; events never contain file names ----------
t = await openSite('/pdf-merge');
check(!t.gaHits.length && await t.page.evaluate(() => !window.gtag), 'Google Analytics stays off until a measurement ID is set');
await t.ctx.close();
t = await openSite('/pdf-merge', { config: { ga4Id: 'G-TEST1234', analytics: true } });
check(t.gaHits.length === 1 && t.gaHits[0].includes('id=G-TEST1234'), 'with ga4Id set, gtag.js loads once', t.gaHits.join());
const consent = await t.page.evaluate(() => dataLayer.filter(a => a[0] === 'consent').map(a => [a[1], a[2].analytics_storage, (a[2].region || []).includes('DE')]));
check(JSON.stringify(consent) === JSON.stringify([['default', 'denied', true], ['default', 'granted', false]]), 'EEA/UK visitors default to "no consent"; others are measured', JSON.stringify(consent));
const pdfOk = LOCAL.find(l => l.name === 'PDFLib' && l.file);
if (pdfOk) {
  await t.page.setInputFiles('#pdf-merge .drop input', [path.join(FX, 'canary.pdf'), path.join(FX, 'canary.pdf')]); await t.page.waitForTimeout(400);
  await t.page.click('#pdf-merge .run'); await t.page.waitForTimeout(2500);
}
const events = await t.page.evaluate(() => dataLayer.filter(a => a[0] === 'event').map(a => [a[1], a[2]]));
const dl = await t.page.evaluate(() => JSON.stringify(dataLayer));
check(events.some(([n, p]) => n === 'tool_use' && p.tool_id === 'pdf-merge'), 'running a tool sends a tool_use event with the tool name', JSON.stringify(events));
check(!/canary|\.pdf/i.test(dl), 'analytics data never contains file names', dl.length + ' bytes checked');
check(!t.errors.length, 'no script errors with analytics on', t.errors.join(' | '));
await t.ctx.close();

await browser.close();
summary('seo & site');
