// One driver per tool: opens the tool, feeds it the CANARY fixtures and runs it to completion.
// `libs` lists the CDN libraries the run needs, so a local test run can skip tools whose library isn't installed.
import path from 'node:path';
import { FX } from './lib.mjs';

const fx = n => path.join(FX, n);
const doneJobs = page => page.waitForFunction(() => { const li = [...document.querySelectorAll('#jobs li[data-id]')];
  return li.length && li.every(l => l.querySelector('.st.okk,.st.err,.st.wait')); }, null, { timeout: 90000 });
const settle = page => page.waitForTimeout(700);

export const DRIVERS = [
  { id: 'convert', libs: ['PDFLib', 'JSZip', 'pdfjsLib'], async run(t) {
      await t.go('convert'); await t.page.setInputFiles('#cfile', ['canary.txt', 'canary.html', 'canary.pdf'].map(fx));
      await t.page.click('.chip[data-f="docx"]'); await doneJobs(t.page);
      return t.page.$eval('#jobs', e => e.innerText.replace(/\s+/g, ' ')); } },
  { id: 'pdf-merge', libs: ['PDFLib'], async run(t) { await t.go('pdf-merge'); await t.add('pdf-merge', ['canary.pdf', 'canary.pdf']); await t.run('pdf-merge'); return t.result('pdf-merge'); } },
  { id: 'pdf-split', libs: ['PDFLib'], async run(t) { await t.go('pdf-split'); await t.add('pdf-split', ['canary.pdf']); await t.page.fill('#pdf-split .o-ranges', '1, 3'); await t.run('pdf-split'); return t.result('pdf-split'); } },
  { id: 'pdf-organize', libs: ['PDFLib', 'pdfjsLib'], async run(t) { await t.go('pdf-organize'); await t.add('pdf-organize', ['canary.pdf']);
      await t.page.waitForFunction(() => document.querySelectorAll('#pdf-organize .thumb canvas').length === 3, null, { timeout: 30000 }); await t.run('pdf-organize'); return t.result('pdf-organize'); } },
  { id: 'pdf-compress', libs: ['PDFLib'], async run(t) { await t.go('pdf-compress'); await t.add('pdf-compress', ['canary.pdf']); await t.run('pdf-compress'); return t.result('pdf-compress'); } },
  { id: 'pdf-protect', libs: ['PDFLib'], async run(t) { await t.go('pdf-protect'); await t.add('pdf-protect', ['canary.pdf']);
      await t.page.fill('#pdf-protect .o-pw', 'secret-pass'); await t.page.fill('#pdf-protect .o-pw2', 'secret-pass'); await t.run('pdf-protect'); return t.result('pdf-protect'); } },
  { id: 'pdf-unlock', libs: ['PDFLib'], async run(t) { await t.go('pdf-unlock'); await t.add('pdf-unlock', ['canary-locked.pdf']); await t.page.fill('#pdf-unlock .o-pw', 'user1'); await t.run('pdf-unlock'); return t.result('pdf-unlock'); } },
  { id: 'pdf-stamp', libs: ['PDFLib'], async run(t) { await t.go('pdf-stamp'); await t.add('pdf-stamp', ['canary.pdf']); await t.run('pdf-stamp'); return t.result('pdf-stamp'); } },
  { id: 'pdf-ocr', libs: ['Tesseract', 'PDFLib'], async run(t) { await t.go('pdf-ocr'); await t.add('pdf-ocr', ['canary.png']); await t.run('pdf-ocr', 240000); return t.result('pdf-ocr'); } },
  { id: 'pdf-to-img', libs: ['pdfjsLib'], async run(t) { await t.go('pdf-to-img'); await t.add('pdf-to-img', ['canary.pdf']); await t.run('pdf-to-img'); return t.result('pdf-to-img'); } },
  { id: 'img-to-pdf', libs: ['PDFLib'], async run(t) { await t.go('img-to-pdf'); await t.add('img-to-pdf', ['canary.png', 'canary.jpg']); await t.run('img-to-pdf'); return t.result('img-to-pdf'); } },
  { id: 'img-convert', libs: [], async run(t) { await t.go('img-convert'); await t.add('img-convert', ['canary.png', 'canary.jpg']); await t.page.selectOption('#img-convert .o-f', 'webp'); await t.run('img-convert'); return t.result('img-convert'); } },
  { id: 'img-resize', libs: [], async run(t) { await t.go('img-resize'); await t.add('img-resize', ['canary.jpg']); await t.page.click('#img-resize [data-p="50"]'); await t.run('img-resize'); return t.result('img-resize'); } },
  { id: 'json', libs: [], async run(t) { await t.go('json'); await t.page.setInputFiles('#jfile', fx('canary.json')); await settle(t.page); await t.page.click('#jvTree'); await settle(t.page); return t.page.textContent('#jstats'); } },
  { id: 'json-compare', libs: [], async run(t) { await t.go('json-compare'); await t.page.setInputFiles('#json-compare .ja-file', fx('canary.json')); await t.page.setInputFiles('#json-compare .jb-file', fx('canary-b.json'));
      await t.page.click('#json-compare .o-go'); await settle(t.page); return t.page.$eval('#json-compare .jcres', e => e.innerText.replace(/\s+/g, ' ').slice(0, 120)); } },
  { id: 'json-query', libs: [], async run(t) { await t.go('json-query'); await t.page.setInputFiles('#json-query .jq-file', fx('canary.json')); await t.page.fill('#json-query .o-path', '$..price'); await settle(t.page);
      return t.page.$eval('#json-query .o-res', e => e.innerText.replace(/\s+/g, ' ').slice(0, 120)); } },
  { id: 'data-convert', libs: ['jsyaml'], async run(t) { await t.go('data-convert'); await t.page.setInputFiles('#data-convert .dc-file', fx('canary.csv')); await t.page.selectOption('#data-convert .o-to', 'yaml'); await settle(t.page);
      return (await t.page.inputValue('#data-convert .dco')).slice(0, 120); } },
  { id: 'table-clean', libs: [], async run(t) { await t.go('table-clean'); await t.page.setInputFiles('#table-clean .o-f', fx('canary.csv')); await settle(t.page);
      await t.page.click('#table-clean [data-op="dedupe"]'); await settle(t.page); return t.page.textContent('#table-clean .o-st'); } },
  { id: 'hash', libs: [], async run(t) { await t.go('hash'); await t.page.fill('#hash .o-bt', 'Kalaburagi FUCANARY7f3a9q'); await t.page.setInputFiles('#hash .o-hf', fx('canary.pdf')); await t.page.waitForTimeout(1500);
      return t.page.$eval('#hash', e => e.innerText.replace(/\s+/g, ' ').slice(0, 160)); } },
  { id: 'word-merge', libs: ['JSZip'], async run(t) { await t.go('word-merge'); await t.add('word-merge', ['canary.docx', 'canary2.docx']); await t.run('word-merge'); return t.result('word-merge'); } },
  { id: 'excel-combine', libs: ['XLSX'], async run(t) { await t.go('excel-combine'); await t.add('excel-combine', ['canary.xlsx', 'canary2.xlsx']); await t.run('excel-combine'); return t.result('excel-combine'); } },
  { id: 'find-replace', libs: ['JSZip'], async run(t) { await t.go('find-replace'); await t.add('find-replace', ['canary.docx', 'canary.txt']);
      await t.page.fill('#find-replace .o-f', 'Kalaburagi'); await t.page.fill('#find-replace .o-r', 'Gulbarga'); await t.run('find-replace'); return t.result('find-replace'); } },
  { id: 'doc-stats', libs: ['JSZip', 'pdfjsLib'], async run(t) { await t.go('doc-stats'); await t.add('doc-stats', ['canary.docx', 'canary.pdf']); await t.run('doc-stats');
      return t.page.$eval('#doc-stats .tout', e => e.innerText.replace(/\s+/g, ' ').slice(0, 160)); } },
  { id: 'metadata', libs: ['PDFLib', 'JSZip'], async run(t) { await t.go('metadata'); await t.add('metadata', ['canary.docx', 'canary.pdf', 'canary.jpg', 'canary.png']); await t.run('metadata'); return t.result('metadata'); } },
  { id: 'diff', libs: [], async run(t) { await t.go('diff'); await t.page.setInputFiles('#fA', fx('canary.txt')); await t.page.setInputFiles('#fB', fx('canary-b.txt')); await t.page.waitForTimeout(1200);
      return t.page.textContent('#dstats'); } },
  { id: 'zip-create', libs: ['JSZip'], async run(t) { await t.go('zip-create'); await t.add('zip-create', ['canary.txt', 'canary.png', 'canary.pdf']); await t.run('zip-create'); return t.result('zip-create'); } },
  { id: 'zip-open', libs: ['JSZip'], async run(t) { await t.go('zip-open'); await t.add('zip-open', ['canary.zip']); await t.page.waitForSelector('#zip-open .zrow', { timeout: 30000 });
      return t.page.$eval('#zip-open', e => e.innerText.replace(/\s+/g, ' ').slice(0, 160)); } },
  // Fileutilo 15: PowerPoint tools
  { id: 'pdf-to-ppt', libs: ['pdfjsLib', 'PptxGenJS', 'JSZip'], async run(t) { await t.go('pdf-to-ppt'); await t.add('pdf-to-ppt', ['canary.pdf']); await t.run('pdf-to-ppt'); return t.result('pdf-to-ppt'); } },
  { id: 'ppt-compress', libs: ['JSZip'], async run(t) { await t.go('ppt-compress'); await t.add('ppt-compress', ['canary-deck.pptx']); await t.run('ppt-compress'); return t.result('ppt-compress'); } },
  { id: 'ppt-to-img', libs: ['JSZip'], async run(t) { await t.go('ppt-to-img'); await t.add('ppt-to-img', ['canary-deck.pptx']); await t.run('ppt-to-img'); return t.result('ppt-to-img'); } },
  { id: 'ppt-images', libs: ['JSZip'], async run(t) { await t.go('ppt-images'); await t.add('ppt-images', ['canary-deck.pptx']); await t.run('ppt-images'); return t.result('ppt-images'); } },
  { id: 'ppt-merge', libs: ['JSZip'], async run(t) { await t.go('ppt-merge'); await t.add('ppt-merge', ['canary.pptx', 'canary-deck.pptx']); await t.run('ppt-merge'); return t.result('ppt-merge'); } },
  { id: 'ppt-text', libs: ['JSZip'], async run(t) { await t.go('ppt-text'); await t.add('ppt-text', ['canary-deck.pptx']); await t.run('ppt-text'); return t.result('ppt-text'); } },
];
