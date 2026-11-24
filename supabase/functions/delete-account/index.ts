// Supabase Edge Function: delete-account
import { deleteAccount } from "../_shared/handlers.ts";
import { realDeps } from "../_shared/deps.ts";

const deps = realDeps();
Deno.serve((req) => deleteAccount(req, deps));
