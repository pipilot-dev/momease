// MomEase Data API. Cloudflare Worker + D1. Replaces Supabase.
// Also owns web billing (Stripe Checkout/Portal/webhook) — the role in D1 is
// the single source of truth the native app reads from /session.

import { handleAuth, publicUser, type UserRow } from './routes/auth'
import { handleState } from './routes/state'
import { handleSocial } from './routes/social'
import { handleBilling } from './routes/billing'
import { requireSession } from './lib/session'
import { corsPreflight, withCors } from './lib/cors'

export interface Env {
  DB: D1Database
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  JWT_SIGNING_KEY: string
  APP_SCHEME: string
  ALLOWED_ORIGINS: string
  WEB_APP_URL?: string
  BILLING_RETURN_BASE?: string
  STRIPE_SECRET_KEY?: string
  STRIPE_WEBHOOK_SECRET?: string
  STRIPE_PRICE_ID?: string
  STRIPE_PORTAL_CONFIG_ID?: string
  RESEND_API_KEY?: string
  MAIL_FROM?: string
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (req.method === 'OPTIONS') return corsPreflight(req, env)
    const url = new URL(req.url)
    try {
      if (url.pathname === '/' || url.pathname === '/health') {
        return withCors(req, env, Response.json({ ok: true, service: 'momease-data-api' }))
      }
      if (url.pathname.startsWith('/auth/')) {
        return withCors(req, env, await handleAuth(req, env, ctx, url))
      }
      if (url.pathname.startsWith('/billing/')) {
        return withCors(req, env, await handleBilling(req, env, url))
      }
      // Everything below needs a session.
      const session = await requireSession(req, env)
      if (session instanceof Response) return withCors(req, env, session)
      if (url.pathname === '/session' && req.method === 'GET') {
        return withCors(req, env, await getSession(env, session.userId))
      }
      if (url.pathname === '/state' || url.pathname.startsWith('/state/')) {
        return withCors(req, env, await handleState(req, env, url, session.userId))
      }
      if (url.pathname === '/account' && req.method === 'DELETE') {
        await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(session.userId).run()
        return withCors(req, env, Response.json({ ok: true }))
      }
      const social = await handleSocial(req, env, url, session.userId)
      if (social) return withCors(req, env, social)
      return withCors(req, env, Response.json({ error: 'not_found' }, { status: 404 }))
    } catch (e) {
      console.error('unhandled', e)
      return withCors(req, env, Response.json({ error: 'server_error' }, { status: 500 }))
    }
  },
} satisfies ExportedHandler<Env>

async function getSession(env: Env, uid: string): Promise<Response> {
  const u = await env.DB.prepare(
    'SELECT id, email, meta, role, sub_status, sub_current_period_end, sub_cancel_at_period_end FROM users WHERE id = ?',
  ).bind(uid).first<UserRow>()
  if (!u) return Response.json({ error: 'user_missing' }, { status: 404 })
  return Response.json({
    user: publicUser(u),
    subscription: {
      status: u.sub_status,
      current_period_end: u.sub_current_period_end,
      cancel_at_period_end: !!u.sub_cancel_at_period_end,
    },
  })
}
