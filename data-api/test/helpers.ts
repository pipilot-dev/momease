import { createExecutionContext, env, waitOnExecutionContext } from 'cloudflare:test'
import { vi } from 'vitest'
import worker from '../src/worker'

let ipCounter = 0
let emailCounter = 0

export interface CallOpts {
  method?: string
  body?: unknown
  raw?: string
  token?: string
  headers?: Record<string, string>
  envOverride?: Record<string, unknown>
  ip?: string
}

export async function call(path: string, opts: CallOpts = {}) {
  const headers: Record<string, string> = {
    // Unique IP per call so the brute-force throttle never leaks between tests.
    'CF-Connecting-IP': opts.ip ?? `10.${(ipCounter >> 16) & 255}.${(ipCounter >> 8) & 255}.${ipCounter++ & 255}`,
    ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    ...(opts.headers ?? {}),
  }
  const method = opts.method ?? (opts.body !== undefined || opts.raw !== undefined ? 'POST' : 'GET')
  const req = new Request(`https://api.test${path}`, {
    method,
    headers,
    body: opts.raw ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
  })
  const ctx = createExecutionContext()
  const e = opts.envOverride ? ({ ...env, ...opts.envOverride } as typeof env) : env
  const res = await worker.fetch(req, e, ctx)
  await waitOnExecutionContext(ctx)
  const text = await res.text()
  let json: any = null
  try { json = JSON.parse(text) } catch { /* non-JSON body */ }
  return { status: res.status, json, text, headers: res.headers }
}

export function uniqueEmail(tag = 'user') {
  return `${tag}-${Date.now()}-${emailCounter++}@test.dev`
}

export const PASSWORD = 'correct-horse-battery'

export interface TestUser { id: string; email: string; token: string }

export async function signup(tag = 'user', name?: string): Promise<TestUser> {
  const email = uniqueEmail(tag)
  const r = await call('/auth/signup', { body: { email, password: PASSWORD, name } })
  if (r.status !== 200) throw new Error(`signup failed: ${r.status} ${r.text}`)
  return { id: r.json.user.id, email, token: r.json.token }
}

/** Create a user AND a profile (needed for search / social routes). */
export async function signupWithProfile(tag: string): Promise<TestUser & { username: string }> {
  const u = await signup(tag, tag)
  const p = await call('/profile/me', { token: u.token, body: { display_name: tag, username: `${tag}${emailCounter}` } })
  if (p.status !== 200) throw new Error(`profile failed: ${p.status} ${p.text}`)
  return { ...u, username: p.json.username }
}

type Handler = (url: string, init?: RequestInit) => Response | Promise<Response> | undefined

/** Intercept outbound fetches (Stripe / Google / Resend). Unmocked URLs fail loudly. */
export function mockOutbound(handler: Handler) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url
    const r = await handler(url, init)
    if (r) return r
    throw new Error(`unmocked outbound fetch: ${url}`)
  })
}

export function formOf(init?: RequestInit): URLSearchParams {
  return new URLSearchParams(String(init?.body ?? ''))
}

export async function stripeSignature(body: string, secret = 'whsec_test_secret', ts = Math.floor(Date.now() / 1000)) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${ts}.${body}`))
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
  return `t=${ts},v1=${hex}`
}

export async function getSession(token: string) {
  return call('/session', { token })
}
