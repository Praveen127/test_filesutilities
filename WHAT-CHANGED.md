# Fileutilo — sign, fill, redact and exam-ready files (25 November 2026)

## Upload
As before (SETUP.md, Part F): upload `site-navy` (or `site-green`) in two rounds — about 63 top-level files, then the
`about` and `media` folders (about 84 files). Nothing to delete this time: all old addresses still work. Then, in Search
Console, request indexing for the 8 new pages listed in Part J.

## New tools (31 in all)
- **Sign PDF** (`/sign-pdf`) — draw, type or upload a signature (the paper background is removed automatically), place it
  anywhere, resize it, add initials, the date or any text, and copy it to every page. Signatures can be remembered in
  this browser only. It's an image signature, not a certificate-based DSC — the page says so.
- **Edit & fill PDF** (`/edit-pdf`) — fillable form fields are listed beside the page (text, tick boxes, drop-downs,
  options), with an optional Flatten. On any PDF: add text, ticks, crosses, dates and white-out. Hindi, Kannada and
  other scripts work when typed on the page.
- **Redact PDF & mask Aadhaar** (`/redact-pdf`) — drag boxes, find-and-redact words, or **Find Aadhaar numbers**:
  12-digit numbers in Aadhaar format are found (checked with the Aadhaar check digit) and the first 8 digits covered,
  XXXX XXXX 1234. Scans and photos are read with OCR; QR codes are covered where the browser can read them. Redacted
  pages are rebuilt as images, so the hidden text is really gone, and document details are removed. Works on JPG/PNG too.
- **Exam photo & signature resizer** (`/exam-photo-resizer`) — presets for bank exams (IBPS, SBI, RBI, RRB), SSC, UPSC,
  NEET UG, JEE Main, passport-size photos and a custom size. Crop, optional paper clean-up for signatures, optional
  name and date below the photo; the JPG comes out at the exact pixels and inside the KB range, with a size check.
  **Free with no daily limit** (marked "No limit"), as a traffic builder.
- **Compress PDF → "Under a size limit"** — type a maximum (100 KB, 200 KB, 1 MB…). A PDF that already fits is kept
  unchanged; otherwise light clean-up first, then the best image quality that fits.

## New task pages (12 in all)
`/compress-pdf-to-200kb`, `/fill-pdf-form`, `/mask-aadhaar`, `/signature-resizer` — each with its own steps,
screenshot, FAQs and preset. Sitemap: 48 pages.

## Worth knowing
- Exam sizes follow the 2025–26 notifications. Where sources disagreed (NEET and JEE signature limits), the preset uses
  the range that satisfies all of them. Rules change every cycle, so re-check presets when new notifications come out:
  they're in `EXAM_PRESETS` in `web/index.html`.
- Some forms now take a live webcam photo instead of an upload (SSC CGL/CHSL, UPSC); the page mentions this.

## Tests
Payment functions 25/25 · privacy 33 · library failures 39 · formats 234 · mobile 60 · accessibility 34 · accounts 29
· SEO & pages 34 (both themes) · return features 34 · **new tools 36** (both themes; includes exact placement on a rotated
page, form values read back with pdf-lib, Aadhaar digits removed from the saved file, exact px/KB, and no data leaving
the browser).

---

# Fileutilo — reasons to come back (25 November 2026)

Everything below stays in the visitor's browser. No account needed, nothing sent to a server.

## Upload
Same as the previous round (SETUP.md, Part F): upload `site-navy` (or `site-green`) in two rounds. There is one new
top-level file, `sw.js`, which makes the app work offline; it must sit next to `index.html`.

## What's new
- **Installable app.** Chrome and Edge show an install icon in the address bar, and the footer shows **⤓ Install app**.
  On Android it's **Add to Home screen**, on iPhone **Share → Add to Home Screen**. The installed app opens in its own
  window and has shortcuts (right-click / long-press the icon) for Merge PDF, Compress PDF, Document converter and
  Image compressor.
- **Offline use.** After the first visit, the pages work without a connection. Tools keep working offline once their
  code has been used at least once (for example, OCR after its first run). A new upload replaces the offline copy
  automatically on the visitor's next visit.
- **Favourites.** A ☆ Favourite button under each tool's name. Favourites show on the home page and at the top of
  the quick-open list.
- **Recent activity.** The home page section **Pick up where you left off** lists the last 6 runs (it keeps up to 20): the tool, the
  number of files, the output name, and when. It records names only, never file contents. Visitors can **Clear**
  the list or switch it off with **Don’t keep recent activity on this device**.
- **Keyboard shortcuts.** `/` or `Ctrl+K` find a tool · `O` choose files · `Ctrl+Enter` run · `F` favourite ·
  `H` home · `?` show the list · `Esc` close. They don't fire while the visitor is typing in a box. The footer
  links to both **Find a tool** and **Keyboard shortcuts**.
- **Preview before download.** Every result has a **Preview** button: PDFs show the first 5 pages, images show
  the picture, and text/JSON/CSV show the start of the file.
- **Batch:** most tools already take many files at once. Split PDF, Organize pages and Open ZIP work on one file
  at a time because that's what the task is.
- Privacy policy (Cookies and storage) updated to mention favourites, recent activity and the offline copy.

## Not in this round
The workflow builder (chaining tools, e.g. merge → compress → protect) is left for a later round.

## Tests
Payment functions 25/25 · privacy 33 · library failures 39 · formats 234 · mobile 60 · accessibility 34 (both
themes) · accounts 29 · SEO & pages 34 (both themes) · return features 34 (both themes, including install and offline).

---

# Fileutilo — search-ready tool pages (25 November 2026)

## Upload
Pick one theme folder — `site-navy` or `site-green` — and upload it in two rounds (GitHub's web upload takes
100 files at a time): first all files at the top level, then the `about` and `media` folders. Then delete the
earlier tool pages with the old addresses. Step by step: SETUP.md, Part F. Then submit the sitemap: Part J.

## What's new
- **Task-named addresses** for all 27 tools: /merge-pdf, /compress-pdf, /image-compressor, /json-formatter,
  /file-comparison, /zip-extractor … Old addresses (/pdf-merge, /#pdf-merge) still work and redirect.
- **8 task pages** that open a tool already set up for the job: /word-to-pdf, /pdf-to-word, /excel-to-pdf,
  /powerpoint-to-pdf, /excel-to-csv, /csv-to-json, /heic-to-jpg, /webp-to-jpg. Deliberately few — each one is a
  real task with its own steps, formats, limits and FAQs, not a near-copy.
- **Every tool and task page** now has: a unique title and description; the working tool at the top; how-it-works
  steps with a real screenshot (descriptive alt text); supported formats and honest limitations; FAQs; four
  related tools; and a clear free-to-Pro path.
- **Structured data:** WebApplication (with screenshot), BreadcrumbList and FAQPage on every tool page; canonical
  URLs; sitemap with 40 pages; permanent redirects for old addresses on Vercel.
- **Mobile:** tool pages use a compact header so the tool is on the first screen of a phone; inline code and styles
  are minified. Measured on a simulated mid-range phone with slow 4G: pages appear in about 1.6–1.7 s, no layout shift.
- **Pro wording:** "No limit on batch or file size" is now "No Fileutilo caps … your device's memory still applies",
  with a note on the pricing page and each tool page.
- The home address always shows the home page (it used to reopen the last tool).

## Tests
Payment functions 25/25 · privacy 33 · library failures 39 · formats 234 · mobile 60 · accessibility 34 (both themes)
· accounts 29 · SEO & pages 34 (both themes) · sub-folder (GitHub Pages) check · mobile load check (`npm run perf`).
