// MomEase Data API. Cloudflare Worker + D1. Replaces Supabase.
//
// Note: the /billing endpoints (Stripe checkout/portal/status/webhook) still
// live on the sibling `worker/` deployment — that's intentional and unchanged.

import { handleAuth } from './routes/auth'
import { handleState } from './routes/state'
import { handleSocial } from './routes/social'
import { requireSession } from './lib/session'
import { corsPreflight, withCors } from './lib/cors'

export interface Env {
  DB: D1Database
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  JWT_SIGNING_KEY: string
  APP_SCHEME: string
  ALLOWED_ORIGINS: string
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
      // Social routes: profiles, follows, messages, blocks, reports.
      const social = await handleSocial(req, env, url, session.userId)
      if (social) return withCors(req, env, social)
      return withCors(req, env, Response.json({ error: 'not_found' }, { status: 404 }))
    } catch (e) {
      console.error('unhandled', e)
      const msg = e instanceof Error ? e.message : String(e)
      return withCors(req, env, Response.json({ error: 'server_error', detail: msg }, { status: 500 }))
    }
  },
} satisfies ExportedHandler<Env>

async function getSession(env: Env, uid: string): Promise<Response> {
  const user = await env.DB.prepare('SELECT id, email, meta FROM users WHERE id = ?')
    .bind(uid).first<{ id: string; email: string; meta: string }>()
  if (!user) return Response.json({ error: 'user_missing' }, { status: 404 })
  const meta = safeJson(user.meta)
  return Response.json({ user: { id: user.id, email: user.email, ...meta } })
}

function safeJson(s: string | null | undefined): Record<string, unknown> {
  if (!s) return {}
  try { return JSON.parse(s) as Record<string, unknown> } catch { return {} }
}
