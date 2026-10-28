import { env } from 'cloudflare:test'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { call, formOf, getSession, mockOutbound, signup, stripeSignature } from './helpers'

afterEach(() => vi.restoreAllMocks())

const sub = (over: Record<string, unknown> = {}) => ({
  id: 'sub_1', object: 'subscription', status: 'trialing', customer: 'cus_1',
  current_period_end: 1893456000, cancel_at_period_end: false, metadata: {}, ...over,
})

let evCounter = 0
async function sendEvent(type: string, object: Record<string, unknown>, opts: { id?: string; secret?: string; ts?: number } = {}) {
  const body = JSON.stringify({ id: opts.id ?? `evt_${Date.now()}_${evCounter++}`, type, data: { object } })
  const sig = await stripeSignature(body, opts.secret, opts.ts)
  return call('/billing/webhook', { raw: body, headers: { 'stripe-signature': sig, 'Content-Type': 'application/json' } })
}

describe('POST /billing/checkout', () => {
  it('requires a signed-in user', async () => {
    expect((await call('/billing/checkout', { body: {} })).status).toBe(401)
  })

  it('creates a session with a SERVER-side price, the user id, a 7-day trial; ignores client-supplied price/user', async () => {
    const u = await signup('co')
    let form: URLSearchParams | undefined
    mockOutbound((url, init) => {
      if (url === 'https://api.stripe.com/v1/checkout/sessions') {
        form = formOf(init)
        return Response.json({ id: 'cs_1', url: 'https://checkout.stripe.com/c/pay/cs_1' })
      }
    })
    const r = await call('/billing/checkout', { token: u.token, body: { price_id: 'price_attacker_free', user_id: 'someone-else', return_url: 'https://app.mease.mom/upgrade' } })
    expect(r.status).toBe(200)
    expect(r.json.url).toBe('https://checkout.stripe.com/c/pay/cs_1')
    expect(form!.get('line_items[0][price]')).toBe('price_test_premium')
    expect(form!.get('client_reference_id')).toBe(u.id)
    expect(form!.get('metadata[user_id]')).toBe(u.id)
    expect(form!.get('subscription_data[metadata][user_id]')).toBe(u.id)
    expect(form!.get('subscription_data[trial_period_days]')).toBe('7')
    expect(form!.get('mode')).toBe('subscription')
    expect(form!.get('customer_email')).toBe(u.email)
    expect(form!.get('success_url')).toBe('https://app.mease.mom/upgrade?checkout=success&session_id={CHECKOUT_SESSION_ID}')
  })

  it('defaults the return url and refuses foreign ones (no open redirect via Stripe)', async () => {
    const u = await signup('coret')
    let form: URLSearchParams | undefined
    mockOutbound((url, init) => { if (url.endsWith('/checkout/sessions')) { form = formOf(init); return Response.json({ id: 'cs', url: 'https://x' }) } })
    expect((await call('/billing/checkout', { token: u.token, body: {} })).status).toBe(200)
    expect(form!.get('cancel_url')).toBe('https://app.mease.mom/upgrade?checkout=canceled')
    expect((await call('/billing/checkout', { token: u.token, body: { return_url: 'https://evil.example/x' } })).status).toBe(400)
    expect((await call('/billing/checkout', { token: u.token, body: { return_url: 'javascript:alert(1)' } })).status).toBe(400)
  })

  it('reuses the Stripe customer for returning subscribers', async () => {
    const u = await signup('cus')
    await env.DB.prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ?').bind('cus_known', u.id).run()
    let form: URLSearchParams | undefined
    mockOutbound((url, init) => { if (url.endsWith('/checkout/sessions')) { form = formOf(init); return Response.json({ id: 'cs', url: 'https://x' }) } })
    await call('/billing/checkout', { token: u.token, body: {} })
    expect(form!.get('customer')).toBe('cus_known')
    expect(form!.get('customer_email')).toBeNull()
  })

  it('refuses a second subscription for an active subscriber', async () => {
    const u = await signup('twice')
    await env.DB.prepare("UPDATE users SET role='premium', sub_status='active' WHERE id = ?").bind(u.id).run()
    const r = await call('/billing/checkout', { token: u.token, body: {} })
    expect(r.status).toBe(409)
    expect(r.json.error).toBe('already_subscribed')
  })

  it('maps Stripe failures to 502 without leaking the Stripe error', async () => {
    const u = await signup('stripedown')
    mockOutbound(() => Response.json({ error: { message: 'No such price: sk_live_leak' } }, { status: 400 }))
    const r = await call('/billing/checkout', { token: u.token, body: {} })
    expect(r.status).toBe(502)
    expect(r.text).not.toContain('sk_live_leak')
  })

  it('reports 503 when billing is not configured', async () => {
    const u = await signup('nocfg')
    const r = await call('/billing/checkout', { token: u.token, body: {}, envOverride: { STRIPE_PRICE_ID: '' } })
    expect(r.status).toBe(503)
  })
})

