// Request handlers for the payment Edge Functions. They receive their dependencies (database, fetch,
// current user, secrets) as a parameter, so the same code runs on Supabase and in the test suite.
import { PRODUCTS } from "./products.ts";
import {
  razorpay, RazorpayError, verifyOrderSignature, verifySubscriptionSignature, verifyWebhookSignature,
} from "./razorpay.ts";

export interface User { id: string; email?: string | null; phone?: string | null }
export interface Db {
  getProfile(userId: string): Promise<Record<string, any> | null>;
  insertPayment(row: Record<string, unknown>): Promise<void>;
  getPaymentByOrder(orderId: string): Promise<Record<string, any> | null>;
  getPaymentBySubscription(subId: string): Promise<Record<string, any> | null>;
  setSubscriptionStatus(userId: string, status: string): Promise<void>;
  rpc(fn: "apply_order_payment" | "apply_subscription", args: Record<string, unknown>): Promise<string>;
  deleteUser(userId: string): Promise<void>;
}
export interface Deps {
  env(name: string): string | undefined;
  fetch: typeof fetch;
  db: Db;
  getUser(authorization: string | null): Promise<User | null>;
}

const ALLOWED_ORIGIN = (deps: Deps) => deps.env("ALLOWED_ORIGIN") || "*";
export const cors = (deps: Deps) => ({
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN(deps),
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-api-version, x-region",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});
const json = (deps: Deps, status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(deps), "Content-Type": "application/json" } });

function secrets(deps: Deps) {
  const keyId = deps.env("RAZORPAY_KEY_ID"), keySecret = deps.env("RAZORPAY_KEY_SECRET");
  if (!keyId || !keySecret) throw new Error("Payments aren't configured yet (missing Razorpay keys).");
  return { keyId, keySecret };
}

/** Wraps a handler: CORS pre-flight, method check, sign-in check and error reporting. */
function endpoint(needsUser: boolean, fn: (req: Request, deps: Deps, user: User | null) => Promise<Response>) {
  return async (req: Request, deps: Deps): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: cors(deps) });
    if (req.method !== "POST") return json(deps, 405, { error: "Use POST" });
    try {
      let user: User | null = null;
      if (needsUser) {
        user = await deps.getUser(req.headers.get("Authorization"));
        if (!user) return json(deps, 401, { error: "Please sign in again." });
      }
      return await fn(req, deps, user);
    } catch (e) {
      const status = e instanceof RazorpayError ? 502 : 500;
      return json(deps, status, { error: e instanceof Error ? e.message : String(e) });
    }
  };
}

async function readJson(req: Request): Promise<Record<string, any>> {
  try { const b = await req.json(); return b && typeof b === "object" ? b : {}; } catch { return {}; }
}

// ─────────────────────────────────────── create-order: start a checkout
export const createOrder = endpoint(true, async (req, deps, user) => {
  const { product: productId } = await readJson(req);
  const product = PRODUCTS[String(productId)];
  if (!product) return json(deps, 400, { error: "Unknown product" });
  const { keyId, keySecret } = secrets(deps);
  const profile = await deps.db.getProfile(user!.id);
  if (!profile) return json(deps, 404, { error: "Profile not found" });
  const base = {
    key: keyId, name: deps.env("BRAND_NAME") || "Kalaburagi Labs", description: product.label,
    amount: product.amount, currency: "INR",
    prefill: { email: user!.email || "", contact: user!.phone || "", name: profile.full_name || "" },
  };

  if (product.kind === "subscription") {
    if (profile.plan === "lifetime") return json(deps, 400, { error: "You already have lifetime Pro." });
    const activeSub = profile.plan === "pro" && profile.pro_until && new Date(profile.pro_until) > new Date()
      && ["active", "authenticated", "charged", "resumed"].includes(profile.subscription_status);
    if (activeSub) return json(deps, 400, { error: "You already have an active Pro subscription." });
    const planId = deps.env(product.planEnv);
    if (!planId) return json(deps, 500, { error: `Subscription plan not configured (${product.planEnv}).` });
    const sub = await razorpay<{ id: string }>(deps.fetch, keyId, keySecret, "POST", "/subscriptions", {
      plan_id: planId, total_count: product.totalCount, customer_notify: 1,
      notes: { user_id: user!.id, product: product.id },
    });
    await deps.db.insertPayment({
      user_id: user!.id, product: product.id, kind: "subscription", amount_paise: product.amount,
      razorpay_subscription_id: sub.id,
    });
    return json(deps, 200, { ...base, subscription_id: sub.id });
  }

  const order = await razorpay<{ id: string }>(deps.fetch, keyId, keySecret, "POST", "/orders", {
    amount: product.amount, currency: "INR", receipt: `fu_${Date.now().toString(36)}`,
    notes: { user_id: user!.id, product: product.id },
  });
  await deps.db.insertPayment({
    user_id: user!.id, product: product.id, kind: "one_time", amount_paise: product.amount,
    grant_plan: product.grantPlan ?? null, grant_credits: product.grantCredits ?? 0, razorpay_order_id: order.id,
  });
  return json(deps, 200, { ...base, order_id: order.id });
});

