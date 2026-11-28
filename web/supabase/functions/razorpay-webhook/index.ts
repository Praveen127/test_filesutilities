// Supabase Edge Function: razorpay-webhook
import { webhook } from "../_shared/handlers.ts";
import { realDeps } from "../_shared/deps.ts";

const deps = realDeps();
Deno.serve((req) => webhook(req, deps));
