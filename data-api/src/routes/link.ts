// Connecting another sign-in method (Apple / Google) to the profile you are already signed in to.
//
//   POST /auth/link/apple         {identityToken, nonce, replaceOther?}   -> {ok, identities}
//   POST /auth/link/google/init   {replaceOther?}                          -> {linkToken}  (then GET /auth/google/start?link=...)
//
// A sign-in identity (apple_sub / google_sub) belongs to exactly one profile. If it already belongs to a
// different profile we only take it over when that profile is "light" (an empty profile created by simply
// signing in: no password, no subscription, no social data) AND the user explicitly agreed to replace it.

import type { Env } from '../worker'
import { requireSession } from '../lib/session'
import { signJwt } from '../lib/jwt'
import { rememberAppleRefreshToken, verifyAppleIdentityToken } from '../lib/apple'
import { sha256Hex } from '../lib/email'
import { clearFailures, isThrottled, recordFailure, throttleBuckets } from '../lib/throttle'

export type Provider = 'apple' | 'google'
const COLUMN: Record<Provider, 'apple_sub' | 'google_sub'> = { apple: 'apple_sub', google: 'google_sub' }

export interface Identities { google: boolean; apple: boolean }

export async function identitiesOf(env: Env, userId: string): Promise<Identities> {
  const r = await env.DB.prepare('SELECT google_sub, apple_sub FROM users WHERE id = ?').bind(userId).first<{ google_sub: string | null; apple_sub: string | null }>()
  return { google: !!r?.google_sub, apple: !!r?.apple_sub }
}

/** True when a profile holds nothing worth protecting: it was created by signing in and nothing else. */
async function isLightProfile(env: Env, userId: string): Promise<boolean> {
  const u = await env.DB.prepare('SELECT password_hash, role, sub_status, stripe_customer_id FROM users WHERE id = ?')
    .bind(userId).first<{ password_hash: string | null; role: string; sub_status: string; stripe_customer_id: string | null }>()
  if (!u) return true
  if (u.password_hash || u.role !== 'free' || u.sub_status !== 'none' || u.stripe_customer_id) return false
  const busy = await env.DB.prepare(
    `SELECT (SELECT COUNT(*) FROM profiles WHERE id = ?1)
          + (SELECT COUNT(*) FROM follows WHERE follower_id = ?1 OR following_id = ?1)
          + (SELECT COUNT(*) FROM messages WHERE sender_id = ?1 OR recipient_id = ?1)
          + (SELECT COUNT(*) FROM blocks WHERE blocker_id = ?1 OR blocked_id = ?1) AS n`,
  ).bind(userId).first<{ n: number }>()
  return (busy?.n ?? 0) === 0
}

export type LinkError = 'already_linked_other' | 'identity_in_use' | 'identity_in_use_mergeable' | 'user_missing'

/** Attach `sub` to `userId`. Returns null on success or the reason it was refused. */
export async function attachIdentity(env: Env, provider: Provider, userId: string, sub: string, replaceOther: boolean): Promise<LinkError | null> {
  const col = COLUMN[provider]
  const me = await env.DB.prepare(`SELECT ${col} AS cur FROM users WHERE id = ?`).bind(userId).first<{ cur: string | null }>()
  if (!me) return 'user_missing'
  if (me.cur === sub) return null // already connected: nothing to do
  if (me.cur) return 'already_linked_other' // this profile already has a different account of that kind

  const other = await env.DB.prepare(`SELECT id FROM users WHERE ${col} = ? AND id <> ?`).bind(sub, userId).first<{ id: string }>()
  if (other) {
    if (!(await isLightProfile(env, other.id))) return 'identity_in_use'
    if (!replaceOther) return 'identity_in_use_mergeable'
    // Free the identity first (unique index), then take it, atomically.
    await env.DB.batch([
      env.DB.prepare('DELETE FROM users WHERE id = ?').bind(other.id),
      env.DB.prepare(`UPDATE users SET ${col} = ? WHERE id = ?`).bind(sub, userId),
    ])
    return null
  }
  await env.DB.prepare(`UPDATE users SET ${col} = ? WHERE id = ?`).bind(sub, userId).run()
  return null
}

const STATUS: Record<LinkError, number> = { already_linked_other: 409, identity_in_use: 409, identity_in_use_mergeable: 409, user_missing: 404 }

export async function handleLink(req: Request, env: Env, url: URL): Promise<Response | null> {
  const isApple = url.pathname === '/auth/link/apple' && req.method === 'POST'
  const isGoogleInit = url.pathname === '/auth/link/google/init' && req.method === 'POST'
  if (!isApple && !isGoogleInit) return null

  const session = await requireSession(req, env)
  if (session instanceof Response) return session
  let b: { identityToken?: string; nonce?: string; authorizationCode?: string; replaceOther?: boolean } = {}
  try { b = await req.json() } catch { /* empty body */ }

  if (isGoogleInit) {
    const iat = Math.floor(Date.now() / 1000)
    const linkToken = await signJwt({ sub: 'google-link', jti: session.userId, iat, exp: iat + 600, rep: b.replaceOther === true }, env.JWT_SIGNING_KEY)
    return Response.json({ linkToken })
  }

  if (typeof b.identityToken !== 'string' || !b.identityToken || typeof b.nonce !== 'string' || !b.nonce) {
    return Response.json({ error: 'invalid_request' }, { status: 400 })
  }
  const buckets = throttleBuckets(req, undefined)
  if (await isThrottled(env, buckets)) return Response.json({ error: 'too_many_attempts' }, { status: 429 })
  const audiences = (env.APPLE_BUNDLE_ID ?? 'com.momease.app').split(',').map((s) => s.trim()).filter(Boolean)
  const claims = await verifyAppleIdentityToken(b.identityToken, audiences)
  if (!claims || claims.nonce !== (await sha256Hex(b.nonce))) {
    await recordFailure(env, buckets)
    return Response.json({ error: 'invalid_apple_token' }, { status: 401 })
  }
  await clearFailures(env, buckets)
  const err = await attachIdentity(env, 'apple', session.userId, claims.sub, b.replaceOther === true)
  if (err) return Response.json({ error: err }, { status: STATUS[err] })
  await rememberAppleRefreshToken(env, session.userId, b.authorizationCode)
  return Response.json({ ok: true, identities: await identitiesOf(env, session.userId) })
}