// ─────────────────────────────────────── verify-payment: called by the browser right after checkout
export const verifyPayment = endpoint(true, async (req, deps, user) => {
  const b = await readJson(req);
  const paymentId = String(b.razorpay_payment_id || ""), signature = String(b.razorpay_signature || "");
  const { keyId, keySecret } = secrets(deps);
  if (!paymentId || !signature) return json(deps, 400, { error: "Missing payment details" });

  if (b.razorpay_order_id) {
    const orderId = String(b.razorpay_order_id);
    if (!(await verifyOrderSignature(orderId, paymentId, signature, keySecret))) return json(deps, 400, { error: "Payment signature is invalid" });
    const pay = await deps.db.getPaymentByOrder(orderId);
    if (!pay || pay.user_id !== user!.id) return json(deps, 403, { error: "This payment belongs to another account" });
    const result = await deps.db.rpc("apply_order_payment", { p_order_id: orderId, p_payment_id: paymentId });
    return json(deps, 200, { ok: true, result, profile: await deps.db.getProfile(user!.id) });
  }

  if (b.razorpay_subscription_id) {
    const subId = String(b.razorpay_subscription_id);
    if (!(await verifySubscriptionSignature(paymentId, subId, signature, keySecret))) return json(deps, 400, { error: "Payment signature is invalid" });
    const pay = await deps.db.getPaymentBySubscription(subId);
    if (!pay || pay.user_id !== user!.id) return json(deps, 403, { error: "This subscription belongs to another account" });
    const sub = await razorpay<{ status: string; current_end?: number }>(deps.fetch, keyId, keySecret, "GET", `/subscriptions/${encodeURIComponent(subId)}`);
    const payment = await razorpay<{ status: string; amount: number }>(deps.fetch, keyId, keySecret, "GET", `/payments/${encodeURIComponent(paymentId)}`);
    // Pro is granted only once money has actually been taken: the first payment is captured for the
    // full plan amount, or Razorpay already reports the subscription as active/charged. A mandate that is
    // only authorised (UPI Autopay waiting for the first debit, or a refundable token charge) does NOT
    // unlock Pro — the subscription.activated / subscription.charged webhook does that when the debit lands.
    const paid = (payment.status === "captured" && Number(payment.amount) >= Number(pay.amount_paise))
      || ["active", "charged"].includes(sub.status);
    if (!paid) {
      const result = await deps.db.rpc("apply_subscription", {
        p_subscription_id: subId, p_status: sub.status === "created" ? "pending" : sub.status, p_current_end: null, p_payment_id: null,
      });
      return json(deps, 202, { ok: true, pending: true, result, profile: await deps.db.getProfile(user!.id) });
    }
    const end = sub.current_end ? new Date(sub.current_end * 1000) : new Date(Date.now() + (pay.product === "pro_yearly" ? 366 : 31) * 864e5);
    const result = await deps.db.rpc("apply_subscription", {
      p_subscription_id: subId, p_status: "active", p_current_end: end.toISOString(), p_payment_id: paymentId,
    });
    return json(deps, 200, { ok: true, result, profile: await deps.db.getProfile(user!.id) });
  }
  return json(deps, 400, { error: "Missing order or subscription id" });
});

