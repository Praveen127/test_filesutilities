// ACCESSIBILITY: automated WCAG 2.2 AA checks on every screen, keyboard-only use of the main flows, and the
// accessibility tree that screen readers read (Chromium's, via the DevTools protocol).
// What this can't replace: listening with a real screen reader (NVDA, VoiceOver, TalkBack) — see the manual
// checklist in tests/browser/README.md.
import path from 'node:path';
import { open, check, summary, FX } from './lib.mjs';
import { DRIVERS } from './drivers.mjs';

const here = path.dirname(new URL(import.meta.url).pathname);
const ROUTES = ['home', ...DRIVERS.map(d => d.id), 'pricing', 'privacy', 'terms', 'refunds', 'for-business'];
const t = await open({ config: { supabaseUrl: 'https://proj.supabase.co', supabaseAnonKey: 'anon' }, extraRoutes: [['supabase-js@2', path.join(here, 'mocks/mock-supabase.js')]] });
const page = t.page;

// ---------- 1. rules on every screen ----------
const RULES = () => {
  const out = {};
  const add = (k, v) => { (out[k] = out[k] || []).push(v); };
  const vis = e => { if (e.closest('[hidden],dialog:not([open])')) return false; const b = e.getBoundingClientRect(); const s = getComputedStyle(e); return b.width > 0 && b.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const label = e => e.textContent.replace(/\s+/g, ' ').trim().slice(0, 30) || e.className || e.tagName;
  const name = e => {
    if (e.getAttribute('aria-label')) return e.getAttribute('aria-label').trim();
    if (e.getAttribute('aria-labelledby')) return e.getAttribute('aria-labelledby').split(/\s+/).map(id => (document.getElementById(id) || {}).textContent || '').join(' ').trim();
    if (e.labels && e.labels.length) return [...e.labels].map(l => l.textContent).join(' ').trim();
    const txt = [...e.childNodes].map(n => n.nodeType === 3 ? n.textContent : (n.getAttribute && n.getAttribute('aria-hidden') === 'true') ? '' : (n.getAttribute && n.getAttribute('alt')) || n.textContent || '').join(' ').trim();
    return txt || (e.getAttribute('title') || '').trim();
  };
  // accessible names
  for (const e of document.querySelectorAll('button, a[href], [role=button], [role=tab], summary')) if (vis(e) && !name(e)) add('control without a name', label(e) || e.outerHTML.slice(0, 60));
  for (const e of document.querySelectorAll('input:not([type=hidden]), select, textarea')) {
    if (!vis(e) && !(e.type === 'file' && vis(e.parentElement))) continue;
    if (!name(e)) add('form field without a label', (e.className || e.type || e.tagName) + ' ' + (e.placeholder || ''));
  }
  // images & svg
  for (const e of document.querySelectorAll('img')) if (vis(e) && !e.hasAttribute('alt')) add('image without alt', e.src.slice(0, 50));
  for (const e of document.querySelectorAll('svg')) if (vis(e) && e.getAttribute('aria-hidden') !== 'true' && !e.getAttribute('aria-label') && !e.querySelector('title') && e.getAttribute('role') !== 'img') add('svg not hidden and unnamed', e.parentElement.className || e.parentElement.tagName);
  // ids
  const ids = {}; for (const e of document.querySelectorAll('[id]')) ids[e.id] = (ids[e.id] || 0) + 1;
  for (const [k, v] of Object.entries(ids)) if (v > 1) add('duplicate id', k);
  for (const e of document.querySelectorAll('[aria-labelledby],[aria-describedby],[aria-controls],label[for]')) for (const a of ['aria-labelledby', 'aria-describedby', 'aria-controls', 'for'])
    for (const id of (e.getAttribute(a) || '').split(/\s+/).filter(Boolean)) if (!document.getElementById(id)) add('reference to missing id', `${a}=${id}`);
  // headings
  const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(vis).map(h => +h.tagName[1]);
  if (hs.filter(h => h === 1).length !== 1) add('page should have exactly one visible h1', String(hs.filter(h => h === 1).length));
  for (let i = 1; i < hs.length; i++) if (hs[i] > hs[i - 1] + 1) add('heading level skipped', `h${hs[i - 1]} → h${hs[i]}`);
  // focusable things hidden from assistive tech
  for (const e of document.querySelectorAll('[aria-hidden=true] a[href], [aria-hidden=true] button, [aria-hidden=true] input')) if (vis(e)) add('focusable element inside aria-hidden', label(e));
  // contrast (text on its nearest opaque background)
  const rgb = c => (c.match(/[\d.]+/g) || []).map(Number);
  const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const bgOf = e => { for (let n = e; n; n = n.parentElement) { const s = getComputedStyle(n); if (s.backgroundImage !== 'none' && n !== document.body) return null; const c = rgb(s.backgroundColor); if (c.length >= 3 && (c[3] === undefined || c[3] > 0.95)) return c.slice(0, 3); } return [255, 255, 255]; };
  const seen = new Set();
  for (const e of document.querySelectorAll('body *')) {
    if (!vis(e) || ['SCRIPT', 'STYLE', 'svg', 'path'].includes(e.tagName)) continue;
    const own = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()); if (!own) continue;
    if (e.closest('[disabled],.preview-note,.adslot') || e.matches(':disabled')) continue;
    const s = getComputedStyle(e); const fg = rgb(s.color); const bg = bgOf(e); if (!bg || fg.length < 3) continue;
    const a = fg[3] === undefined ? 1 : fg[3]; const f = fg.slice(0, 3).map((v, i) => v * a + bg[i] * (1 - a));
    const L1 = lum(f), L2 = lum(bg), ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const size = parseFloat(s.fontSize), bold = +s.fontWeight >= 700, large = size >= 24 || (bold && size >= 18.66);
    if (ratio < (large ? 3 : 4.5)) { const k = label(e); if (!seen.has(k)) { seen.add(k); add('low text contrast', `${k} ${ratio.toFixed(2)}:1`); } }
  }
  // status messages must be announced
  for (const e of document.querySelectorAll('.msg, #gmsg')) if (!e.closest('[role=status],[role=alert],[aria-live]') && !e.matches('[role=status],[role=alert],[aria-live]')) add('message area not announced (needs role=status / aria-live)', e.className || e.id);
  for (const e of document.querySelectorAll('.tprog, .prog, .bar')) if (vis(e) && !e.closest('[role=progressbar]') && !e.querySelector('[role=progressbar]')) add('progress bar without role=progressbar', e.className);
  return out;
};
const totals = {};
for (const r of ROUTES) {
  await t.go(r); await page.waitForTimeout(120);
  const res = await page.evaluate(RULES);
  for (const [k, v] of Object.entries(res)) (totals[k] = totals[k] || []).push(...v.map(x => `${r}: ${x}`));
}
await page.evaluate(() => { document.getElementById('authDlg').showModal(); });
for (const [k, v] of Object.entries(await page.evaluate(RULES))) (totals[k] = totals[k] || []).push(...v.map(x => `sign-in: ${x}`));
await page.evaluate(() => document.getElementById('authDlg').close());
check(await page.evaluate(() => document.documentElement.lang === 'en'), 'page language is declared (lang="en")');
check(await page.evaluate(() => !!document.querySelector('main') && !!document.querySelector('nav') && !!document.querySelector('footer')), 'landmarks: main, nav and footer present');
const RULE_NAMES = ['control without a name', 'form field without a label', 'image without alt', 'svg not hidden and unnamed', 'duplicate id', 'reference to missing id',
  'page should have exactly one visible h1', 'heading level skipped', 'focusable element inside aria-hidden', 'low text contrast', 'message area not announced (needs role=status / aria-live)', 'progress bar without role=progressbar'];