describe('switching Stripe accounts', () => {
  it('checkout forgets a customer id that belongs to another Stripe account and retries with the email', async () => {
    const u = await signup('acctswitch')
    await env.DB.prepare("UPDATE users SET stripe_customer_id = 'cus_OLD_ACCOUNT', role='premium', sub_status='canceled' WHERE id = ?").bind(u.id).run()
    const forms: URLSearchParams[] = []
    mockOutbound((url, init) => {
      if (!url.endsWith('/checkout/sessions')) return
      const f = formOf(init); forms.push(f)
      return f.get('customer') ? Response.json({ error: { message: "No such customer: 'cus_OLD_ACCOUNT'" } }, { status: 400 }) : Response.json({ id: 'cs_new', url: 'https://checkout.stripe.com/new' })
    })
    const r = await call('/billing/checkout', { token: u.token, body: {} })
    expect(r.status).toBe(200)
    expect(forms.map((f) => [f.get('customer'), f.get('customer_email')])).toEqual([['cus_OLD_ACCOUNT', null], [null, u.email]])
    const row = await env.DB.prepare('SELECT stripe_customer_id, role FROM users WHERE id = ?').bind(u.id).first<any>()
    expect(row).toEqual({ stripe_customer_id: null, role: 'free' })
  })

  it('portal with a stale customer id answers 404 and clears it', async () => {
    const u = await signup('acctportal')
    await env.DB.prepare("UPDATE users SET stripe_customer_id = 'cus_OLD_ACCOUNT' WHERE id = ?").bind(u.id).run()
    mockOutbound((url) => (url.endsWith('/billing_portal/sessions') ? Response.json({ error: { message: "No such customer: 'cus_OLD_ACCOUNT'" } }, { status: 400 }) : undefined))
    expect((await call('/billing/portal', { token: u.token, body: {} })).status).toBe(404)
    expect((await env.DB.prepare('SELECT stripe_customer_id c FROM users WHERE id = ?').bind(u.id).first<any>()).c).toBeNull()
  })
})

describe('POST /billing/portal', () => {
  it('404s without a subscription, returns a portal URL with one', async () => {
    const u = await signup('portal')
    expect((await call('/billing/portal', { token: u.token, body: {} })).status).toBe(404)
    await env.DB.prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ?').bind('cus_p', u.id).run()
    let form: URLSearchParams | undefined
    mockOutbound((url, init) => { if (url.endsWith('/billing_portal/sessions')) { form = formOf(init); return Response.json({ url: 'https://billing.stripe.com/p/s1' }) } })
    const r = await call('/billing/portal', { token: u.token, body: {}, envOverride: { STRIPE_PORTAL_CONFIG_ID: 'bpc_momease' } })
    expect(r.json.url).toBe('https://billing.stripe.com/p/s1')
    expect(form!.get('customer')).toBe('cus_p')
    expect(form!.get('configuration')).toBe('bpc_momease')
  })

  it('can only ever open the CALLER’s portal (no user_id parameter exists)', async () => {
    const victim = await signup('victim')
    const attacker = await signup('attacker')
    await env.DB.prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ?').bind('cus_victim', victim.id).run()
    const r = await call('/billing/portal', { token: attacker.token, body: { user_id: victim.id, customer: 'cus_victim' } })
    expect(r.status).toBe(404)
  })
})

