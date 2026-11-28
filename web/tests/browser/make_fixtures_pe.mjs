// Fixtures for Sign, Edit & fill and Redact: a fillable form, an Aadhaar letter (text layer), and a rotated page.
// Run: node tests/browser/make_fixtures_pe.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const req = createRequire(import.meta.url);
let L; try { L = req('pdf-lib'); } catch { L = req('/opt/npm-tools/node_modules/pdf-lib'); }
const { PDFDocument, StandardFonts, degrees, rgb } = L;
const FX = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

// Verhoeff check digit, as used by Aadhaar
const D = [[0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0]];
const P = [[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]];
const INV = [0,4,3,2,1,5,6,7,8,9];
const check = s => { let c = 0; [...s].reverse().forEach((d, i) => { c = D[c][P[(i + 1) % 8][+d]]; }); return INV[c]; };
export const AADHAAR = (b => b + check(b))('29876543210');   // 12 digits, valid check digit

const font = async d => d.embedFont(StandardFonts.Helvetica);
{ // fillable form
  const d = await PDFDocument.create(); const p = d.addPage([595, 842]); const f = await font(d); const form = d.getForm();
  p.drawText('Application form FUCANARY7f3a9q', { x: 50, y: 790, size: 18, font: f });
  p.drawText('Full name', { x: 50, y: 730, size: 11, font: f });
  const name = form.createTextField('applicant.full_name'); name.addToPage(p, { x: 150, y: 720, width: 300, height: 22 });
  p.drawText('City', { x: 50, y: 690, size: 11, font: f });
  const city = form.createDropdown('applicant.city'); city.addOptions(['Bengaluru', 'Kalaburagi', 'Mysuru']); city.addToPage(p, { x: 150, y: 680, width: 200, height: 22 });
  p.drawText('I agree', { x: 50, y: 650, size: 11, font: f });
  const ok = form.createCheckBox('applicant.agree'); ok.addToPage(p, { x: 150, y: 645, width: 16, height: 16 });
  fs.writeFileSync(path.join(FX, 'form.pdf'), await d.save());
}
{ // Aadhaar letter: number printed in the usual 4-4-4 format, plus an unrelated 12-digit invoice number that must NOT be masked
  const d = await PDFDocument.create(); const p = d.addPage([595, 842]); const f = await font(d);
  p.drawText('Unique Identification Authority of India', { x: 50, y: 780, size: 14, font: f });
  p.drawText('Name: Asha Rao', { x: 50, y: 740, size: 12, font: f });
  p.drawText('Your Aadhaar No.:', { x: 50, y: 700, size: 12, font: f });
  p.drawText(AADHAAR.replace(/(\d{4})(?=\d)/g, '$1 '), { x: 170, y: 700, size: 16, font: f });
  p.drawText('Invoice 123456789012', { x: 50, y: 660, size: 12, font: f });
  p.drawText('Also written as ' + AADHAAR + ' in one block.', { x: 50, y: 620, size: 12, font: f });
  fs.writeFileSync(path.join(FX, 'aadhaar.pdf'), await d.save());
}
{ // a portrait page stored with /Rotate 90 (it displays as landscape)
  const d = await PDFDocument.create(); const p = d.addPage([595, 842]); const f = await font(d);
  p.drawText('Rotated page', { x: 50, y: 790, size: 18, font: f }); p.setRotation(degrees(90));
  d.addPage([595, 842]).drawText('Second page', { x: 50, y: 790, size: 18, font: f });
  fs.writeFileSync(path.join(FX, 'rotated.pdf'), await d.save());
}
console.log('fixtures written; Aadhaar', AADHAAR);