for (const k of RULE_NAMES) { const v = [...new Set(totals[k] || [])]; check(!v.length, `rule: ${k}`, v.length ? `${v.length}: ${v.slice(0, 4).join(' | ')}` : `0 on ${ROUTES.length + 1} screens`); }

// ---------- 2. keyboard only ----------
await page.reload(); await page.waitForTimeout(400);
await page.keyboard.press('Tab');
const first = await page.evaluate(() => ({ text: document.activeElement.textContent.trim(), href: document.activeElement.getAttribute('href') }));
check(/skip/i.test(first.text) && first.href, 'first Tab reaches a “Skip to content” link', JSON.stringify(first));
await page.keyboard.press('Enter'); await page.waitForTimeout(150);
check(await page.evaluate(() => !!document.activeElement.closest('main') || document.activeElement.id === 'main'), 'skip link moves focus to the main content', await page.evaluate(() => document.activeElement.tagName + '#' + document.activeElement.id));
// focus is always visible
await t.go('pdf-merge'); await page.evaluate(() => { document.activeElement.blur(); window.scrollTo(0, 0); });
const noRing = [];
for (let i = 0; i < 40; i++) {
  await page.keyboard.press('Tab');
  const f = await page.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return null; const s = getComputedStyle(e);
    const ring = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || /\d+px/.test(s.boxShadow) && s.boxShadow !== 'none';
    const b = e.getBoundingClientRect(); return { ring, name: (e.getAttribute('aria-label') || e.textContent || e.className).trim().slice(0, 25), shown: b.width > 0 && b.height > 0 }; });
  if (f && (!f.ring || !f.shown)) noRing.push(f.name + (f.shown ? '' : ' (invisible)'));
}
check(!noRing.length, 'every focused control shows a visible focus ring (40 Tab stops)', noRing.slice(0, 5).join(' | '));
// complete a tool with the keyboard only
await t.go('pdf-merge');
await page.focus('#pdf-merge .drop input[type=file], #pdf-merge .drop .pick, #pdf-merge .drop button').catch(() => {});
const pick = await page.evaluate(() => { const d = document.querySelector('#pdf-merge .drop'); const f = [...d.querySelectorAll('button, [tabindex], input, label')].find(e => e.tabIndex >= 0); return f ? f.tagName + '.' + f.className : 'none'; });
await page.evaluate(() => { const d = document.querySelector('#pdf-merge .drop'); const f = [...d.querySelectorAll('button, [tabindex], input, label')].find(e => e.tabIndex >= 0); f && f.focus(); });
const openPicker = async sel => { for (const key of ['Enter', 'Space', 'Enter']) {
    await page.evaluate(sel => { const d = document.querySelector(sel); const f = [...d.querySelectorAll('button, [tabindex], input, label')].find(e => e.tabIndex >= 0); f && f.focus(); }, sel);
    try { const [c] = await Promise.all([page.waitForEvent('filechooser', { timeout: 5000 }), page.keyboard.press(key)]); return { c, key }; } catch {} } return {}; };
