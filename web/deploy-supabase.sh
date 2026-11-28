#!/usr/bin/env bash
# Fileutilo: sets the payment secrets and deploys the 5 payment functions to your Supabase project.
# Mac/Linux:  bash deploy-supabase.sh      (needs Node.js LTS from nodejs.org)
set -euo pipefail
cd "$(dirname "$0")"
NPX=${NPX:-npx}
echo "=== Fileutilo: deploy the payment functions to Supabase ==="
read -rp "Supabase project ref (the abcdefgh part of https://abcdefgh.supabase.co): " REF
read -rp "Razorpay Key ID (rzp_test_...): " RZP_ID
read -rsp "Razorpay Key Secret (hidden): " RZP_SECRET; echo
read -rsp "Razorpay webhook secret (hidden): " RZP_WH; echo
read -rp "Razorpay plan ID for Pro monthly (plan_...): " PLAN_M
read -rp "Razorpay plan ID for Pro yearly (plan_...): " PLAN_Y
echo "Step 1 of 4: sign in to Supabase (a browser window opens — approve it there)"
$NPX --yes supabase login
echo "Step 2 of 4: connect this folder to your project (if asked for the database password, type it or press Enter)"
$NPX --yes supabase link --project-ref "$REF"
echo "Step 3 of 4: save the Razorpay secrets in Supabase"
$NPX --yes supabase secrets set "RAZORPAY_KEY_ID=$RZP_ID" "RAZORPAY_KEY_SECRET=$RZP_SECRET" "RAZORPAY_WEBHOOK_SECRET=$RZP_WH" \
  "RAZORPAY_PLAN_MONTHLY=$PLAN_M" "RAZORPAY_PLAN_YEARLY=$PLAN_Y" "ALLOWED_ORIGIN=https://www.fileutilo.com"
echo "Step 4 of 4: deploy the 5 functions"
for f in create-order verify-payment cancel-subscription delete-account razorpay-webhook; do
  echo "  - $f"; $NPX --yes supabase functions deploy "$f" --no-verify-jwt --use-api
done
echo "All done. In Supabase, open Edge Functions: you should see 5 functions."
