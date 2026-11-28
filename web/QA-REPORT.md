# Fileutilo — QA fixes, 22 November 2026

All six review items are addressed in `web/index.html`, and each one now has an automated test suite in
`tests/browser/` (see its README for how to run them).

| # | Item | Status | Evidence |
|---|---|---|---|
| P1 | Tool count said 26 | **Fixed** — 27 tools; the number is now computed from the code | hero, badge, pricing and meta description |
| P1 | Privacy claim not verified | **Verified** with network capture; no fixes needed | `privacy.test.mjs` — 32 passed |
| P2 | External library dependency | **Fixed** — backup CDN, time limit, clear messages, retry | `deps.test.mjs` — 39 passed |
| P2 | Conversion quality unknown | **Tested**, 2 bugs found and fixed | `formats.test.mjs` — 98 checks + 75 baseline comparisons passed |
| P2 | Mobile behaviour unknown | **Tested**, 3 issues found and fixed | `mobile.test.mjs` — 60 passed on 6 devices |
| P2 | Accessibility | **Tested**, 9 issues found and fixed | `a11y.test.mjs` — 34 passed |

## P1 · Tool count
The app has 27 tools: Convert 1, PDF 10, Images 2, Data 6, Documents 5, Compare 1, Archive 2.
"Remove metadata" had not been counted. The page now works the number out from the list of tools, so it can't drift again.

## P1 · Privacy — "files never leave your device"
Each of the 27 tools ran on sample files containing a unique marker, while every request the browser made was
recorded. Results:
- No request contained the marker (as text, base64, URL-encoded or UTF-16) or a file name.
- Without accounts, **zero requests had a body**. Every request was a `GET` to the site, cdn.jsdelivr.net, unpkg.com or Google Fonts.
- With accounts on, the only data sent to Supabase per task is: tool name, number of files, size of the largest file in MB, OCR page count.

**Not covered:** OCR (Tesseract) also downloads language data from tessdata.projectnaptha.com. That host is on the
allowed list, but the run needs internet, so it's checked by `npm run test:browser:online`.

## P2 · Library failures
Previously, a failed download meant one generic error, and some tools got stuck. Now:
- **Backup CDN.** Every library loads from cdn.jsdelivr.net, then unpkg.com. The pdf.js worker follows whichever CDN worked.
- **Time limit.** Each attempt stops after 30 seconds, so a stalled download can't hang a tool forever.
- **Clear messages.** The message names what failed (for example "Couldn’t download the PDF reader…"), says whether the device is offline, and makes clear the files are still there.
- **Retry.** The Run button comes back, and running again works once the network returns. The converter shows a **Try again** button per file.
- **Bug fixed:** *Organize pages* said "All pages are deleted" after a failed load. It now reloads the PDF when you press Save.
- Errors in background tasks now show a message instead of failing silently.

**Remaining limitations:**
- With accounts on, a task is counted before the library loads. A run that fails to download still uses one of the day's tasks.
- OCR's own internal downloads (worker, language data) don't use the backup CDN.

## P2 · Format regression
Each sample (TXT, HTML, PDF, ODT, RTF, PPTX; DOCX/DOC/XLSX/ODS/CSV in online mode) was converted to every output format.
The PDF, image and document tools were also run. Every result was then opened by independent software. The checks
cover: valid file, every expected phrase present, headings, lists, tables, page and slide counts, LibreOffice can
open it, and the text is visible when rendered.

Bugs found and fixed:
1. **Word export wrote invalid table XML.** An operator-precedence slip made the column grid malformed for every table with 2 or more columns. Word is strict about this; LibreOffice tolerated it.
2. **Lists in Word and ODT exports were fake.** They were "•" characters typed into paragraphs. They are now real Word/ODF lists, so they renumber and re-indent when edited.

Measurements are saved in `tests/browser/baselines/formats.json`. A later change that loses words, headings, lists or tables fails the test.

## P2 · Mobile
Tested on iPhone SE, iPhone 13 (portrait and landscape), Pixel 7, Galaxy S9+ and iPad Mini, across all 31 screens.

Fixed:
- **Tap targets.** Only 57 % of buttons met the 44 × 44 px touch size; on touch screens all now do. Sliders were 16 px tall and are now 44 px.
- **Clipped labels.** On narrow phones the format tiles cut off "DOCX", "XLSX", "PPTX" and "HTML". The grid now uses 3 columns there.
- **Small footer links.** They were 16 px tall and now have touch-size padding.

Verified: no sideways scrolling anywhere, and merging PDFs, converting and signing in all work by touch.

## P2 · Accessibility (WCAG 2.2 AA)
Fixed:
1. **Skip link.** Added a "Skip to content" link.
2. **Labels.** 17 form fields had no label (JSON, compare, data, hash and diff boxes, plus hidden file inputs).
3. **Decorative icons.** Decorative SVG icons (77 instances across the screens) are now hidden from screen readers.
4. **Heading order.** Converter headings skipped from h2 to h4.
5. **Contrast.** Five format colours and the white-on-coral badges failed. So did the diff colours in dark mode.
6. **Announced messages.** Converter and JSON messages weren't announced. Converter results are now announced ("file: PDF ready").
7. **Progress.** Progress bars are now exposed as progress bars with a percentage.
8. **Results.** Tool results are now announced when a task finishes.
9. **Button names.** File-list buttons now name the file ("Remove report.pdf").

Verified with the keyboard only: focus ring on every stop; pick → run → download; reordering files; page
thumbnails; the category menu; the sign-in dialog (focus stays inside, Escape returns focus). The screen-reader
accessibility tree gives every control a name.

**Still needs a person:** listening with real screen readers (NVDA, VoiceOver, TalkBack). There's a 20-minute checklist in `tests/browser/README.md`.

## Test coverage limits in this run
The test machine had no internet, so libraries came from local copies. Mammoth (DOCX reading), SheetJS (Excel) and
Tesseract (OCR) weren't available. That leaves 17 conversions plus the Excel-combine and OCR runs to be covered by
`npm run test:browser:online` on a machine with internet.
