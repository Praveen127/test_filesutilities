// The price list. The server is the only place prices are decided — the browser just asks for a product id.
// Amounts are in paise (₹1 = 100 paise). Keep the display prices in index.html (FILEUTILO_CONFIG.prices) in sync.
// Subscriptions are billed by Razorpay Plans: create one monthly and one yearly plan in the Razorpay Dashboard
// with these amounts, then set their ids as the RAZORPAY_PLAN_MONTHLY / RAZORPAY_PLAN_YEARLY secrets.

export type Product =
  | { id: string; kind: "subscription"; label: string; amount: number; planEnv: string; totalCount: number }
  | { id: string; kind: "one_time"; label: string; amount: number; grantPlan?: "lifetime"; grantCredits?: number };

export const PRODUCTS: Record<string, Product> = {
  pro_monthly: { id: "pro_monthly", kind: "subscription", label: "Fileutilo Pro — monthly", amount: 14900, planEnv: "RAZORPAY_PLAN_MONTHLY", totalCount: 120 },
  pro_yearly: { id: "pro_yearly", kind: "subscription", label: "Fileutilo Pro — yearly", amount: 99900, planEnv: "RAZORPAY_PLAN_YEARLY", totalCount: 10 },
  lifetime: { id: "lifetime", kind: "one_time", label: "Fileutilo Pro — lifetime", amount: 299900, grantPlan: "lifetime" },
  credits_50: { id: "credits_50", kind: "one_time", label: "50 Fileutilo credits", amount: 4900, grantCredits: 50 },
  credits_250: { id: "credits_250", kind: "one_time", label: "250 Fileutilo credits", amount: 19900, grantCredits: 250 },
};
