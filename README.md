# Fileutilo — by Kalaburagi Labs

31 private file tools that run in the browser, with optional accounts and payments.

* `web/index.html` — the app. Open it directly to try it (preview mode: no sign-in, no limits).
* `SETUP.md` — step-by-step setup: Supabase → sign-in (email, Google) → Razorpay → payment functions → website → test → go live.
* `deploy-supabase.bat` / `deploy-supabase.sh` — one script that saves the payment secrets and deploys the payment functions.
* `supabase/` — database migration and payment Edge Functions.
* `tests/` — payment function tests (`npm test`) and browser tests for privacy, library failures, file formats, mobile and accessibility (`npm run test:browser:online`, see `tests/browser/README.md`).
* `QA-REPORT.md` — what was tested and fixed.

© 2026 Kalaburagi Labs. All rights reserved.
