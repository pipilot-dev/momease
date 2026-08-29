// Client-side billing service.
//
// Talks to the MomEase billing Worker (Cloudflare) at BILLING_API_BASE.
// The Worker holds the Stripe secret + webhook secret; this module never
// touches secrets and is safe to bundle in the client.
//
// Flow:
//   1. User taps "Upgrade" → checkoutSession(user) → returns a hosted
//      Stripe Checkout URL. The client redirects the browser to that URL.
//   2. On completion, Stripe redirects back to `${return_url}?checkout=success`.
//   3. The Stripe webhook fires (out of band) and updates KV in the Worker.
//   4. Client calls fetchStatus(user.id) to see the fresh premium flag.
//   5. To manage/cancel, portalSession() returns a Stripe Billing Portal URL.

import { Platform } from "react-native";
import Constants from "expo-constants";

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;

/** Cloudflare Worker base URL. Override via app.json expo.extra.billingApi. */
export const BILLING_API_BASE =
  extra.billingApi || "https://momease-api.pipilot-rpc.workers.dev";

/** Public Stripe Price id for MomEase Premium ($7.99/mo, 7-day trial). */
export const PREMIUM_PRICE_ID =
  extra.stripePremiumPriceId || "price_1U9g9SFL6fziSfdwF4ve8eOn";

export interface SubStatus {
  premium: boolean;
  status: "none" | "trialing" | "active" | "past_due" | "canceled" | "unpaid" | "incomplete" | string;
  current_period_end?: number;
  cancel_at_period_end?: boolean;
  stripe_customer_id?: string;
}

async function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${BILLING_API_BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).error || `billing ${res.status}`);
  return data as T;
}

/** Fetch the user's current subscription status from KV. Non-throwing. */
export async function fetchStatus(userId: string): Promise<SubStatus> {
  try {
    const res = await fetch(`${BILLING_API_BASE}/status?user_id=${encodeURIComponent(userId)}`);
    if (!res.ok) return { premium: false, status: "none" };
    return (await res.json()) as SubStatus;
  } catch {
    return { premium: false, status: "none" };
  }
}

/**
 * Start a subscription checkout. Returns the hosted URL — the caller
 * navigates the browser there. On web we do a full-page redirect; on native
 * we open the URL in the system browser.
 */
export async function checkoutSession(user: {
  id: string;
  email: string;
}, opts?: { priceId?: string; returnUrl?: string }): Promise<{ url: string }> {
  const priceId = opts?.priceId ?? PREMIUM_PRICE_ID;
  const returnUrl =
    opts?.returnUrl ??
    (Platform.OS === "web" && typeof window !== "undefined"
      ? `${window.location.origin}/upgrade`
      : "https://app.mease.mom/upgrade");
  const { url } = await post<{ url: string }>("/checkout", {
    user_id: user.id,
    email: user.email,
    price_id: priceId,
    return_url: returnUrl,
  });
  return { url };
}

/**
 * Create a Billing Portal session so the user can update card, cancel,
 * see invoices. Returns the hosted URL.
 */
export async function portalSession(userId: string, returnUrl?: string): Promise<{ url: string }> {
  const rtn =
    returnUrl ??
    (Platform.OS === "web" && typeof window !== "undefined"
      ? `${window.location.origin}/profile`
      : "https://app.mease.mom/profile");
  return post<{ url: string }>("/portal", {
    user_id: userId,
    return_url: rtn,
  });
}

/** Best-effort browser redirect that works on web and native. */
export async function openBillingUrl(url: string): Promise<void> {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.location.href = url;
    return;
  }
  // Native: open the URL in the system browser via expo-linking. Import
  // dynamically so web builds don't pull it in unused.
  const Linking = await import("expo-linking");
  await Linking.default.openURL(url);
}
