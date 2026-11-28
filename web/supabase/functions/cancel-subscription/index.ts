// Supabase Edge Function: cancel-subscription
import { cancelSubscription } from "../_shared/handlers.ts";
import { realDeps } from "../_shared/deps.ts";

const deps = realDeps();
Deno.serve((req) => cancelSubscription(req, deps));
