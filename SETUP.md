# Fileutilo — setup guide (accounts, payments, analytics)

Checked against the Supabase, Google, Razorpay and Vercel dashboards as of 23 November 2026; paths and file names
updated for Fileutilo 16.1.1 on 28 November 2026. This guide is for setting everything up the first time. **To update
the live site to a new version, follow the update runbook** ("Fileutilo — Updating fileutilo.com") and Part M below.
Do the parts in order. Parts A–F take about 1½ hours, plus waiting for Razorpay KYC and your email domain check.

| What | Where it goes |
|---|---|
| Everything inside the `site-navy` folder | Your GitHub repo, at the top level (no `site-navy` folder in GitHub). Vercel publishes it. Staging: `Praveen127/test_filesutilities`; live: `Praveen127/filebench`. |
| `site-navy/config.js` (from `web/config.js`) | The website settings (Supabase, live Razorpay key, AdSense, Google Analytics). Edit this one file — every page reads it. |
| `supabase/migrations/*.sql` (two files, oldest first) | Supabase → SQL Editor (copy and paste) |
| `supabase/functions/` | Supabase Edge Functions, deployed by `deploy-supabase.bat` (Windows) or `deploy-supabase.sh` (Mac) |
| Razorpay secret keys | Supabase secrets only, set by the same script. **Never** in `index.html` or GitHub. |

Only public keys may appear in `config.js`: the Supabase **publishable** key (`sb_publishable_…`), the Razorpay
**Key ID** (`rzp_test_…` / `rzp_live_…`) and, for Google Drive, a browser API key restricted to fileutilo.com.

First, unzip the latest `fileutilo_<version>.zip` to `D:\fileutilo_automation\fileutilo_16` (any folder works; this guide
uses that one) and install **Node.js LTS** from nodejs.org.

---

## Part A — Supabase project

1. Go to supabase.com → **New project**.
   - Name: `fileutilo`. Set a **database password** and save it.
   - Region: **South Asia (Mumbai)**.
   - Leave the security / Data API options at their defaults. The database script grants exactly the access the app needs.
   - Click **Create** and wait about 2 minutes.
2. Copy three things into Notepad:
   - **Project URL** (`https://abcdefgh.supabase.co`): click **Connect** at the top of the project, or open
     **Project Settings → Data API**.
   - **Publishable key** (`sb_publishable_…`): **Project Settings → API Keys**, tab *Publishable and secret API keys*.
     If there are no keys yet, create them there. Older projects also have a legacy **anon** key (`eyJ…`). It works
     too, but legacy keys are being retired at the end of 2026.
   - **Project ref**: the `abcdefgh` part of the URL.

## Part B — Database

1. Open `D:\fileutilo_automation\fileutilo_16\supabase\migrations\20261121000000_fileutilo.sql` in Notepad. Press **Ctrl+A**, then **Ctrl+C**.
2. In Supabase: **SQL Editor → New query**. Paste, then click **Run**. If it warns about destructive operations,
   confirm: the script only drops and re-creates its own policies and triggers.
3. You should see **"Success. No rows returned"**. In **Table Editor** you should see `profiles`, `usage_daily` and `payments`.
4. Do the same with the second file, `supabase\migrations\20261124000000_pro_after_charge.sql`. It makes Pro start
   only after the first subscription payment goes through, not when a customer only authorises the mandate.
   Again you should see **"Success. No rows returned"**.

You can run both scripts again safely at any time. `version.json` on the site names the newest script the build
expects (`database`), so you can tell if Supabase is behind.

## Part C — Sign-in

### C1. Addresses (Authentication → URL Configuration)
- **Site URL:** `https://www.fileutilo.com`
- **Redirect URLs:** add `https://www.fileutilo.com/**`
- Click **Save**.

### C2. Email sending (required before real people can sign up)
Supabase's built-in email sender only delivers to members of your Supabase team (so it works for testing with your
own login email). It is limited to a few messages an hour. Connect your own email service:

