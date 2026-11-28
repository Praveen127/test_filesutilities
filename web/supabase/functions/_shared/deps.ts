// Real dependencies for Supabase Edge Functions (Deno). Supabase provides SUPABASE_URL and the project's keys
// automatically: the new SUPABASE_SECRET_KEYS (a JSON object, {"default": "sb_secret_…"}) and, on projects that
// still have them, the legacy SUPABASE_SERVICE_ROLE_KEY (being retired at the end of 2026).
import { createClient } from "npm:@supabase/supabase-js@2";
import type { Deps } from "./handlers.ts";

/** The project's server-side key: the new secret key if present, otherwise the legacy service_role key. */
export function serverKey(env: (k: string) => string | undefined = (k) => Deno.env.get(k)): string {
  const keys = env("SUPABASE_SECRET_KEYS");
  if (keys) {
    try {
      const parsed = JSON.parse(keys) as Record<string, string>;
      const k = parsed["default"] ?? Object.values(parsed)[0];
      if (k) return k;
    } catch { /* fall through to the legacy key */ }
  }
  const legacy = env("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  throw new Error("No Supabase secret key: create one under Project Settings → API Keys");
}

export function realDeps(): Deps {
  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, serverKey(), { auth: { persistSession: false } });
  const check = <T>(r: { data: T; error: { message: string } | null }) => { if (r.error) throw new Error(r.error.message); return r.data; };
  return {
    env: (k) => Deno.env.get(k),
    fetch: (...a) => fetch(...a),
    async getUser(authorization) {
      const token = authorization?.replace(/^Bearer\s+/i, "");
      if (!token) return null;
      const { data, error } = await admin.auth.getUser(token);
      return error || !data.user ? null : { id: data.user.id, email: data.user.email, phone: data.user.phone };
    },
    db: {
      getProfile: async (id) => check(await admin.from("profiles").select("*").eq("id", id).maybeSingle()),
      insertPayment: async (row) => { check(await admin.from("payments").insert(row)); },
      getPaymentByOrder: async (o) => check(await admin.from("payments").select("*").eq("razorpay_order_id", o).maybeSingle()),
      getPaymentBySubscription: async (s) =>
        check(await admin.from("payments").select("*").eq("razorpay_subscription_id", s).order("id").limit(1).maybeSingle()),
      setSubscriptionStatus: async (id, status) => {
        check(await admin.from("profiles").update({ subscription_status: status, updated_at: new Date().toISOString() }).eq("id", id));
      },
      rpc: async (fn, args) => check(await admin.rpc(fn, args)) as string,
      deleteUser: async (id) => { const { error } = await admin.auth.admin.deleteUser(id); if (error) throw new Error(error.message); },
    },
  };
}
