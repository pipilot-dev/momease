// /auth/* — email/password + Google OAuth (Web client, code flow) + password reset.

import type { Env } from '../worker'
import { hashPassword, verifyPassword } from '../lib/password'
import { issueSession, requireSession, revokeSession } from '../lib/session'
import { signJwt, verifyJwt } from '../lib/jwt'

const GOOGLE_AUTHORIZE = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO = 'https://openidconnect.googleapis.com/v1/userinfo'

export async function handleAuth(req: Request, env: Env, _ctx: ExecutionContext, url: URL): Promise<Response> {
  const path = url.pathname
  if (path === '/auth/signup' && req.method === 'POST') return signup(req, env)
  if (path === '/auth/signin' && req.method === 'POST') return signin(req, env)
  if (path === '/auth/signout' && req.method === 'POST') return signout(req, env)
  if (path === '/auth/update' && req.method === 'POST') return updateMeta(req, env)
  if (path === '/auth/reset/request' && req.method === 'POST') return resetRequest(req, env)
  if (path === '/auth/reset/confirm' && req.method === 'POST') return resetConfirm(req, env)
  if (path === '/auth/google/start' && req.method === 'GET') return googleStart(env, url)
  if (path === '/auth/google/callback' && req.method === 'GET') return googleCallback(env, url)
  return Response.json({ error: 'not_found' }, { status: 404 })
}

interface SignBody { email?: string; password?: string; name?: string }
async function body<T>(req: Request): Promise<T> {
  try { return (await req.json()) as T } catch { return {} as T }
}

function authPayload(user: { id: string; email: string; meta: Record<string, unknown> }, token: string) {
  return { user: { id: user.id, email: user.email, ...user.meta }, token }
}

async function signup(req: Request, env: Env): Promise<Response> {
  const b = await body<SignBody>(req)
  const email = b.email?.trim().toLowerCase()
  const password = b.password
  const name = (b.name ?? '').trim()
  if (!email || !password) return Response.json({ error: 'email_and_password_required' }, { status: 400 })
  if (password.length < 8) return Response.json({ error: 'password_too_short' }, { status: 400 })

  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first<{ id: string }>()
  if (existing) return Response.json({ error: 'email_in_use' }, { status: 409 })

  const id = crypto.randomUUID()
  const hash = await hashPassword(password)
  const meta = {
    name: name || email.split('@')[0],
    role: 'free',
    childrenAges: [],
    interests: [],
    onboardingCompleted: false,
  }
  await env.DB.prepare('INSERT INTO users (id, email, password_hash, meta) VALUES (?, ?, ?, ?)')
    .bind(id, email, hash, JSON.stringify(meta)).run()
  const token = await issueSession(env, id)
  return Response.json(authPayload({ id, email, meta }, token))
}

async function signin(req: Request, env: Env): Promise<Response> {
  const b = await body<SignBody>(req)
  const email = b.email?.trim().toLowerCase()
  const password = b.password
  if (!email || !password) return Response.json({ error: 'email_and_password_required' }, { status: 400 })
  const row = await env.DB.prepare('SELECT id, password_hash, meta FROM users WHERE email = ?')
    .bind(email).first<{ id: string; password_hash: string | null; meta: string }>()
  if (!row || !row.password_hash) return Response.json({ error: 'invalid_credentials' }, { status: 401 })
  if (!(await verifyPassword(password, row.password_hash))) {
    return Response.json({ error: 'invalid_credentials' }, { status: 401 })
  }
  const meta = safeJson(row.meta)
  const token = await issueSession(env, row.id)
  return Response.json(authPayload({ id: row.id, email, meta }, token))
}

async function signout(req: Request, env: Env): Promise<Response> {
  const s = await requireSession(req, env)
  if (s instanceof Response) return s
  await revokeSession(env, s.jti)
  return Response.json({ ok: true })
}

async function updateMeta(req: Request, env: Env): Promise<Response> {
  const s = await requireSession(req, env)
  if (s instanceof Response) return s
  const updates = await body<Record<string, unknown>>(req)
  const cur = await env.DB.prepare('SELECT meta FROM users WHERE id = ?').bind(s.userId).first<{ meta: string }>()
  const merged = { ...safeJson(cur?.meta ?? '{}'), ...updates }
  await env.DB.prepare('UPDATE users SET meta = ? WHERE id = ?').bind(JSON.stringify(merged), s.userId).run()
  return Response.json({ ok: true, meta: merged })
}

// Password reset: request creates a one-shot token; confirm consumes it.
// Emails are the caller's problem for now — the endpoint returns the token
// in the response body so an admin can hand it over. When a mail sender
// (Resend/SES/…) is wired, this same endpoint POSTs to it and stops leaking
// the token in the response.
async function resetRequest(req: Request, env: Env): Promise<Response> {
  const b = await body<SignBody>(req)
  const email = b.email?.trim().toLowerCase()
  if (!email) return Response.json({ error: 'email_required' }, { status: 400 })
  const row = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first<{ id: string }>()
  // Always 200 to avoid email enumeration.
  if (!row) return Response.json({ ok: true })
  const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '')
  const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString()
  await env.DB.prepare('INSERT INTO password_resets (token, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(token, row.id, expires).run()
  return Response.json({ ok: true, token })
}

