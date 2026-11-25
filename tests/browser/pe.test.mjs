// SIGN, EDIT & FILL, REDACT (with Aadhaar masking), EXAM PHOTO RESIZER and COMPRESS-TO-SIZE.
// Outputs are checked independently in Node with pdf-lib and pdf.js — including where things land on a rotated page.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { open, FX, check, skip, summary, waitDone, download } from './lib.mjs';
const req = createRequire(import.meta.url);
const load = (n, alt) => { try { return req(n); } catch { return req(alt); } };
const { PDFDocument, StandardFonts } = load('pdf-lib', '/opt/npm-tools/node_modules/pdf-lib');
let pdfjs; try { pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs'); } catch { pdfjs = await import('/opt/npm-tools/node_modules/pdfjs-dist/legacy/build/pdf.mjs'); }
const AADHAAR = '298765432101';

async function textOf(file) {   // [{page, str, fx, fy}] — positions as fractions of the page as displayed
  const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(file)), isEvalSupported: false }).promise; const out = [];
  for (let i = 1; i <= doc.numPages; i++) { const pg = await doc.getPage(i), vp = pg.getViewport({ scale: 1 }), tc = await pg.getTextContent();
    for (const it of tc.items) { if (!it.str.trim()) continue; const [x, y] = vp.convertToViewportPoint(it.transform[4], it.transform[5]); out.push({ page: i, str: it.str, fx: x / vp.width, fy: y / vp.height }); } }
  return out;
}
const imagesOn = async (file, i) => { const d = await PDFDocument.load(fs.readFileSync(file)); const p = d.getPages()[i]; const xo = p.node.Resources().lookup(req('/opt/npm-tools/node_modules/pdf-lib').PDFName.of('XObject')); return xo ? xo.keys().length : 0; };

const t = await open({ viewport: { width: 1400, height: 1000 } });
const p = t.page;
const pageBox = async (sec, i) => { const el = (await p.$$(`#${sec} .pe-page`))[i]; await el.evaluate(e => e.scrollIntoView({ block: 'center' })); await p.waitForTimeout(100); return el.boundingBox(); };
const clickAt = async (sec, i, fx, fy) => { const b = await pageBox(sec, i); await p.mouse.click(b.x + b.width * fx, b.y + b.height * fy); await p.waitForTimeout(150); };
const save = async sec => { await p.click(`#${sec} .run`); await waitDone(p, sec, 120000); const err = await p.$eval(`#${sec} .side .msg`, e => e.textContent); const b = await p.$(`#${sec} [data-get]`); return b ? download(p, () => b.click()) : (console.log('  no result:', err), null); };

