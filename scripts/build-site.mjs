// Builds the upload-ready website into ./site from web/index.html, web/config.js, web/seo.json and web/static/*.
// Every tool gets its own page (site/pdf-merge.html → https://www.fileutilo.com/pdf-merge) with its own
// title, description, share preview, structured data and help text, plus sitemap.xml and robots.txt.
// Run:  node scripts/build-site.mjs        (no npm packages needed)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB = path.join(ROOT, 'web'), OUT = path.join(ROOT, 'site');
const ORIGIN = 'https://www.fileutilo.com';
const TODAY = new Date().toISOString().slice(0, 10);

const src = fs.readFileSync(path.join(WEB, 'index.html'), 'utf8');
const seo = JSON.parse(fs.readFileSync(path.join(WEB, 'seo.json'), 'utf8'));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const jsonLd = o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;

// Short tool names and menu order, taken from the app itself so the footer always matches.
const names = Function(`return (${src.match(/const TOOL_NAMES=(\{[\s\S]*?\});/)[1]})`)();
const cats = [...src.matchAll(/\{id:'([a-z]+)',name:'([^']+)',sub:'[^']*',tools:\[([^\]]*)\]/g)]
  .map(m => ({ id: m[1], name: m[2], tools: m[3].split(',').map(t => t.trim().replace(/'/g, '')).filter(t => t && t !== 'home') }))
  .filter(c => c.tools.length);
const TOOLS = cats.flatMap(c => c.tools);
for (const t of TOOLS) if (!seo.tools[t]) throw new Error(`web/seo.json has no entry for tool "${t}"`);
const PAGES = Object.keys(seo.pages);
const label = t => ({ 'pdf-merge': 'Merge PDF', 'pdf-split': 'Split PDF', 'pdf-organize': 'Organize PDF', 'pdf-compress': 'Compress PDF',
  'pdf-protect': 'Protect PDF', 'pdf-unlock': 'Unlock PDF', 'pdf-stamp': 'Watermark PDF', 'pdf-ocr': 'OCR', 'img-convert': 'Image converter',
  'img-resize': 'Resize image', convert: 'Document converter' }[t] || names[t] || t);

const toolLinks = `<div class="tool-links" role="navigation" aria-label="All tools">${TOOLS.map(t => `<a href="/${t}">${esc(label(t))}</a>`).join(' ')}</div>`;
const seoData = { home: { t: seo.tools.home.title, d: seo.tools.home.description } };
for (const t of TOOLS) seoData[t] = { t: seo.tools[t].title, d: seo.tools[t].description, h: seo.tools[t].h1 };
for (const p of PAGES) seoData[p] = { t: seo.pages[p].title, d: seo.pages[p].description };
const seoDataTag = `<script id="seo-data" type="application/json">${JSON.stringify(seoData).replace(/</g, '\\u003c')}</script>`;

const ORG = { '@type': 'Organization', '@id': ORIGIN + '/#org', name: 'Kalaburagi Labs', url: ORIGIN + '/', logo: ORIGIN + '/icon-512.png',
  email: 'support@fileutilo.com' };

function head(id, m, { noindex = false } = {}) {
  const url = ORIGIN + (id === 'home' ? '/' : '/' + id);
  const graph = [ORG];
  if (id === 'home') graph.push({ '@type': 'WebSite', '@id': ORIGIN + '/#site', name: 'Fileutilo', url: ORIGIN + '/', description: m.description, publisher: { '@id': ORIGIN + '/#org' } });
  else if (seo.tools[id]) {
    graph.push({ '@type': 'WebApplication', name: m.h1, url, description: m.description, applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (runs in a web browser)', isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
      publisher: { '@id': ORIGIN + '/#org' } });
    graph.push({ '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Fileutilo', item: ORIGIN + '/' },
      { '@type': 'ListItem', position: 2, name: label(id), item: url }] });
  }
  return `<!--seo:start-->
<title>${esc(m.title)}</title>
<meta name="description" content="${esc(m.description)}">
${noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${url}">`}
<meta property="og:type" content="website">
<meta property="og:site_name" content="Fileutilo">
<meta property="og:url" content="${url}">
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

function about(id, m) {
  const steps = m.steps && m.steps.length ? `<h3>How it works</h3><ol>${m.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>` : '';
  const faqs = m.faqs && m.faqs.length ? `<h3>Frequently asked questions</h3>${m.faqs.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}` : '';
  const more = id === 'home' ? '' : `<p>More tools: ${cats.find(c => c.tools.includes(id)).tools.filter(t => t !== id).slice(0, 6).map(t => `<a href="/${t}">${esc(label(t))}</a>`).join(' · ') || `<a href="/">all ${TOOLS.length} tools</a>`}</p>`;
  return `<article class="seo-about" data-route="${id}"${id === 'home' ? '' : ''}>
<h2>${esc(id === 'home' ? m.h1 : 'About this tool')}</h2>
<p>${esc(m.intro)}</p>${steps}${faqs}${more}
</article>`;
}

const HERO = '<h1>Less file busywork.<br><em>More work, done.</em></h1>';
if (!src.includes(HERO)) throw new Error('hero heading not found in web/index.html');

function page(id, { noindex = false } = {}) {
  const m = seo.tools[id] || seo.pages[id];
  let html = src.replace(/<!--seo:start-->[\s\S]*?<!--seo:end-->/, head(id, m, { noindex }));
  html = html.replace('<!--seo:about-->', seo.tools[id] ? about(id, m) : '');
  html = html.replace('<!--seo:toollinks-->', toolLinks).replace('<!--seo:data-->', seoDataTag);
  if (seo.tools[id] && id !== 'home') html = html.replace(HERO, `<h1>${esc(m.h1)}<br><em>Free &amp; private.</em></h1>`);
  // pre-select the right page so the correct section shows even before the script runs
  return html;
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const files = [];
const write = (name, data) => { fs.writeFileSync(path.join(OUT, name), data); files.push(name); };
write('index.html', page('home'));
for (const t of TOOLS) write(t + '.html', page(t));
for (const p of PAGES) write(p + '.html', page(p));
write('404.html', page('home', { noindex: true }));
write('config.js', fs.readFileSync(path.join(WEB, 'config.js')));
for (const f of fs.readdirSync(path.join(WEB, 'static'))) write(f, fs.readFileSync(path.join(WEB, 'static', f)));
if (fs.existsSync(path.join(WEB, 'ads.txt'))) write('ads.txt', fs.readFileSync(path.join(WEB, 'ads.txt')));

const urls = ['/', ...TOOLS.map(t => '/' + t), ...PAGES.map(p => '/' + p)];
const prio = u => u === '/' ? '1.0' : PAGES.includes(u.slice(1)) ? (u === '/pricing' ? '0.6' : '0.3') : '0.8';
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${ORIGIN}${u}</loc><lastmod>${TODAY}</lastmod><priority>${prio(u)}</priority></url>`).join('\n')}
</urlset>
`);
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`);
write('vercel.json', JSON.stringify({
  cleanUrls: true, trailingSlash: false,
  redirects: [{ source: '/index', destination: '/', permanent: true }],
  headers: [{ source: '/config.js', headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }] }],
}, null, 2) + '\n');

console.log(`Built ${files.length} files into ${path.relative(process.cwd(), OUT) || OUT}:`);
console.log('  ' + files.join(', '));
