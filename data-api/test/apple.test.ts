import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetAppleKeyCache } from '../src/lib/apple'
import { sha256Hex } from '../src/lib/email'
import { call, mockOutbound, PASSWORD, signup, uniqueEmail } from './helpers'

const AUD = 'com.momease.app'
const b64url = (b: ArrayBuffer | Uint8Array | string) => {
  const bytes = typeof b === 'string' ? new TextEncoder().encode(b) : new Uint8Array(b)
  let s = ''
  for (const x of bytes) s += String.fromCharCode(x)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

interface Signer { kid: string; priv: CryptoKey; jwk: JsonWebKey & { kid: string } }
let counter = 0
async function newSigner(kid = `kid-${Date.now()}-${counter++}`): Promise<Signer> {
  const pair = (await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify'],
  )) as CryptoKeyPair
  const jwk = { ...(await crypto.subtle.exportKey('jwk', pair.publicKey)), kid, alg: 'RS256', use: 'sig' } as Signer['jwk']
  return { kid, priv: pair.privateKey, jwk }
}

async function appleToken(signer: Signer, claims: Record<string, unknown> = {}, header: Record<string, unknown> = {}) {
  const now = Math.floor(Date.now() / 1000)
  const h = b64url(JSON.stringify({ alg: 'RS256', kid: signer.kid, ...header }))
  const p = b64url(JSON.stringify({ iss: 'https://appleid.apple.com', aud: AUD, iat: now, exp: now + 600, ...claims }))
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', signer.priv, new TextEncoder().encode(`${h}.${p}`))
  return `${h}.${p}.${b64url(sig)}`
}

let signer: Signer
let published: Signer[]
let keyFetches = 0

beforeEach(async () => {
  resetAppleKeyCache()
  keyFetches = 0
  signer = await newSigner()
  published = [signer]
  mockOutbound((url) => {
    if (url === 'https://appleid.apple.com/auth/keys') {
      keyFetches++
      return Response.json({ keys: published.map((s) => s.jwk) })
    }
  })
})
afterEach(() => vi.restoreAllMocks())

/** Sign in as the app would: a fresh raw nonce, whose SHA-256 (hex) goes into the token. */
async function appleSignin(claims: Record<string, unknown>, opts: { signer?: Signer; nonce?: string; fullName?: object; header?: Record<string, unknown>; env?: Record<string, unknown>; ip?: string } = {}) {
  const raw = opts.nonce ?? `raw-${Math.random()}`
  const token = await appleToken(opts.signer ?? signer, { nonce: await sha256Hex(raw), ...claims }, opts.header)
  return call('/auth/apple', { body: { identityToken: token, nonce: raw, fullName: opts.fullName }, envOverride: opts.env, ip: opts.ip })
}

const goodClaims = (email = uniqueEmail('apple'), extra: Record<string, unknown> = {}) => ({ sub: `apple-${Math.random()}`, email, email_verified: 'true', ...extra })

describe('sign in with Apple', () => {
  it('creates an account and a working session, normalising the email and using the name Apple gave once', async () => {
    const email = uniqueEmail('Apple').toUpperCase()
    const r = await appleSignin(goodClaims(email), { fullName: { givenName: 'Ada', familyName: 'Lovelace' } })
    expect(r.status).toBe(200)
    expect(r.json.user.email).toBe(email.toLowerCase())
    expect(r.json.user.name).toBe('Ada Lovelace')
    expect(r.json.user.role).toBe('free')
    const s = await call('/session', { token: r.json.token })
    expect(s.status).toBe(200)
    expect(s.json.user.email).toBe(email.toLowerCase())
  })

  it('signs the same Apple user into the same account later, even if the token no longer carries an email', async () => {
    const claims = goodClaims()
    const first = await appleSignin(claims)
    const again = await appleSignin({ sub: claims.sub }) // later tokens may omit the email
    expect(again.status).toBe(200)
    expect(again.json.user.id).toBe(first.json.user.id)
    expect(again.json.token).not.toBe(first.json.token)
  })

  it('links to an existing password account only through a verified email, and the password keeps working', async () => {
    const u = await signup('applelink')
    const r = await appleSignin({ sub: 'apple-link-1', email: u.email, email_verified: true })
    expect(r.status).toBe(200)
    expect(r.json.user.id).toBe(u.id)
    expect((await call('/auth/signin', { body: { email: u.email, password: PASSWORD } })).status).toBe(200)
  })

  it('refuses an unverified email: no takeover of an existing account, and no new account', async () => {
    const victim = await signup('victim')
    const hit = await appleSignin({ sub: 'attacker-sub', email: victim.email, email_verified: 'false' })
    expect([hit.status, hit.json.error]).toEqual([403, 'email_not_verified'])
    const fresh = await appleSignin({ sub: 'attacker-sub-2', email: uniqueEmail('new'), email_verified: false })
    expect(fresh.status).toBe(403)
    // The victim's account is untouched: the attacker's Apple id was never attached to it.
    const later = await appleSignin({ sub: 'attacker-sub' })
    expect(later.status).toBe(400)
    expect((await call('/session', { token: victim.token })).status).toBe(200)
  })

  it('does not attach a second Apple identity to an account already linked to another one', async () => {
    const email = uniqueEmail('shared')
    expect((await appleSignin({ sub: 'apple-owner', email, email_verified: true })).status).toBe(200)
    const r = await appleSignin({ sub: 'apple-intruder', email, email_verified: true })
    expect([r.status, r.json.error]).toEqual([409, 'account_linked_elsewhere'])
  })

  it('works with Apple "Hide My Email" addresses and does not use the random address as a display name', async () => {
    const r = await appleSignin(goodClaims('x7k2q9@privaterelay.appleid.com', { is_private_email: 'true' }))
    expect(r.status).toBe(200)
    expect(r.json.user.email).toBe('x7k2q9@privaterelay.appleid.com')
    expect(r.json.user.name).toBe('')
  })

  it('needs an email for a first sign-in', async () => {
    const r = await appleSignin({ sub: 'no-email-sub' })
    expect([r.status, r.json.error]).toEqual([400, 'no_email'])
  })
})

