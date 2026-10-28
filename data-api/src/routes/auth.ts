// /auth/* — email/password + Google OAuth (Web client, code flow) + password reset.

import type { Env } from '../worker'
import { hashPassword, verifyPassword } from '../lib/password'
import { issueSession, requireSession, revokeSession } from '../lib/session'
import { signJwt, verifyJwt } from '../lib/jwt'
import { isAllowedAppRedirect, withSessionFragment } from '../lib/redirect'
import { clearFailures, isThrottled, recordFailure, throttleBuckets } from '../lib/throttle'
import { sendResetEmail, sha256Hex } from '../lib/email'

const GOOGLE_AUTHORIZE = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO = 'https://openidconnect.googleapis.com/v1/userinfo'

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/

// The ONLY fields a client may write to its own profile. Role / billing are
// server-owned columns and are never read from client input.
const EDITABLE_META = ['name', 'avatarUrl', 'childrenAges', 'workSchedule', 'interests', 'personalization', 'onboardingCompleted'] as const
const MAX_META_BYTES = 16 * 1024

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

export interface UserRow {
  id: string
  email: string
  meta: string
  role: string
  sub_status: string
  sub_current_period_end: number | null
  sub_cancel_at_period_end: number
}

export function publicUser(u: Pick<UserRow, 'id' | 'email' | 'meta' | 'role'>) {
  // meta first so a stored key can never shadow id/email/role.
  return { ...safeJson(u.meta), id: u.id, email: u.email, role: u.role }
}

async function signup(req: Request, env: Env): Promise<Response> {
  const b = await body<SignBody>(req)
  const email = b.email?.trim().toLowerCase()
  const password = b.password
  const name = (b.name ?? '').trim().slice(0, 80)
  if (!email || !password) return Response.json({ error: 'email_and_password_required' }, { status: 400 })
  if (!EMAIL_RE.test(email)) return Response.json({ error: 'invalid_email' }, { status: 400 })
  if (password.length < 8) return Response.json({ error: 'password_too_short' }, { status: 400 })
  if (password.length > 200) return Response.json({ error: 'password_too_long' }, { status: 400 })

  const buckets = throttleBuckets(req, email)
  if (await isThrottled(env, buckets)) return Response.json({ error: 'too_many_attempts' }, { status: 429 })

  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first<{ id: string }>()
  if (existing) return Response.json({ error: 'email_in_use' }, { status: 409 })

  const id = crypto.randomUUID()
  const hash = await hashPassword(password)
  const meta = {
    name: name || email.split('@')[0],
    childrenAges: [],
    interests: [],
    onboardingCompleted: false,
  }
  await env.DB.prepare('INSERT INTO users (id, email, password_hash, meta) VALUES (?, ?, ?, ?)')
    .bind(id, email, hash, JSON.stringify(meta)).run()
  const token = await issueSession(env, id)
  return Response.json({ user: publicUser({ id, email, meta: JSON.stringify(meta), role: 'free' }), token })
}

async function signin(req: Request, env: Env): Promise<Response> {
  const b = await body<SignBody>(req)
  const email = b.email?.trim().toLowerCase()
  const password = b.password
  if (!email || !password) return Response.json({ error: 'email_and_password_required' }, { status: 400 })

  const buckets = throttleBuckets(req, email)
  if (await isThrottled(env, buckets)) return Response.json({ error: 'too_many_attempts' }, { status: 429 })

  const row = await env.DB.prepare('SELECT id, email, password_hash, meta, role FROM users WHERE email = ?')
    .bind(email).first<{ id: string; email: string; password_hash: string | null; meta: string; role: string }>()
  const ok = !!row && !!row.password_hash && (await verifyPassword(password, row.password_hash))
  if (!ok || !row) {
    await recordFailure(env, buckets)
    return Response.json({ error: 'invalid_credentials' }, { status: 401 })
  }
  await clearFailures(env, [`email:${email}`])
  const token = await issueSession(env, row.id)
  return Response.json({ user: publicUser(row), token })
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
  const raw = await req.text()
  if (raw.length > MAX_META_BYTES) return Response.json({ error: 'too_large' }, { status: 413 })
  let updates: Record<string, unknown>
  try { updates = JSON.parse(raw) as Record<string, unknown> } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 })
  }
  const cur = await env.DB.prepare('SELECT meta FROM users WHERE id = ?').bind(s.userId).first<{ meta: string }>()
  const merged: Record<string, unknown> = { ...safeJson(cur?.meta) }
  for (const k of EDITABLE_META) if (k in updates) merged[k] = updates[k]
  await env.DB.prepare('UPDATE users SET meta = ? WHERE id = ?').bind(JSON.stringify(merged), s.userId).run()
  return Response.json({ ok: true })
}

