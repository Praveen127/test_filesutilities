// Builds the upload-ready website from web/index.html, web/config.js, web/seo.json, web/static-*/ and web/media-*/.
// Every tool gets its own task-named page (site/merge-pdf.html → https://www.fileutilo.com/merge-pdf) with its own
// title, description, share preview, structured data, steps with a real screenshot, formats and limits, FAQs,
// related tools and an upgrade path; plus a few preset task pages (/word-to-pdf …), sitemap.xml and robots.txt.
// Run:  node scripts/build-site.mjs [--brand navy|green] [--out site-navy]     (no npm packages needed)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const BRAND = arg('brand', 'navy');
if (!['navy', 'green'].includes(BRAND)) throw new Error('--brand must be navy or green');
const WEB = path.join(ROOT, 'web'), OUT = path.resolve(ROOT, arg('out', 'site-' + BRAND));
const THEME_COLOR = { navy: '#101a33', green: '#064b40' }[BRAND];
const ORIGIN = 'https://www.fileutilo.com';
const TODAY = new Date().toISOString().slice(0, 10);

const source = fs.readFileSync(path.join(WEB, 'index.html'), 'utf8');
let src = source;
const seo = JSON.parse(fs.readFileSync(path.join(WEB, 'seo.json'), 'utf8'));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const jsonLd = o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;