describe('rejecting bad Apple tokens', () => {
  const rejected = (r: { status: number; json: any }) => expect([r.status, r.json.error]).toEqual([401, 'invalid_apple_token'])

  it('rejects a token made for another app', async () => {
    rejected(await appleSignin({ ...goodClaims(), aud: 'com.someone.else' }))
  })
  it('accepts several configured audiences (e.g. a later web Services ID)', async () => {
    const r = await appleSignin({ ...goodClaims(), aud: 'mom.mease.web' }, { env: { APPLE_BUNDLE_ID: 'com.momease.app, mom.mease.web' } })
    expect(r.status).toBe(200)
  })
  it('rejects the wrong issuer', async () => {
    rejected(await appleSignin({ ...goodClaims(), iss: 'https://evil.example.com' }))
  })
  it('rejects expired tokens and tokens from the future', async () => {
    const now = Math.floor(Date.now() / 1000)
    rejected(await appleSignin({ ...goodClaims(), exp: now - 5 }))
    rejected(await appleSignin({ ...goodClaims(), iat: now + 3600, exp: now + 7200 }))
  })
  it('rejects a token signed by a key Apple does not publish, even if it claims a published key id', async () => {
    const forger = await newSigner(signer.kid) // same kid, different private key
    rejected(await appleSignin(goodClaims(), { signer: forger }))
  })
  it('rejects unknown key ids, and other algorithms (none / HS256)', async () => {
    rejected(await appleSignin(goodClaims(), { signer: await newSigner('not-published') }))
    rejected(await appleSignin(goodClaims(), { header: { alg: 'HS256' } }))
    rejected(await appleSignin(goodClaims(), { header: { alg: 'none' } }))
  })
  it('rejects a replayed token with a different nonce, or a token with no nonce', async () => {
    const claims = goodClaims()
    const raw = 'the-real-nonce'
    const token = await appleToken(signer, { ...claims, nonce: await sha256Hex(raw) })
    rejected(await call('/auth/apple', { body: { identityToken: token, nonce: 'attacker-nonce' } }))
    rejected(await call('/auth/apple', { body: { identityToken: await appleToken(signer, claims), nonce: raw } })) // token without nonce claim
    expect((await call('/auth/apple', { body: { identityToken: token, nonce: raw } })).status).toBe(200)
  })
  it('rejects garbage, oversized tokens and bad requests', async () => {
    rejected(await call('/auth/apple', { body: { identityToken: 'not.a.jwt', nonce: 'n' } }))
    rejected(await call('/auth/apple', { body: { identityToken: 'x'.repeat(5000), nonce: 'n' } }))
    expect((await call('/auth/apple', { body: { nonce: 'n' } })).status).toBe(400)
    expect((await call('/auth/apple', { body: { identityToken: 'a.b.c' } })).status).toBe(400)
    expect((await call('/auth/apple', { raw: '{bad json' })).status).toBe(400)
  })
  it('throttles repeated failures from one address', async () => {
    for (let i = 0; i < 10; i++) rejected(await appleSignin({ ...goodClaims(), iss: 'bad' }, { ip: '203.0.113.9' }))
    const r = await appleSignin(goodClaims(), { ip: '203.0.113.9' })
    expect([r.status, r.json.error]).toEqual([429, 'too_many_attempts'])
    expect((await appleSignin(goodClaims(), { ip: '203.0.113.10' })).status).toBe(200) // others unaffected
  })
})

describe('Apple key handling', () => {
  it('caches Apple\'s keys, and refetches once when Apple rotates to a new key id', async () => {
    expect((await appleSignin(goodClaims())).status).toBe(200)
    expect((await appleSignin(goodClaims())).status).toBe(200)
    expect(keyFetches).toBe(1)
    const rotated = await newSigner()
    published = [signer, rotated]
    expect((await appleSignin(goodClaims(), { signer: rotated })).status).toBe(200)
    expect(keyFetches).toBe(2)
  })
  it('fails closed when Apple\'s key list cannot be fetched', async () => {
    resetAppleKeyCache()
    vi.restoreAllMocks()
    mockOutbound((url) => (url === 'https://appleid.apple.com/auth/keys' ? new Response('down', { status: 503 }) : undefined))
    const r = await appleSignin(goodClaims())
    expect([r.status, r.json.error]).toEqual([401, 'invalid_apple_token'])
  })
})