const { c: chooser, key: usedKey } = await openPicker('#pdf-merge .drop');
check(!!chooser, 'file picker opens from the keyboard on the drop zone', `${pick} · ${usedKey || 'no key worked'}`);
if (chooser) await chooser.setFiles([path.join(FX, 'canary.pdf'), path.join(FX, 'canary.pdf')]);
await page.waitForTimeout(500);
const moveBtn = await page.$('#pdf-merge [data-down="0"]');
if (moveBtn) { await moveBtn.focus(); await page.keyboard.press('Enter'); }
check(!!moveBtn, 'files can be reordered with the keyboard (move buttons)');
await page.focus('#pdf-merge .run'); await page.keyboard.press('Enter');
await page.waitForSelector('#pdf-merge [data-get]', { timeout: 60000 });
await page.focus('#pdf-merge [data-get]');
let dl = null; try { [dl] = await Promise.all([page.waitForEvent('download', { timeout: 10000 }), page.keyboard.press('Enter')]); } catch {}
check(!!dl, 'merge PDFs start to finish with only the keyboard (pick → run → download)');
const focusAfter = await page.evaluate(() => document.activeElement.closest('#pdf-merge') ? 'inside tool' : document.activeElement.tagName);
check(focusAfter === 'inside tool', 'focus stays in the tool after running (not lost to the page top)', focusAfter);
// category menu with keyboard
await page.focus('#t-cat-home'); await page.keyboard.press('Enter'); await page.waitForTimeout(250);
const homeOk = await page.evaluate(() => !document.getElementById('home').hidden);
await page.focus('#tools .tcw[data-k="json"] a'); await page.keyboard.press('Enter'); await page.waitForTimeout(250);
check(homeOk && await page.evaluate(() => location.pathname === '/json-formatter'), 'Home tab and tool tiles work with Enter');
// dialogs: open with keyboard, focus inside, Tab trapped, Escape closes and returns focus
await page.focus('#acctBtn'); await page.keyboard.press('Enter'); await page.waitForSelector('#authDlg[open]');
const inDlg = await page.evaluate(() => !!document.activeElement.closest('#authDlg'));
// (a native modal <dialog> makes the rest of the page inert; focus may visit the browser's own UI, which shows here as <body>)
let escaped = false; for (let i = 0; i < 25; i++) { await page.keyboard.press('Tab'); if (await page.evaluate(() => document.activeElement !== document.body && !document.activeElement.closest('#authDlg'))) { escaped = true; break; } }
check(inDlg && !escaped, 'sign-in window: focus moves into it and Tab stays inside');
await page.keyboard.press('Escape'); await page.waitForTimeout(150);
check(await page.evaluate(() => !document.getElementById('authDlg').open && document.activeElement.id === 'acctBtn'), 'Escape closes it and focus returns to the Sign in button');
// converter: choose format with keyboard
await t.go('convert');
const { c: ch2 } = await openPicker('#drop');
check(!!ch2, 'converter: file picker opens from the keyboard');
if (ch2) { await ch2.setFiles(path.join(FX, 'canary.txt')); await page.focus('.chip[data-f="pdf"]'); await page.keyboard.press('Enter'); await page.waitForSelector('#jobs [data-dl]', { timeout: 60000 }); check(true, 'converter: choose PDF with Enter and get a download button'); }
// pdf-organize thumbnails operable without a mouse
await t.go('pdf-organize'); await t.add('pdf-organize', ['canary.pdf']);
await page.waitForFunction(() => document.querySelectorAll('#pdf-organize .thumb canvas').length === 3, null, { timeout: 30000 });
const thumbBtns = await page.$$eval('#pdf-organize .thumb [data-a]', b => b.map(x => ({ n: (x.getAttribute('aria-label') || x.textContent).trim(), tab: x.tabIndex })));
check(thumbBtns.length && thumbBtns.every(b => b.tab >= 0 && b.n), 'organize: every page has keyboard-reachable, labelled rotate/delete/move buttons', thumbBtns.slice(0, 4).map(b => b.n).join(', '));

