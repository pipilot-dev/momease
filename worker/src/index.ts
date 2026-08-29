// MomEase billing API — Cloudflare Worker.
//
// Endpoints (all JSON, all CORS-safe for the PWA origins):
//
//   POST /checkout   → returns { url } — hosted Stripe Checkout session
//     body: { user_id, email, price_id, return_url }
//
//   POST /portal     → returns { url } — hosted Stripe Billing Portal
//     body: { user_id, return_url }
//
//   GET  /status?user_id=...
//                    → returns { premium, status, current_period_end, cancel_at_period_end }
//     Read from KV; source of truth is Stripe (webhook updates KV).
//
//   POST /webhook    → Stripe → us. Verifies signature, updates KV.
//     Header: Stripe-Signature
//
// Secrets (never in code): STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET.
// KV: SUBS namespace, key `sub:<user_id>`, value JSON.

export interface Env {
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  SUBS: KVNamespace;
}

const ALLOWED_ORIGINS = new Set([
  "https://app.mease.mom",
  "https://mease.mom",
  "https://www.mease.mom",
  "https://momease-app.pages.dev",
  "https://momease-landing.pages.dev",
]);

function cors(origin: string | null): HeadersInit {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://app.mease.mom";
  return {
    "access-control-allow-origin": allow,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,authorization",
    "access-control-max-age": "86400",
    vary: "origin",
  };
}

function json(body: unknown, init: ResponseInit = {}, origin: string | null = null): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json",
      ...cors(origin),
      ...(init.headers || {}),
    },
  });
}

/**
 * Call Stripe's REST API with form-encoded body (their SDK is bulky for Workers).
 * Nested keys use `foo[bar]` — Stripe's convention.
 */
