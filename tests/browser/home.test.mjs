// HOME PAGE (Fileutilo 15): search, popular tasks by region, tools grouped by job, stars, recent & favourites, footer.
import fs from 'node:fs';
import path from 'node:path';
import { open, ROOT, check, summary } from './lib.mjs';
const seo = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/seo.json'), 'utf8'));
const tz = (zone, lang) => `(()=>{const R=Intl.DateTimeFormat.prototype.resolvedOptions;Intl.DateTimeFormat.prototype.resolvedOptions=function(){return{...R.call(this),timeZone:'${zone}'}};Object.defineProperty(navigator,'languages',{get:()=>['${lang}']});Object.defineProperty(navigator,'language',{get:()=>'${lang}'})})()`;
const chips = p => p.$$eval('#hchips a', a => a.map(x => [x.textContent, x.getAttribute('href')]));

// ---------- visitor outside India, accounts not connected (preview copy) ----------
let t = await open({ viewport: { width: 1400, height: 1000 }, init: tz('Europe/London', 'en-GB') }); let p = t.page;
const g = await chips(p);
check(g.length === 12 && g[0][0] === 'JPG to PDF' && g[1][0] === 'PDF to JPG' && g.some(c => c[0] === 'HEIC to JPG') && !g.some(c => /Aadhaar/.test(c[0])), 'Popular tasks: the global list, with each conversion next to its reverse', g.map(c => c[0]).join(' · '));
const known = new Set([...Object.values(seo.tools).map(m => m.slug).filter(Boolean), ...Object.keys(seo.variants)]);
check(g.every(([, h]) => known.has(h)), 'Popular tasks: every chip opens a real page', g.filter(([, h]) => !known.has(h)).join(', ') || 'all found');
const tiles = await p.$$eval('#tools .tcw', a => a.map(x => [x.dataset.k, x.querySelector('a').getAttribute('href')]));
const toolKeys = Object.keys(seo.tools).filter(k => k !== 'home');
check(tiles.length === 39 && toolKeys.every(k => tiles.some(([tk]) => tk === k)), 'Tools: all 37 tools (plus 2 PowerPoint task pages) appear as tiles', `${tiles.length} tiles`);
check(tiles.every(([, h]) => known.has(h)), 'Tools: every tile links to its own page');
const groups = await p.$$eval('#tools .jgroup h3', a => a.map(x => x.textContent));
check(groups.join('|') === 'Combine|Make smaller|Protect & keep private|Convert|PowerPoint & slides|Edit & organize|Read, check & compare', 'Tools: grouped into the seven jobs, in order', groups.join(' · '));
check(await p.evaluate(() => !document.querySelector('#tools .hhead, .shots, .hbadge') && document.querySelectorAll('#tools .tcw').length === 39 && document.querySelector('#tools h2').textContent === 'All tools'), 'Tools: no toolkit heading, badge or screenshot gallery; 39 tiles under a hidden "All tools" heading');
const bar = await p.$$eval('.acctbar a, .acctbar button', a => a.map(x => x.textContent.trim()));
check(bar.join('|') === 'All tools|Pricing|For business|Privacy|Sign in', 'Header: All tools, Pricing, For business, Privacy and Sign in', bar.join(' · '));
// search
await p.fill('#hq', 'merge'); await p.waitForTimeout(150);
let opts = await p.$$eval('#hqList [role=option] b', a => a.map(x => x.textContent));
check(opts[0] === 'Merge PDF' && opts.includes('Merge PowerPoint') && await p.$eval('#hq', e => e.getAttribute('aria-expanded')) === 'true', 'Search: typing shows matching tools, best first', opts.join(', '));
await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown');
check(await p.$eval('#hq', e => e.getAttribute('aria-activedescendant')) === 'hq-1', 'Search: arrow keys move through the results');
await p.keyboard.press('Escape'); check(await p.$eval('#hqList', e => e.hidden), 'Search: Escape closes the list');
await p.fill('#hq', 'png to jpg'); await p.waitForTimeout(150); await p.keyboard.press('Enter'); await p.waitForTimeout(500);
check(!await p.$eval('#img-convert', e => e.hidden) && await p.$eval('#img-convert .o-f', e => e.value) === 'jpg' && /png-to-jpg$/.test(new URL(p.url()).pathname), 'Search: Enter opens the first match (PNG to JPG, with JPG chosen)', p.url());
check(await p.$eval('.hsearch', e => getComputedStyle(e).display === 'none') && await p.$eval('.hpop', e => getComputedStyle(e).display === 'none'), 'Search and popular tasks stay off tool pages, so the tool is above the fold');
await p.goto('https://app.test/'); await p.waitForTimeout(500);
await p.fill('#hq', 'zzqx'); await p.waitForTimeout(150);
check(/No tool matches/.test(await p.$eval('#hqList', e => e.textContent)), 'Search: a clear message when nothing matches');
await p.fill('#hq', '');
// stars and favourites (accounts off: everyone can use them, kept in this browser)
check(await p.$eval('.tcw[data-k="ppt-merge"] .tstar', e => getComputedStyle(e).display !== 'none'), 'Stars: shown on tiles when accounts are off (preview copy)');
await p.click('.tcw[data-k="ppt-merge"] .tstar'); await p.waitForTimeout(200);
check(await p.$eval('.tcw[data-k="ppt-merge"] .tstar', e => e.getAttribute('aria-pressed')) === 'true' && /Remove Merge PowerPoint/.test(await p.$eval('.tcw[data-k="ppt-merge"] .tstar', e => e.getAttribute('aria-label'))), 'Stars: tapping one marks the tool as a favourite');
check(!await p.$eval('#mine', e => e.hidden) && /Merge PowerPoint/.test(await p.$eval('#mine .mine-favs', e => e.textContent)), 'Favourites: the starred tool appears under Pick up where you left off');
const mineText = await p.$eval('#mine', e => e.innerText);
check(/Recently used/.test(mineText) && /Favourites/.test(mineText) && /Kept in this browser/.test(mineText), 'Recent & favourites: both lists, and they say where the data is kept');
check(!/:\/\/(?!app\.test)/.test(JSON.stringify(t.requests.filter(r => r.method !== 'GET').map(r => r.url))), 'Favourites are not sent anywhere');
// footer
const foot = await p.$eval('footer', e => e.innerText);
check(/never uploaded to our servers/.test(foot) && /never your files or their names/.test(foot) && /product of Kalaburagi Labs/.test(foot) && /support@fileutilo\.com/.test(foot) && /Refund policy/.test(foot), 'Footer: privacy statement, company and contact, and legal links');
check(!t.errors.length, 'No script errors (visitor outside India)', t.errors.join(' | '));
await t.close();

