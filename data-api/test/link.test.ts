import { env } from 'cloudflare:test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetAppleKeyCache } from '../src/lib/apple'
import { sha256Hex } from '../src/lib/email'
import { call, mockOutbound, signup, signupWithProfile, uniqueEmail } from './helpers'

const AUD = 'com.momease.app'
const b64url = (b: ArrayBuffer | Uint8Array | string) => {
  const bytes = typeof b === 'string' ? new TextEncoder().encode(b) : new Uint8Array(b)
  let s = ''
  for (const x of bytes) s += String.fromCharCode(x)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
let counter = 0
async function newSigner() {
  const kid = `link-kid-${Date.now()}-${counter++}`
  const pair = (await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify'])) as CryptoKeyPair
  const jwk = { ...(await crypto.subtle.exportKey('jwk', pair.publicKey)), kid, alg: 'RS256', use: 'sig' }
  return { kid, priv: pair.privateKey, jwk }
}
let signer: Awaited<ReturnType<typeof newSigner>>

async function appleToken(claims: Record<string, unknown>, raw: string) {
  const now = Math.floor(Date.now() / 1000)
  const h = b64url(JSON.stringify({ alg: 'RS256', kid: signer.kid }))
  const p = b64url(JSON.stringify({ iss: 'https://appleid.apple.com', aud: AUD, iat: now, exp: now + 600, nonce: await sha256Hex(raw), ...claims }))
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', signer.priv, new TextEncoder().encode(`${h}.${p}`))
  return `${h}.${p}.${b64url(sig)}`
}
/** What the app sends: a token for Apple user `sub`. */
async function appleBody(sub: string, extra: Record<string, unknown> = {}, claims: Record<string, unknown> = {}) {
  const nonce = `n-${Math.random()}`
  return { identityToken: await appleToken({ sub, ...claims }, nonce), nonce, ...extra }
}
const appleSignin = async (sub: string, email = uniqueEmail('apl')) => call('/auth/apple', { body: await appleBody(sub, {}, { email, email_verified: true }) })
const link = async (token: string, sub: string, extra: Record<string, unknown> = {}) => call('/auth/link/apple', { token, body: await appleBody(sub, extra) })
const session = (token: string) => call('/session', { token })

beforeEach(async () => {
  resetAppleKeyCache()
  signer = await newSigner()
  mockOutbound((url) => (url === 'https://appleid.apple.com/auth/keys' ? Response.json({ keys: [signer.jwk] }) : undefined))
})
afterEach(() => vi.restoreAllMocks())

describe('connect Apple to the profile you are signed in to', () => {
  it('attaches Apple, shows it as connected, and later Apple sign-ins open THIS profile', async () => {
    const me = await signup('connector')
    expect((await session(me.token)).json.identities).toEqual({ google: false, apple: false })
    const r = await link(me.token, 'apple-conn-1')
    expect(r.status).toBe(200)
    expect(r.json.identities).toEqual({ google: false, apple: true })
    expect((await session(me.token)).json.identities.apple).toBe(true)
    // The point of the feature: even with a hidden relay email, Apple now lands in her existing profile.
    const viaApple = await appleSignin('apple-conn-1', 'hidden@privaterelay.appleid.com')
    expect(viaApple.status).toBe(200)
    expect(viaApple.json.user.id).toBe(me.id)
  })

  it('is idempotent: connecting the same Apple account again is fine', async () => {
    const me = await signup('idem')
    expect((await link(me.token, 'apple-idem')).status).toBe(200)
    expect((await link(me.token, 'apple-idem')).status).toBe(200)
  })

  it('needs a session and a genuine Apple token', async () => {
    expect((await call('/auth/link/apple', { body: await appleBody('x') })).status).toBe(401)
    const me = await signup('badtok')
    const bad = await call('/auth/link/apple', { token: me.token, body: { identityToken: 'a.b.c', nonce: 'n' } })
    expect([bad.status, bad.json.error]).toEqual([401, 'invalid_apple_token'])
    expect((await call('/auth/link/apple', { token: me.token, body: {} })).status).toBe(400)
    const replay = await appleToken({ sub: 'apple-replay' }, 'real-nonce')
    expect((await call('/auth/link/apple', { token: me.token, body: { identityToken: replay, nonce: 'other' } })).status).toBe(401)
    expect((await session(me.token)).json.identities.apple).toBe(false)
  })

  it('refuses to swap a profile\'s Apple account for a different one', async () => {
    const me = await signup('swap')
    expect((await link(me.token, 'apple-first')).status).toBe(200)
    const r = await link(me.token, 'apple-second')
    expect([r.status, r.json.error]).toEqual([409, 'already_linked_other'])
    expect((await appleSignin('apple-first')).json.user.id).toBe(me.id)
  })

  it('her case: the hidden-email Apple profile is empty, so she can replace it, but only after agreeing', async () => {
    const google = await signup('hasgoogle') // the profile she wants to keep
    const hidden = await appleSignin('apple-hidden', 'abc123@privaterelay.appleid.com') // created by tapping "Continue with Apple"
    expect(hidden.json.user.id).not.toBe(google.id)

    const first = await link(google.token, 'apple-hidden')
    expect([first.status, first.json.error]).toEqual([409, 'identity_in_use_mergeable'])
    expect((await session(hidden.json.token)).status).toBe(200) // nothing was deleted without consent

    const ok = await link(google.token, 'apple-hidden', { replaceOther: true })
    expect(ok.status).toBe(200)
    expect((await session(hidden.json.token)).status).toBe(401) // the empty profile (and its sessions) are gone
    const again = await appleSignin('apple-hidden', 'abc123@privaterelay.appleid.com')
    expect(again.json.user.id).toBe(google.id)
  })

  it('never replaces a profile that has real content, even when asked', async () => {
    const mine = await signup('keepme')
    // Another profile that owns this Apple id AND is real: it has a password and a social profile.
    const real = await signupWithProfile('realuser')
    await env.DB.prepare('UPDATE users SET apple_sub = ? WHERE id = ?').bind('apple-real', real.id).run()
    const r = await link(mine.token, 'apple-real', { replaceOther: true })
    expect([r.status, r.json.error]).toEqual([409, 'identity_in_use'])
    expect((await session(real.token)).status).toBe(200)
    expect((await session(mine.token)).json.identities.apple).toBe(false)
  })

  it('never replaces a paying or premium profile', async () => {
    const mine = await signup('keepme2')
    const hidden = await appleSignin('apple-paying', 'paying@privaterelay.appleid.com')
    await env.DB.prepare("UPDATE users SET role = 'premium', sub_status = 'active' WHERE id = ?").bind(hidden.json.user.id).run()
    const r = await link(mine.token, 'apple-paying', { replaceOther: true })
    expect([r.status, r.json.error]).toEqual([409, 'identity_in_use'])
    expect((await session(hidden.json.token)).status).toBe(200)
  })
})

describe('connect Google to the profile you are signed in to', () => {
  const googleProfile = (sub: string, email: string) =>
    mockOutbound((url) => {
      if (url === 'https://appleid.apple.com/auth/keys') return Response.json({ keys: [signer.jwk] })
      if (url.startsWith('https://oauth2.googleapis.com/token')) return Response.json({ access_token: 'at' })
      if (url.startsWith('https://openidconnect.googleapis.com/v1/userinfo')) return Response.json({ sub, email, email_verified: true, name: 'G' })
    })
  const frag = (loc: string) => new URLSearchParams(new URL(loc).hash.slice(1))
  const REDIRECT = 'momease://auth-callback'

  async function ticket(token: string, extra: Record<string, unknown> = {}) {
    const r = await call('/auth/link/google/init', { token, body: extra })
    return r.json.linkToken as string
  }
  async function connect(token: string, sub: string, email: string, extra: Record<string, unknown> = {}) {
    googleProfile(sub, email)
    const t = await ticket(token, extra)
    const start = await call(`/auth/google/start?redirect=${encodeURIComponent(REDIRECT)}&link=${encodeURIComponent(t)}`)
    expect(start.status).toBe(302)
    const state = new URL(start.headers.get('location')!).searchParams.get('state')!
    const cb = await call(`/auth/google/callback?code=c&state=${encodeURIComponent(state)}`)
    expect(cb.status).toBe(302)
    return frag(cb.headers.get('location')!)
  }

  it('attaches Google, and the next Google sign-in opens this same profile', async () => {
    const me = await signup('gl')
    const f = await connect(me.token, 'google-sub-1', uniqueEmail('different'))
    expect(f.get('linked')).toBe('google')
    expect(f.get('token')).toBeNull() // no new session is minted for a link
    expect((await session(me.token)).json.identities.google).toBe(true)
    googleProfile('google-sub-1', uniqueEmail('different'))
    const start = await call(`/auth/google/start?redirect=${encodeURIComponent(REDIRECT)}`)
    const state = new URL(start.headers.get('location')!).searchParams.get('state')!
    const cb = await call(`/auth/google/callback?code=c&state=${encodeURIComponent(state)}`)
    expect(frag(cb.headers.get('location')!).get('user_id')).toBe(me.id)
  })

  it('needs a session to get a link ticket', async () => {
    expect((await call('/auth/link/google/init', { body: {} })).status).toBe(401)
  })

  it('rejects forged tickets, and a session token cannot be used as a ticket (or the other way round)', async () => {
    const me = await signup('forge')
    const bad = await call(`/auth/google/start?redirect=${encodeURIComponent(REDIRECT)}&link=garbage`)
    expect([bad.status, bad.json.error]).toEqual([400, 'bad_link_token'])
    const asTicket = await call(`/auth/google/start?redirect=${encodeURIComponent(REDIRECT)}&link=${encodeURIComponent(me.token)}`)
    expect(asTicket.status).toBe(400)
    const t = await ticket(me.token)
    expect((await session(t)).status).toBe(401) // a ticket is not a session
  })

  it('an empty Google profile can be replaced only with consent; a real one never', async () => {
    const me = await signup('gl2')
    googleProfile('google-empty', 'empty@example.com')
    // an empty profile created by "Continue with Google"
    const s1 = await call(`/auth/google/start?redirect=${encodeURIComponent(REDIRECT)}`)
    const st1 = new URL(s1.headers.get('location')!).searchParams.get('state')!
    const cb1 = await call(`/auth/google/callback?code=c&state=${encodeURIComponent(st1)}`)
    const emptyId = frag(cb1.headers.get('location')!).get('user_id')!
    const emptyTok = frag(cb1.headers.get('location')!).get('token')!

    expect((await connect(me.token, 'google-empty', 'empty@example.com')).get('link_error')).toBe('identity_in_use_mergeable')
    expect((await session(emptyTok)).status).toBe(200)
    expect((await connect(me.token, 'google-empty', 'empty@example.com', { replaceOther: true })).get('linked')).toBe('google')
    expect((await session(emptyTok)).status).toBe(401)
    expect(emptyId).not.toBe(me.id)

    const real = await signupWithProfile('realgoogle')
    await env.DB.prepare('UPDATE users SET google_sub = ? WHERE id = ?').bind('google-real', real.id).run()
    const other = await signup('gl3')
    expect((await connect(other.token, 'google-real', 'x@example.com', { replaceOther: true })).get('link_error')).toBe('identity_in_use')
    expect((await session(real.token)).status).toBe(200)
  })
})
