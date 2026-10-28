// Web billing. Subscriptions are bought on the web (Stripe Checkout) and the
// native app only reads the resulting role from /session.
//
//   POST /billing/checkout   (auth)    → { url }  hosted Stripe Checkout
//   POST /billing/portal     (auth)    → { url }  hosted Billing Portal
//   POST /billing/webhook    (Stripe)  → verifies signature, updates users.role

import type { Env } from '../worker'
import { requireSession } from '../lib/session'
import { stripe, verifyStripeSignature } from '../lib/stripe'

const PREMIUM_STATUSES = new Set(['active', 'trialing'])

function allowedReturnUrl(raw: string | undefined, env: Env): string | null {
  const fallback = `${env.BILLING_RETURN_BASE || 'https://app.mease.mom'}/upgrade`
  if (!raw) return fallback
  let u: URL
  try { u = new URL(raw) } catch { return null }
  const allowed = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
  if (!allowed.includes(u.origin) || u.username || u.password) return null
  return `${u.origin}${u.pathname}`
}

export async function handleBilling(req: Request, env: Env, url: URL): Promise<Response> {
  if (url.pathname === '/billing/webhook' && req.method === 'POST') return webhook(req, env)

  const session = await requireSession(req, env)
  if (session instanceof Response) return session

  if (url.pathname === '/billing/checkout' && req.method === 'POST') return checkout(req, env, session.userId)
  if (url.pathname === '/billing/portal' && req.method === 'POST') return portal(req, env, session.userId)
  return Response.json({ error: 'not_found' }, { status: 404 })
}

async function checkout(req: Request, env: Env, uid: string): Promise<Response> {
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PRICE_ID) return Response.json({ error: 'billing_not_configured' }, { status: 503 })
  const b = (await req.json().catch(() => ({}))) as { return_url?: string }
  const returnUrl = allowedReturnUrl(b.return_url, env)
  if (!returnUrl) return Response.json({ error: 'return_url_not_allowed' }, { status: 400 })

  const user = await env.DB.prepare('SELECT email, stripe_customer_id, sub_status FROM users WHERE id = ?')
    .bind(uid).first<{ email: string; stripe_customer_id: string | null; sub_status: string }>()
  if (!user) return Response.json({ error: 'user_missing' }, { status: 404 })
  if (PREMIUM_STATUSES.has(user.sub_status)) return Response.json({ error: 'already_subscribed' }, { status: 409 })

  const form: Record<string, string> = {
    mode: 'subscription',
    'line_items[0][price]': env.STRIPE_PRICE_ID, // fixed server-side: the client never picks a price
    'line_items[0][quantity]': '1',
    'subscription_data[trial_period_days]': '7',
    'subscription_data[metadata][user_id]': uid,
    client_reference_id: uid,
    'metadata[user_id]': uid,
    success_url: `${returnUrl}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${returnUrl}?checkout=canceled`,
    allow_promotion_codes: 'true',
  }
  if (user.stripe_customer_id) form.customer = user.stripe_customer_id
  else form.customer_email = user.email

  try {
    let s
    try {
      s = await stripe(env, 'checkout/sessions', 'POST', form)
    } catch (e) {
      // The stored customer belongs to a different Stripe account (account switch) or was deleted:
      // forget it and let Stripe create a fresh customer from the email.
      if (!user.stripe_customer_id || !/No such customer/i.test(String(e))) throw e
      await env.DB.prepare('UPDATE users SET stripe_customer_id = NULL, sub_status = ?, role = ? WHERE id = ?').bind('none', 'free', uid).run()
      delete form.customer
      form.customer_email = user.email
      s = await stripe(env, 'checkout/sessions', 'POST', form)
    }
    return Response.json({ url: s.url, id: s.id })
  } catch (e) {
    console.error('[billing] checkout failed', e)
    return Response.json({ error: 'checkout_failed' }, { status: 502 })
  }
}