// ---------- visitor in India ----------
t = await open({ viewport: { width: 1400, height: 1000 }, init: tz('Asia/Kolkata', 'en-IN') }); p = t.page;
const ind = await chips(p);
check(ind.some(c => c[0] === 'Mask Aadhaar') && ind.some(c => c[1] === 'compress-image-to-50kb') && ind.some(c => c[0] === 'Passport size photo') && !ind.some(c => c[0] === 'HEIC to JPG'), 'Popular tasks: India gets form uploads, passport photo and Aadhaar masking', ind.map(c => c[0]).join(' · '));
check(ind.every(([, h]) => known.has(h)), 'Popular tasks (India): every chip opens a real page');
await t.close();

// ---------- accounts connected: signed out vs signed in ----------
t = await open({ viewport: { width: 1400, height: 1000 }, config: { supabaseUrl: 'https://demo.supabase.co', supabaseAnonKey: 'anon' }, init: tz('Europe/London', 'en-GB') }); p = t.page;
await p.evaluate(() => localStorage.setItem('fu_favs', JSON.stringify(['pdf-merge'])));
await p.evaluate(() => window.fuAfterRoute('home')); await p.waitForTimeout(100);
check(await p.$eval('#mine', e => e.hidden) && !await p.$eval('#nudge', e => e.hidden), 'Signed out: recent & favourites are hidden and a sign-in prompt shows instead');
check(await p.$eval('.tcw[data-k="pdf-merge"] .tstar', e => getComputedStyle(e).display === 'none'), 'Signed out: no stars on tiles');
await p.click('#nudge .nudge-in'); await p.waitForTimeout(200);
check(await p.evaluate(() => document.getElementById('authDlg').open), 'Signed out: the prompt’s Sign in button opens sign-in');
await p.keyboard.press('Escape');
await p.evaluate(() => { window.FB.state.session = { user: { id: 'u1', email: 'a@example.com' } }; window.fuAfterRoute('home'); }); await p.waitForTimeout(100);
check(!await p.$eval('#mine', e => e.hidden) && await p.$eval('#nudge', e => e.hidden) && /Merge PDF/.test(await p.$eval('#mine .mine-favs', e => e.textContent)), 'Signed in: recent & favourites show with the user’s favourites');
check(await p.$eval('.tcw[data-k="pdf-merge"] .tstar', e => getComputedStyle(e).display !== 'none' && e.getAttribute('aria-pressed') === 'true'), 'Signed in: stars show, and favourites are already marked');
await t.close();