// Menu order comes from the app itself, so pages, footer and sitemap always match it.
const cats = [...src.matchAll(/\{id:'([a-z]+)',name:'([^']+)',sub:'[^']*',tools:\[([^\]]*)\]/g)]
  .map(m => ({ id: m[1], name: m[2], tools: m[3].split(',').map(t => t.trim().replace(/'/g, '')).filter(t => t && t !== 'home') }))
  .filter(c => c.tools.length);
const TOOLS = cats.flatMap(c => c.tools);
const VARS = Object.keys(seo.variants);
const PAGES = Object.keys(seo.pages);
for (const t of TOOLS) if (!seo.tools[t]) throw new Error(`web/seo.json has no entry for tool "${t}"`);
// the router in index.html must know the same addresses
const jsSlugs = JSON.parse(src.match(/const SLUGS=(\{[^}]*\});/)[1]), jsVars = JSON.parse(src.match(/const VARIANTS=(\{.*?\});\n/)[1]);
for (const t of TOOLS) if (jsSlugs[t] !== seo.tools[t].slug) throw new Error(`index.html SLUGS and seo.json disagree for ${t}`);
for (const v of VARS) if (!jsVars[v] || jsVars[v][0] !== seo.variants[v].tool) throw new Error(`index.html VARIANTS is missing ${v}`);

// Smaller pages load faster on phones: minify the inline scripts and styles when esbuild is available
// (it is optional — without it the pages are simply larger). Comments and whitespace go; behaviour stays the same.
let esbuild = null;
for (const p of ['esbuild', '/opt/npm-tools/node_modules/esbuild/lib/main.js']) { try { esbuild = (await import(p)).default || await import(p); break; } catch {} }
if (esbuild && !process.argv.includes('--no-minify')) {
  const before = src.length;
  const parts = []; let at = 0, n = 0;
  for (const m of src.matchAll(/<script>|<style>/g)) {
    if (m.index < at) continue;
    const isCss = m[0] === '<style>', close = isCss ? '</style>' : '</script>';
    const start = m.index + m[0].length, end = src.indexOf(close, start);
    const code = src.slice(start, end);
    if (code.includes('/*config-overrides*/') || (isCss && n++ > 0 && false)) { continue; }
    const out = (await esbuild.transform(code, { loader: isCss ? 'css' : 'js', minify: true, target: 'esnext', charset: 'utf8', legalComments: 'none' })).code.trim();
    parts.push(src.slice(at, start), out); at = end;
  }
  parts.push(src.slice(at)); src = parts.join('');
  console.log(`minified inline scripts and styles: ${(before / 1024).toFixed(0)} KB → ${(src.length / 1024).toFixed(0)} KB`);
}
const meta = k => seo.tools[k] || seo.variants[k] || seo.pages[k];
const slug = k => k === 'home' ? '' : (seo.variants[k] ? k : (seo.tools[k] && seo.tools[k].slug) || k);
const href = k => slug(k) || './';
const url = k => ORIGIN + '/' + slug(k);
const isGated = k => !meta(k).free;

const toolLinks = `<div class="tool-links" role="navigation" aria-label="All tools">${TOOLS.map(t => `<a href="${href(t)}">${esc(seo.tools[t].name)}</a>`).join(' ')}</div>`
  + `<div class="tool-links" role="navigation" aria-label="Popular conversions"><b>Popular:</b> ${VARS.map(v => `<a href="${href(v)}">${esc(seo.variants[v].name)}</a>`).join(' ')}</div>`;
const popular = `<div class="popular"><h3>Popular tasks</h3><div class="pchips">${VARS.map(v => `<a href="${href(v)}">${esc(seo.variants[v].h1)}</a>`).join('')}</div></div>`;
const seoData = { home: { t: seo.tools.home.title, d: seo.tools.home.description } };
for (const k of [...TOOLS, ...VARS]) seoData[k] = { t: meta(k).title, d: meta(k).description, h: meta(k).h1 };
for (const p of PAGES) seoData[p] = { t: seo.pages[p].title, d: seo.pages[p].description };
const seoDataTag = `<script id="seo-data" type="application/json">${JSON.stringify(seoData).replace(/</g, '\\u003c')}</script>`;

const ORG = { '@type': 'Organization', '@id': ORIGIN + '/#org', name: 'Kalaburagi Labs', url: ORIGIN + '/', logo: ORIGIN + '/icon-512.png', email: 'support@fileutilo.com' };
// a task page uses its own screenshot if there is one, otherwise its tool's (with that screenshot's description)
const ownShot = k => fs.existsSync(path.join(WEB, 'media-' + BRAND, `tool-${slug(k)}.webp`));
const shotKey = k => ownShot(k) ? k : (seo.variants[k] ? seo.variants[k].tool : k);
const shotFile = k => `tool-${slug(shotKey(k))}.webp`;
const hasShot = k => ownShot(shotKey(k));
const SHOT_DIMS = (() => { try { return JSON.parse(fs.readFileSync(path.join(WEB, 'media-' + BRAND, 'shots.json'), 'utf8')); } catch { return {}; } })();
const shotDims = k => SHOT_DIMS[shotFile(k)] || [1200, 760];
const shotAlt = k => ownShot(k) ? meta(k).shot_alt : meta(shotKey(k)).shot_alt;

function head(k, m, { noindex = false } = {}) {
  const u = url(k), graph = [ORG];
  if (k === 'home') graph.push({ '@type': 'WebSite', '@id': ORIGIN + '/#site', name: 'Fileutilo', url: ORIGIN + '/', description: m.description, publisher: { '@id': ORIGIN + '/#org' } });
  else if (seo.tools[k] || seo.variants[k]) {
    graph.push({ '@type': 'WebApplication', name: m.h1, url: u, description: m.description, applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (runs in a web browser)', browserRequirements: 'A modern web browser such as Chrome, Edge, Safari or Firefox',
      isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' }, publisher: { '@id': ORIGIN + '/#org' },
      ...(hasShot(k) ? { screenshot: `${ORIGIN}/media/${shotFile(k)}` } : {}) });
    graph.push({ '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Fileutilo', item: ORIGIN + '/' }, { '@type': 'ListItem', position: 2, name: m.name, item: u }] });
    if (m.faqs && m.faqs.length) graph.push({ '@type': 'FAQPage', mainEntity: m.faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });
  }
  return `<!--seo:start-->
<title>${esc(m.title)}</title>
<meta name="description" content="${esc(m.description)}">
${noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${u}">`}
<meta property="og:type" content="website">
<meta property="og:site_name" content="Fileutilo">
<meta property="og:url" content="${u}">
<meta property="og:title" content="${esc(m.title)}">
<meta property="og:description" content="${esc(m.description)}">
<meta property="og:image" content="${ORIGIN}/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="en_IN">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(m.title)}">
<meta name="twitter:description" content="${esc(m.description)}">
<meta name="twitter:image" content="${ORIGIN}/og-image.png">
${jsonLd({ '@context': 'https://schema.org', '@graph': graph })}
<!--seo:end-->`;
}

function about(k, m) {
  const shot = hasShot(k) ? `<figure class="sa-shot"><img src="media/${shotFile(k)}" width="${shotDims(k)[0]}" height="${shotDims(k)[1]}" loading="lazy" decoding="async" alt="${esc(shotAlt(k))}"><figcaption>Real screenshot of ${esc(meta(shotKey(k)).name)} in Fileutilo.</figcaption></figure>` : '';
  const [opens, creates] = m.formats;
  const plan = isGated(k)
    ? `<li><b>Free:</b> 5 files of up to 20 MB each per task; 10 tasks a day without an account, 25 with a free account.</li><li><b>Pro:</b> no Fileutilo limits on tasks, files or size. Files are processed on your device, so very large files are still limited by your browser and device memory.</li>`
    : `<li><b>Free:</b> this tool has no daily limit.</li><li>Files are processed on your device, so very large files are limited by your browser and device memory.</li>`;
  const rel = m.related.map(r => { const x = meta(r); return `<a class="sa-rcard" href="${href(r)}"><b>${esc(x.name)}</b><small>${esc(x.blurb)}</small></a>`; }).join('');
  const up = isGated(k)
    ? `<div class="sa-up"><b>Need more than the free limits?</b><p>Pro gives unlimited tasks, no file caps and no ads — ₹149 a month, ₹999 a year or ₹2,999 once. Or buy credits from ₹49 for occasional extra tasks.</p><a href="pricing">Compare plans</a></div>`
    : `<div class="sa-up"><b>Free with no daily limit.</b><p>Pro removes ads and the daily limits on Fileutilo's PDF, image and document tools — ₹149 a month or ₹999 a year.</p><a href="pricing">See Pro</a></div>`;
  return `<article class="seo-about" data-route="${k}">
<div class="sa-main">
<h2>About ${esc(m.name)}</h2>
<p>${esc(m.intro)}</p>
<h3>How it works</h3>
<ol class="sa-steps">${m.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
${shot}
<h3>Supported formats and limits</h3>
<dl class="sa-fmt"><dt>Opens</dt><dd>${esc(opens)}</dd><dt>Creates</dt><dd>${esc(creates)}</dd></dl>
<ul class="sa-lim">${m.limits.map(l => `<li>${esc(l)}</li>`).join('')}${plan}</ul>
<h3>Frequently asked questions</h3>
${m.faqs.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}
</div>
<aside class="sa-side"><h3>Related tools</h3><div class="sa-rel">${rel}</div>${up}</aside>
</article>`;
}

const HERO = '<h1>Your files. Your device.<br><em>Your control.</em></h1>';
if (!src.includes(HERO)) throw new Error('hero heading not found in web/index.html');
const HTML_TAG = '<html lang="en" data-brand="green" data-view="home">';
if (!src.includes(HTML_TAG)) throw new Error('<html> tag not found in web/index.html');

function page(k, { noindex = false } = {}) {
  const m = meta(k), view = k === 'home' ? 'home' : seo.pages[k] ? 'page' : 'tool';
  let html = src.replace(/<!--seo:start-->[\s\S]*?<!--seo:end-->/, head(k, m, { noindex }))
    .replace(HTML_TAG, `<html lang="en" data-brand="${BRAND}" data-view="${view}">`)
    .replace(/<meta name="theme-color" content="[^"]*">/, `<meta name="theme-color" content="${THEME_COLOR}">`)
    .replace('<!--seo:about-->', view === 'tool' ? about(k, m) : '')
    .replace('<!--seo:toollinks-->', toolLinks).replace('<!--seo:popular-->', popular).replace('<!--seo:data-->', seoDataTag);
  if (view === 'tool') html = html.replace(HERO, `<h1>${esc(m.h1)}<br><em>Free &amp; private.</em></h1>`);
  return html;
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const files = [];
const write = (name, data) => { fs.writeFileSync(path.join(OUT, name), data); files.push(name); };
write('index.html', page('home'));
for (const k of [...TOOLS, ...VARS]) write(slug(k) + '.html', page(k));
// help text on its own, for in-app navigation between tools (the app fetches it, a few KB each)
fs.mkdirSync(path.join(OUT, 'about'));
for (const k of [...TOOLS, ...VARS]) write('about/' + slug(k) + '.html', about(k, meta(k)));
for (const p of PAGES) write(p + '.html', page(p));
write('404.html', page('home', { noindex: true }));
write('config.js', fs.readFileSync(path.join(WEB, 'config.js')));
for (const d of [path.join(WEB, 'static-' + BRAND)]) if (fs.existsSync(d)) for (const f of fs.readdirSync(d)) write(f, fs.readFileSync(path.join(d, f)));
const media = path.join(WEB, 'media-' + BRAND);
if (fs.existsSync(media)) { fs.mkdirSync(path.join(OUT, 'media')); for (const f of fs.readdirSync(media)) if (f !== 'shots.json') write('media/' + f, fs.readFileSync(path.join(media, f))); }
if (fs.existsSync(path.join(WEB, 'ads.txt'))) write('ads.txt', fs.readFileSync(path.join(WEB, 'ads.txt')));

const keys = ['home', ...TOOLS, ...VARS, ...PAGES];
const prio = k => k === 'home' ? '1.0' : seo.pages[k] ? (k === 'pricing' ? '0.6' : '0.3') : seo.variants[k] ? '0.7' : '0.8';
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${keys.map(k => `  <url><loc>${url(k)}</loc><lastmod>${TODAY}</lastmod><priority>${prio(k)}</priority></url>`).join('\n')}
</urlset>
`);
write('.nojekyll', '');   // GitHub Pages: serve files as they are
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`);
write('vercel.json', JSON.stringify({
  cleanUrls: true, trailingSlash: false,
  redirects: [{ source: '/index', destination: '/', permanent: true },
    // earlier addresses (/pdf-merge …) → task-named addresses (/merge-pdf …)
    ...TOOLS.filter(t => slug(t) !== t).map(t => ({ source: '/' + t, destination: '/' + slug(t), permanent: true }))],
  headers: [{ source: '/config.js', headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }] },
    { source: '/media/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800' }] }],
}, null, 2) + '\n');

console.log(`Built ${files.length} files into ${path.relative(process.cwd(), OUT) || OUT} (${keys.length} pages in the sitemap)`);