// ---------------- Sign PDF ----------------
await t.go('pdf-sign'); await t.add('pdf-sign', ['rotated.pdf']);
await p.waitForSelector('#pdf-sign .pe-page canvas', { timeout: 30000 });
check(await p.$$eval('#pdf-sign .pe-page', e => e.length) === 2, 'Sign: the PDF opens as pages to place a signature on');
const ar = await p.$eval('#pdf-sign .pe-page', e => e.offsetWidth / e.offsetHeight);
check(ar > 1.3, 'Sign: a page stored with /Rotate 90 is shown the way readers show it (landscape)', ar.toFixed(2));
await p.click('#pdf-sign .o-sig');
check(await p.evaluate(() => document.getElementById('sigDlg').open), 'Sign: “Add signature” opens the signature pad');
const pad = await (await p.$('#sigDlg .sig-pad')).boundingBox();
await p.mouse.move(pad.x + 40, pad.y + pad.height * .7); await p.mouse.down();
for (let k = 0; k <= 20; k++) await p.mouse.move(pad.x + 40 + k * 18, pad.y + pad.height * (.5 + .25 * Math.sin(k / 2)));
await p.mouse.up();
await p.click('#sigDlg .sig-save'); await p.click('#sigDlg .sig-ok'); await p.waitForTimeout(200);
check(await p.evaluate(() => !document.getElementById('sigDlg').open && document.querySelector('#pdf-sign .pe').classList.contains('armed')), 'Sign: after drawing, the next click places it');
await clickAt('pdf-sign', 0, .5, .5);
check(await p.$$eval('#pdf-sign .pe-img img', e => e.length) === 1, 'Sign: the signature appears on the page');
check(await p.evaluate(() => JSON.parse(localStorage.getItem('fu_sig_signature') || '[]').length === 1), 'Sign: “Remember” keeps it in this browser only (localStorage)');
await p.click('#pdf-sign .o-all');
check(await p.$$eval('#pdf-sign .pe-img img', e => e.length) === 2, 'Sign: “Copy to every page” puts it on page 2 as well');
await p.click('#pdf-sign .o-date'); await clickAt('pdf-sign', 0, .3, .2); await p.keyboard.press('Escape');
const dateTxt = await p.$eval('#pdf-sign .pe-text .pe-tx', e => e.textContent);
check(/^\d{2}-\d{2}-\d{4}$/.test(dateTxt), 'Sign: “Date” adds today’s date', dateTxt);
const sf = await save('pdf-sign');
if (sf) {
  const tx = await textOf(sf), d = tx.find(x => x.str === dateTxt);
  check(d && d.page === 1 && Math.abs(d.fx - .3) < .02 && Math.abs(d.fy - .2) < .05, 'Sign: on the rotated page the date lands exactly where it was placed', d ? `${d.fx.toFixed(3)}, ${d.fy.toFixed(3)}` : 'not found');
  check(await imagesOn(sf, 0) === 1 && await imagesOn(sf, 1) === 1, 'Sign: the signature image is on both pages of the saved PDF');
  check((await PDFDocument.load(fs.readFileSync(sf))).getPage(0).getRotation().angle === 90, 'Sign: the page keeps its rotation');
}
// saved signature offered next time
await p.click('#pdf-sign .o-sig');
check(await p.$$eval('#sigDlg .sig-list [data-use]', e => e.length) === 1, 'Sign: a remembered signature is offered next time');
await p.click('#sigDlg [data-forget="0"]');
check(await p.evaluate(() => JSON.parse(localStorage.getItem('fu_sig_signature') || '[]').length === 0), 'Sign: a remembered signature can be forgotten');
await p.keyboard.press('Escape');

// ---------------- Edit & fill ----------------
await t.go('pdf-edit'); await t.add('pdf-edit', ['form.pdf']);
await p.waitForSelector('#pdf-edit .ffl [data-f]', { timeout: 30000 });
check(await p.$$eval('#pdf-edit .ffl [data-f]', e => e.length) === 3, 'Edit: a fillable form’s fields are listed');
await p.fill('#pdf-edit .ffl input[type=text]', 'Asha Rao');
await p.selectOption('#pdf-edit .ffl select', 'Kalaburagi');
await p.click('#pdf-edit .ffl label.chk');
await p.click('#pdf-edit .o-txt'); await clickAt('pdf-edit', 0, .2, .5); await p.keyboard.type('Hello FUCANARY');
await p.click('#pdf-edit .o-tick'); await clickAt('pdf-edit', 0, .6, .5);
await p.click('#pdf-edit .o-txt'); await clickAt('pdf-edit', 0, .2, .6); await p.keyboard.type('नमस्ते ಕನ್ನಡ');
await p.mouse.click(5, 5);
check(await p.$$eval('#pdf-edit .pe-it', e => e.length) === 3, 'Edit: text, a tick and Hindi/Kannada text are placed');
const ef = await save('pdf-edit');
if (ef) {
  const d = await PDFDocument.load(fs.readFileSync(ef)), f = d.getForm();
  check(f.getTextField('applicant.full_name').getText() === 'Asha Rao' && f.getDropdown('applicant.city').getSelected()[0] === 'Kalaburagi' && f.getCheckBox('applicant.agree').isChecked(), 'Edit: form fields are filled in the saved PDF');
  const tx = await textOf(ef), h = tx.find(x => x.str === 'Hello FUCANARY');
  check(h && Math.abs(h.fx - .2) < .02, 'Edit: typed text is real, searchable text where it was placed', h ? h.fx.toFixed(3) : 'missing');
  check(await imagesOn(ef, 0) >= 1, 'Edit: text in Indian scripts is kept (drawn as a sharp picture)');
}
await p.fill('#pdf-edit .ffl input[type=text]', 'आशा');
await p.click('#pdf-edit .run'); await waitDone(p, 'pdf-edit');
check(/can’t show here/.test(await p.$eval('#pdf-edit .side .msg', e => e.textContent)), 'Edit: Hindi in a form field gives a clear message instead of a broken file');

