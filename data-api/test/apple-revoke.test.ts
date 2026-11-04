import { env } from 'cloudflare:test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetAppleKeyCache } from '../src/lib/apple'
import { sha256Hex } from '../src/lib/email'
import { call, formOf, mockOutbound, signup, uniqueEmail } from './helpers'

// Apple's rule: when someone deletes their account, the app must revoke their Sign in with Apple token.
// Revoking needs a refresh token (from exchanging the sign-in's authorization code) and the app's Apple key.

const AUD = 'com.momease.app'
const TOKEN_URL = 'https://appleid.apple.com/auth/token'
const REVOKE_URL = 'https://appleid.apple.com/auth/revoke'

const b64url = (b: ArrayBuffer | Uint8Array | string) => {
  const bytes = typeof b === 'string' ? new TextEncoder().encode(b) : new Uint8Array(b)
  let s = ''
  for (const x of bytes) s += String.fromCharCode(x)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4)), (c) => c.charCodeAt(0))

let idKey: { kid: string; priv: CryptoKey; jwk: JsonWebKey & { kid: string } }
let appleKey: { pub: CryptoKey; secrets: Record<string, string> }
let tokenCalls: URLSearchParams[]
let revokeCalls: URLSearchParams[]
let tokenStatus = 200
let revokeStatus = 200