1. Create an account with an email service that offers SMTP, such as Resend, Brevo, Postmark or ZeptoMail (Zoho).
2. In that service, add and verify the domain `fileutilo.com`. It gives you a few DNS records (TXT/CNAME/MX).
   Add them where your domain's DNS is managed: Vercel → your project → **Settings → Domains** (if Vercel runs
   your DNS), or your domain registrar. Wait until the service shows the domain as verified.
3. In Supabase: **Authentication → Emails → SMTP Settings** → turn on **Enable custom SMTP**.
   - Sender email: `no-reply@fileutilo.com`. Sender name: `Fileutilo`.
   - Host, port, username and password: copy them from the email service's SMTP page.
   - Click **Save**.
4. Optional: **Authentication → Rate Limits**, raise the emails-per-hour limit.

**If your email is on Google Workspace** (no new service or DNS records needed):
1. Sign in at myaccount.google.com with the Workspace address that will send the emails (e.g. `support@fileutilo.com`).
   Go to **Security → 2-Step Verification** and turn it on.
   If you can't, an admin turns it on first in admin.google.com → **Security → Authentication → 2-step verification**.
2. Open myaccount.google.com/apppasswords, create an app password named `Supabase`, and copy the 16 letters (no spaces).
3. Supabase SMTP settings:
   - Sender email: that same address. Sender name: `Fileutilo`.
   - Host `smtp.gmail.com`, port `465`.
   - Username: the full address. Password: the app password.
4. Make sure emails aren't marked as spam. In admin.google.com → **Apps → Google Workspace → Gmail → Authenticate email**,
   generate a DKIM key, add it at Namecheap as a TXT record with host `google._domainkey`, then click **Start authentication**.
   Your domain's SPF TXT record (host `@`) should contain `include:_spf.google.com`.
5. Workspace sends up to 2,000 emails a day per account (500 on a trial), plenty to start. For more, switch to one of the services above.

Namecheap DNS records are under **Domain List → Manage → Advanced DNS**.

### C3. Google sign-in
1. Google Cloud Console → **Google Auth Platform**. Create a Google Cloud project first if asked.
   - **Branding:**
     - App name: `Fileutilo`. Add your support email.
     - Authorised domain: `fileutilo.com`.
     - Home page: `https://www.fileutilo.com`.
     - Privacy policy: `https://www.fileutilo.com/#privacy`. Terms: `https://www.fileutilo.com/#terms`.
   - **Audience:**
     - User type: **External**.
     - Click **Publish app**. While it's in *Testing*, only the test users you list can sign in.
   - **Clients → Create client → Web application:**
     - Authorised JavaScript origins: `https://www.fileutilo.com`
     - Authorised redirect URIs: copy the **Callback URL** shown in Supabase → **Authentication → Sign In / Providers → Google**.
       It looks like `https://abcdefgh.supabase.co/auth/v1/callback`.
     - Click **Create**, then copy the **Client ID** and **Client secret**.
2. Supabase → **Authentication → Sign In / Providers → Google**: turn it on, paste the Client ID and secret, and click **Save**.

The app only asks Google for name and email, so Google doesn't need to review it. Showing your logo on Google's
sign-in screen needs a brand check, which can take a few days. Sign-in works meanwhile.

### C4. Phone sign-in (later)
Skip for now. It needs an SMS provider plus DLT registration in India (about a week). Email and Google work without it.

## Part D — Razorpay (dashboard.razorpay.com, **Test mode**)

1. **Account & Settings → API Keys** (under *Website and app settings*) → **Generate Key**.
   Download and save the **Key ID** (`rzp_test_…`) and **Key Secret**. The secret is shown only once.
2. **Subscriptions → Plans → Create Plan**, twice:
   - "Pro monthly": ₹149, every 1 month
   - "Pro yearly": ₹999, every 1 year

   Copy both plan IDs (`plan_…`).
3. **Account & Settings → Webhooks → Add New Webhook:**
   - URL: `https://abcdefgh.supabase.co/functions/v1/razorpay-webhook` (use your project ref)
   - Secret: make one up, using **letters and numbers only**, and copy it.
   - Events: `payment.captured`, `subscription.activated`, `subscription.charged`, `subscription.cancelled`,
     `subscription.completed`, `subscription.halted`
   - Click **Create**.

