import { fileURLToPath } from 'node:url';
// PRIVACY: proves that file contents never leave the browser.
// Runs every tool on files that contain a unique marker (CANARY) and inspects every network request the page makes:
//  - no request may carry the marker (as text, base64, URL-encoded or UTF-16) or a file name, in its URL or body
//  - in preview mode no request may have a body at all (no uploads of any kind)
//  - with accounts switched on, the only requests with a body go to Supabase, and contain only usage counters
//  - every request goes to an expected host (the site itself, the two library CDNs, fonts, OCR language data)
//  - visit statistics (Vercel Web Analytics, simulated by mocks/mock-vercel-insights.js) only carry the page address
import path from 'node:path';
import { open, check, skip, summary, hasLib, CANARY, LIB_MODE } from './lib.mjs';
import { DRIVERS } from './drivers.mjs';

const ALLOWED = [/^https:\/\/app\.test\//, /^https:\/\/cdn\.jsdelivr\.net\//, /^https:\/\/unpkg\.com\//, /^https:\/\/esm\.sh\//, /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
  /^https:\/\/tessdata\.projectnaptha\.com\//, /^https:\/\/[a-z0-9-]+\.supabase\.co\//];
const needles = [CANARY, Buffer.from(CANARY).toString('base64').slice(0, 16), encodeURIComponent(CANARY), Buffer.from(CANARY, 'utf16le').toString('latin1'), 'canary.', 'canary-'];
const leaks = r => { const hay = [r.url, r.body ? r.body.toString('latin1') : '', r.body ? r.body.toString('utf8') : ''].join('\n'); return needles.filter(n => hay.includes(n)); };
const real = r => /^https?:/.test(r.url);

async function sweep(label, opts) {
  const t = await open(opts);
  const perTool = [];
  for (const d of DRIVERS) {
    const missing = d.libs.filter(l => !hasLib(l));
    if (missing.length) { skip(`${label}: ${d.id} runs`, `library not available offline (${missing.join(', ')}) — run with LIB_MODE=online`); continue; }
    const before = t.requests.length;
    let out = '';
    try { out = await d.run(t); } catch (e) { out = 'ERROR ' + e.message; }
    const reqs = t.requests.slice(before).filter(real);
    perTool.push({ id: d.id, reqs });
    check(!/^ERROR|Could not|Couldn’t|Failed/.test(out), `${label}: ${d.id} runs`, out.slice(0, 90));
  }
  const all = t.requests.filter(real);
  const leaked = all.map(r => ({ r, hit: leaks(r) })).filter(x => x.hit.length);
  check(!leaked.length, `${label}: no request contains file content or file names`, leaked.map(x => x.r.method + ' ' + x.r.url.slice(0, 80) + ' ' + x.hit).join('; ') || `${all.length} requests inspected`);
  const odd = all.filter(r => !ALLOWED.some(a => a.test(r.url)));
  check(!odd.length, `${label}: every request goes to an expected host`, odd.map(r => r.url.slice(0, 80)).join('; ') || [...new Set(all.map(r => new URL(r.url).host))].join(', '));
  const isStats = r => /^https:\/\/app\.test\/_vercel\/insights\/view$/.test(r.url);
  const withBody = all.filter(r => r.body && r.body.length);
  const nonSupabase = withBody.filter(r => !/\.supabase\.co\//.test(r.url) && !isStats(r));
  check(!nonSupabase.length, `${label}: nothing is uploaded anywhere except usage counters (Supabase) and page-view pings (analytics)`, nonSupabase.map(r => r.method + ' ' + r.url).join('; ') || `${withBody.length} requests with a body`);
  const stats = all.filter(isStats);
  const badStats = stats.filter(r => { let j; try { j = JSON.parse(r.body.toString()); } catch { return true; }
    return Object.keys(j).some(k => !['o', 'r', 'ts'].includes(k)) || !/^https:\/\/app\.test\/([a-z0-9-]*)(#[a-z-]*)?$/.test(j.o); });
  check(stats.length > 0 && !badStats.length, `${label}: analytics pings contain only the page address (e.g. /#pdf-merge), never file data`,
    `${stats.length} pings, pages: ${[...new Set(stats.map(r => JSON.parse(r.body.toString()).o.replace('https://app.test/', '/')))].slice(0, 6).join(' ')}` + (badStats.length ? ' BAD ' + badStats[0].body.toString().slice(0, 100) : ''));
  const methods = [...new Set(all.filter(r => !/\.supabase\.co\//.test(r.url) && !isStats(r)).map(r => r.method))];
  check(methods.every(m => m === 'GET'), `${label}: only GET requests outside Supabase and analytics`, methods.join(','));
  for (const p of perTool) console.log(`   ${p.id.padEnd(14)} ${p.reqs.length} requests  ${[...new Set(p.reqs.map(r => r.method + ' ' + new URL(r.url).host + new URL(r.url).pathname.replace(/@[^/]+/, '@…').slice(0, 50)))].join(' | ')}`);
  check(!t.errors.length, `${label}: no script errors`, t.errors.join(' / '));
  await t.close();
  return t;
}

console.log(`LIB_MODE=${LIB_MODE}\n`);
await sweep('preview mode', { config: { analytics: true } });   // analytics forced on, as on the live site

// Accounts switched on (Supabase + Razorpay configured, signed in). supabase-js is replaced by a recording mock
// unless LIB_MODE=online, so we check the exact arguments the app hands to Supabase for every task.
const here = path.dirname(fileURLToPath(import.meta.url));
const mockRoutes = LIB_MODE === 'online' ? [] : [['supabase-js@2', path.join(here, 'mocks/mock-supabase.js')]];
const t = await open({ config: { supabaseUrl: 'https://proj.supabase.co', supabaseAnonKey: 'anon', analytics: true }, extraRoutes: mockRoutes });
if (LIB_MODE !== 'online') {
  await t.page.waitForFunction(() => window.__sb, null, { timeout: 15000 });
  await t.page.evaluate(() => { window.__sb.profile.plan = 'lifetime'; });
  await t.page.click('#acctBtn'); await t.page.fill('.a-em', 'asha@example.com'); await t.page.fill('.a-pw', 'rightpass1'); await t.page.click('.a-go');
  await t.page.waitForFunction(() => /Lifetime/.test(document.querySelector('#acctBtn').textContent), null, { timeout: 15000 });
  let ran = 0;
  for (const d of DRIVERS) { if (d.libs.some(l => !hasLib(l))) continue; try { await d.run(t); ran++; } catch {} }
  const calls = await t.page.evaluate(() => window.__sb.calls.filter(c => c[0] === 'rpc' || c[0] === 'fn').map(c => ({ kind: c[0], name: c[1], args: c[2] })));
  const OK_KEYS = new Set(['p_tool', 'p_files', 'p_max_mb', 'p_ocr_pages', 'p_confirm']);
  const bad = calls.filter(c => c.kind !== 'rpc' || c.name !== 'use_task' || Object.keys(c.args).some(k => !OK_KEYS.has(k)) || JSON.stringify(c.args).includes(CANARY) || /canary/i.test(JSON.stringify(c.args)));
  check(calls.length > 0 && !bad.length, 'accounts on: Supabase only receives usage counters (tool name, file count, largest size, OCR pages)',
    `${calls.length} calls over ${ran} tools, e.g. ${JSON.stringify(calls[0] && calls[0].args)}` + (bad.length ? ' BAD ' + JSON.stringify(bad[0]) : ''));
  const other = t.requests.filter(real).filter(r => r.body && r.body.length && !/^https:\/\/app\.test\/_vercel\/insights\/view$/.test(r.url));
  check(!other.length, 'accounts on: no other request carries a body (apart from page-view pings)', other.map(r => r.url).join('; ') || 'none');
} else skip('accounts on', 'run with a test Supabase project to inspect real traffic');
await t.close();
summary('privacy');
