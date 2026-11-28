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
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
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

// ---------- 1. every page renders with its own metadata and content ----------
const meta = k => seo.tools[k] || seo.variants[k] || seo.pages[k];
const slug = k => k === 'home' ? '' : seo.variants[k] ? k : (seo.tools[k] && seo.tools[k].slug) || k;
const toolOf = k => seo.variants[k] ? seo.variants[k].tool : k;
// pages meant for search; the licences page is for people only (noindex, not in the sitemap) and is checked further down
const NOT_FOR_SEARCH = new Set(['licenses']);
const ids = ['home', ...Object.keys(seo.tools).filter(t => t !== 'home'), ...Object.keys(seo.variants), ...Object.keys(seo.pages).filter(p => !NOT_FOR_SEARCH.has(p))];
const bad = [], thin = [];
let t = await openSite('/');
for (const id of ids) {
  const url = '/' + slug(id);
  await t.page.goto('https://www.fileutilo.com' + url); await t.page.waitForTimeout(150);
  const m = meta(id), i = await info(t.page);
  const want = 'https://www.fileutilo.com' + url;
  const problems = [];
  if (i.path !== url) problems.push('address ' + i.path);
  if (i.title !== m.title) problems.push('title');
  if (i.desc !== m.description) problems.push('description');
  if (i.canon !== want || i.ogUrl !== want) problems.push('canonical');
  if (!i.vis.includes(toolOf(id))) problems.push('section hidden: ' + i.vis);
  if (i.ld.includes('BAD') || !i.ld.length) problems.push('structured data');
  if (m.title.length > 70) problems.push('title too long (' + m.title.length + ')');
  if (m.description.length > 170) problems.push('description too long (' + m.description.length + ')');
  if (id !== 'home' && !seo.pages[id]) {
    if (!i.h1.startsWith(m.h1)) problems.push('h1 ' + i.h1);
    if (!i.about.includes(id)) problems.push('help text hidden');
    const c = await t.page.evaluate(k => { const a = document.querySelector(`.seo-about[data-route="${k}"]`); if (!a) return null;
      const img = a.querySelector('.sa-shot img');
      return { steps: a.querySelectorAll('.sa-steps li').length, img: img ? [img.alt.length, img.getAttribute('loading'), img.src] : null, fmt: a.querySelectorAll('.sa-fmt dd').length,
        lim: a.querySelectorAll('.sa-lim li').length, faq: a.querySelectorAll('details').length, rel: a.querySelectorAll('.sa-rcard').length, up: !!a.querySelector('.sa-up a[href="pricing"]'),
        words: a.textContent.trim().split(/\s+/).length, view: document.documentElement.dataset.view,
        faqLd: [...document.querySelectorAll('script[type="application/ld+json"]')].some(s => s.textContent.includes('"FAQPage"')) }; }, id);
    if (!c) problems.push('no page content');
    else {
      if (c.steps < 3) problems.push('steps'); if (!c.img || c.img[0] < 30 || c.img[1] !== 'lazy') problems.push('screenshot ' + JSON.stringify(c.img && c.img.slice(0, 2)));
      if (c.fmt !== 2) problems.push('formats'); if (c.lim < 3) problems.push('limits'); if (c.faq < 2) problems.push('faq'); if (c.rel !== 4) problems.push('related ' + c.rel);
      if (!c.up) problems.push('upgrade path'); if (!c.faqLd) problems.push('FAQ structured data'); if (c.view !== 'tool') problems.push('view ' + c.view);
      if (c.words < 220) thin.push(`${id} (${c.words} words)`);
      if (c.img) { const r = await t.page.evaluate(async src => (await fetch(src)).status, c.img[2]); if (r !== 200) problems.push('screenshot file ' + r); }
    }
  }
  if (problems.length) bad.push(id + ': ' + problems.join(', '));
}
check(!bad.length, `all ${ids.length} pages: own title, description, canonical, h1, structured data, steps with a screenshot, formats and limits, FAQs, related tools and an upgrade path`, bad.slice(0, 4).join(' | '));
check(!thin.length, 'every tool and task page has substantial help text (220+ words)', thin.join(', '));
const titles = ids.map(id => meta(id).title), descs = ids.map(id => meta(id).description);
check(new Set(titles).size === titles.length && new Set(descs).size === descs.length, 'titles and descriptions are unique');
check(!t.errors.length, 'no script errors on any page', t.errors.slice(0, 3).join(' | '));
const raw = fs.readFileSync(path.join(SITE, 'merge-pdf.html'), 'utf8');
check(raw.includes('<title>Merge PDF Files Online') && raw.includes('class="seo-about" data-route="pdf-merge"') && raw.includes('"@type":"WebApplication"') && raw.includes('data-view="tool"'),
  'help text, title and structured data are in the HTML itself (visible to crawlers and link previews without JavaScript)');