// ---------- phone ----------
t = await open({ device: 'iPhone 13', init: tz('Europe/London', 'en-GB') }); p = t.page;
check(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Phone: no sideways scrolling on the home page');
check(await p.$eval('#hq', e => e.placeholder) === 'Search tools…', 'Phone: a short search placeholder that fits');
const small = await p.$$eval('#hchips a, #tools .tcard, #tools .tstar', a => a.filter(x => { const r = x.getBoundingClientRect(); return r.width && r.height < 40; }).length);
check(small === 0, 'Phone: chips, tiles and stars are big enough to tap', small + ' too small');
const cols = await p.$eval('#do-slides', e => getComputedStyle(e).gridTemplateColumns.split(' ').length);
check(cols === 1, 'Phone: each job group stacks its heading above its tools');
await t.close();

// ---------- headline and the For business page ----------
t = await open({ viewport: { width: 1320, height: 900 } }); p = t.page;
check(await p.$eval('.hero h1', e => e.textContent.replace(/\s+/g, ' ')) === 'Free PDF, image, Word and other Office toolsYour files never leave your device.', 'Headline: "Free PDF, image, Word and other Office tools", with the tagline under it');
check(await p.$eval('.hero h1', e => e.getBoundingClientRect().height < 130), 'Headline: one line on a laptop, with the tagline on the next line');
await p.click('.acctbar a[href="for-business"]'); await p.waitForTimeout(250);
const biz = await p.evaluate(() => ({ path: location.pathname, vis: !document.getElementById('for-business').hidden, h: document.querySelector('#for-business h2').textContent, title: document.title,
  mails: [...document.querySelectorAll('#for-business a[href^="mailto:support@fileutilo.com"]')].length, plans: document.querySelectorAll('#for-business .biz-plan').length,
  pro: document.getElementById('bizPro').textContent, rows: document.querySelectorAll('#for-business .biz-cmp tbody tr').length }));
check(biz.path === '/for-business' && biz.vis && /without uploading/.test(biz.h), 'For business: the header link opens its own page', JSON.stringify(biz));
check(biz.plans === 2 && biz.pro === '₹999' && biz.mails === 3 && biz.rows === 4, 'For business: Pro and "Contact us" plans, a 4-row comparison and email buttons', JSON.stringify(biz));
check(await p.$$eval('footer .flegal a', a => a.some(x => x.getAttribute('href') === 'for-business')), 'For business: linked from the footer too');
await t.close();
summary('Home page');
