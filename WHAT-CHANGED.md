# Fileutilo 15 — new home page and PowerPoint tools (27 November 2026)

Upload the same way (SETUP.md, Part F): `site-navy` in two rounds — 79 top-level files, then the
`about` and `media` folders (105 files). Nothing to delete, no Supabase or Razorpay changes. Then, in Search Console,
submit the sitemap again and request indexing for the new pages (SETUP.md, Part J).

## New home page (design 11)
- **Look:** the finalized design 11 — light warm page, white header bar, black headline in Outfit, outlined search box,
  white task chips, Recently used / Favourites cards with tiles, pastel tiles per job, and a dark footer on every page.
  Tool pages keep their compact header so the tool stays above the fold.
- **Header:** All tools · Pricing · Privacy · Sign in (on phones: Sign in; the rest is in the footer).
- **Headline** “Your files. Your device. Your control.” with a new line: “…free to start, and your files never leave your device.”
- **Tool search** right under the headline: type a task or a format (“compress”, “pptx”, “50 kb”), use the arrow keys,
  press Enter to open the tool. It searches all tools and task pages.
- **Popular tasks** — 12 links, each conversion next to its reverse. Visitors whose browser is set to India (time zone
  or language) see an India list with *Compress PDF to 200 KB*, *Compress photo to 50 KB*, *Passport size photo* and
  *Mask Aadhaar*; everyone else sees the global list with *Edit PDF*, *Sign PDF* and *HEIC to JPG*.
- **Recently used and Favourites** for signed-in users (“Pick up where you left off”). Signed-out visitors see a short
  “Sign in to keep your recently used and favourite tools one click away” prompt instead. The lists are still kept only
  in the visitor’s browser, never on our servers. On a copy without accounts (preview), everyone sees them.
- **All tools grouped by job** — Combine · Make smaller · Protect & keep private · Convert · PowerPoint & slides ·
  Edit & organize · Read, check & compare — 37 tools plus the PowerPoint to PDF and PPT to PPTX pages, each tile linking
  to its own page. Signed-in users can star any tile to add it to Favourites.
- **Footer** with the privacy statement (files never uploaded; with an account we keep only the account, plan, credits
  and daily task counts) and company details (Kalaburagi Labs, support@fileutilo.com), plus Pricing, Terms, Refund
  policy and Privacy policy.
- The *How it works*, *Privacy, precisely*, *Supported formats* and *Free and Pro* sections stay below the tools.

## Navy only
- The green colour theme is gone: there is no `site-green` folder any more, and its screenshots and icons
  (`web/media-green`, `web/static-green`) were removed. `npm run build` builds `site-navy` only. Nothing on the live site
  changes, since it already uses navy.

## New headline and a "For business" page
- **Home headline:** "Free PDF, image, Word and other Office tools", with the tagline "Your files *never leave* your
  device." under it (smaller, "never leave" in coral). The line below now reads "No uploads, no installs — safe for
  confidential and work documents. Free to start." The "Private by design" badge, the "What do you want to do?" heading
  and the three screenshots under *How it works* are gone. The home search box is shorter and narrower.
- **New page: fileutilo.com/for-business** (64 pages in the sitemap now). It covers:
  - why files that never leave the device mean no data-processing risk and an easier security review;
  - a comparison with typical online PDF tools, which keep uploaded files for about 1–2 hours (iLovePDF and Smallpdf
    publish this);
  - Pro (the price follows `prices.pro_yearly` in your config, ₹999 by default) and a "For your team — Contact us" card;
  - contact buttons that email support@fileutilo.com.
- **"For business" links** in the header (between Pricing and Privacy) and in the footer under *Plans & legal*.
- The page claims no certifications (no ISO 27001 or similar). Add those only once you have them.