// ---------- 3. what a screen reader gets (Chromium accessibility tree) ----------
const cdp = await t.ctx.newCDPSession(page);
await t.go('pdf-merge');
const { nodes } = await cdp.send('Accessibility.getFullAXTree');
const interactive = nodes.filter(n => !n.ignored && ['button', 'link', 'textbox', 'combobox', 'checkbox', 'radio', 'slider', 'spinbutton', 'tab', 'switch'].includes(n.role?.value));
const unnamed = interactive.filter(n => !(n.name?.value || '').trim());
check(!unnamed.length, 'screen-reader tree: every interactive element has a name', `${interactive.length} elements` + (unnamed.length ? `, unnamed: ${unnamed.slice(0, 5).map(n => n.role.value).join(',')}` : ''));
const roles = new Set(nodes.filter(n => !n.ignored).map(n => n.role?.value));
check(['main', 'navigation', 'heading', 'contentinfo'].every(r => roles.has(r)), 'screen-reader tree: has main, navigation, headings and footer', [...roles].filter(r => ['main', 'navigation', 'banner', 'contentinfo', 'heading', 'status', 'progressbar', 'dialog'].includes(r)).join(', '));
// toggles announce state
const pressed = await page.$$eval('button[aria-pressed]', b => b.length);
check(pressed > 0, 'toggle buttons expose their on/off state (aria-pressed)', `${pressed} on this screen`);
// progress and results are announced
await t.add('pdf-merge', ['canary.pdf', 'canary.pdf']);
const live = await page.evaluate(() => { const s = document.querySelector('#pdf-merge'); const r = s.querySelector('.tout'); return { out: !!(r && (r.closest('[aria-live]') || r.getAttribute('aria-live'))), prog: !!s.querySelector('[role=progressbar]') }; });
check(live.out, 'results are announced when a task finishes (aria-live)');
check(live.prog, 'progress is exposed as a progressbar');
check(!t.errors.length, 'no script errors', t.errors.join(' / '));
await t.close();

// ---------- 4. dark mode contrast ----------
const d = await open({ colorScheme: 'dark' });
const darkLow = [];
for (const r of ROUTES) { await d.go(r); await d.page.waitForTimeout(100); const res = await d.page.evaluate(RULES); for (const x of res['low text contrast'] || []) darkLow.push(`${r}: ${x}`); }
const uniq = [...new Set(darkLow.map(x => x.replace(/^[^:]+: /, '')))];
check(!uniq.length, 'dark mode: text contrast meets WCAG AA on every screen', uniq.slice(0, 5).join(' | '));
await d.close();
summary('accessibility');
