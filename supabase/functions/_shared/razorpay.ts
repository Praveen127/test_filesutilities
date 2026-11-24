// Razorpay helpers: signature checks (HMAC-SHA256) and a small REST client. Uses only Web Crypto + fetch,
// so it runs unchanged on Supabase Edge Functions (Deno) and in the Node test suite.

const enc = new TextEncoder();

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(message)));
  return Array.from(sig, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time string comparison, so signatures can't be guessed byte by byte from response timing. */
export function safeEqual(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Checkout success for a one-time order: signature = HMAC(order_id + "|" + payment_id, key_secret). */
export async function verifyOrderSignature(orderId: string, paymentId: string, signature: string, keySecret: string) {
  return safeEqual(await hmacSha256Hex(keySecret, `${orderId}|${paymentId}`), signature);
}

/** Checkout success for a subscription: signature = HMAC(payment_id + "|" + subscription_id, key_secret). */
export async function verifySubscriptionSignature(paymentId: string, subscriptionId: string, signature: string, keySecret: string) {
  return safeEqual(await hmacSha256Hex(keySecret, `${paymentId}|${subscriptionId}`), signature);
}

/** Webhooks: X-Razorpay-Signature = HMAC(raw request body, webhook_secret). Always check the raw body. */
export async function verifyWebhookSignature(rawBody: string, signature: string, webhookSecret: string) {
  return safeEqual(await hmacSha256Hex(webhookSecret, rawBody), signature);
}

export class RazorpayError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function razorpay<T = Record<string, unknown>>(
  fetchImpl: typeof fetch, keyId: string, keySecret: string, method: "GET" | "POST", path: string, body?: unknown,
): Promise<T> {
  const res = await fetchImpl(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: { "Authorization": "Basic " + btoa(`${keyId}:${keySecret}`), "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch { /* non-JSON error page */ }
  if (!res.ok) throw new RazorpayError(data?.error?.description || `Razorpay error ${res.status}`, res.status);
  return data as T;
}