## Tool pages match the home page
- Every tool, task and info page now uses the design 11 look: the white header strip with the logo, the Outfit
  headline, the light palette (dark mode follows the visitor's setting), the tool sits on a white panel, and the dark
  footer is shared by all pages.
- The category tabs are gone from tool and info pages. Only the **Home** tab stays, to go back to the home page. The
  related-tool pills under the header stay, so a visitor can still move between tools in the same group.

## Six new PowerPoint tools (37 tools in all), each with its own page
- **PDF to PowerPoint** (`/pdf-to-powerpoint`) — *Same look*: every page becomes a slide picture, with the page’s text
  in the speaker notes; or *Editable text*: headings, bullets and tables you can change.
- **Compress PowerPoint** (`/compress-powerpoint`) — Light / Recommended / Strong. Re-saves the pictures inside at a
  screen-friendly size and turns large PNG photos into JPG; slides, animations and notes are untouched. A 9 MB test
  deck became 0.5 MB. If a file can’t get smaller, the original is returned.
- **PowerPoint to JPG** (`/powerpoint-to-jpg`) — each slide as JPG or PNG (HD, Full HD or 4K), or one PDF with a page per
  slide; pick slides like “2-4, 7”. Slides are drawn in the browser: text, pictures, shapes, tables, backgrounds and
  themes; charts and SmartArt effects may be simplified (shown as an outline, and the page says so).
- **Extract images from PowerPoint** (`/extract-images-from-powerpoint`) — the original picture files, byte for byte;
  also works on Word and Excel files, optionally with videos and sounds.
- **Merge PowerPoint** (`/merge-powerpoint`) — combine decks in any order, keeping each deck’s design, or putting every
  slide on the first deck’s layouts. Notes of the 2nd and later decks are not carried over (the page says so).
- **Slide text & speaker notes** (`/powerpoint-text-and-notes`) — every slide’s text, tables and notes as .txt or
  Markdown, with Copy text; option to skip hidden slides; old .ppt files give their text.
- **PowerPoint to PDF** (`/powerpoint-to-pdf`) now uses the slide drawing above, so the PDF looks like the slides
  (before, it held only the slide text). For selectable text, the document converter still makes a text PDF.
- The **document converter** is now called *Word, PowerPoint & Excel converter*, and its PPTX files are tidied (strict
  checkers no longer warn about three unused entries that the PowerPoint library adds).

## Nine new task pages (21 in all)
`/ppt-to-pptx`, `/compress-image-to-50kb`, `/compress-image-to-20kb`, `/compress-image-to-100kb`,
`/compress-pdf-to-100kb`, `/compress-pdf-to-500kb`, `/png-to-jpg`, `/jpg-to-png`, `/image-to-pdf` — each opens the right
tool with the setting already chosen, and has its own title, description, steps, formats, limits and FAQs. The sitemap
now lists 63 pages.

## Tests
- New `ppt.test.mjs` (45 checks): every PowerPoint result is opened with python-pptx, every internal reference and
  content type is checked, and LibreOffice renders the files; plus the 9 task pages.
- New `home.test.mjs` (31 checks): search, both popular lists, all tiles and groups, stars, signed-in and signed-out
  views, footer, and the phone layout.
- The privacy suite now runs the six PowerPoint tools too (33 tools), with a deck carrying the marker in its text,
  notes and picture description.
- Rebuild everything from Fileutilo 14 with: `python scripts/apply_v15_tools.py && python scripts/seo_content.py &&
  python scripts/apply_v15_home.py && python scripts/apply_v15_look.py &&
  python scripts/apply_v15_look_all.py && python scripts/apply_v15_hero.py &&
  python scripts/apply_v15_business.py` (already applied in this build).

---

# Fileutilo 14 — naming and limits (25 November 2026)

Small update on top of Fileutilo 13. Upload the same way (SETUP.md, Part F); nothing to delete, no Supabase changes.

- **Passport size photo & signature resizer** — the exam photo tool now says "passport size photo" everywhere it
  applies: tool name, home card, quick open, preset names (e.g. "Passport size photo — 200×230 px, 20–50 KB"), and the
  Resize & compress chip ("Passport photo ≤ 50 KB"). Its address is now **`/passport-size-photo`**; the old
  `/exam-photo-resizer` redirects there permanently (Vercel) or forwards with a small page (GitHub Pages).
- **It now counts towards the free limits** like other tools (10 a day without an account, 25 with one, unlimited on
  Pro). The "No limit" badge and the "Is it really free?" FAQ are gone.
- **"Redact" is now "Mask"** in the interface: the PDF tab says *Mask*, the tool is *Mask PDF & Aadhaar*, buttons say
  *Mask all* and *Save masked file*, and files are saved as `-masked.pdf`. The page address stays `/redact-pdf`
  (that is what people search for); its title reads "Mask PDF (Redact) & Aadhaar Number Online".
- Search Console: request indexing for `/passport-size-photo`.
- Tests: new-tools suite now 40 checks (adds the names, the limit and the redirect); all suites pass in both themes.

---

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
