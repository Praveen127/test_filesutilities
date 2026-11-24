// Supabase Edge Function: create-order
import { createOrder } from "../_shared/handlers.ts";
import { realDeps } from "../_shared/deps.ts";

const deps = realDeps();
Deno.serve((req) => createOrder(req, deps));
