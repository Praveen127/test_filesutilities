# Fileutilo — new landing page and brand (24 November 2026)

## Choose a colour theme, then upload ONE folder
- `site-navy`  — navy + blue (like your reference screenshot)
- `site-green` — the current deep green + lime

Upload **everything inside the folder you choose** to the top level of your GitHub repo
(Add file → Upload files → select all → Commit). Same steps as SETUP.md Part F. Don't upload both.
Your live settings are in `config.js` inside each folder.

## What's new
- **Landing page:** hero "Your files. Your device. Your control." with a *Private by design* badge;
  all 27 tools with their own icons, grouped and linked to their own pages; How it works with a real
  10-second demo recording and three product screenshots; a precise privacy section (what stays on your
  device vs. what uses the network, how it's tested, how to check yourself); supported formats; a clear
  Free vs Pro table; a support section with email and bug-report links.
- **Visual identity:** your existing logo (lines and coral dot) — lime tile in green, blue tile with white lines in navy — on a new favicon,
  phone icons, share image and colour system, in both themes.
- **Privacy check:** every tool was run on files containing a unique marker and every network request was
  inspected (25 tools in the automated suite; OCR and Combine Excel checked on the live site). No request
  carried file contents or names.

## Rebuilding later (only if you edit web/index.html or the text)
```
node scripts/build-site.mjs --brand navy  --out site-navy
node scripts/build-site.mjs --brand green --out site-green
```