// ---------- password reset ----------
// The raw token is only ever emailed. It is never returned in a response.

async function resetRequest(req: Request, env: Env): Promise<Response> {
  const b = await body<SignBody>(req)
  const email = b.email?.trim().toLowerCase()
  if (!email || !EMAIL_RE.test(email)) return Response.json({ error: 'email_required' }, { status: 400 })

  const buckets = [`reset-ip:${req.headers.get('CF-Connecting-IP') ?? 'unknown'}`, `reset-email:${email}`]
  if (await isThrottled(env, buckets)) return Response.json({ ok: true }) // silent: no oracle
  await recordFailure(env, buckets)

  const row = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first<{ id: string }>()
  if (row) {
    const raw = [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, '0')).join('')
    const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString()
    await env.DB.prepare('INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
      .bind(await sha256Hex(raw), row.id, expires).run()
    const base = env.WEB_APP_URL || 'https://mease.mom'
    await sendResetEmail(env, email, `${base}/reset-password#token=${raw}`)
  }
  return Response.json({ ok: true }) // identical for known/unknown emails
}

async function resetConfirm(req: Request, env: Env): Promise<Response> {
  const b = await body<{ token?: string; password?: string }>(req)
  if (!b.token || !b.password || b.password.length < 8 || b.password.length > 200) {
    return Response.json({ error: 'token_and_password_required' }, { status: 400 })
  }
  const hash = await sha256Hex(b.token)
  const row = await env.DB.prepare(
    `SELECT user_id, expires_at, used_at FROM password_resets WHERE token_hash = ?`,
  ).bind(hash).first<{ user_id: string; expires_at: string; used_at: string | null }>()
  if (!row || row.used_at || new Date(row.expires_at).getTime() < Date.now()) {
    return Response.json({ error: 'token_invalid' }, { status: 400 })
  }
  const pw = await hashPassword(b.password)
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(pw, row.user_id),
    env.DB.prepare("UPDATE password_resets SET used_at = datetime('now') WHERE token_hash = ?").bind(hash),
    // A reset must kick out whoever else is holding a session.
    env.DB.prepare("UPDATE sessions_auth SET revoked_at = datetime('now') WHERE user_id = ? AND revoked_at IS NULL").bind(row.user_id),
  ])
  return Response.json({ ok: true })
}

// ---------- google oauth ----------

async function googleStart(env: Env, url: URL): Promise<Response> {
  const appRedirect = url.searchParams.get('redirect') ?? `${env.APP_SCHEME}://auth-callback`
  if (!isAllowedAppRedirect(appRedirect, env)) {
    return Response.json({ error: 'redirect_not_allowed' }, { status: 400 })
  }
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
  if (!isAllowedAppRedirect(appRedirect, env)) return Response.json({ error: 'redirect_not_allowed' }, { status: 400 })

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
  if (!tokenRes.ok) return Response.json({ error: 'token_exchange_failed' }, { status: 502 })
  const tokens = (await tokenRes.json()) as { access_token: string }
  const userRes = await fetch(GOOGLE_USERINFO, { headers: { Authorization: `Bearer ${tokens.access_token}` } })
  if (!userRes.ok) return Response.json({ error: 'userinfo_failed' }, { status: 502 })
  const info = (await userRes.json()) as { sub: string; email?: string; email_verified?: boolean; name?: string; picture?: string }
  if (!info.sub || !info.email) return Response.json({ error: 'no_email' }, { status: 400 })
  // Never link/sign in by an email Google hasn't verified: that is an account-takeover path.
  if (info.email_verified !== true) return Response.json({ error: 'email_not_verified' }, { status: 403 })
  const email = info.email.toLowerCase()

  let userId: string | undefined
  const bySub = await env.DB.prepare('SELECT id FROM users WHERE google_sub = ?').bind(info.sub).first<{ id: string }>()
  if (bySub) userId = bySub.id
  if (!userId) {
    const byEmail = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first<{ id: string }>()
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
      childrenAges: [],
      interests: [],
      onboardingCompleted: false,
    }
    await env.DB.prepare('INSERT INTO users (id, email, google_sub, meta) VALUES (?, ?, ?, ?)')
      .bind(userId, email, info.sub, JSON.stringify(meta)).run()
  }

  const token = await issueSession(env, userId)
  return Response.redirect(withSessionFragment(appRedirect, { token, user_id: userId, email }), 302)
}

export function safeJson(s: string | null | undefined): Record<string, unknown> {
  if (!s) return {}
  try { return JSON.parse(s) as Record<string, unknown> } catch { return {} }
}