// ---------------- Redact + Aadhaar ----------------
await t.go('pdf-redact'); await t.add('pdf-redact', ['aadhaar.pdf']);
await p.waitForSelector('#pdf-redact .pe-page canvas', { timeout: 30000 });
await p.click('#pdf-redact .o-aad');
await p.waitForFunction(() => /Masked|No Aadhaar/.test(document.querySelector('#pdf-redact .o-aadn').textContent), null, { timeout: 30000 });
const note = await p.$eval('#pdf-redact .o-aadn', e => e.textContent);
check(/Masked 2 Aadhaar numbers/.test(note), 'Redact: finds both Aadhaar numbers (spaced and in one block), not the invoice number', note);
const helv = await (await PDFDocument.create()).embedFont(StandardFonts.Helvetica);
const boxes = await p.$$eval('#pdf-redact .pe-box', e => e.map(b => ({ x: parseFloat(b.style.left) / 100, w: parseFloat(b.style.width) / 100 })));
const spaced = boxes.sort((a, b) => b.w - a.w).find(b => Math.abs(b.x * 595 - 170) < 8);
const want8 = helv.widthOfTextAtSize('2987 6543', 16), full = helv.widthOfTextAtSize('2987 6543 2101', 16);
check(spaced && spaced.w * 595 > want8 && spaced.w * 595 < full - helv.widthOfTextAtSize('2101', 16) * .6, 'Redact: masks the first 8 digits and leaves the last 4 visible', spaced ? `${(spaced.w * 595).toFixed(1)}pt vs 8 digits ${want8.toFixed(1)}pt` : 'no box');
await p.fill('#pdf-redact .o-q', 'Asha'); await p.click('#pdf-redact .o-find');
check(/Marked 1 match/.test(await p.$eval('#pdf-redact .o-findn', e => e.textContent)), 'Redact: “Find and redact words” marks every match');
const rf = await save('pdf-redact');
if (rf) {
  const tx = await textOf(rf), all = tx.map(x => x.str).join(' ');
  check(!all.includes(AADHAAR.slice(0, 4)) && !/Asha/.test(all), 'Redact: the hidden text is gone from the saved PDF (not just covered)', all.slice(0, 80) || '(no text on redacted page)');
  const d = await PDFDocument.load(fs.readFileSync(rf));
  check(!d.getAuthor() && !d.getTitle(), 'Redact: document details are removed');
}
// photo of a document: draw a box by hand and check the pixels are black
await t.add('pdf-redact', ['canary.png']);
await p.waitForSelector('#pdf-redact .pe-page canvas', { timeout: 20000 });
const b = await pageBox('pdf-redact', 0);
await p.mouse.move(b.x + b.width * .2, b.y + b.height * .2); await p.mouse.down(); await p.mouse.move(b.x + b.width * .5, b.y + b.height * .5, { steps: 6 }); await p.mouse.up();
const pf = await save('pdf-redact');
if (pf) {
  const px = await p.evaluate(async d => { const im = new Image(); im.src = 'data:image/png;base64,' + d; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0);
    return [im.width, im.height, ...g.getImageData(im.width * .35 | 0, im.height * .35 | 0, 1, 1).data]; }, fs.readFileSync(pf).toString('base64'));
  check(path.extname(pf) === '.png' && px[0] === 640 && px[2] < 10 && px[3] < 10 && px[4] < 10, 'Redact: on a photo, the box is burned into the picture (same size and format)', px.join(','));
}

// ---------------- Exam photo & signature ----------------
const exam = async (preset, file, extra) => { await t.go('exam-photo'); await p.selectOption('#exam-photo .o-pre', preset); await p.dispatchEvent('#exam-photo .o-pre', 'change'); if (extra) await extra();
  await t.add('exam-photo', [file]); await p.waitForTimeout(300); const f = await save('exam-photo');
  if (!f) return null; const sz = fs.statSync(f).size; const dim = await p.evaluate(async d => { const im = new Image(); im.src = 'data:image/jpeg;base64,' + d; await im.decode(); return [im.width, im.height]; }, fs.readFileSync(f).toString('base64'));
  return { f, kb: sz / 1024, w: dim[0], h: dim[1] }; };