async function portal(req: Request, env: Env, uid: string): Promise<Response> {
  if (!env.STRIPE_SECRET_KEY) return Response.json({ error: 'billing_not_configured' }, { status: 503 })
  const b = (await req.json().catch(() => ({}))) as { return_url?: string }
  const returnUrl = allowedReturnUrl(b.return_url, env)
  if (!returnUrl) return Response.json({ error: 'return_url_not_allowed' }, { status: 400 })

  const user = await env.DB.prepare('SELECT stripe_customer_id FROM users WHERE id = ?')
    .bind(uid).first<{ stripe_customer_id: string | null }>()
  if (!user?.stripe_customer_id) return Response.json({ error: 'no_subscription' }, { status: 404 })
  try {
    const form: Record<string, string> = { customer: user.stripe_customer_id, return_url: returnUrl }
    if (env.STRIPE_PORTAL_CONFIG_ID) form.configuration = env.STRIPE_PORTAL_CONFIG_ID // MomEase-only portal config
    const s = await stripe(env, 'billing_portal/sessions', 'POST', form)
    return Response.json({ url: s.url })
  } catch (e) {
    if (/No such customer/i.test(String(e))) {
      await env.DB.prepare('UPDATE users SET stripe_customer_id = NULL WHERE id = ?').bind(uid).run()
      return Response.json({ error: 'no_subscription' }, { status: 404 })
    }
    console.error('[billing] portal failed', e)
    return Response.json({ error: 'portal_failed' }, { status: 502 })
  }
}

async function webhook(req: Request, env: Env): Promise<Response> {
  const sig = req.headers.get('stripe-signature')
  const raw = await req.text()
  if (!env.STRIPE_WEBHOOK_SECRET || !sig || !(await verifyStripeSignature(raw, sig, env.STRIPE_WEBHOOK_SECRET))) {
    return new Response('bad signature', { status: 400 })
  }
  let event: any
  try { event = JSON.parse(raw) } catch { return new Response('bad json', { status: 400 }) }

  const seen = await env.DB.prepare('SELECT 1 FROM stripe_events WHERE id = ?').bind(event.id).first()
  if (seen) return new Response('ok (duplicate)', { status: 200 })

  try {
    await applyEvent(env, event)
  } catch (e) {
    console.error('[billing] webhook processing failed', event.type, e)
    return new Response('processing error', { status: 500 }) // Stripe will retry
  }
  await env.DB.prepare('INSERT OR IGNORE INTO stripe_events (id, type) VALUES (?, ?)').bind(event.id, event.type).run()
  return new Response('ok', { status: 200 })
}

function subscriptionIdOf(type: string, obj: any): string | null {
  if (type === 'checkout.session.completed') return obj.subscription ?? null
  if (type.startsWith('customer.subscription.')) return obj.id ?? null
  if (type.startsWith('invoice.')) return typeof obj.subscription === 'string' ? obj.subscription : obj.subscription?.id ?? null
  return null
}

async function applyEvent(env: Env, event: any): Promise<void> {
  const type: string = event.type
  const obj = event.data?.object
  if (!obj) return
  const handled =
    type === 'checkout.session.completed' ||
    type.startsWith('customer.subscription.') ||
    type === 'invoice.payment_failed' ||
    type === 'invoice.paid'
  if (!handled) return

  // Events can arrive out of order, so re-read the subscription from Stripe
  // (the source of truth) instead of trusting the event payload's snapshot.
  let sub: any = type.startsWith('customer.subscription.') ? obj : null
  const subId = subscriptionIdOf(type, obj)
  if (subId) {
    try { sub = await stripe(env, `subscriptions/${subId}`, 'GET') } catch (e) {
      if (!sub) throw e
    }
  }
  if (!sub) return

  const customerId: string | null = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null
  let userId: string | null = sub.metadata?.user_id ?? obj.client_reference_id ?? obj.metadata?.user_id ?? null
  if (!userId && customerId) {
    const row = await env.DB.prepare('SELECT id FROM users WHERE stripe_customer_id = ?').bind(customerId).first<{ id: string }>()
    userId = row?.id ?? null
  }
  if (!userId) return
  const exists = await env.DB.prepare('SELECT 1 FROM users WHERE id = ?').bind(userId).first()
  if (!exists) return

  const premium = PREMIUM_STATUSES.has(sub.status)
  await env.DB.prepare(
    `UPDATE users SET role = ?, sub_status = ?, sub_current_period_end = ?, sub_cancel_at_period_end = ?,
       stripe_customer_id = COALESCE(?, stripe_customer_id) WHERE id = ?`,
  ).bind(premium ? 'premium' : 'free', sub.status, sub.current_period_end ?? null, sub.cancel_at_period_end ? 1 : 0, customerId, userId).run()
}
