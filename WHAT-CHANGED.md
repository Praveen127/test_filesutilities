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
