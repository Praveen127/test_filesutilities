/* ======================  FILEUTILO SETTINGS — edit these  ======================
   This file is shared by every page of the site: change it here once.
   Leave supabaseUrl empty to run in "preview" mode: every tool works, no sign-in,
   no limits, no payments. Fill them in (see SETUP.md) to switch accounts on.     */
window.FILEUTILO_CONFIG = {
  supabaseUrl:     "https://rctsjdcclnbgmglqoudl.supabase.co",            // e.g. "https://abcdefgh.supabase.co"
  supabaseAnonKey: "sb_publishable_dGuzul6v3foV-SPxdCmn2A_SYrCnV4A",            // Supabase → Project Settings → API Keys → publishable key (sb_publishable_…). Never the secret key.
  razorpayKeyId:   "rzp_live_U3iIkkrttO16K0",            // rzp_test_… while testing, rzp_live_… when you go live
  adsenseClient:   "ca-pub-9678463082871615",            // e.g. "ca-pub-1234567890123456" (leave empty for no ads)
  adsenseSlot:     "",            // the ad unit's slot id
  contactEmail:    "support@fileutilo.com",
  brandName:       "Kalaburagi Labs",
  analytics:       "auto",        // Vercel Web Analytics: "auto" = on at fileutilo.com and *.vercel.app only, false = off
  // Google Drive buttons (SETUP.md, Part K). Leave all three empty to hide them.
  googleClientId:  "",            // OAuth client ID, ends in .apps.googleusercontent.com
  googleApiKey:    "",            // API key restricted to fileutilo.com and the Google Picker API
  googleAppId:     "",            // the Google Cloud project NUMBER (digits only)
  ga4Id:           "",            // Google Analytics 4 measurement ID, e.g. "G-ABC123XYZ9" (empty = no Google Analytics)
  // Display prices in rupees. The amounts actually charged live in supabase/functions/_shared/products.ts
  prices: { pro_monthly: 149, pro_yearly: 999, lifetime: 2999, credits_50: 49, credits_250: 199 }
};
