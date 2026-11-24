# Fileutilo — setup guide (accounts, payments, analytics)

Checked against the Supabase, Google, Razorpay and Vercel dashboards as of 23 November 2026.
Do the parts in order. Parts A–F take about 1½ hours, plus waiting for Razorpay KYC and your email domain check.

| What | Where it goes |
|---|---|
| Everything inside the `site/` folder | Your GitHub repo, at the top level (no `site` folder in GitHub). Vercel publishes it. |
| `site/config.js` | The website settings (Supabase, live Razorpay key, AdSense, Google Analytics). Edit this one file — every page reads it. |
| `supabase/migrations/20261121000000_fileutilo.sql` | Supabase → SQL Editor (copy and paste) |
| `supabase/functions/` | Supabase Edge Functions, deployed by `deploy-supabase.bat` (Windows) or `deploy-supabase.sh` (Mac) |
| Razorpay secret keys | Supabase secrets only, set by the same script. **Never** in `index.html` or GitHub. |

Only two keys may appear in `index.html`: the Supabase **publishable** key (`sb_publishable_…`) and the Razorpay
**Key ID** (`rzp_test_…` / `rzp_live_…`). Both are meant to be public.

First, unzip `fileutilo.zip`, for example to `C:\fileutilo`, and install **Node.js LTS** from nodejs.org.

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

1. Open `C:\fileutilo\supabase\migrations\20261121000000_fileutilo.sql` in Notepad. Press **Ctrl+A**, then **Ctrl+C**.
2. In Supabase: **SQL Editor → New query**. Paste, then click **Run**. If it warns about destructive operations,
   confirm: the script only drops and re-creates its own policies and triggers.
3. You should see **"Success. No rows returned"**. In **Table Editor** you should see `profiles`, `usage_daily` and `payments`.

You can run the script again safely at any time.

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

1. **Windows:** double-click `C:\fileutilo\deploy-supabase.bat`.
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

The website is the **`site`** folder: one page per tool (`pdf-merge.html` becomes `www.fileutilo.com/pdf-merge`),
plus `config.js`, icons, `sitemap.xml`, `robots.txt`, `ads.txt` and `vercel.json`. All pages share one settings file.

1. Open `site\config.js` in **Notepad** and check the settings:
   ```js
   supabaseUrl:     "https://abcdefgh.supabase.co",
   supabaseAnonKey: "sb_publishable_…",
   razorpayKeyId:   "rzp_live_…",
   adsenseClient:   "ca-pub-…",       // adsenseSlot stays "" until AdSense approves the site
   ga4Id:           "G-…",            // Google Analytics measurement ID (Part I); "" = off
   ```
   Save.
2. **GitHub:** open the repo Vercel uses → **Add file → Upload files** → open the `site` folder, select **all files
   inside it** (Ctrl+A) and drag them in → **Commit changes**. They go at the top level of the repo, next to the old
   `index.html` they replace. (GitHub accepts up to 100 files per upload; `site` has about 45.)
3. **Vercel:** nothing to upload. It redeploys within about a minute.
   - Under **Deployments**, the newest entry should say *Ready*.
   - Open https://www.fileutilo.com/pdf-merge — the tool opens directly, with its own title in the browser tab.
   - Under **Settings → Domains**, `fileutilo.com` should redirect to `www.fileutilo.com`.
   - **Analytics** tab → **Enable** turns on the visitor statistics.

**Later changes:** to change only a setting, edit `config.js` and upload just that file. If you edit page text or
code in `web\index.html` or `scripts\seo_content.py`, rebuild the site, then upload the `site` folder again:
```
python scripts\seo_content.py
node scripts\build-site.mjs
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
4. In `index.html`, set `razorpayKeyId` to `rzp_live_…` and upload it to GitHub again.

---

## Part I — Google Analytics 4 and conversions (optional, free)

1. Go to **analytics.google.com** → **Start measuring** (or **Admin → Create → Property**).
   Property name `Fileutilo`, time zone **India**, currency **Indian Rupee**. Choose **Web**, enter
   `https://www.fileutilo.com`, stream name `Fileutilo`. Copy the **Measurement ID** (`G-XXXXXXXXXX`).
2. Put it in `site\config.js` as `ga4Id: "G-XXXXXXXXXX"` and upload `config.js` to GitHub.
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
3. **Sitemaps** → enter `sitemap.xml` → **Submit**. Google then finds all 32 pages.
4. Optional: **URL inspection** → paste `https://www.fileutilo.com/pdf-merge` → **Request indexing** for your most
   important tools. New sites usually appear in results within one to four weeks.

## Good to know
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