async function stripe(
  env: Env,
  path: string,
  method: "GET" | "POST",
  form?: Record<string, string>
): Promise<any> {
  const url = `https://api.stripe.com/v1/${path}`;
  const body = form ? new URLSearchParams(form).toString() : undefined;
  const res = await fetch(url, {
    method,
    headers: {
      authorization: `Basic ${btoa(`${env.STRIPE_SECRET_KEY}:`)}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Stripe ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

/**
 * Verify a Stripe webhook signature. Stripe signs with HMAC-SHA256 over
 * `${timestamp}.${rawBody}`. Header looks like `t=123,v1=hex,v1=hex`.
 * We accept if any v1 matches. Timestamp tolerance: 5 minutes.
 */
async function verifyStripeSignature(
  rawBody: string,
  header: string,
  secret: string
): Promise<boolean> {
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const [k, ...v] = p.split("=");
      return [k, v.join("=")];
    })
  );
  const ts = parts.t;
  if (!ts) return false;
  const age = Math.abs(Date.now() / 1000 - Number(ts));
  if (age > 300) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${ts}.${rawBody}`));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");

  const provided = header
    .split(",")
    .filter((p) => p.startsWith("v1="))
    .map((p) => p.slice(3));
  return provided.some((v) => timingSafeEqual(v, hex));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

interface SubStatus {
  premium: boolean;
  status: string;
  current_period_end?: number;
  cancel_at_period_end?: boolean;
  stripe_customer_id?: string;
}

async function readSub(env: Env, userId: string): Promise<SubStatus> {
  const raw = await env.SUBS.get(`sub:${userId}`);
  if (!raw) return { premium: false, status: "none" };
  try {
    return JSON.parse(raw) as SubStatus;
  } catch {
    return { premium: false, status: "none" };
  }
}

async function writeSub(env: Env, userId: string, sub: SubStatus): Promise<void> {
  await env.SUBS.put(`sub:${userId}`, JSON.stringify(sub));
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const origin = req.headers.get("origin");
    if (req.method === "OPTIONS") return new Response(null, { headers: cors(origin) });

    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    try {
      // ─── POST /checkout ────────────────────────────────────────────────
      if (path === "/checkout" && req.method === "POST") {
        const { user_id, email, price_id, return_url } = (await req.json()) as any;
        if (!user_id || !email || !price_id || !return_url) {
          return json({ error: "user_id, email, price_id, return_url are required" }, { status: 400 }, origin);
        }

        // Reuse an existing Stripe customer for this user if we've seen them
        // before; otherwise Stripe will create one and the webhook will
        // stash the id in KV for next time.
        const existing = await readSub(env, user_id);
        const customerArg = existing.stripe_customer_id
          ? { customer: existing.stripe_customer_id }
          : { customer_email: email };

        const session = await stripe(env, "checkout/sessions", "POST", {
          mode: "subscription",
          "line_items[0][price]": price_id,
          "line_items[0][quantity]": "1",
          "subscription_data[trial_period_days]": "7",
          client_reference_id: user_id,
          "metadata[user_id]": user_id,
          success_url: `${return_url}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${return_url}?checkout=canceled`,
          allow_promotion_codes: "true",
          ...Object.fromEntries(Object.entries(customerArg)),
        });
        return json({ url: session.url, id: session.id }, {}, origin);
      }

      // ─── POST /portal ─────────────────────────────────────────────────
      if (path === "/portal" && req.method === "POST") {
        const { user_id, return_url } = (await req.json()) as any;
        if (!user_id || !return_url) {
          return json({ error: "user_id and return_url are required" }, { status: 400 }, origin);
        }
        const sub = await readSub(env, user_id);
        if (!sub.stripe_customer_id) {
          return json({ error: "no subscription found" }, { status: 404 }, origin);
        }
        const session = await stripe(env, "billing_portal/sessions", "POST", {
          customer: sub.stripe_customer_id,
          return_url,
        });
        return json({ url: session.url }, {}, origin);
      }

      // ─── GET /status?user_id=... ──────────────────────────────────────
      if (path === "/status" && req.method === "GET") {
        const user_id = url.searchParams.get("user_id");
        if (!user_id) return json({ error: "user_id is required" }, { status: 400 }, origin);
        const sub = await readSub(env, user_id);
        return json(sub, {}, origin);
      }

      // ─── POST /webhook (from Stripe) ──────────────────────────────────
      if (path === "/webhook" && req.method === "POST") {
        const sig = req.headers.get("stripe-signature");
        const raw = await req.text();
        if (!sig || !(await verifyStripeSignature(raw, sig, env.STRIPE_WEBHOOK_SECRET))) {
          return new Response("bad signature", { status: 400 });
        }
        const event = JSON.parse(raw);
        await handleStripeEvent(env, event);
        return new Response("ok", { status: 200 });
      }

      // ─── GET / — health ───────────────────────────────────────────────
      if (path === "/" && req.method === "GET") {
        return json({ service: "momease-api", ok: true }, {}, origin);
      }

      return json({ error: "not found", path }, { status: 404 }, origin);
    } catch (err) {
      console.error(err);
      return json({ error: (err as Error).message }, { status: 500 }, origin);
    }
  },
};

async function handleStripeEvent(env: Env, event: any): Promise<void> {
  const type = event.type as string;
  const data = event.data.object;

  // Every subscription event carries the customer id; we resolve the app's
  // user_id from the subscription's metadata (set at checkout time).
  const userIdFromMeta = data?.metadata?.user_id;
  const userIdFromRef = data?.client_reference_id;
  const userId = userIdFromMeta || userIdFromRef;

  if (type === "checkout.session.completed") {
    // First-time subscribe. Stripe has issued a subscription id; fetch the
    // full sub to get period + status.
    const uid = userIdFromRef || userIdFromMeta;
    if (!uid) return;
    const subId = data.subscription;
    const customerId = data.customer;
    if (subId) {
      const sub = await stripe(env, `subscriptions/${subId}`, "GET");
      await writeSub(env, uid, {
        premium: sub.status === "active" || sub.status === "trialing",
        status: sub.status,
        current_period_end: sub.current_period_end,
        cancel_at_period_end: sub.cancel_at_period_end,
        stripe_customer_id: customerId,
      });
    }
    return;
  }

  if (
    type === "customer.subscription.created" ||
    type === "customer.subscription.updated" ||
    type === "customer.subscription.deleted"
  ) {
    if (!userId) return;
    await writeSub(env, userId, {
      premium: data.status === "active" || data.status === "trialing",
      status: data.status,
      current_period_end: data.current_period_end,
      cancel_at_period_end: data.cancel_at_period_end,
      stripe_customer_id: data.customer,
    });
    return;
  }

  if (type === "invoice.payment_failed") {
    // A billing failure — mark past_due so the app can nudge the user to
    // fix payment in the portal.
    if (!userId) return;
    const current = await readSub(env, userId);
    await writeSub(env, userId, { ...current, premium: false, status: "past_due" });
    return;
  }
}
