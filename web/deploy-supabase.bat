@echo off
setlocal
rem Fileutilo: sets the payment secrets and deploys the 5 payment functions to your Supabase project.
rem Double-click this file (Windows). Needs Node.js LTS from nodejs.org.
cd /d "%~dp0"
echo.
echo === Fileutilo: deploy the payment functions to Supabase ===
echo You need: your Supabase project ref, and from Razorpay the Key ID, Key Secret,
echo webhook secret and the two plan IDs. (Use letters and numbers only in the webhook secret.)
echo.
set /p REF=Supabase project ref (the abcdefgh part of https://abcdefgh.supabase.co): 
set /p RZP_ID=Razorpay Key ID (rzp_test_...): 
set /p RZP_SECRET=Razorpay Key Secret: 
set /p RZP_WH=Razorpay webhook secret: 
set /p PLAN_M=Razorpay plan ID for Pro monthly (plan_...): 
set /p PLAN_Y=Razorpay plan ID for Pro yearly (plan_...): 
echo.
echo Step 1 of 4: sign in to Supabase (a browser window opens - approve it there)
call npx --yes supabase login || goto :fail
echo Step 2 of 4: connect this folder to your project (if asked for the database password, type it or press Enter)
call npx --yes supabase link --project-ref %REF% || goto :fail
echo Step 3 of 4: save the Razorpay secrets in Supabase
call npx --yes supabase secrets set RAZORPAY_KEY_ID=%RZP_ID% RAZORPAY_KEY_SECRET=%RZP_SECRET% RAZORPAY_WEBHOOK_SECRET=%RZP_WH% RAZORPAY_PLAN_MONTHLY=%PLAN_M% RAZORPAY_PLAN_YEARLY=%PLAN_Y% ALLOWED_ORIGIN=https://www.fileutilo.com || goto :fail
echo Step 4 of 4: deploy the 5 functions
for %%F in (create-order verify-payment cancel-subscription delete-account razorpay-webhook) do (
  echo   - %%F
  call npx --yes supabase functions deploy %%F --no-verify-jwt --use-api || goto :fail
)
echo.
echo All done. In Supabase, open Edge Functions: you should see 5 functions.
pause
exit /b 0
:fail
echo.
echo Something went wrong in the step above. Read the message, fix it, and run this file again.
pause
exit /b 1