## Part E — Payment functions (one script)

1. **Windows:** double-click `D:\fileutilo_automation\fileutilo_16\deploy-supabase.bat`.
   **Mac:** open Terminal and run `bash ~/Documents/fileutilo/deploy-supabase.sh` (or wherever you unzipped it).
2. It asks for: your project ref, the Razorpay Key ID, Key Secret, webhook secret and the two plan IDs.
3. It then does four steps by itself:
   - signs you in to Supabase (your browser opens; approve it)
   - links the folder to your project (if it asks for the database password, type it or press Enter)
   - saves the secrets
   - deploys the 5 functions (Docker isn't needed)
4. Check Supabase → **Edge Functions**: you should see `create-order`, `verify-payment`, `cancel-subscription`,
   `delete-account` and `razorpay-webhook`.

<details><summary>Doing it by hand instead (same commands the script runs)</summary>

Open a terminal in the unzipped folder, then:

```
npx --yes supabase login
npx --yes supabase link --project-ref abcdefgh
npx --yes supabase secrets set RAZORPAY_KEY_ID=rzp_test_xxx RAZORPAY_KEY_SECRET=xxx RAZORPAY_WEBHOOK_SECRET=xxx RAZORPAY_PLAN_MONTHLY=plan_xxx RAZORPAY_PLAN_YEARLY=plan_xxx ALLOWED_ORIGIN=https://www.fileutilo.com
npx --yes supabase functions deploy create-order --no-verify-jwt --use-api
npx --yes supabase functions deploy verify-payment --no-verify-jwt --use-api
npx --yes supabase functions deploy cancel-subscription --no-verify-jwt --use-api
npx --yes supabase functions deploy delete-account --no-verify-jwt --use-api
npx --yes supabase functions deploy razorpay-webhook --no-verify-jwt --use-api
```

`--no-verify-jwt` is required. Supabase's built-in token check only understands the legacy keys, so each function
checks the signed-in user itself and refuses the call without one. The functions find the project's secret key
automatically. The company name on Razorpay's checkout defaults to "Kalaburagi Labs". To change it, add
`BRAND_NAME=...` to the secrets line.
</details>

## Part F — Website (Notepad → GitHub → Vercel)

The website is the **`site-navy`** folder. It has one page per tool at a
task-named address (`merge-pdf.html` becomes `www.fileutilo.com/merge-pdf`), eight task pages such as `/word-to-pdf`,
plus `config.js`, `sw.js` (offline copy), `version.json` (which build this is), icons, `sitemap.xml`, `robots.txt`, `ads.txt`, `vercel.json` and two folders: `about` (help text the
app loads when you move between tools) and `media` (screenshots and the demo video). All pages share one settings file.

1. Open `site-navy\config.js` in **Notepad** and check the settings:
   ```js
   supabaseUrl:     "https://abcdefgh.supabase.co",
   supabaseAnonKey: "sb_publishable_…",
   razorpayKeyId:   "rzp_live_…",
   adsenseClient:   "ca-pub-…",       // adsenseSlot stays "" until AdSense approves the site
   ga4Id:           "G-…",            // Google Analytics measurement ID (Part I); "" = off
   ```
   Save.
2. **GitHub** — there are two repositories, each connected to its own Vercel project. Upload every new build to
   **staging** (`Praveen127/test_filesutilities`) first and check it there; upload the same folder to **live**
   (`Praveen127/filebench`, www.fileutilo.com) only after that. Uploading replaces the live `config.js`, so compare it with
   the one in `filebench` first and carry over any live setting the new one lacks (for example `ga4Id`).
   In the **Commit changes** box, write the version as the message, for example `Fileutilo 16.1.1`. Vercel's
   **Deployments** list shows that message, so you can see which version is live and pick the right one to roll back to.
   GitHub's web upload takes at most 100 files at a time, so upload in three rounds:
   - **Round 1:** repo → **Add file → Upload files** → open your site folder, select **all the files** at its top level
     (not the two folders) → drag them in → **Commit changes**. About 63 files.
   - **Round 2:** **Add file → Upload files** again → drag the **`about`**, **`media`** and **`legal`** folders in together →
     **Commit changes**. About 84 files; GitHub keeps the folder names.
   - The hidden `.nojekyll` file is part of round 1. If Windows hides it, turn on **View → Show → Hidden items**.
   - **Round 3 (Fileutilo 16.1 and later):** drag the **`vendor`** folder in → **Commit changes**. It holds the tool
     libraries (Part L). Upload it again only when `scripts\vendor-libs.mjs` downloads something new.
3. **Remove the earlier tool pages** (they used the old addresses). In GitHub, open each and delete it
   (… menu → **Delete file**), or delete them all at once with GitHub Desktop:
   `convert.html`, `pdf-merge.html`, `pdf-split.html`, `pdf-organize.html`, `pdf-compress.html`, `pdf-protect.html`, `pdf-unlock.html`, `pdf-stamp.html`, `pdf-ocr.html`, `pdf-to-img.html`, `img-to-pdf.html`, `img-convert.html`, `img-resize.html`, `json.html`, `json-query.html`, `data-convert.html`, `table-clean.html`, `hash.html`, `word-merge.html`, `excel-combine.html`, `find-replace.html`, `doc-stats.html`, `metadata.html`, `diff.html`, `zip-create.html`, `zip-open.html`.
   On Vercel these addresses also redirect permanently to the new ones (`vercel.json`), so old links keep working.
4. **Vercel:** nothing to upload. It redeploys within about a minute.
   - Under **Deployments**, the newest entry should say *Ready*.
   - Open https://www.fileutilo.com/version.json. `version` should be the one you uploaded; the page footer shows it too
     (small, after "All rights reserved").
   - Open https://www.fileutilo.com/merge-pdf — the tool opens directly, with its own title in the browser tab,
     and the help text, screenshot, formats, FAQs and related tools below it.
   - Open https://www.fileutilo.com/pdf-merge — it should jump to `/merge-pdf`.
   - Under **Settings → Domains**, `fileutilo.com` should redirect to `www.fileutilo.com`.
   - **Analytics** tab → **Enable** turns on the visitor statistics.
   - **Install and offline:** in Chrome, the address bar shows an install icon on www.fileutilo.com. After one visit,
     F12 → **Application → Service workers** shows `sw.js` as *activated*. Each upload replaces the offline copy
     on visitors' next visit, so there's nothing to clear by hand.

**Later changes:** to change only a setting, edit `config.js` and upload just that file. If you edit page text or
code in `web\index.html` or `scripts\seo_content.py`, rebuild, then upload the site folder again:
```
python scripts\seo_content.py
node scripts\build-site.mjs --brand navy
```

## Part G — Test (still in Razorpay test mode)

1. Open https://www.fileutilo.com and press **Ctrl+F5**. You should see **Pricing** and **Sign in** at the top right.
2. **Sign in → Create an account** with your email, then click the link in the confirmation email.
   Sign out, then try **Continue with Google**.
3. **Pricing → 50 credits.** In Razorpay's test checkout, choose **Card** and use a Razorpay test card from
   Razorpay's *Test Cards* documentation page (for example Visa `4111 1111 1111 1111`, any future expiry, any CVV).
   On the mock bank page, enter any OTP and click **Success**. The credits should show in your account (top right).
   Typing a UPI ID (UPI "collect") was retired on 28 February 2026, so `success@razorpay` may no longer work.
4. Supabase → **Table Editor → payments**: there should be a row with status `paid`.
5. Optional: buy **Pro monthly** the same way, then use **Account → Cancel subscription**.
   Subscriptions only offer the payment methods switched on in Razorpay → **Subscriptions → Settings**.
   Turn on **Card** there first, otherwise checkout says *"No appropriate payment method found"*.

If something fails:
- Supabase → **Edge Functions → (function) → Logs** shows the error from the server side.
- The browser console (F12) shows it from the page side.

## Part H — Go live

1. Razorpay: finish KYC, then switch to **Live mode**.
2. Repeat Part D in live mode: new live keys, the two plans again (live plan IDs differ), and the webhook again.
3. Run the deploy script again with the live values. It replaces the test secrets.
4. In `config.js`, set `razorpayKeyId` to `rzp_live_…` and upload that file to GitHub again.

---

## Part I — Google Analytics 4 and conversions (optional, free)

1. Go to **analytics.google.com** → **Start measuring** (or **Admin → Create → Property**).
   Property name `Fileutilo`, time zone **India**, currency **Indian Rupee**. Choose **Web**, enter
   `https://www.fileutilo.com`, stream name `Fileutilo`. Copy the **Measurement ID** (`G-XXXXXXXXXX`).
2. Put it in `config.js` (inside the site folder you uploaded) as `ga4Id: "G-XXXXXXXXXX"` and upload `config.js` to GitHub.
3. In the data stream's **Enhanced measurement** settings, keep **Page views** on and make sure
   **"Page changes based on browser history events"** is ticked (tools change the address without reloading).
4. Events the site sends (never file names or contents):
   | Event | When |
   |---|---|
   | `tool_use` (`tool_id`) | a tool starts a task |
   | `limit_reached` (`tool_id`) | a free limit dialog appears |
   | `sign_up` / `login` (`method`) | someone creates an account / signs in |
   | `begin_checkout` (`value`, `items`) | Razorpay checkout opens |
   | `purchase` (`transaction_id`, `value`, `items`) | a payment is confirmed |
   | `subscription_pending` | a UPI Autopay mandate is set up, waiting for the first debit |
   | `payment_failed` | Razorpay reports a failed payment |
5. **Admin → Events** (or **Key events**): mark `purchase`, `sign_up` and `begin_checkout` as **key events**
   so they appear as conversions. Data shows up in **Reports → Realtime** within minutes, other reports within a day.
6. Visitors from the EEA, UK and Switzerland are counted only after they accept the AdSense consent message
   (Google's consent mode). The privacy policy page mentions Google Analytics automatically once `ga4Id` is set.

## Part J — Google Search Console (get the tool pages into Google)

1. Go to **search.google.com/search-console** → **Add property** → **Domain** → `fileutilo.com`.
2. It shows a TXT record. Namecheap → **Domain List → Manage → Advanced DNS → Add new record**:
   type **TXT**, host `@`, value = the `google-site-verification=…` text → save. Back in Search Console, **Verify**
   (DNS can take a few minutes to an hour).
3. **Sitemaps** → enter `sitemap.xml` → **Submit**. It lists all 63 pages: home, 37 tools, 21 task pages and 4 info pages. After each update, submit it again.
4. **URL inspection** → paste each of your most important pages and click **Request indexing** (about 10 a day are
   allowed), for example `/merge-pdf`, `/compress-pdf`, `/word-to-pdf`, `/pdf-to-word`, `/image-compressor`,
   `/json-formatter`, `/file-comparison`, `/excel-to-csv`, `/zip-extractor`, `/heic-to-jpg`. After the November 2026
   update, request the new pages too: `/sign-pdf`, `/edit-pdf`, `/redact-pdf`, `/mask-aadhaar`,
   `/passport-size-photo`, `/signature-resizer`, `/compress-pdf-to-200kb`, `/fill-pdf-form`. After the Fileutilo 15
   update: `/pdf-to-powerpoint`, `/compress-powerpoint`, `/powerpoint-to-jpg`, `/merge-powerpoint`,
   `/extract-images-from-powerpoint`, `/powerpoint-text-and-notes`, `/compress-image-to-50kb`, `/image-to-pdf`,
   `/png-to-jpg`, `/compress-pdf-to-100kb` (then the rest over the following days, plus `/powerpoint-to-pdf`, which changed).
5. After 2–4 weeks, check **Performance → Search results** to see which searches show your pages, and
   **Pages** for any that weren't indexed and why. **Experience → Core Web Vitals** shows real-phone loading speed
   once there is enough traffic.

## Part K — Google Drive buttons (optional, about 20 minutes)

This turns on **Choose from Google Drive** under every drop area and **Save a copy to Google Drive** after each
download. Files go straight between Google and the visitor's browser; they never touch Supabase or Vercel. Fileutilo
can see only the files a person picks or saves (Google's `drive.file` permission), so Google's long security review
isn't needed. Until the three settings below are filled in, the buttons stay hidden.

Use the **same Google Cloud project** as Google sign-in (Part C3).

1. **Turn on two APIs.** Google Cloud Console → **APIs & Services → Library**. Search for and **Enable**:
   - **Google Drive API**
   - **Google Picker API**
2. **Add the Drive permission.** **Google Auth Platform → Data Access → Add or remove scopes**. Tick
   `.../auth/drive.file` ("See, edit, create and delete only the specific Google Drive files you use with this app"),
   click **Update**, then **Save**.
3. **Check the client.** **Google Auth Platform → Clients** → open the Web client from Part C3. Under
   **Authorised JavaScript origins**, make sure both are listed, then **Save**:
   - `https://www.fileutilo.com`
   - `https://fileutilo.com`

   Copy its **Client ID** (it ends in `.apps.googleusercontent.com`). The client secret is not needed here and must
   never go in `config.js`.
4. **Make an API key.** **APIs & Services → Credentials → Create credentials → API key**. Then click it and set:
   - **Application restrictions → Websites:** `https://www.fileutilo.com/*` and `https://fileutilo.com/*`
   - **API restrictions → Restrict key:** tick **Google Picker API** and **Google Drive API**
   - Click **Save** and copy the key.
5. **Find the project number.** Click the project name at the top → the **Project number** column (digits only, not
   the project ID).
6. **Fill in `config.js`** (in `site-navy`, and in `web` so later builds keep it):
   ```js
   googleClientId:  "1234567890-abc123.apps.googleusercontent.com",
   googleApiKey:    "AIza…",
   googleAppId:     "1234567890",
   ```
   Upload `config.js` to GitHub as in Part F. The client ID, API key and project number are meant to be public in
   a web page; the website restriction in step 4 stops other sites using the key.
7. **Test.** Open `https://www.fileutilo.com/merge-pdf` → **Choose from Google Drive** → sign in → pick two PDFs. They
   appear in the list. Merge them, download, then click **Save a copy to Google Drive** and open the link.

**If something goes wrong**
- *"Access blocked: this app's request is invalid"* — the site's address is missing from step 3's origins.
- *"This app is blocked"* or only some people can sign in — **Google Auth Platform → Audience**: the app must be
  **In production**, not *Testing*.
- *The picker opens but says "The API developer key is invalid"* — check step 4's restrictions, and wait 5 minutes
  after saving them.
- *Nothing happens on click* — the browser blocked the pop-up; allow pop-ups for fileutilo.com and click again.
- Google may ask to verify your branding (name, logo, domain) because of the new permission. Follow its steps; the
  buttons keep working for visitors meanwhile, with Google's "unverified app" notice if it applies.

## Part L — Put the tool libraries on fileutilo.com (once, about 5 minutes)

The tools use open-source libraries (PDF reader, Word reader, Excel engine, OCR and so on). Until you do this, they
download from public CDNs (cdn.jsdelivr.net, unpkg.com, cdn.sheetjs.com) the first time someone uses a tool. With
them on fileutilo.com:
- tools work on company networks that block those CDNs;
- the exact files can never change underneath you (each one's fingerprint is checked);
- the site talks to fileutilo.com only, which is what the For business page promises.

The CDNs stay as a backup, so nothing breaks if a file is missing.

1. Open a terminal in the project folder (`D:\fileutilo_automation\fileutilo_16`) on a computer with internet.
2. Run:
   ```
   node scripts\vendor-libs.mjs
   ```
   It downloads about 30 MB into `web\vendor\`. Each line starts with ✓ (already there), ↓ (downloaded) or ✗ (failed).
   It ends with "11 of 11 libraries on fileutilo.com, plus OCR engine and English data".
   - A ✗ line means that file couldn't be downloaded. Run the command again later; that tool keeps working from the
     CDN meanwhile.
   - The first run records every file's SHA-256 fingerprint in `web\vendor\vendor-lock.json`. Keep that file. Later
     runs refuse any file whose content differs, so a changed or tampered copy is never used.
3. Rebuild the site:
   ```
   node scripts\build-site.mjs --brand navy
   ```
   It reports "… library files on fileutilo.com" (about 25).
4. Upload `site-navy` as in Part F, including **Round 3** (the `vendor` folder).
5. Check: open https://www.fileutilo.com/merge-pdf, press F12 → **Network**, and merge two PDFs. The library line reads
   `pdf-lib.min.js` from `www.fileutilo.com/vendor/…`, not from cdn.jsdelivr.net.

**To check the files later** without downloading: `node scripts\vendor-libs.mjs --verify` lists any file that is
missing or changed. **To update a library**, change its version in `scripts\vendor-libs.mjs` (and the matching address in
`web\index.html`), update its row on the Open-source licences page (the `licenses` section of `web\index.html`),
run the script, rebuild and upload; the old version's folder can then be deleted.

The AVIF image encoder (Image compressor → AVIF) stays on the CDN: its code loads other packages by CDN address.
Languages other than English for OCR also still come from the CDN.

## Part M — Version numbers

Each build has one version number, kept in the `VERSION` file at the top of the project (for example `16.1.1`).
Change it only there; the build stamps it everywhere else.

- **Numbering** (major.minor.patch): **major** for a big release (17 for e-sign), **minor** for new features (16.2),
  **patch** for fixes only (16.1.2).
- **Where it shows:** `/version.json` on the site (version, build time, fingerprint, newest database script), the
  page head (`<meta name="fileutilo-version">`), the footer, the offline cache name in `sw.js`, the zip name and
  WHAT-CHANGED.md. AutoQA prints it at the top of every report.
- **Fingerprint:** a short code for the exact files in the build, leaving out `config.js`. The same build shows the
  same fingerprint on staging and live, so if both say `625ece4b…`, live has exactly what you tested.
- **Releases (optional):** after a live upload, in `filebench` click **Releases → Draft a new release**, tag it
  `v16.1.1`, and paste that version's WHAT-CHANGED section. It's a permanent record of every live version.
- **Is Supabase up to date?** `version.json` → `database` names the newest SQL file in `supabase\migrations`. If you
  haven't run that file in Supabase yet, run it (Part B).

## Good to know
- **On-device extras:** favourites and recent activity live in the visitor's browser (`localStorage`); clearing
  site data removes them. Nothing about them reaches Supabase.
- **Free limits:**
  - 25 tasks a day, 5 files per task, 20 MB per file and 5 OCR pages a day, resetting at midnight IST.
  - Signed-out visitors get 10 tasks a day.
  - JSON, data, hash, diff, ZIP-open and word-count tools are always free.
  - To change the limits, edit `use_task` in the migration and `LIM` in `index.html`.
- **Credits:** each run over a free limit costs 1 credit per extra task, per extra file, per extra OCR page, and
  per started 50 MB over the size limit.
- **Limits are a fair-use gate, not DRM.** Tools run on the visitor's device, so a technical person could skip
  the check. Plans, credits and payments are protected on the server.
- **Ads (optional, later):** apply at adsense.google.com once the site has visitors. Then put the `ca-pub-…` client
  and slot ID into the settings, and the `ads.txt` file AdSense gives you next to `index.html`.
- **Tax:** ask a CA about GST registration. Razorpay's invoices and settlement reports help.
- **Data protection (DPDP Act):** the privacy page lists what's stored. Users can delete their own account;
  payment records stay, unlinked, for tax reasons.
- **Tests:**
  - `npm test` covers the payment functions and needs a local Postgres (see `tests/functions.test.ts`).
  - `npm run test:browser:online` covers the website (see `tests/browser/README.md`).
