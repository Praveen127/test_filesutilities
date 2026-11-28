// FIXES FROM THE AUTOQA RUN OF 27 NOVEMBER 2026 — bad input must be refused clearly, never misreported or used.
import path from 'node:path';
import { open, FX, check, summary } from './lib.mjs';
const BAD_PDF = { name: 'corrupt.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nthis is not really a pdf\n') };
const XYZ = { name: 'notes.xyz', mimeType: 'application/octet-stream', buffer: Buffer.from('this format is not supported by any tool\n') };
const LOCKED = path.join(FX, 'locked-open2026.pdf');           // password Open#2026
const said = p => p.evaluate(() => [...document.querySelectorAll('[role=status],[role=alert],.msg,.errc')]
  .filter(e => e.getClientRects().length && e.innerText.trim()).map(e => e.innerText.trim()).join(' | '));

const t = await open({ viewport: { width: 1366, height: 900 } }); const p = t.page;
const go = async u => { await p.goto('https://app.test' + u); await p.waitForTimeout(350); };

// 1. Unlock PDF
await go('/unlock-pdf'); await p.setInputFiles('#pdf-unlock .drop input', BAD_PDF); await p.click('#pdf-unlock button.run'); await p.waitForTimeout(1500);
let s = await said(p);
check(/damaged or isn’t a PDF/.test(s) && !/isn’t password-protected/.test(s), 'Unlock: a damaged file is called damaged, not "isn’t password-protected"', s);
await go('/unlock-pdf'); await p.setInputFiles('#pdf-unlock .drop input', path.join(FX, 'canary.pdf')); await p.click('#pdf-unlock button.run'); await p.waitForTimeout(1500);
check(/isn’t password-protected/.test(await said(p)), 'Unlock: a normal PDF still says it isn’t password-protected');

// 2. Word count: plain-language, announced errors
await go('/word-counter'); await p.setInputFiles('#doc-stats .drop input', BAD_PDF); await p.click('#doc-stats button.run'); await p.waitForTimeout(1500);
check(/corrupt\.pdf: This file can’t be opened — it’s damaged or isn’t a PDF/.test(await said(p)), 'Word count: a damaged PDF gets a plain message that screen readers announce');
await go('/word-counter'); await p.setInputFiles('#doc-stats .drop input', LOCKED); await p.click('#doc-stats button.run'); await p.waitForTimeout(1500);
s = await said(p);
check(/password-protected — unlock it first/.test(s) && !/No password given/.test(s), 'Word count: a locked PDF says to unlock it first (not "No password given")', s);

// 3. File comparison
await go('/file-comparison'); await p.setInputFiles('#fA', BAD_PDF); await p.waitForTimeout(800); await p.setInputFiles('#fB', path.join(FX, 'canary.pdf')); await p.waitForTimeout(1500);
await p.click('#cmp'); await p.waitForTimeout(400);
check(/corrupt\.pdf couldn’t be read/.test(await p.$eval('#dmsg', e => e.hidden ? '' : e.textContent)) && await p.$eval('#ta', e => e.value === '') &&
  await p.$eval('#dout', e => e.innerText.trim() === ''), 'Compare: an unreadable file empties its side, says so, and nothing is compared — even after the other file loads');
await p.fill('#ta', 'Fileutilo sample'); await p.click('#cmp'); await p.waitForTimeout(400);
check(await p.$eval('#dmsg', e => e.hidden) && await p.$eval('#dout', e => e.innerText.trim().length > 0), 'Compare: typing text for that side clears the message and compares again');

// 4. Table cleaner
await go('/csv-cleaner'); const rows0 = await p.$eval('#table-clean .o-st', e => e.textContent);
await p.setInputFiles('#table-clean input[aria-label="Open a CSV or Excel file"]', XYZ); await p.waitForTimeout(500);
check(/notes\.xyz isn’t a CSV or Excel file/.test(await said(p)) && await p.$eval('#table-clean .o-st', e => e.textContent) === rows0, 'Table cleaner: a .xyz file is refused with a message, not opened as CSV');

// 5. Data converter
await go('/data-converter'); await p.fill('#data-convert textarea[aria-label="Input"]', '{"name": "Alice", age: }'); await p.waitForTimeout(700);
s = await p.$eval('#data-convert .o-info', e => e.textContent);
check(/^Couldn’t convert — .*invalid JSON/.test(s), 'Data converter: the status line reports invalid JSON instead of "Read as JSON"', s);
await p.fill('#data-convert textarea[aria-label="Input"]', '{"name": "Alice", "age": 3}'); await p.waitForTimeout(700);
check(await p.$eval('#data-convert .o-info', e => e.textContent) === 'Read as JSON', 'Data converter: valid JSON still says "Read as JSON"');
check(t.errors.length === 0, 'No page errors', t.errors.join(' | '));
await t.close();
summary('AutoQA fixes (27 Nov)');
