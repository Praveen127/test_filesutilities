# Fixes for two issues found by AutoQA

Copy this folder over your fileutilo_14 folder (same paths; 101 files).

1. **Data converter status not announced to screen readers** (a11y, SPEC-A11Y-003).
   The converter's info/error line `<span class="note o-info">` had no live region, so messages such as
   "Detected CSV" or parse errors were silent for screen-reader users. It is now
   `<span class="note o-info" role="status" aria-live="polite">` — in web/index.html and in every built page of
   site-navy and site-green (each page embeds the app).
2. **README tool count out of date** (SPEC-DOC-001). README.md said "27 private file tools"; the app has 31.
   Also updated tests/browser/README.md ("Runs all 31 tools"). QA-REPORT.md and the changelog entry describe an
   earlier release and are left as they were.

If you rebuild site-navy / site-green from web/ with your own build step, only web/index.html, README.md and
tests/browser/README.md need to be applied — the rebuild carries change 1 into the site pages.