await t.ctx.close();

// ---------- 2. task pages open their tool with the right preset ----------
t = await openSite('/pdf-to-word');
check(await t.page.evaluate(() => document.querySelector('#tgts .chip[data-f="docx"]').getAttribute('aria-pressed')) === 'true', '/pdf-to-word opens the converter with DOCX chosen');
await t.page.goto('https://www.fileutilo.com/word-to-pdf'); await t.page.waitForTimeout(300);
check(await t.page.evaluate(() => document.querySelector('#tgts .chip[data-f="pdf"]').getAttribute('aria-pressed')) === 'true', '/word-to-pdf opens the converter with PDF chosen');
await t.page.goto('https://www.fileutilo.com/excel-to-csv'); await t.page.waitForTimeout(500);
check(await t.page.evaluate(() => document.querySelector('#data-convert .o-to').value) === 'csv', '/excel-to-csv opens the data converter with CSV chosen');
await t.page.goto('https://www.fileutilo.com/heic-to-jpg'); await t.page.waitForTimeout(300);
check(await t.page.evaluate(() => document.querySelector('#img-convert .o-f').value) === 'jpg', '/heic-to-jpg opens the image converter with JPG chosen');
await t.ctx.close();

// ---------- 3. navigation uses real, task-named addresses ----------
t = await openSite('/merge-pdf');
await t.page.click('#subnav a[href$="split-pdf"]'); await t.page.waitForTimeout(250);
let i = await info(t.page);
check(i.path === '/split-pdf' && i.vis.includes('pdf-split') && i.title === seo.tools['pdf-split'].title && i.h1.startsWith(seo.tools['pdf-split'].h1) && !i.about.length,
  'clicking a tool link changes the address, title and heading without reloading', JSON.stringify([i.path, i.title.slice(0, 30), i.about]));
check(await t.page.evaluate(() => document.querySelector('#t-cat-home').getAttribute('href') === './' || document.querySelector('#t-cat-home').getAttribute('href') === '/') && await t.page.evaluate(() => [...document.querySelectorAll('#subnav a')].every(a => /^\/[a-z0-9-]+$/.test(a.getAttribute('href')))), 'Home and tool links are real addresses that crawlers can follow');
await t.page.goBack(); await t.page.waitForTimeout(250); i = await info(t.page);
check(i.path === '/merge-pdf' && i.vis.includes('pdf-merge') && i.about.includes('pdf-merge') && i.title === seo.tools['pdf-merge'].title, 'Back button returns to the previous tool', i.path);
check(await t.page.evaluate(() => [...document.querySelectorAll('#catnav a')].filter(a => a.offsetParent).map(a => a.dataset.cat).join() === 'home'), 'tool pages show only the Home tab');
await t.page.goForward(); await t.page.waitForTimeout(250); i = await info(t.page);
check(i.path === '/split-pdf' && i.vis.includes('pdf-split'), 'Forward button works', i.path);
await t.page.click('footer a[href="pricing"]'); await t.page.waitForTimeout(250); i = await info(t.page);
check(i.path === '/pricing' && i.vis.includes('pricing') && i.title === seo.pages.pricing.title, 'footer link opens the pricing page', i.path);
await t.page.click('footer .tool-links a[href="zip-extractor"]'); await t.page.waitForTimeout(250); i = await info(t.page);
check(i.path === '/zip-extractor' && i.vis.includes('zip-open'), 'footer "all tools" links work', i.path);
await t.page.click('footer .tool-links a[href="excel-to-csv"]'); await t.page.waitForTimeout(400); i = await info(t.page);
check(i.path === '/excel-to-csv' && i.vis.includes('data-convert') && i.title === seo.variants['excel-to-csv'].title, 'footer "popular" links open task pages in place', i.path);
await t.page.evaluate(() => document.querySelector('.hero-cta') && document.querySelector('.hero-cta').click());
await t.page.goto('https://www.fileutilo.com/'); await t.page.waitForTimeout(300); i = await info(t.page);
check(i.vis.includes('home') && i.h1.startsWith('Free PDF, image, Word and other Office tools'), 'home page shows the home heading', i.path + ' ' + i.h1);
const n = await t.page.evaluate(() => [document.querySelectorAll('footer .tool-links a').length, document.querySelectorAll('.popular .pchips a').length]);
const NT = Object.keys(seo.tools).length - 1, NV = Object.keys(seo.variants).length;
check(n[0] === NT + NV && n[1] === NV, `footer links all ${NT} tools and ${NV} task pages; home lists the task pages`, n.join());
await t.ctx.close();

