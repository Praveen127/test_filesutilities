// Mobile load check: a mid-range phone (4× slower CPU) on a slow 4G connection, pages served compressed the way
// Vercel serves them. Reports First Contentful Paint, Largest Contentful Paint, layout shift and bytes downloaded.
// Usage: node tests/browser/perf.mjs [site-navy]
import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib';
import { pw, ROOT } from './lib.mjs';
const SITE = path.join(ROOT, process.argv[2] || 'site-navy');
const TYPES = { html: 'text/html; charset=utf-8', js: 'text/javascript', png: 'image/png', ico: 'image/x-icon', svg: 'image/svg+xml', webp: 'image/webp', webm: 'video/webm', mp4: 'video/mp4', webmanifest: 'application/manifest+json', json: 'application/json' };
const browser = await pw.chromium.launch();
const rows = [];
for (const page of ['/', '/compress-pdf', '/image-compressor', '/json-formatter']) {
  const ctx = await browser.newContext({ ...pw.devices['Pixel 7'] });
  let bytes = 0;
  await ctx.route('**/*', r => {
    const u = new URL(r.request().url());
    if (u.host === 'www.fileutilo.com') {
      let f = u.pathname === '/' ? 'index.html' : u.pathname.slice(1); if (!f.includes('.')) f += '.html';
      const p = path.join(SITE, f); if (!fs.existsSync(p)) return r.fulfill({ status: 404, body: '' });
      const ext = f.split('.').pop(), raw = fs.readFileSync(p);
      const zip = ['html', 'js', 'svg', 'json', 'webmanifest'].includes(ext);
      const body = zip ? zlib.brotliCompressSync(raw) : raw; bytes += body.length;
      return r.fulfill({ body, headers: { 'content-type': TYPES[ext] || 'application/octet-stream', ...(zip ? { 'content-encoding': 'br' } : {}) } });
    }
    if (/fonts\.(googleapis|gstatic)/.test(u.host)) return r.continue();
    return r.abort();
  });
  const pg = await ctx.newPage();
  const cdp = await ctx.newCDPSession(pg);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await pg.addInitScript(() => {
    window.__m = { lcp: 0, cls: 0 };
    new PerformanceObserver(l => { for (const e of l.getEntries()) window.__m.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__m.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
  });
  const t0 = Date.now();
  await pg.goto('https://www.fileutilo.com' + page, { waitUntil: 'load' });
  await pg.waitForTimeout(2500);
  const m = await pg.evaluate(() => ({ fcp: (performance.getEntriesByName('first-contentful-paint')[0] || {}).startTime || 0, lcp: window.__m.lcp, cls: window.__m.cls,
    dcl: performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd }));
  rows.push({ page, fcp: (m.fcp / 1000).toFixed(2) + ' s', lcp: (m.lcp / 1000).toFixed(2) + ' s', cls: m.cls.toFixed(3), ready: (m.dcl / 1000).toFixed(2) + ' s', 'own bytes': (bytes / 1024).toFixed(0) + ' KB' });
  await ctx.close();
}
await browser.close();
console.table(rows);
