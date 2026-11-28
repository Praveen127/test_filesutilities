// Tests for the payment Edge Functions: run with  npx tsx tests/functions.test.ts
// Needs a local Postgres: createdb fb; psql -d fb -f tests/auth-stub.sql -f supabase/migrations/*.sql; set PSQL if not default. Razorpay is simulated.
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { createOrder, verifyPayment, webhook, cancelSubscription, deleteAccount, type Deps } from "../supabase/functions/_shared/handlers.ts";
import { hmacSha256Hex } from "../supabase/functions/_shared/razorpay.ts";

const PSQL = (process.env.PSQL || "psql -h /tmp/pgsock -p 5499 -U postgres -d fb").split(" ");
const sql = (q: string) => execFileSync(PSQL[0], [...PSQL.slice(1), "-qAt", "-v", "ON_ERROR_STOP=1", "-c", `set role service_role; ${q}`]).toString().trim();
const lit = (v: unknown) => v === null || v === undefined ? "null" : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`;
const one = (q: string) => { const r = sql(`select row_to_json(t) from (${q}) t limit 1`); return r ? JSON.parse(r) : null; };

const ASHA = "aaaaaaaa-0000-0000-0000-000000000001", RAVI = "aaaaaaaa-0000-0000-0000-000000000002";
execFileSync(PSQL[0], [...PSQL.slice(1), "-qAt", "-c", `delete from public.payments; delete from auth.users where id in ('${ASHA}','${RAVI}');
  insert into auth.users(id,email,phone,raw_user_meta_data) values ('${ASHA}','asha@example.com','+919845000001','{"full_name":"Asha Rao"}'),('${RAVI}','ravi@example.com',null,'{}');`]);

const SECRET = "test_secret_123", WH = "whsec_456";
const env: Record<string, string> = { RAZORPAY_KEY_ID: "rzp_test_abc", RAZORPAY_KEY_SECRET: SECRET, RAZORPAY_WEBHOOK_SECRET: WH, RAZORPAY_PLAN_MONTHLY: "plan_M", RAZORPAY_PLAN_YEARLY: "plan_Y" };
const calls: { method: string; path: string; body: any; auth: string }[] = [];
let n = 0;
const payState: Record<string, { status: string; amount: number }> = {};
const subState: Record<string, string> = {};
const fakeFetch = (async (url: string, init: any) => {
  const path = url.replace("https://api.razorpay.com/v1", ""), body = init.body ? JSON.parse(init.body) : undefined;
  calls.push({ method: init.method, path, body, auth: init.headers.Authorization });
  const ok = (d: unknown) => new Response(JSON.stringify(d), { status: 200 });
  if (path === "/orders") return ok({ id: `order_T${++n}`, amount: body.amount, status: "created" });
  if (path === "/subscriptions") return ok({ id: `sub_T${++n}`, status: "created" });
  if (path.includes("sub_GONE")) return new Response(JSON.stringify({ error: { description: "The id provided does not exist" } }), { status: 400 });
  if (path.includes("sub_DOWN")) return new Response(JSON.stringify({ error: { description: "server error" } }), { status: 500 });
  if (/^\/payments\/[^/]+$/.test(path)) return ok({ id: path.split("/")[2], ...(payState[path.split("/")[2]] ?? { status: "captured", amount: 14900 }) });
  if (/^\/subscriptions\/[^/]+$/.test(path)) return ok({ id: path.split("/")[2], status: subState[path.split("/")[2]] ?? "active", current_end: Math.floor(Date.now() / 1000) + 30 * 86400 });
  if (/\/cancel$/.test(path)) return ok({ status: "active" });
  return new Response(JSON.stringify({ error: { description: "not found" } }), { status: 404 });
}) as unknown as typeof fetch;

const deps: Deps = {
  env: (k) => env[k],
  fetch: fakeFetch,
  getUser: async (a) => a === "Bearer tok-asha" ? { id: ASHA, email: "asha@example.com", phone: "+919845000001" } : a === "Bearer tok-ravi" ? { id: RAVI, email: "ravi@example.com" } : null,
  db: {
    getProfile: async (id) => one(`select * from public.profiles where id = ${lit(id)}`),
    insertPayment: async (row) => { const k = Object.keys(row); sql(`insert into public.payments (${k.join(",")}) values (${k.map((x) => lit((row as any)[x])).join(",")})`); },
    getPaymentByOrder: async (o) => one(`select * from public.payments where razorpay_order_id = ${lit(o)}`),
    getPaymentBySubscription: async (s) => one(`select * from public.payments where razorpay_subscription_id = ${lit(s)} order by id`),
    setSubscriptionStatus: async (id, st) => { sql(`update public.profiles set subscription_status = ${lit(st)} where id = ${lit(id)}`); },
    rpc: async (fn, a) => fn === "apply_order_payment"
      ? sql(`select public.apply_order_payment(${lit(a.p_order_id)}, ${lit(a.p_payment_id)})`)
      : sql(`select public.apply_subscription(${lit(a.p_subscription_id)}, ${lit(a.p_status)}, ${lit(a.p_current_end)}::timestamptz, ${lit(a.p_payment_id)})`),
    deleteUser: async (id) => { sql(`reset role; delete from auth.users where id = ${lit(id)}`); },
  },
};
const req = (body: unknown, token?: string, extra: Record<string, string> = {}) => new Request("https://x.supabase.co/functions/v1/f", {
  method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra }, body: typeof body === "string" ? body : JSON.stringify(body) });
const call = async (h: (r: Request, d: Deps) => Promise<Response>, r: Request) => { const res = await h(r, deps); const t = await res.text(); let j: any; try { j = JSON.parse(t); } catch { j = t; } return { status: res.status, body: j }; };
const prof = (id: string) => one(`select plan, credits, pro_until, subscription_status, razorpay_subscription_id from public.profiles where id = ${lit(id)}`);
let passed = 0; const ok = (name: string) => { passed++; console.log("  ✓", name); };

// ── basics
assert.equal((await createOrder(new Request("https://x/f", { method: "OPTIONS" }), deps)).status, 200); ok("CORS pre-flight");
assert.equal((await call(createOrder, req({ product: "credits_50" }))).status, 401); ok("signed-out users are rejected");
assert.equal((await call(createOrder, req({ product: "gold" }, "tok-asha"))).status, 400); ok("unknown products are rejected");

// ── credits pack: order → checkout → verify
let r = await call(createOrder, req({ product: "credits_50" }, "tok-asha"));
assert.equal(r.status, 200); assert.equal(r.body.amount, 4900); assert.ok(r.body.order_id); assert.equal(r.body.key, "rzp_test_abc");
assert.equal(calls.at(-1)!.body.amount, 4900); assert.equal(calls.at(-1)!.auth, "Basic " + btoa("rzp_test_abc:" + SECRET));
assert.equal(calls.at(-1)!.body.notes.user_id, ASHA); ok("credits order created with the server price (₹49)");
const order = r.body.order_id;
r = await call(verifyPayment, req({ razorpay_order_id: order, razorpay_payment_id: "pay_1", razorpay_signature: "forged" }, "tok-asha"));
assert.equal(r.status, 400); assert.equal(prof(ASHA).credits, 0); ok("forged signature is refused and grants nothing");
const sig = await hmacSha256Hex(SECRET, `${order}|pay_1`);
r = await call(verifyPayment, req({ razorpay_order_id: order, razorpay_payment_id: "pay_1", razorpay_signature: sig }, "tok-ravi"));
assert.equal(r.status, 403); assert.equal(prof(RAVI).credits, 0); ok("another user can't claim Asha's payment");
r = await call(verifyPayment, req({ razorpay_order_id: order, razorpay_payment_id: "pay_1", razorpay_signature: sig }, "tok-asha"));
assert.equal(r.status, 200); assert.equal(r.body.result, "applied"); assert.equal(prof(ASHA).credits, 50); ok("valid payment adds 50 credits");
r = await call(verifyPayment, req({ razorpay_order_id: order, razorpay_payment_id: "pay_1", razorpay_signature: sig }, "tok-asha"));
assert.equal(r.body.result, "already_applied"); assert.equal(prof(ASHA).credits, 50); ok("replaying the same payment doesn't add credits twice");

// ── webhook for the same order (arrives after verify): idempotent
const capt = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_1", order_id: order } } } });
r = await call(webhook, req(capt, undefined, { "x-razorpay-signature": "bad" })); assert.equal(r.status, 400); ok("webhook with a bad signature is refused");
r = await call(webhook, req(capt, undefined, { "x-razorpay-signature": await hmacSha256Hex(WH, capt) }));
assert.equal(r.status, 200); assert.equal(r.body.result, "already_applied"); assert.equal(prof(ASHA).credits, 50); ok("webhook + verify together still grant once");

// ── lifetime via webhook only (user closed the tab before verify ran)
r = await call(createOrder, req({ product: "lifetime" }, "tok-ravi")); assert.equal(r.body.amount, 299900);
const lifeOrder = r.body.order_id;
const capt2 = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_L", order_id: lifeOrder } } } });
r = await call(webhook, req(capt2, undefined, { "x-razorpay-signature": await hmacSha256Hex(WH, capt2) }));
assert.equal(r.body.result, "applied"); assert.equal(prof(RAVI).plan, "lifetime"); ok("lifetime unlocked by the webhook alone");
r = await call(createOrder, req({ product: "pro_monthly" }, "tok-ravi")); assert.equal(r.status, 400); ok("lifetime users aren't offered a subscription");

// ── subscription: create → verify → renewal webhook → cancel
r = await call(createOrder, req({ product: "pro_monthly" }, "tok-asha"));
assert.equal(r.status, 200); assert.ok(r.body.subscription_id); assert.equal(calls.at(-1)!.body.plan_id, "plan_M"); ok("monthly subscription created on the Razorpay plan");
const subId = r.body.subscription_id;
// UPI Autopay: mandate approved but the first debit hasn't landed yet → no Pro
subState[subId] = "created"; payState["pay_S1"] = { status: "authorized", amount: 14900 };
const ssig = await hmacSha256Hex(SECRET, `pay_S1|${subId}`);
r = await call(verifyPayment, req({ razorpay_subscription_id: subId, razorpay_payment_id: "pay_S1", razorpay_signature: ssig }, "tok-asha"));
assert.equal(r.status, 202); assert.equal(r.body.pending, true); assert.equal(prof(ASHA).plan, "free"); assert.equal(prof(ASHA).subscription_status, "pending");
ok("authorised-but-not-charged subscription does NOT unlock Pro");
const authEvt = JSON.stringify({ event: "subscription.authenticated", payload: { subscription: { entity: { id: subId, status: "authenticated" } } } });
r = await call(webhook, req(authEvt, undefined, { "x-razorpay-signature": await hmacSha256Hex(WH, authEvt) }));
assert.equal(r.status, 200); assert.equal(prof(ASHA).plan, "free"); ok("subscription.authenticated webhook does NOT unlock Pro");
// token-amount authorisation (₹5 refunded) is not a real payment either
subState[subId] = "authenticated"; payState["pay_S1"] = { status: "captured", amount: 500 };
r = await call(verifyPayment, req({ razorpay_subscription_id: subId, razorpay_payment_id: "pay_S1", razorpay_signature: ssig }, "tok-asha"));
assert.equal(r.status, 202); assert.equal(prof(ASHA).plan, "free"); ok("token authorisation charge does NOT unlock Pro");
// first debit captured for the full amount → Pro
delete subState[subId]; subState[subId] = "created"; payState["pay_S1"] = { status: "captured", amount: 14900 };
r = await call(verifyPayment, req({ razorpay_subscription_id: subId, razorpay_payment_id: "pay_S1", razorpay_signature: ssig }, "tok-asha"));
assert.equal(r.status, 200); let p = prof(ASHA); assert.equal(p.plan, "pro"); assert.ok(new Date(p.pro_until) > new Date(Date.now() + 29 * 864e5)); ok("subscription payment activates Pro for ~30 days");
r = await call(createOrder, req({ product: "pro_yearly" }, "tok-asha")); assert.equal(r.status, 400); ok("can't start a second subscription while one is active");
const charged = JSON.stringify({ event: "subscription.charged", payload: { subscription: { entity: { id: subId, status: "active", current_end: Math.floor(Date.now() / 1000) + 61 * 86400 } }, payment: { entity: { id: "pay_S2" } } } });
r = await call(webhook, req(charged, undefined, { "x-razorpay-signature": await hmacSha256Hex(WH, charged) }));
assert.equal(r.status, 200); p = prof(ASHA); assert.ok(new Date(p.pro_until) > new Date(Date.now() + 60 * 864e5));
assert.equal(Number(sql(`select count(*) from public.payments where razorpay_subscription_id = '${subId}' and status = 'paid'`)), 2); ok("renewal webhook extends Pro and records the payment");
r = await call(cancelSubscription, req({}, "tok-asha"));
assert.equal(r.status, 200); assert.deepEqual(calls.at(-1)!.body, { cancel_at_cycle_end: 1 }); assert.equal(prof(ASHA).subscription_status, "cancelling");
assert.equal(prof(ASHA).plan, "pro"); ok("cancel stops renewal but keeps Pro until the paid period ends");

// ── account deletion
r = await call(deleteAccount, req({}, "tok-asha")); assert.equal(r.status, 400); ok("deletion needs typed confirmation");
r = await call(deleteAccount, req({ confirm: "DELETE" }, "tok-asha"));
assert.equal(r.status, 200); assert.equal(prof(ASHA), null); assert.deepEqual(calls.at(-1)!.body, { cancel_at_cycle_end: 0 });
assert.ok(Number(sql(`select count(*) from public.payments where user_id is null`)) >= 3); ok("account deleted, subscription cancelled, payment records kept for tax");

sql(`update public.profiles set razorpay_subscription_id = 'sub_DOWN', subscription_status = 'active' where id = '${RAVI}'`);
r = await call(deleteAccount, req({ confirm: "DELETE" }, "tok-ravi")); assert.equal(r.status, 502); assert.ok(prof(RAVI)); ok("deletion refused when a live subscription couldn't be cancelled");
sql(`update public.profiles set razorpay_subscription_id = 'sub_GONE', subscription_status = 'pending' where id = '${RAVI}'`);
r = await call(deleteAccount, req({ confirm: "DELETE" }, "tok-ravi")); assert.equal(r.status, 200); assert.equal(prof(RAVI), null); ok("unpaid / other-mode subscription doesn't block deletion");

// ── misconfiguration
delete env.RAZORPAY_KEY_SECRET;
r = await call(createOrder, req({ product: "credits_50" }, "tok-ravi")); assert.equal(r.status, 500); assert.match(r.body.error, /aren't configured/); ok("clear error when Razorpay keys are missing");
console.log(`\n${passed} tests passed`);