async function newIdentityKey() {
  const kid = `kid-${Date.now()}-${Math.random()}`
  const pair = (await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify'])) as CryptoKeyPair
  return { kid, priv: pair.privateKey, jwk: { ...(await crypto.subtle.exportKey('jwk', pair.publicKey)), kid, alg: 'RS256', use: 'sig' } as JsonWebKey & { kid: string } }
}

/** A fresh P-256 key standing in for the .p8 file from the Apple developer portal. */
async function newAppleServiceKey() {
  const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair
  const der = new Uint8Array((await crypto.subtle.exportKey('pkcs8', pair.privateKey)) as ArrayBuffer)
  let bin = ''
  for (const b of der) bin += String.fromCharCode(b)
  const pem = `-----BEGIN PRIVATE KEY-----\n${btoa(bin).match(/.{1,64}/g)!.join('\n')}\n-----END PRIVATE KEY-----`
  return { pub: pair.publicKey, secrets: { APPLE_TEAM_ID: 'TEAM123456', APPLE_KEY_ID: 'KEYABC1234', APPLE_PRIVATE_KEY: pem } }
}

beforeEach(async () => {
  resetAppleKeyCache()
  idKey = await newIdentityKey()
  appleKey = await newAppleServiceKey()
  tokenCalls = []
  revokeCalls = []
  tokenStatus = 200
  revokeStatus = 200
  mockOutbound((url, init) => {
    if (url === 'https://appleid.apple.com/auth/keys') return Response.json({ keys: [idKey.jwk] })
    if (url === TOKEN_URL) {
      tokenCalls.push(formOf(init))
      return tokenStatus === 200 ? Response.json({ refresh_token: `refresh-${tokenCalls.length}`, access_token: 'a' }) : new Response('{"error":"invalid_grant"}', { status: tokenStatus })
    }
    if (url === REVOKE_URL) {
      revokeCalls.push(formOf(init))
      return new Response('', { status: revokeStatus })
    }
  })
})
afterEach(() => vi.restoreAllMocks())

async function identityToken(raw: string, claims: Record<string, unknown>) {
  const now = Math.floor(Date.now() / 1000)
  const h = b64url(JSON.stringify({ alg: 'RS256', kid: idKey.kid }))
  const p = b64url(JSON.stringify({ iss: 'https://appleid.apple.com', aud: AUD, iat: now, exp: now + 600, nonce: await sha256Hex(raw), ...claims }))
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', idKey.priv, new TextEncoder().encode(`${h}.${p}`))
  return `${h}.${p}.${b64url(sig)}`
}

async function signInWithApple(opts: { code?: string; configured?: boolean; sub?: string } = {}) {
  const raw = `raw-${Math.random()}`
  const sub = opts.sub ?? `apple-${Math.random()}`
  const r = await call('/auth/apple', {
    body: { identityToken: await identityToken(raw, { sub, email: uniqueEmail('rv'), email_verified: 'true' }), nonce: raw, authorizationCode: opts.code },
    envOverride: opts.configured === false ? {} : appleKey.secrets,
  })
  return r
}

const stored = (userId: string) => env.DB.prepare('SELECT apple_refresh_token AS t FROM users WHERE id = ?').bind(userId).first<{ t: string | null }>()
const del = (token: string, configured = true) => call('/account', { token, method: 'DELETE', envOverride: configured ? appleKey.secrets : {} })

describe('revoking Sign in with Apple on account deletion', () => {
  it('exchanges the authorization code with a valid client secret, stores the refresh token, and revokes it on deletion', async () => {
    const r = await signInWithApple({ code: 'one-time-code' })
    expect(r.status).toBe(200)
    expect(tokenCalls).toHaveLength(1)
    const f = tokenCalls[0]
    expect([f.get('client_id'), f.get('grant_type'), f.get('code')]).toEqual([AUD, 'authorization_code', 'one-time-code'])

    // The client secret is an ES256 JWT from our Apple key: right header, team, audience and subject, and a real signature.
    const [h, p, s] = f.get('client_secret')!.split('.')
    expect(JSON.parse(new TextDecoder().decode(fromB64url(h)))).toMatchObject({ alg: 'ES256', kid: 'KEYABC1234' })
    const claims = JSON.parse(new TextDecoder().decode(fromB64url(p)))
    expect(claims).toMatchObject({ iss: 'TEAM123456', aud: 'https://appleid.apple.com', sub: AUD })
    expect(claims.exp - claims.iat).toBeLessThanOrEqual(600)
    expect(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, appleKey.pub, fromB64url(s), new TextEncoder().encode(`${h}.${p}`))).toBe(true)

    expect((await stored(r.json.user.id))!.t).toBe('refresh-1')

    const gone = await del(r.json.token)
    expect(gone.status).toBe(200)
    expect(revokeCalls).toHaveLength(1)
    expect([revokeCalls[0].get('token'), revokeCalls[0].get('token_type_hint'), revokeCalls[0].get('client_id')]).toEqual(['refresh-1', 'refresh_token', AUD])
    expect(revokeCalls[0].get('client_secret')!.split('.')).toHaveLength(3)
    expect((await call('/session', { token: r.json.token })).status).toBe(401)
  })

  it('still deletes the account when Apple refuses or is down', async () => {
    const r = await signInWithApple({ code: 'c' })
    revokeStatus = 500
    expect((await del(r.json.token)).status).toBe(200)
    expect(revokeCalls).toHaveLength(1)
    expect((await call('/session', { token: r.json.token })).status).toBe(401)
  })

  it('does not call Apple at all when the Apple key is not configured, and sign-in and deletion still work', async () => {
    const r = await signInWithApple({ code: 'c', configured: false })
    expect(r.status).toBe(200)
    expect(tokenCalls).toHaveLength(0)
    expect((await stored(r.json.user.id))!.t).toBeNull()
    expect((await del(r.json.token, false)).status).toBe(200)
    expect(revokeCalls).toHaveLength(0)
  })

  it('signs in fine when Apple rejects the code, and then has nothing to revoke', async () => {
    tokenStatus = 400
    const r = await signInWithApple({ code: 'expired' })
    expect(r.status).toBe(200)
    expect((await stored(r.json.user.id))!.t).toBeNull()
    expect((await del(r.json.token)).status).toBe(200)
    expect(revokeCalls).toHaveLength(0)
  })

  it('does nothing extra when the app sends no authorization code (older builds)', async () => {
    const r = await signInWithApple({})
    expect(r.status).toBe(200)
    expect(tokenCalls).toHaveLength(0)
    expect((await del(r.json.token)).status).toBe(200)
    expect(revokeCalls).toHaveLength(0)
  })

  it('does not call Apple when deleting an account that never used Apple', async () => {
    const u = await signup('pw')
    expect((await del(u.token)).status).toBe(200)
    expect(tokenCalls).toHaveLength(0)
    expect(revokeCalls).toHaveLength(0)
  })

  it('also keeps the token when Apple is connected to an existing profile, and revokes it on deletion', async () => {
    const u = await signup('linker')
    const raw = `raw-${Math.random()}`
    const link = await call('/auth/link/apple', {
      token: u.token,
      body: { identityToken: await identityToken(raw, { sub: `apple-${Math.random()}`, email: uniqueEmail('lk'), email_verified: 'true' }), nonce: raw, authorizationCode: 'link-code' },
      envOverride: appleKey.secrets,
    })
    expect(link.status).toBe(200)
    expect(tokenCalls).toHaveLength(1)
    expect((await stored(u.id))!.t).toBe('refresh-1')
    expect((await del(u.token)).status).toBe(200)
    expect(revokeCalls.map((c) => c.get('token'))).toEqual(['refresh-1'])
  })

  it('ignores an oversized authorization code', async () => {
    const r = await signInWithApple({ code: 'x'.repeat(5000) })
    expect(r.status).toBe(200)
    expect(tokenCalls).toHaveLength(0)
  })
})