describe('POST /billing/webhook', () => {
  it('rejects missing / forged / stale signatures and wrong secrets', async () => {
    const body = JSON.stringify({ id: 'evt_x', type: 'customer.subscription.created', data: { object: sub() } })
    expect((await call('/billing/webhook', { raw: body })).status).toBe(400)
    expect((await call('/billing/webhook', { raw: body, headers: { 'stripe-signature': 't=1,v1=abc' } })).status).toBe(400)
    const wrong = await stripeSignature(body, 'whsec_other')
    expect((await call('/billing/webhook', { raw: body, headers: { 'stripe-signature': wrong } })).status).toBe(400)
    const stale = await stripeSignature(body, undefined, Math.floor(Date.now() / 1000) - 3600)
    expect((await call('/billing/webhook', { raw: body, headers: { 'stripe-signature': stale } })).status).toBe(400)
    const tampered = await stripeSignature(body)
    expect((await call('/billing/webhook', { raw: body + ' ', headers: { 'stripe-signature': tampered } })).status).toBe(400)
  })

  it('subscription created → premium, visible in /session; deleted → back to free', async () => {
    const u = await signup('wh')
    let current = sub({ metadata: { user_id: u.id }, status: 'trialing' })
    mockOutbound((url) => { if (url.endsWith('/subscriptions/sub_1')) return Response.json(current) })

    expect((await sendEvent('customer.subscription.created', current)).status).toBe(200)
    let s = (await getSession(u.token)).json
    expect(s.user.role).toBe('premium')
    expect(s.subscription).toMatchObject({ status: 'trialing', current_period_end: 1893456000, cancel_at_period_end: false })

    current = sub({ metadata: { user_id: u.id }, status: 'active', cancel_at_period_end: true })
    await sendEvent('customer.subscription.updated', current)
    s = (await getSession(u.token)).json
    expect(s.user.role).toBe('premium')
    expect(s.subscription).toMatchObject({ status: 'active', cancel_at_period_end: true })

    current = sub({ metadata: { user_id: u.id }, status: 'canceled' })
    await sendEvent('customer.subscription.deleted', current)
    s = (await getSession(u.token)).json
    expect(s.user.role).toBe('free')
    expect(s.subscription.status).toBe('canceled')
  })

  it('checkout.session.completed links the customer and grants premium', async () => {
    const u = await signup('cs')
    mockOutbound((url) => { if (url.endsWith('/subscriptions/sub_9')) return Response.json(sub({ id: 'sub_9', customer: 'cus_9', metadata: { user_id: u.id } })) })
    await sendEvent('checkout.session.completed', { id: 'cs_9', client_reference_id: u.id, customer: 'cus_9', subscription: 'sub_9' })
    expect((await getSession(u.token)).json.user.role).toBe('premium')
    const row = await env.DB.prepare('SELECT stripe_customer_id FROM users WHERE id = ?').bind(u.id).first<{ stripe_customer_id: string }>()
    expect(row!.stripe_customer_id).toBe('cus_9')
  })

  it('later events find the user by customer id when metadata is missing', async () => {
    const u = await signup('bycus')
    await env.DB.prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ?').bind('cus_lookup', u.id).run()
    mockOutbound((url) => { if (url.endsWith('/subscriptions/sub_l')) return Response.json(sub({ id: 'sub_l', customer: 'cus_lookup', status: 'active' })) })
    await sendEvent('customer.subscription.updated', sub({ id: 'sub_l', customer: 'cus_lookup' }))
    expect((await getSession(u.token)).json.user.role).toBe('premium')
  })

  it('payment failure → past_due → loses premium; invoice.paid restores it', async () => {
    const u = await signup('pf')
    let status = 'past_due'
    mockOutbound((url) => { if (url.endsWith('/subscriptions/sub_pf')) return Response.json(sub({ id: 'sub_pf', status, metadata: { user_id: u.id } })) })
    await sendEvent('invoice.payment_failed', { id: 'in_1', subscription: 'sub_pf' })
    expect((await getSession(u.token)).json.user.role).toBe('free')
    expect((await getSession(u.token)).json.subscription.status).toBe('past_due')
    status = 'active'
    await sendEvent('invoice.paid', { id: 'in_2', subscription: 'sub_pf' })
    expect((await getSession(u.token)).json.user.role).toBe('premium')
  })

  it('uses Stripe as source of truth when events arrive out of order', async () => {
    const u = await signup('ooo')
    // The (older) "created" payload says trialing, but Stripe's live state is already canceled.
    mockOutbound((url) => { if (url.endsWith('/subscriptions/sub_o')) return Response.json(sub({ id: 'sub_o', status: 'canceled', metadata: { user_id: u.id } })) })
    await sendEvent('customer.subscription.created', sub({ id: 'sub_o', status: 'trialing', metadata: { user_id: u.id } }))
    expect((await getSession(u.token)).json.user.role).toBe('free')
  })

  it('is idempotent: a replayed event id is not processed twice', async () => {
    const u = await signup('idem')
    const spy = mockOutbound((url) => { if (url.endsWith('/subscriptions/sub_i')) return Response.json(sub({ id: 'sub_i', metadata: { user_id: u.id } })) })
    const obj = sub({ id: 'sub_i', metadata: { user_id: u.id } })
    expect((await sendEvent('customer.subscription.created', obj, { id: 'evt_same' })).status).toBe(200)
    const calls = spy.mock.calls.length
    const again = await sendEvent('customer.subscription.created', obj, { id: 'evt_same' })
    expect(again.status).toBe(200)
    expect(again.text).toContain('duplicate')
    expect(spy.mock.calls.length).toBe(calls)
  })

  it('acks unrelated events and unknown users without error', async () => {
    mockOutbound((url) => { if (url.includes('/subscriptions/')) return Response.json(sub({ metadata: { user_id: 'does-not-exist' } })) })
    expect((await sendEvent('charge.succeeded', { id: 'ch_1' })).status).toBe(200)
    expect((await sendEvent('customer.subscription.created', sub({ metadata: { user_id: 'does-not-exist' } }))).status).toBe(200)
  })

  it('returns 500 (so Stripe retries) when Stripe is unreachable, and does NOT mark the event done', async () => {
    const u = await signup('retry')
    mockOutbound((url) => { if (url.includes('/subscriptions/')) return new Response('boom', { status: 500 }) })
    const body = { id: 'sub_r', object: 'subscription', status: 'active', customer: 'cus_r', metadata: { user_id: u.id } }
    const r = await sendEvent('checkout.session.completed', { client_reference_id: u.id, subscription: 'sub_r', customer: 'cus_r' }, { id: 'evt_retry' })
    expect(r.status).toBe(500)
    expect(await env.DB.prepare('SELECT 1 FROM stripe_events WHERE id = ?').bind('evt_retry').first()).toBeNull()
    expect((await getSession(u.token)).json.user.role).toBe('free')
    vi.restoreAllMocks()
    mockOutbound((url) => { if (url.includes('/subscriptions/')) return Response.json(body) })
    expect((await sendEvent('checkout.session.completed', { client_reference_id: u.id, subscription: 'sub_r', customer: 'cus_r' }, { id: 'evt_retry' })).status).toBe(200)
    expect((await getSession(u.token)).json.user.role).toBe('premium')
  })
})