// ---------- 4. old addresses and unknown addresses ----------
t = await openSite('/#pdf-split'); i = await info(t.page);
check(i.path === '/split-pdf' && i.vis.includes('pdf-split'), 'old #links like /#pdf-split open the tool at its new address /split-pdf', i.path);
await t.page.evaluate(() => { location.hash = '#json'; }); await t.page.waitForTimeout(250); i = await info(t.page);
check(i.path === '/json-formatter' && i.vis.includes('json'), 'in-page #links still work', i.path);
await t.ctx.close();
t = await openSite('/pdf-merge'); i = await info(t.page);
check(i.vis.includes('pdf-merge') && i.path === '/merge-pdf', 'earlier addresses like /pdf-merge still open the tool and switch to /merge-pdf', `${t.resp.status()} ${i.path}`);
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
check(man.icons.every(ic => fs.existsSync(path.join(SITE, ic.src.replace(/^\//, '')))) && pngSize('icon-512.png').join() === '512,512' && pngSize('apple-touch-icon.png').join() === '180,180',
  'app icons and manifest are present');
check(pngSize('og-image.png').join() === '1200,630', 'share image is 1200×630');
const ico = fs.readFileSync(path.join(SITE, 'favicon.ico'));
check(ico.readUInt16LE(2) === 1 && ico.readUInt16LE(4) >= 2, 'favicon.ico has several sizes', ico.readUInt16LE(4));
const vj = JSON.parse(fs.readFileSync(path.join(SITE, 'vercel.json'), 'utf8'));
check(vj.cleanUrls === true && vj.redirects.some(r => r.source === '/pdf-merge' && r.destination === '/merge-pdf' && r.permanent), 'vercel.json serves /merge-pdf from merge-pdf.html and permanently redirects old addresses');

// ---------- 5. Google Analytics: off by default; events never contain file names ----------
t = await openSite('/merge-pdf');
check(!t.gaHits.length && await t.page.evaluate(() => !window.gtag), 'Google Analytics stays off until a measurement ID is set');
await t.ctx.close();
t = await openSite('/merge-pdf', { config: { ga4Id: 'G-TEST1234', analytics: true } });
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

// Version stamps (16.1.1): one number from the VERSION file, on every page, in version.json and the offline cache name
{
  const VER = fs.readFileSync(path.join(ROOT, 'VERSION'), 'utf8').trim();
  const vj = JSON.parse(fs.readFileSync(path.join(SITE, 'version.json'), 'utf8'));
  check(vj.version === VER && /^[0-9a-f]{16}$/.test(vj.fingerprint) && !isNaN(Date.parse(vj.built)) && /^\d{14}_/.test(vj.database || ''),
    'version.json gives the version, build time, fingerprint and latest database script', JSON.stringify(vj));
  const pages = fs.readdirSync(SITE).filter(f => f.endsWith('.html'));
  const unstamped = pages.filter(f => { const h = fs.readFileSync(path.join(SITE, f), 'utf8'); return h.includes('<footer') && !(h.includes(`content="${VER}"`) && h.includes(`data-fu-ver>${VER}<`)); });
  check(!unstamped.length, `every page carries v${VER} in its head and footer`, unstamped.slice(0, 5).join(', '));
  check(fs.readFileSync(path.join(SITE, 'sw.js'), 'utf8').startsWith(`const V='fileutilo-${VER}-`), 'the offline cache is named after the version');
  const vc = JSON.parse(fs.readFileSync(path.join(SITE, 'vercel.json'), 'utf8'));
  check(vc.headers.some(h => h.source === '/version.json' && h.headers.some(x => x.value === 'no-cache')), 'version.json is never cached, so it always shows what is live');
  const vt = await openSite('/merge-pdf'); const vp = vt.page;
  const foot = await vp.locator('footer .fver').innerText();
  const live = await vp.evaluate(() => fetch('/version.json').then(r => r.json()));
  check(foot === 'v' + VER && live.version === VER, 'the footer shows the version and /version.json answers', foot + ' · ' + live.version);
  await vt.ctx.close();
}

// Logo (16.1.2): the header logo is the app icon — blue gradient, white lines — on every view and in dark mode
{
  const lt = await openSite('/');
  const logo = () => lt.page.evaluate(() => { const c = getComputedStyle(document.querySelector('.brand .logo')); return c.backgroundImage + ' | ' + c.color; });
  const seen = [await logo()];
  await lt.page.goto('https://www.fileutilo.com/merge-pdf'); await lt.page.waitForTimeout(300); seen.push(await logo());
  await lt.page.emulateMedia({ colorScheme: 'dark' }); await lt.page.waitForTimeout(200); seen.push(await logo());
  check(seen.every(v => v.includes('rgb(91, 151, 255)') && v.includes('rgb(47, 111, 237)') && v.endsWith('rgb(255, 255, 255)')),
    'header logo is the blue app icon on the home page, a tool page and in dark mode', seen.join(' ; '));
  // 16.1.3: the name beside it is deep navy on light pages and soft blue in dark mode
  const nameCol = () => lt.page.evaluate(() => getComputedStyle(document.querySelector('.brand .bname')).color);
  const darkName = await nameCol(); await lt.page.emulateMedia({ colorScheme: 'light' }); await lt.page.waitForTimeout(200);
  const lightTool = await nameCol(); await lt.page.goto('https://www.fileutilo.com/'); await lt.page.waitForTimeout(300);
  const lightHome = await nameCol();
  check(lightHome === 'rgb(30, 58, 138)' && lightTool === 'rgb(30, 58, 138)' && darkName === 'rgb(199, 216, 255)',
    'the Fileutilo name is deep navy on light pages and soft blue in dark mode', [lightHome, lightTool, darkName].join(' ; '));
  await lt.ctx.close();
  const mf = JSON.parse(fs.readFileSync(path.join(SITE, 'site.webmanifest'), 'utf8'));
  check(mf.icons.some(i => i.purpose === 'any') && mf.icons.filter(i => i.purpose === 'maskable').length === 2 && mf.icons.every(i => fs.existsSync(path.join(SITE, i.src))),
    'install icons: a rounded one for desktops and full-bleed ones for Android home screens', mf.icons.map(i => i.src + ' ' + i.purpose).join(', '));
}

// Open-source licences page (16.1.4): for people, not search; linked from every footer; lists every library version
{
  const lic = fs.readFileSync(path.join(SITE, 'licenses.html'), 'utf8');
  const sm = fs.readFileSync(path.join(SITE, 'sitemap.xml'), 'utf8');
  check(lic.includes('<meta name="robots" content="noindex">') && !/rel="canonical"/.test(lic.split('</head>')[0]) && !sm.includes('/licenses<'),
    'licences page is noindex and left out of the sitemap');
  const pages = fs.readdirSync(SITE).filter(f => f.endsWith('.html'));
  const nolink = pages.filter(f => { const h = fs.readFileSync(path.join(SITE, f), 'utf8'); return h.includes('<footer') && !h.includes('class="flic" href="licenses"'); });
  check(!nolink.length, 'every page links "Open-source licences" from its footer', nolink.slice(0, 5).join(', '));
  const sec = lic.slice(lic.indexOf('<section id="licenses"'), lic.indexOf('</section>', lic.indexOf('<section id="licenses"')));
  const texts = [...sec.matchAll(/href="legal\/([^"]+)"/g)].map(m => m[1]);
  const missing = [...new Set(texts)].filter(f => !fs.existsSync(path.join(SITE, 'legal', f)));
  check(texts.length >= 5 && !missing.length, 'every licence text the page links is on the site', missing.join(', ') || [...new Set(texts)].join(', '));
  // every library version the app loads must be on the page, so an upgrade can't leave it out of date
  const app = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8');
  const vers = new Set([...app.matchAll(/(?:npm\/(?:@[\w.-]+\/)?[\w.-]+@|xlsx-)(\d+\.\d+\.\d+)/g)].map(m => m[1]));
  const absent = [...vers].filter(v => !sec.includes('<td>' + v + '</td>'));
  check(vers.size >= 10 && !absent.length, `all ${vers.size} library versions the app loads are listed`, absent.join(', ') || [...vers].join(' '));
  check(sec.includes('GNU Lesser General Public License') && sec.includes('Copyright (C) 2012-present SheetJS LLC'), 'the LGPL notice and the SheetJS attribution are on the page');
  const terms = fs.readFileSync(path.join(SITE, 'terms.html'), 'utf8');
  check(terms.includes('<a href="licenses">Open-source licences</a>'), 'the terms link to the licences page');
}

await browser.close();
summary('seo & site');
