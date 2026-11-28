import { fileURLToPath } from 'node:url';
// GOOGLE DRIVE (Fileutilo 16): open files from Drive into a tool, save a result back to Drive.
// Google is replaced by mocks/mock-google.js and fake Drive endpoints, so no real Google account is needed.
import fs from 'node:fs';
import path from 'node:path';
import { open, FX, check, summary, download } from './lib.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const MOCK = path.join(here, 'mocks/mock-google.js');
const GCFG = { googleClientId: 'abc.apps.googleusercontent.com', googleApiKey: 'KEY123', googleAppId: '123456789' };
const google = r => /^https:\/\/(apis\.google\.com|accounts\.google\.com|www\.googleapis\.com)\//.test(r.url);
const PDF_A = fs.readFileSync(path.join(FX, 'canary.pdf')), PDF_B = fs.readFileSync(path.join(FX, 'form.pdf'));

// Fake Drive: two PDFs, one Google Doc (exported as Word), and an upload endpoint.
async function fakeDrive(t) {
  const up = t.uploads = [];
  await t.page.route(/^https:\/\/www\.googleapis\.com\//, async route => {
    const r = route.request(), u = new URL(r.url()), auth = r.headers().authorization;
    if (auth !== 'Bearer TOKEN123') return route.fulfill({ status: 401, body: '{}' });
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Expose-Headers': 'Location' };
    if (u.pathname === '/drive/v3/files/pdfA') return route.fulfill({ body: PDF_A, contentType: 'application/pdf', headers: cors });
    if (u.pathname === '/drive/v3/files/pdfB') return route.fulfill({ body: PDF_B, contentType: 'application/pdf', headers: cors });
    if (u.pathname === '/drive/v3/files/doc1/export') { t.exported = u.searchParams.get('mimeType'); return route.fulfill({ body: fs.readFileSync(path.join(FX, 'canary.docx')), headers: cors }); }
    if (u.pathname === '/upload/drive/v3/files' && r.method() === 'POST') { up.push({ start: JSON.parse(r.postData() || '{}'), type: r.headers()['x-upload-content-type'] });
      return route.fulfill({ status: 200, body: '', headers: { ...cors, Location: 'https://www.googleapis.com/upload/session/xyz' } }); }
    return route.fulfill({ status: 404, body: '{}', headers: cors });
  });
  // the upload session URL carries no Authorization header, as with Google
  await t.page.route('https://www.googleapis.com/upload/session/xyz', async route => {
    const r = route.request(); up.push({ put: (r.postDataBuffer() || Buffer.alloc(0)).length, type: r.headers()['content-type'] });
    return route.fulfill({ body: JSON.stringify({ id: 'f1', name: 'merged.pdf', webViewLink: 'https://drive.google.com/file/d/f1/view' }), contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' } });
  });
}
const routes = [['apis.google.com/js/api.js', MOCK], ['accounts.google.com/gsi/client', MOCK]];

// ---------- not configured: nothing shows, nothing loads ----------
let t = await open({ viewport: { width: 1320, height: 900 } }); let p = t.page;
await p.goto('https://app.test/merge-pdf'); await p.waitForTimeout(400);
check(await p.$$eval('.gd-btn', b => b.length) === 0, 'Off by default: no Google Drive button until it is set up in config.js');
await t.add('pdf-merge', ['canary.pdf', 'form.pdf']); await t.run('pdf-merge'); await download(p, () => p.click('#pdf-merge [data-get]'));
check(await p.$$eval('.gd-toast', b => b.length) === 0 && !t.requests.some(google), 'Off by default: no Drive offer after a download, and no request to Google');
await t.close();

// ---------- configured ----------
t = await open({ viewport: { width: 1320, height: 900 }, config: GCFG, extraRoutes: routes }); p = t.page; await fakeDrive(t);
await p.goto('https://app.test/merge-pdf'); await p.waitForTimeout(400);
check(await p.$$eval('#pdf-merge .drop + .gd-row .gd-btn', b => b.length === 1 && b[0].textContent.trim() === 'Choose from Google Drive'), 'Set up: "Choose from Google Drive" sits under the drop area');
check(!t.requests.some(google), 'Set up: still nothing loads from Google until the button is used', t.requests.filter(google).map(r => r.url).join(' '));
await p.goto('https://app.test/document-converter'); await p.waitForTimeout(400);
check(await p.$$eval('#convert .gd-btn', b => b.length) === 1, 'The button is also on tools built differently (Document converter)');

// pick two PDFs into Merge
await p.goto('https://app.test/merge-pdf'); await p.waitForTimeout(300);
await p.evaluate(() => { window.__gd = { log: [], pick: [{ id: 'pdfA', name: 'Contract.pdf', mimeType: 'application/pdf' }, { id: 'pdfB', name: 'Annex.pdf', mimeType: 'application/pdf' }] }; });
await p.click('#pdf-merge .gd-btn'); await p.waitForFunction(() => document.querySelectorAll('#pdf-merge .flist li').length === 2, null, { timeout: 15000 });
const names = await p.$$eval('#pdf-merge .flist .nm', a => a.map(x => x.textContent));
check(names.join('|') === 'Contract.pdf|Annex.pdf', 'Open: the picked files land in the tool, in order', names.join(' · '));
const st = await p.evaluate(() => window.__gd);
check(st.built && st.built.token === 'TOKEN123' && st.built.key === 'KEY123' && st.built.app === '123456789' && st.built.origin === 'https://app.test' && st.built.multi, 'Open: the picker gets the token, API key, project number and this site, with multi-select for a multi-file tool', JSON.stringify(st.built));
check(st.log.some(l => l === 'init:abc.apps.googleusercontent.com:https://www.googleapis.com/auth/drive.file'), 'Open: asks only for the drive.file permission (files the person picks or saves)', st.log.join(' '));
check(/Added 2 files from Google Drive/.test(await p.$eval('#pdf-merge .gd-msg', e => e.textContent)), 'Open: a short confirmation under the button');
const fileReq = t.requests.filter(r => /drive\/v3\/files\/pdf/.test(r.url));
check(fileReq.length === 2 && fileReq.every(r => r.headers.authorization === 'Bearer TOKEN123'), 'Open: each file comes straight from Google to the browser');
check(!t.requests.some(r => r.body && r.body.length > 1000 && !google(r)), 'Privacy: the files are never sent anywhere except Google');

// run, download, save a copy back to Drive
await t.run('pdf-merge'); await download(p, () => p.click('#pdf-merge [data-get]')); await p.waitForTimeout(200);
check(await p.$eval('.gd-toast', e => !e.hidden && /Downloaded merged\.pdf/.test(e.textContent)), 'Save: after the download, the "Save a copy to Google Drive" offer appears');
await p.click('.gd-toast .gd-save'); await p.waitForFunction(() => /Saved .* to Google Drive/.test(document.querySelector('.gd-toast').textContent), null, { timeout: 15000 });
check(t.uploads.length === 2 && t.uploads[0].start.name === 'merged.pdf' && t.uploads[0].type === 'application/pdf' && t.uploads[1].put > 1000, 'Save: the file is uploaded to Drive with its name and type (resumable upload)', JSON.stringify(t.uploads));
check(await p.$eval('.gd-toast a', a => a.href === 'https://drive.google.com/file/d/f1/view' && a.target === '_blank'), 'Save: an "Open" link to the file in Drive');

// a Google Doc is exported as Word; cancelling does nothing
await p.goto('https://app.test/document-converter'); await p.waitForTimeout(300);
await p.evaluate(() => { window.__gd = { log: [], pick: [{ id: 'doc1', name: 'Board notes', mimeType: 'application/vnd.google-apps.document' }] }; });
await p.click('#convert .gd-btn'); await p.waitForFunction(() => /Added/.test((document.querySelector('#convert .gd-msg') || {}).textContent || ''), null, { timeout: 15000 });
check(t.exported === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' && /Board notes\.docx/.test(await p.$eval('#convert .gd-msg', e => e.textContent)), 'Google Docs are opened as Word files (Board notes.docx)', t.exported);
await p.goto('https://app.test/split-pdf'); await p.waitForTimeout(300);
await p.evaluate(() => { window.__gd = { log: [], pick: 'cancel' }; });
await p.click('#pdf-split .gd-btn'); await p.waitForTimeout(400);
check(await p.$$eval('#pdf-split .flist li', l => l.length) === 0 && !(await p.$eval('#pdf-split .gd-msg', e => e.textContent)), 'Cancel: closing the picker adds nothing and shows no error');
check(await p.evaluate(() => window.__gd.built.multi === false), 'A one-file tool opens the picker for one file');
check(t.errors.length === 0, 'No page errors', t.errors.join(' | '));
await t.close();

// ---------- sign-in refused ----------
t = await open({ viewport: { width: 1320, height: 900 }, config: GCFG, extraRoutes: routes, init: () => { window.__gd = { log: [], pick: [], deny: true }; } }); p = t.page; await fakeDrive(t);
await p.goto('https://app.test/compress-pdf'); await p.waitForTimeout(300);
await p.click('#pdf-compress .gd-btn'); await p.waitForTimeout(500);
check(/access wasn’t allowed/.test(await p.$eval('#pdf-compress .gd-msg', e => e.textContent)) && !(await p.$eval('#pdf-compress .gd-btn', b => b.disabled)), 'Refused: a plain message, and the button can be tried again');
await t.close();

// ---------- phone ----------
t = await open({ device: 'iPhone 13', config: GCFG, extraRoutes: routes }); p = t.page;
await p.goto('https://app.test/merge-pdf'); await p.waitForTimeout(400);
const box = await p.$eval('#pdf-merge .gd-btn', b => { const r = b.getBoundingClientRect(); return { h: r.height, fits: r.right <= innerWidth }; });
check(box.h >= 40 && box.fits && await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Phone: the button is big enough to tap and fits the screen', JSON.stringify(box));
await t.close();
summary('Google Drive');
