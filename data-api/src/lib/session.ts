// Session issuance + validation. Every JWT has a matching row in sessions_auth
// so we can revoke on signout.

import type { Env } from '../worker'
import { signJwt, verifyJwt } from './jwt'

const SESSION_TTL_SEC = 60 * 60 * 24 * 30 // 30 days

export async function issueSession(env: Env, userId: string): Promise<string> {
  const jti = crypto.randomUUID()
  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + SESSION_TTL_SEC
  await env.DB.prepare(
    `INSERT INTO sessions_auth (jti, user_id, expires_at) VALUES (?, ?, ?)`,
  ).bind(jti, userId, new Date(exp * 1000).toISOString()).run()
  return signJwt({ sub: userId, jti, iat, exp }, env.JWT_SIGNING_KEY)
}

export async function requireSession(req: Request, env: Env): Promise<{ userId: string; jti: string } | Response> {
  const auth = req.headers.get('Authorization')
  if (!auth || !auth.startsWith('Bearer ')) return Response.json({ error: 'unauthenticated' }, { status: 401 })
  const token = auth.slice(7)
  const payload = await verifyJwt(token, env.JWT_SIGNING_KEY)
  if (!payload) return Response.json({ error: 'invalid_token' }, { status: 401 })
  const row = await env.DB.prepare(
    `SELECT revoked_at FROM sessions_auth WHERE jti = ? AND user_id = ?`,
  ).bind(payload.jti, payload.sub).first<{ revoked_at: string | null }>()
  if (!row || row.revoked_at) return Response.json({ error: 'session_revoked' }, { status: 401 })
  return { userId: payload.sub, jti: payload.jti }
}

export async function revokeSession(env: Env, jti: string): Promise<void> {
  await env.DB.prepare(
    `UPDATE sessions_auth SET revoked_at = datetime('now') WHERE jti = ?`,
  ).bind(jti).run()
}
