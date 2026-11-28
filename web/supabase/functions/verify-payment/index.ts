// Supabase Edge Function: verify-payment
import { verifyPayment } from "../_shared/handlers.ts";
import { realDeps } from "../_shared/deps.ts";

const deps = realDeps();
Deno.serve((req) => verifyPayment(req, deps));
