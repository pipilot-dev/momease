// Client-side billing service.
//
// Subscriptions are bought on the WEB (Stripe Checkout) and the app only reads
// the result. The server decides the price and who the customer is, from the
// signed-in session -- this module never sends a price id or user id.
//
// Flow:
//   1. User taps "Upgrade" -> checkoutSession() -> hosted Stripe Checkout URL.
//   2. Stripe redirects back to `${return}?checkout=success`.
//   3. Stripe's webhook (out of band) sets role=premium in the API's database.
//   4. The app calls fetchStatus() -> GET /session to see the fresh role.
//   5. portalSession() returns a Stripe Billing Portal URL to manage/cancel.

import { Platform } from "react-native";
import { api } from "./api";

export interface SubStatus {
  premium: boolean;
  status: "none" | "trialing" | "active" | "past_due" | "canceled" | "unpaid" | "incomplete" | string;
  current_period_end?: number;
  cancel_at_period_end?: boolean;
}

interface SessionPayload {
  user: { role?: string };
  subscription?: { status: string; current_period_end: number | null; cancel_at_period_end: boolean };
}

/** Read the signed-in user's subscription from the server. Non-throwing. */
export async function fetchStatus(_userId?: string): Promise<SubStatus> {
  try {
    const s = await api.get<SessionPayload>("/session");
    return {
      premium: s.user.role === "premium",
      status: s.subscription?.status ?? "none",
      current_period_end: s.subscription?.current_period_end ?? undefined,
      cancel_at_period_end: s.subscription?.cancel_at_period_end,
    };
  } catch {
    return { premium: false, status: "none" };
  }
}

function defaultReturn(path: string): string {
  return Platform.OS === "web" && typeof window !== "undefined"
    ? `${window.location.origin}${path}`
    : `https://app.mease.mom${path}`;
}

/**
 * Start a subscription checkout. Returns the hosted URL; the caller navigates
 * the browser there (full-page redirect on web, system browser on native).
 */
export async function checkoutSession(
  _user?: { id: string; email: string },
  opts?: { returnUrl?: string },
): Promise<{ url: string }> {
  const { usesExternalBrowserForCheckout } = await import("./env");
  // Native hands off to the system browser, so land on a friendly page that
  // helps the user hop back into the app.
  const returnUrl = opts?.returnUrl ?? (usesExternalBrowserForCheckout ? "https://app.mease.mom/upgrade" : defaultReturn("/upgrade"));
  return api.post<{ url: string }>("/billing/checkout", { return_url: returnUrl });
}

/** Billing Portal session so the user can update card, cancel, see invoices. */
export async function portalSession(_userId?: string, returnUrl?: string): Promise<{ url: string }> {
  return api.post<{ url: string }>("/billing/portal", { return_url: returnUrl ?? defaultReturn("/upgrade") });
}

/** Best-effort browser redirect that works on web and native. */
export async function openBillingUrl(url: string): Promise<void> {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.location.href = url;
    return;
  }
  const Linking = await import("expo-linking");
  await Linking.default.openURL(url);
}
