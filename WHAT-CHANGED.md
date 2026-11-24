# Fileutilo — build of 24 November 2026

## Upload to GitHub (the website)
Upload **everything inside the `site` folder** to the top level of your GitHub repo (Add file → Upload files →
select all → Commit). Vercel publishes it in about a minute. Full steps: SETUP.md, Part F.

Your live settings (Supabase, live Razorpay key, AdSense publisher ID) are already in `site/config.js`.
From now on, settings live in **`config.js`**, not inside `index.html`.

## What's new
1. **Brand:** favicon (browser tab icon), phone home-screen icons, web app manifest, and a 1200×630 share
   image for WhatsApp/LinkedIn/X link previews.
2. **SEO:** every tool has its own address (www.fileutilo.com/pdf-merge, /img-resize, …) — 32 pages, each with
   its own title, description, heading, help text with steps and FAQs, structured data and share preview.
   Plus `sitemap.xml`, `robots.txt`, a 404 page and a footer linking all 27 tools. Old links such as
   `/#pdf-merge` still work and switch to the new address.
3. **Google Analytics 4 + conversions:** add your `G-…` ID to `config.js` (SETUP.md Part I). Events:
   tool_use, limit_reached, sign_up, login, begin_checkout, purchase, subscription_pending, payment_failed.
   No file names or contents are ever sent. Off until you add the ID.
4. **Google Search Console:** steps to verify the domain and submit the sitemap (SETUP.md Part J).
5. **Payments (from earlier today, also in this build):** Pro only after a real charge, and Delete account no
   longer fails on unpaid or test-mode subscriptions. If you haven't yet: run
   `supabase/migrations/20261124000000_pro_after_charge.sql` in the Supabase SQL Editor, then
   `deploy-supabase.bat` from this folder.

## Tests
Payment functions 25/25; browser suites: privacy 33, library failures 39, formats 234, mobile 60,
accessibility 34, accounts 29, SEO & site 27 — all passing.