let r = await exam('bank-photo', 'canary.jpg');
check(r && r.w === 200 && r.h === 230 && r.kb >= 20 && r.kb <= 50 && path.basename(r.f) === 'photo.jpg', 'Exam: bank photo is 200×230 px and 20–50 KB', r && `${r.w}×${r.h}, ${r.kb.toFixed(1)} KB`);
r = await exam('bank-sign', 'canary.png');
check(r && r.w === 140 && r.h === 60 && r.kb >= 10 && r.kb <= 20, 'Exam: bank signature is 140×60 px and 10–20 KB (padded up if the picture is tiny)', r && `${r.w}×${r.h}, ${r.kb.toFixed(1)} KB`);
r = await exam('neet-post', 'canary.jpg');
check(r && r.w === 600 && r.h === 900 && r.kb >= 10 && r.kb <= 200, 'Exam: NEET postcard photo is 600×900 px within 10–200 KB', r && `${r.w}×${r.h}, ${r.kb.toFixed(1)} KB`);
r = await exam('bank-photo', 'canary.jpg', async () => { await p.click('#exam-photo label.chk:has(.o-nd)'); await p.fill('#exam-photo .o-name', 'ASHA RAO'); });
check(r && r.w === 200 && r.h === 230 && r.kb <= 50, 'Exam: name and date below the photo keep the exact size');
check(await p.$$eval('#exam-photo .xchk li.ok', e => e.length) === 3, 'Exam: the size check shows pixels, KB range and format');
await t.go('signature-resizer'); await p.waitForTimeout(300);
check(await p.$eval('#exam-photo .o-pre', s => s.value) === 'bank-sign', '/signature-resizer opens with the signature size chosen');

// ---------------- Compress PDF to a size ----------------
await t.go('compress-pdf-to-200kb'); await p.waitForTimeout(300);
check(await p.$eval('#pdf-compress [name=cp-mode][value=target]', e => e.checked) && await p.$eval('#pdf-compress .o-kb', e => e.value) === '200', '/compress-pdf-to-200kb opens with “Under a size limit” and 200 KB');
await t.add('pdf-compress', ['big.pdf']);
const cf = await save('pdf-compress');
check(cf && fs.statSync(cf).size <= 200 * 1000 && (await PDFDocument.load(fs.readFileSync(cf))).getPageCount() === 2, 'Compress: a 2.3 MB PDF comes out under 200 KB with every page', cf && `${(fs.statSync(cf).size / 1024).toFixed(0)} KB`);
await t.add('pdf-compress', ['canary.pdf']); await p.click('#pdf-compress [data-rm="0"]').catch(() => {});
const small = await save('pdf-compress');
check(small && /already under 200 KB|already optimized/.test(await t.result('pdf-compress')), 'Compress: a PDF that already fits is kept as it is');

// ---------------- quick open ----------------
await t.go('home'); await p.keyboard.press('/'); await p.keyboard.type('aadhaar'); await p.waitForTimeout(150);
check(/Mask Aadhaar|Redact/.test(await p.$eval('#cmdList', e => e.textContent)), 'Quick open finds the new tools (e.g. “aadhaar”)');
await p.keyboard.press('Escape');

// ---------------- privacy: nothing these tools touched left the browser ----------------
const sent = t.requests.filter(r => r.body && r.body.length);
const leaked = t.requests.filter(r => { const b = r.body ? r.body.toString('latin1') : ''; return b.includes('FUCANARY') || b.includes(AADHAAR) || b.includes('Asha') || r.url.includes(AADHAAR); });
check(!leaked.length && !sent.some(r => !/^https:\/\/app\.test\//.test(r.url)), 'Privacy: no request carried file contents, the Aadhaar number, names or signatures', `${t.requests.length} requests, ${sent.length} with a body`);

await t.close();
summary('sign, edit, redact, exam photo, compress to size');
