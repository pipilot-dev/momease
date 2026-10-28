import { describe, expect, it } from 'vitest'
import { call, signup } from './helpers'

describe('per-user state store', () => {
  it('round-trips JSON blobs per key, overwrites, deletes', async () => {
    const u = await signup('st')
    expect((await call('/state', { token: u.token })).json).toEqual({})
    expect((await call('/state/momease-tasks', { method: 'PUT', token: u.token, body: { tasks: [{ id: 1 }] } })).status).toBe(200)
    expect((await call('/state/momease-mood', { method: 'PUT', token: u.token, body: { v: 3 } })).status).toBe(200)
    expect((await call('/state', { token: u.token })).json).toEqual({ 'momease-tasks': { tasks: [{ id: 1 }] }, 'momease-mood': { v: 3 } })
    await call('/state/momease-tasks', { method: 'PUT', token: u.token, body: { tasks: [] } })
    expect((await call('/state', { token: u.token })).json['momease-tasks']).toEqual({ tasks: [] })
    expect((await call('/state/momease-mood', { method: 'DELETE', token: u.token })).status).toBe(200)
    expect(Object.keys((await call('/state', { token: u.token })).json)).toEqual(['momease-tasks'])
  })

  it('isolates users from each other', async () => {
    const a = await signup('sa')
    const b = await signup('sb')
    await call('/state/k', { method: 'PUT', token: a.token, body: { secret: 'a' } })
    expect((await call('/state', { token: b.token })).json).toEqual({})
    await call('/state/k', { method: 'DELETE', token: b.token })
    expect((await call('/state', { token: a.token })).json.k).toEqual({ secret: 'a' })
  })

  it('rejects bad keys, bad JSON, oversized payloads, and anonymous access', async () => {
    const u = await signup('sv')
    expect((await call('/state/bad key!', { method: 'PUT', token: u.token, body: {} })).status).toBe(404)
    expect((await call('/state/k', { method: 'PUT', token: u.token, raw: '{oops' })).status).toBe(400)
    expect((await call('/state/k', { method: 'PUT', token: u.token, body: { x: 'y'.repeat(600 * 1024) } })).status).toBe(413)
    expect((await call('/state')).status).toBe(401)
  })
})

describe('every protected route rejects anonymous callers', () => {
  const G = '00000000-0000-4000-8000-000000000000'
  const routes: Array<[string, string]> = [
    ['GET', '/session'], ['GET', '/state'], ['PUT', '/state/k'], ['DELETE', '/state/k'], ['DELETE', '/account'],
    ['GET', '/profile/me'], ['POST', '/profile/me'], ['PUT', '/profile/username'], ['POST', '/profile/last-seen'],
    ['GET', '/profile/search?q=a'], ['GET', `/profile/${G}`], ['GET', '/follows'], ['GET', '/followers'],
    ['PUT', `/follows/${G}`], ['DELETE', `/follows/${G}`], ['GET', '/blocks'], ['PUT', `/blocks/${G}`],
    ['DELETE', `/blocks/${G}`], ['POST', '/messages'], ['GET', '/messages/inbox'], ['GET', `/messages/${G}`],
    ['POST', `/messages/${G}/read`], ['POST', '/reports'], ['POST', '/billing/checkout'], ['POST', '/billing/portal'],
    ['POST', '/auth/signout'], ['POST', '/auth/update'],
  ]
  it.each(routes)('%s %s → 401', async (method, path) => {
    const r = await call(path, { method, body: method === 'GET' || method === 'DELETE' ? undefined : {} })
    expect(r.status).toBe(401)
  })
})

describe('http surface', () => {
  it('health endpoint', async () => {
    expect((await call('/health')).json).toEqual({ ok: true, service: 'momease-data-api' })
  })

  it('unknown routes 404 (authed) and never 500', async () => {
    const u = await signup('nf')
    expect((await call('/nope', { token: u.token })).status).toBe(404)
    expect((await call('/auth/nope')).status).toBe(404)
  })

  it('CORS: allowed origins echoed, others get no CORS headers', async () => {
    const good = await call('/health', { headers: { Origin: 'https://app.mease.mom' } })
    expect(good.headers.get('access-control-allow-origin')).toBe('https://app.mease.mom')
    const bad = await call('/health', { headers: { Origin: 'https://evil.example' } })
    expect(bad.headers.get('access-control-allow-origin')).toBeNull()
    const pre = await call('/session', { method: 'OPTIONS', headers: { Origin: 'https://mease.mom' } })
    expect(pre.status).toBe(204)
    expect(pre.headers.get('access-control-allow-origin')).toBe('https://mease.mom')
    const preBad = await call('/session', { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } })
    expect(preBad.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('error bodies never leak internals', async () => {
    const r = await call('/auth/signup', { raw: '\u0000\u0000' })
    expect(r.text).not.toMatch(/at \w+\s*\(|SQLITE|D1_ERROR/)
  })
})