// ─────────────────────────────────────── razorpay-webhook: Razorpay → our server (source of truth)
export const webhook = async (req: Request, deps: Deps): Promise<Response> => {
  if (req.method !== "POST") return new Response("Use POST", { status: 405 });
  const secret = deps.env("RAZORPAY_WEBHOOK_SECRET");
  if (!secret) return new Response("Webhook secret not configured", { status: 500 });
  const raw = await req.text();
  const sig = req.headers.get("x-razorpay-signature") || "";
  if (!(await verifyWebhookSignature(raw, sig, secret))) return new Response("Invalid signature", { status: 400 });
  let evt: any;
  try { evt = JSON.parse(raw); } catch { return new Response("Bad JSON", { status: 400 }); }
  const event: string = evt.event || "";
  const payment = evt.payload?.payment?.entity;
  const sub = evt.payload?.subscription?.entity;
  let result = "ignored";
  try {
    if (event === "payment.captured" && payment?.order_id && !payment?.subscription_id && !sub) {
      result = await deps.db.rpc("apply_order_payment", { p_order_id: payment.order_id, p_payment_id: payment.id });
    } else if (sub && event.startsWith("subscription.")) {
      result = await deps.db.rpc("apply_subscription", {
        p_subscription_id: sub.id, p_status: event === "subscription.charged" ? "active" : sub.status,
        p_current_end: sub.current_end ? new Date(sub.current_end * 1000).toISOString() : null,
        p_payment_id: event === "subscription.charged" ? payment?.id ?? null : null,
      });
    }
  } catch (e) {
    // 500 makes Razorpay retry later (e.g. if the database was briefly unavailable).
    return new Response(`Error: ${e instanceof Error ? e.message : e}`, { status: 500 });
  }
  return new Response(JSON.stringify({ ok: true, event, result }), { status: 200, headers: { "Content-Type": "application/json" } });
};

// ─────────────────────────────────────── cancel-subscription: stop renewing (access continues to period end)
export const cancelSubscription = endpoint(true, async (_req, deps, user) => {
  const { keyId, keySecret } = secrets(deps);
  const profile = await deps.db.getProfile(user!.id);
  const subId = profile?.razorpay_subscription_id;
  if (!subId) return json(deps, 400, { error: "No subscription to cancel" });
  const sub = await razorpay<{ status: string }>(deps.fetch, keyId, keySecret, "POST", `/subscriptions/${encodeURIComponent(subId)}/cancel`, { cancel_at_cycle_end: 1 });
  await deps.db.setSubscriptionStatus(user!.id, "cancelling");
  return json(deps, 200, { ok: true, status: sub.status, pro_until: profile?.pro_until });
});

// ─────────────────────────────────────── delete-account: right to erasure (DPDP Act)
export const deleteAccount = endpoint(true, async (req, deps, user) => {
  const { confirm } = await readJson(req);
  if (confirm !== "DELETE") return json(deps, 400, { error: 'Type DELETE to confirm' });
  const profile = await deps.db.getProfile(user!.id);
  const subId = profile?.razorpay_subscription_id;
  if (subId && ["active", "authenticated", "charged", "resumed", "cancelling"].includes(profile?.subscription_status)) {
    try {
      const { keyId, keySecret } = secrets(deps);
      await razorpay(deps.fetch, keyId, keySecret, "POST", `/subscriptions/${encodeURIComponent(subId)}/cancel`, { cancel_at_cycle_end: 0 });
    } catch (e) {
      // Cancelling can fail for harmless reasons: the subscription was never paid ("created" can't be
      // cancelled), it already ended, or it belongs to the other Razorpay mode (a test subscription after
      // switching to live keys → "does not exist"). Only refuse if it is really still able to charge.
      let blocking = true;
      if (e instanceof RazorpayError && (e.status === 400 || e.status === 404)) {
        try {
          const { keyId, keySecret } = secrets(deps);
          const s = await razorpay<{ status: string }>(deps.fetch, keyId, keySecret, "GET", `/subscriptions/${encodeURIComponent(subId)}`);
          blocking = ["authenticated", "active", "pending", "halted", "paused"].includes(s.status);
        } catch (e2) {
          blocking = !(e2 instanceof RazorpayError && (e2.status === 400 || e2.status === 404));
        }
      }
      if (blocking) return json(deps, 502, { error: "Couldn't cancel your subscription, so the account wasn't deleted. Please try again." });
    }
  }
  await deps.db.deleteUser(user!.id);
  return json(deps, 200, { ok: true });
});
