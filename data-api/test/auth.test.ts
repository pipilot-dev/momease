import { afterEach, describe, expect, it, vi } from 'vitest'
import { call, getSession, mockOutbound, PASSWORD, signup, uniqueEmail } from './helpers'

afterEach(() => vi.restoreAllMocks())

describe('signup', () => {
  it('creates an account and returns a working session', async () => {
    const email = uniqueEmail('new')
    const r = await call('/auth/signup', { body: { email, password: PASSWORD, name: 'Mama Bear' } })
    expect(r.status).toBe(200)
    expect(r.json.user).toMatchObject({ email, name: 'Mama Bear', role: 'free', onboardingCompleted: false })
    expect(r.json.token).toBeTruthy()
    const s = await getSession(r.json.token)
    expect(s.status).toBe(200)
    expect(s.json.user.email).toBe(email)
    expect(s.json.subscription.status).toBe('none')
  })

  it('normalises email case and rejects duplicates', async () => {
    const email = uniqueEmail('dup')
    expect((await call('/auth/signup', { body: { email: email.toUpperCase(), password: PASSWORD } })).status).toBe(200)
    const again = await call('/auth/signup', { body: { email, password: PASSWORD } })
    expect(again.status).toBe(409)
    expect(again.json.error).toBe('email_in_use')
  })

  it.each([
    [{ email: 'nope', password: PASSWORD }, 'invalid_email'],
    [{ email: 'a@b.co', password: 'short' }, 'password_too_short'],
    [{ email: 'a@b.co', password: 'x'.repeat(201) }, 'password_too_long'],
    [{ password: PASSWORD }, 'email_and_password_required'],
    [{ email: 'a@b.co' }, 'email_and_password_required'],
  ])('rejects bad input %j', async (body, error) => {
    const r = await call('/auth/signup', { body })
    expect(r.status).toBe(400)
    expect(r.json.error).toBe(error)
  })

  it('survives malformed JSON', async () => {
    const r = await call('/auth/signup', { raw: '{not json' })
    expect(r.status).toBe(400)
  })

  it('does not store the password in plaintext', async () => {
    const u = await signup('hash')
    const { env } = await import('cloudflare:test')
    const row = await env.DB.prepare('SELECT password_hash FROM users WHERE id = ?').bind(u.id).first<{ password_hash: string }>()
    expect(row!.password_hash.startsWith('pbkdf2$')).toBe(true)
    expect(row!.password_hash).not.toContain(PASSWORD)
  })
})

describe('signin / signout', () => {
  it('signs in with correct credentials, case-insensitive email', async () => {
    const u = await signup('si')
    const r = await call('/auth/signin', { body: { email: u.email.toUpperCase(), password: PASSWORD } })
    expect(r.status).toBe(200)
    expect(r.json.user.id).toBe(u.id)
    expect((await getSession(r.json.token)).status).toBe(200)
  })

  it('returns the same error for wrong password and unknown email', async () => {
    const u = await signup('bad')
    const wrong = await call('/auth/signin', { body: { email: u.email, password: 'wrong-password-1' } })
    const unknown = await call('/auth/signin', { body: { email: uniqueEmail('ghost'), password: PASSWORD } })
    expect(wrong.status).toBe(401)
    expect(unknown.status).toBe(401)
    expect(wrong.json).toEqual(unknown.json)
  })

  it('throttles after repeated failures, even from many IPs, then recovers on success path for others', async () => {
    const u = await signup('thr')
    for (let i = 0; i < 10; i++) {
      expect((await call('/auth/signin', { body: { email: u.email, password: 'wrong-password-1' } })).status).toBe(401)
    }
    const blocked = await call('/auth/signin', { body: { email: u.email, password: PASSWORD } })
    expect(blocked.status).toBe(429)
    const other = await signup('other')
    expect((await call('/auth/signin', { body: { email: other.email, password: PASSWORD } })).status).toBe(200)
  })

  it('signout revokes only that session', async () => {
    const u = await signup('so')
    const second = await call('/auth/signin', { body: { email: u.email, password: PASSWORD } })
    expect((await call('/auth/signout', { token: u.token, method: 'POST' })).status).toBe(200)
    const dead = await getSession(u.token)
    expect(dead.status).toBe(401)
    expect(dead.json.error).toBe('session_revoked')
    expect((await getSession(second.json.token)).status).toBe(200)
  })
})

describe('session tokens', () => {
  it('rejects missing, malformed, tampered and foreign tokens', async () => {
    const u = await signup('tok')
    expect((await call('/session')).status).toBe(401)
    expect((await call('/session', { token: 'garbage' })).status).toBe(401)
    const [h, p, s] = u.token.split('.')
    const flipped = `${h}.${p}.${s.slice(0, -2)}${s.endsWith('AA') ? 'BB' : 'AA'}`
    expect((await call('/session', { token: flipped })).status).toBe(401)
    expect((await call('/session', { headers: { Authorization: `Basic ${u.token}` } })).status).toBe(401)
  })

  it('an OAuth state token cannot be used as a session', async () => {
    const start = await call('/auth/google/start?redirect=momease://auth-callback')
    const state = new URL(start.headers.get('location')!).searchParams.get('state')!
    expect((await call('/session', { token: state })).status).toBe(401)
  })
})

