# Browser tests

Automated checks for the Fileutilo web app (`web/index.html`), run in a real Chromium browser with Playwright.

| Suite | File | What it proves |
|---|---|---|
| Privacy | `privacy.test.mjs` | Runs all 37 tools (33 drivers; the JSON, data and text tools share drivers) on files containing a unique marker, records every network request, and fails if any request carries file content or names, uploads anything, or goes to an unexpected host. With accounts on, Supabase only receives usage counters. |
| Library failures | `deps.test.mjs` | Blocks, slows and partly blocks the library CDNs, then checks every tool shows a clear message, recovers when you try again, falls back to unpkg.com, gives up after a time limit, and detects offline. |
| Formats | `formats.test.mjs` + `validate_formats.py` | Converts each sample into every output format and runs the PDF, image and document tools. Each result is checked by independent software (qpdf, pdftotext, pypdf, python-docx, odfpy, python-pptx, openpyxl, Pillow, LibreOffice) for validity, text, headings, lists, tables and tool-specific promises. Results are compared with `baselines/formats.json`. |
| Mobile | `mobile.test.mjs` | Emulates iPhone SE, iPhone 13 (portrait and landscape), Pixel 7, Galaxy S9+ and iPad Mini. Checks for sideways scrolling, tap-target size, text size and clipped labels on every tool screen, and runs tools, the converter and sign-in by touch. Screenshots go to `out/mobile/`. |
| Accessibility | `a11y.test.mjs` | WCAG 2.2 AA rule checks on every screen (names, labels, alt text, IDs, headings, contrast in light and dark mode, live regions, progress bars). Also keyboard-only flows (skip link, focus ring, pick → run → download, dialogs, reordering, page thumbnails) and the screen-reader accessibility tree. |
| PowerPoint | `ppt.test.mjs` + `validate_ppt.py` | Runs PDF to PowerPoint, Compress, PowerPoint to JPG, Extract images, Merge and Text & notes. Every result is opened with python-pptx, every internal reference and content type is checked, LibreOffice renders it, and the 9 new task pages open the right tool and setting. Fixtures: `python make_fixtures_ppt.py`. |
| Home page | `home.test.mjs` | Search (typing, arrows, Enter, Escape), the global and India popular tasks, all tiles in the seven job groups, stars and favourites, signed-in vs signed-out views, footer, header, and the phone layout. |
| Google Drive | `drive.test.mjs` | With a stand-in for Google: buttons hidden until set up, nothing loads from Google before a click, picking files into Merge and the Document converter, Google Docs opened as Word, cancel and refused sign-in, saving a result to Drive, and the phone layout. |
| AutoQA fixes | `qa16.test.mjs` | Bad input is refused clearly: Unlock PDF on a damaged file, Word count on damaged and locked PDFs, File comparison with an unreadable file, Table cleaner with a non-spreadsheet file, Data converter with invalid JSON. |
| Libraries from fileutilo.com | `vendor.test.mjs` | Libraries load from `web/vendor/` first; tools still work when the CDNs are blocked; no vendored files, a missing file or a silent manifest fall back to the CDNs; the message when everything fails; Supabase pinned; SheetJS 0.20.3. |
| Accounts | `accounts.test.mjs` | Sign-in, limits, credits, Razorpay checkout, subscriptions and the account panel, against recording mocks. |

## Running

```bash
npm install                     # installs Playwright
npx playwright install chromium
pip install pypdf python-docx odfpy python-pptx openpyxl pillow lxml   # for the format checks
# also needed on PATH: LibreOffice (soffice), qpdf, poppler-utils (pdftotext, pdfimages)

npm run test:fixtures           # creates the sample files (once)
npm run test:browser:online     # everything, with the real CDNs (recommended)
node tests\browser\run-all.mjs --online formats deps   # only some suites, with the real CDNs
npm run test:browser            # offline: libraries come from node_modules; tools needing missing ones are skipped
node tests/browser/run-all.mjs privacy a11y    # just some suites
```

After an intentional change to conversion output, refresh the baseline with
`UPDATE_BASELINE=1 node tests/browser/formats.test.mjs`.

## Manual screen-reader check (about 20 minutes, before each release)

Automated tests check what screen readers are given. A person still needs to listen once. Use **NVDA + Firefox or Chrome** on Windows, **VoiceOver + Safari** on Mac/iPhone, and **TalkBack + Chrome** on Android.

1. Load the home page. The page title and the main heading are read. **Tab** once: "Skip to content" is announced. Press Enter: you land on the tool.
2. Move through the category menu. Each item reads its name, and the current one says "current".
3. Open **Merge PDFs**. The drop zone reads as a file button ("Choose files"). Pick two PDFs. The list reads each file name, and the Move up / Move down / Remove buttons name the file.
4. Press **Merge**. Progress is announced (or readable as a progress bar), then the result with its Download button. Download works with Enter or Space.
5. In the **converter**, add a file and choose a format. You should hear "<file>: PDF ready" without moving focus.
6. Open **Sign in**. It is announced as a dialog with its title. Tab stays inside it, and Escape closes it and returns to the Sign in button.
7. Trigger an error (for example, protect a PDF with mismatched passwords). The error is read out automatically.
8. Switch the OS to **dark mode** and **200 % zoom**: nothing overlaps and everything stays readable.
9. On a phone, use the screen reader's swipe navigation through **Pricing**. Each plan's price and button is read in order.