async function resetConfirm(req: Request, env: Env): Promise<Response> {
  const b = await body<{ token?: string; password?: string }>(req)
  if (!b.token || !b.password || b.password.length < 8) {
    return Response.json({ error: 'token_and_password_required' }, { status: 400 })
  }
  const row = await env.DB.prepare(
    `SELECT user_id, expires_at, used_at FROM password_resets WHERE token = ?`,
  ).bind(b.token).first<{ user_id: string; expires_at: string; used_at: string | null }>()
  if (!row || row.used_at || new Date(row.expires_at).getTime() < Date.now()) {
    return Response.json({ error: 'token_invalid' }, { status: 400 })
  }
  const hash = await hashPassword(b.password)
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(hash, row.user_id),
    env.DB.prepare("UPDATE password_resets SET used_at = datetime('now') WHERE token = ?").bind(b.token),
  ])
  return Response.json({ ok: true })
}

// ---------- google oauth ----------

async function googleStart(env: Env, url: URL): Promise<Response> {
  const appRedirect = url.searchParams.get('redirect') ?? `${env.APP_SCHEME}://auth-callback`
  const iat = Math.floor(Date.now() / 1000)
  const state = await signJwt(
    { sub: 'oauth-state', jti: appRedirect, iat, exp: iat + 600 },
    env.JWT_SIGNING_KEY,
  )
  const callback = `${url.origin}/auth/google/callback`
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: callback,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
    access_type: 'online',
  })
  return Response.redirect(`${GOOGLE_AUTHORIZE}?${params}`, 302)
}

async function googleCallback(env: Env, url: URL): Promise<Response> {
  const code = url.searchParams.get('code')
  const stateParam = url.searchParams.get('state')
  const err = url.searchParams.get('error')
  if (err) return Response.json({ error: 'google_error', detail: err }, { status: 400 })
  if (!code || !stateParam) return Response.json({ error: 'missing_code_or_state' }, { status: 400 })

  const state = await verifyJwt(stateParam, env.JWT_SIGNING_KEY)
  if (!state || state.sub !== 'oauth-state') return Response.json({ error: 'bad_state' }, { status: 400 })
  const appRedirect = state.jti

  const callback = `${url.origin}/auth/google/callback`
  const tokenRes = await fetch(GOOGLE_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: callback,
      grant_type: 'authorization_code',
    }),
  })
  if (!tokenRes.ok) {
    const t = await tokenRes.text()
    return Response.json({ error: 'token_exchange_failed', detail: t }, { status: 502 })
  }
  const tokens = await tokenRes.json<{ access_token: string; id_token?: string }>()
  const userRes = await fetch(GOOGLE_USERINFO, { headers: { Authorization: `Bearer ${tokens.access_token}` } })
  if (!userRes.ok) return Response.json({ error: 'userinfo_failed' }, { status: 502 })
  const info = await userRes.json<{ sub: string; email?: string; name?: string; picture?: string }>()
  if (!info.sub || !info.email) return Response.json({ error: 'no_email' }, { status: 400 })
  const email = info.email.toLowerCase()

  let userId: string | undefined
  const bySub = await env.DB.prepare('SELECT id FROM users WHERE google_sub = ?').bind(info.sub)
    .first<{ id: string }>()
  if (bySub) userId = bySub.id
  if (!userId) {
    const byEmail = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email)
      .first<{ id: string }>()
    if (byEmail) {
      await env.DB.prepare('UPDATE users SET google_sub = ? WHERE id = ?').bind(info.sub, byEmail.id).run()
      userId = byEmail.id
    }
  }
  if (!userId) {
    userId = crypto.randomUUID()
    const meta = {
      name: info.name || email.split('@')[0],
      avatarUrl: info.picture ?? null,
      role: 'free',
      childrenAges: [],
      interests: [],
      onboardingCompleted: false,
    }
    await env.DB.prepare('INSERT INTO users (id, email, google_sub, meta) VALUES (?, ?, ?, ?)')
      .bind(userId, email, info.sub, JSON.stringify(meta)).run()
  }

  const token = await issueSession(env, userId)
  const redirect = new URL(appRedirect)
  redirect.searchParams.set('token', token)
  redirect.searchParams.set('user_id', userId)
  redirect.searchParams.set('email', email)
  return Response.redirect(redirect.toString(), 302)
}

function safeJson(s: string | null | undefined): Record<string, unknown> {
  if (!s) return {}
  try { return JSON.parse(s) as Record<string, unknown> } catch { return {} }
}