describe('profile updates cannot escalate privileges', () => {
  it('ignores role / id / email / billing fields; keeps allowed ones', async () => {
    const u = await signup('esc', 'Original')
    const r = await call('/auth/update', {
      token: u.token,
      body: { role: 'premium', id: 'someone-else', email: 'x@y.co', sub_status: 'active', stripe_customer_id: 'cus_x', name: 'Renamed', interests: ['yoga'] },
    })
    expect(r.status).toBe(200)
    const s = await getSession(u.token)
    expect(s.json.user.role).toBe('free')
    expect(s.json.user.id).toBe(u.id)
    expect(s.json.user.email).toBe(u.email)
    expect(s.json.user.name).toBe('Renamed')
    expect(s.json.user.interests).toEqual(['yoga'])
    expect(s.json.subscription.status).toBe('none')
  })

  it('requires auth and caps payload size', async () => {
    expect((await call('/auth/update', { body: { name: 'x' } })).status).toBe(401)
    const u = await signup('big')
    const r = await call('/auth/update', { token: u.token, body: { name: 'x'.repeat(20000) } })
    expect(r.status).toBe(413)
  })
})

describe('google oauth: redirect allowlist', () => {
  const ok = ['momease://auth-callback', 'https://app.mease.mom/auth-callback', 'http://localhost:8081/auth-callback']
  const bad = [
    'https://evil.example/auth-callback',
    'momease://evil',
    'momease://auth-callback@evil.example',
    'momease://auth-callback/extra',
    'https://app.mease.mom.evil.example/auth-callback',
    'https://app.mease.mom/other-path',
    'https://user:pw@app.mease.mom/auth-callback',
    'javascript:alert(1)',
    'sitwith://auth-callback',
    'not a url',
  ]
  it.each(ok)('allows %s', async (redirect) => {
    const r = await call(`/auth/google/start?redirect=${encodeURIComponent(redirect)}`)
    expect(r.status).toBe(302)
    const loc = new URL(r.headers.get('location')!)
    expect(loc.origin).toBe('https://accounts.google.com')
    expect(loc.searchParams.get('client_id')).toBe('test-client-id.apps.googleusercontent.com')
    expect(loc.searchParams.get('redirect_uri')).toBe('https://api.test/auth/google/callback')
    expect(loc.searchParams.get('scope')).toBe('openid email profile')
  })
  it.each(bad)('rejects %s', async (redirect) => {
    const r = await call(`/auth/google/start?redirect=${encodeURIComponent(redirect)}`)
    expect(r.status).toBe(400)
    expect(r.json.error).toBe('redirect_not_allowed')
  })
  it('defaults to the app scheme when no redirect is given', async () => {
    expect((await call('/auth/google/start')).status).toBe(302)
  })
})

describe('google oauth: callback', () => {
  async function stateFor(redirect: string) {
    const start = await call(`/auth/google/start?redirect=${encodeURIComponent(redirect)}`)
    return new URL(start.headers.get('location')!).searchParams.get('state')!
  }
  function google(profile: Record<string, unknown>) {
    return mockOutbound((url) => {
      if (url.startsWith('https://oauth2.googleapis.com/token')) return Response.json({ access_token: 'at' })
      if (url.startsWith('https://openidconnect.googleapis.com/v1/userinfo')) return Response.json(profile)
    })
  }
  function fragment(location: string) {
    return new URLSearchParams(new URL(location).hash.slice(1))
  }

  it('creates a user and returns the session in the URL fragment, not the query', async () => {
    const email = uniqueEmail('g')
    google({ sub: `sub-${email}`, email, email_verified: true, name: 'Gina', picture: 'https://p/x.png' })
    const state = await stateFor('momease://auth-callback')
    const r = await call(`/auth/google/callback?code=abc&state=${encodeURIComponent(state)}`)
    expect(r.status).toBe(302)
    const loc = r.headers.get('location')!
    expect(loc.startsWith('momease://auth-callback')).toBe(true)
    expect(new URL(loc).search).toBe('')
    const f = fragment(loc)
    expect(f.get('email')).toBe(email)
    const s = await getSession(f.get('token')!)
    expect(s.status).toBe(200)
    expect(s.json.user).toMatchObject({ email, name: 'Gina', avatarUrl: 'https://p/x.png', role: 'free' })
  })

  it('signing in again with the same Google account reuses the same user', async () => {
    const email = uniqueEmail('g2')
    google({ sub: `sub-${email}`, email, email_verified: true })
    const run = async () => {
      const state = await stateFor('momease://auth-callback')
      const r = await call(`/auth/google/callback?code=abc&state=${encodeURIComponent(state)}`)
      return fragment(r.headers.get('location')!).get('user_id')
    }
    expect(await run()).toBe(await run())
  })

  it('links to an existing password account with the same verified email', async () => {
    const u = await signup('link')
    google({ sub: `sub-${u.email}`, email: u.email, email_verified: true })
    const state = await stateFor('momease://auth-callback')
    const r = await call(`/auth/google/callback?code=abc&state=${encodeURIComponent(state)}`)
    expect(fragment(r.headers.get('location')!).get('user_id')).toBe(u.id)
  })

  it('REFUSES an unverified Google email (account takeover guard)', async () => {
    const u = await signup('victim')
    google({ sub: 'attacker-sub', email: u.email, email_verified: false })
    const state = await stateFor('momease://auth-callback')
    const r = await call(`/auth/google/callback?code=abc&state=${encodeURIComponent(state)}`)
    expect(r.status).toBe(403)
    expect(r.json.error).toBe('email_not_verified')
  })

  it('rejects missing code/state, forged state, and google errors', async () => {
    expect((await call('/auth/google/callback')).status).toBe(400)
    expect((await call('/auth/google/callback?code=x&state=forged')).status).toBe(400)
    expect((await call('/auth/google/callback?error=access_denied')).status).toBe(400)
  })

  it('surfaces a failed token exchange as 502 without leaking details', async () => {
    mockOutbound((url) => (url.includes('oauth2.googleapis.com') ? new Response('{"error":"invalid_grant","secret":"x"}', { status: 400 }) : undefined))
    const state = await stateFor('momease://auth-callback')
    const r = await call(`/auth/google/callback?code=bad&state=${encodeURIComponent(state)}`)
    expect(r.status).toBe(502)
    expect(r.text).not.toContain('secret')
  })
})

describe('password reset', () => {
  const withResend = { RESEND_API_KEY: 're_test_key' }

  it('NEVER returns the token, identical response for known and unknown emails', async () => {
    const u = await signup('rst')
    const known = await call('/auth/reset/request', { body: { email: u.email } })
    const unknown = await call('/auth/reset/request', { body: { email: uniqueEmail('nobody') } })
    expect(known.status).toBe(200)
    expect(known.json).toEqual({ ok: true })
    expect(unknown.json).toEqual(known.json)
    expect(known.text).not.toMatch(/token/i)
  })

  it('does not send mail when no provider is configured', async () => {
    const spy = mockOutbound(() => undefined)
    const u = await signup('nomail')
    await call('/auth/reset/request', { body: { email: u.email } })
    expect(spy).not.toHaveBeenCalled()
  })

  it('full flow: email link → new password; old password dead; sessions revoked; token single-use', async () => {
    const u = await signup('flow')
    let html = ''
    mockOutbound((url, init) => {
      if (url === 'https://api.resend.com/emails') {
        const b = JSON.parse(String(init?.body))
        expect(b.to).toEqual([u.email])
        html = b.html
        return Response.json({ id: 'em_1' })
      }
    })
    await call('/auth/reset/request', { body: { email: u.email }, envOverride: withResend })
    const token = /reset-password#token=([a-f0-9]+)/.exec(html)?.[1]
    expect(token).toBeTruthy()

    const newPw = 'brand-new-password-9'
    expect((await call('/auth/reset/confirm', { body: { token, password: newPw } })).status).toBe(200)
    expect((await call('/auth/signin', { body: { email: u.email, password: PASSWORD } })).status).toBe(401)
    expect((await call('/auth/signin', { body: { email: u.email, password: newPw } })).status).toBe(200)
    expect((await getSession(u.token)).status).toBe(401) // old session killed
    expect((await call('/auth/reset/confirm', { body: { token, password: 'another-password-1' } })).status).toBe(400)
  })

  it('rejects bogus tokens and short passwords', async () => {
    expect((await call('/auth/reset/confirm', { body: { token: 'deadbeef', password: 'long-enough-pw' } })).status).toBe(400)
    expect((await call('/auth/reset/confirm', { body: { token: 'x', password: 'short' } })).status).toBe(400)
    expect((await call('/auth/reset/request', { body: { email: 'nope' } })).status).toBe(400)
  })

  it('stores only a hash of the token', async () => {
    const { env } = await import('cloudflare:test')
    const u = await signup('hashed')
    let html = ''
    mockOutbound((url, init) => {
      if (url.includes('resend')) { html = JSON.parse(String(init?.body)).html; return Response.json({}) }
    })
    await call('/auth/reset/request', { body: { email: u.email }, envOverride: withResend })
    const raw = /token=([a-f0-9]+)/.exec(html)![1]
    const rows = await env.DB.prepare('SELECT token_hash FROM password_resets WHERE user_id = ?').bind(u.id).all<{ token_hash: string }>()
    expect(rows.results.length).toBe(1)
    expect(rows.results[0].token_hash).not.toBe(raw)
    expect(rows.results[0].token_hash).toMatch(/^[a-f0-9]{64}$/)
  })
})

describe('account deletion', () => {
  it('removes the user and kills the session', async () => {
    const u = await signup('del')
    expect((await call('/account', { token: u.token, method: 'DELETE' })).status).toBe(200)
    expect((await getSession(u.token)).status).toBe(401)
    expect((await call('/auth/signin', { body: { email: u.email, password: PASSWORD } })).status).toBe(401)
  })
})
