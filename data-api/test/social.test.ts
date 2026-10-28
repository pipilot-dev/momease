import { describe, expect, it } from 'vitest'
import { call, getSession, signup, signupWithProfile } from './helpers'

const GHOST = '00000000-0000-4000-8000-000000000000'

describe('profiles', () => {
  it('creates a profile with a slugified, unique username', async () => {
    const a = await signup('p1', 'Anna')
    const r = await call('/profile/me', { token: a.token, body: { display_name: 'Anna', username: 'Anna Banana!!' } })
    expect(r.status).toBe(200)
    expect(r.json.username).toBe('annabanana')
    const b = await signup('p2', 'Bea')
    const clash = await call('/profile/me', { token: b.token, body: { display_name: 'Bea', username: 'annabanana' } })
    expect(clash.status).toBe(200)
    expect(clash.json.username).toMatch(/^annabanana\d{4}$/)
  })

  it('GET /profile/me is null before creation and the profile after', async () => {
    const a = await signup('p3')
    expect((await call('/profile/me', { token: a.token })).json).toBeNull()
    await call('/profile/me', { token: a.token, body: { display_name: 'Cee' } })
    expect((await call('/profile/me', { token: a.token })).json.display_name).toBe('Cee')
  })

  it('updating one field does not blank the others', async () => {
    const a = await signup('p4')
    await call('/profile/me', { token: a.token, body: { display_name: 'Keep Me', avatar_url: 'https://x/y.png' } })
    const r = await call('/profile/me', { token: a.token, body: { avatar_url: 'https://x/z.png' } })
    expect(r.json.display_name).toBe('Keep Me')
    expect(r.json.avatar_url).toBe('https://x/z.png')
    const r2 = await call('/profile/me', { token: a.token, body: { display_name: 'Renamed' } })
    expect(r2.json.display_name).toBe('Renamed')
    expect(r2.json.avatar_url).toBe('https://x/z.png')
  })

  it('username changes: validates length, detects conflicts', async () => {
    const a = await signupWithProfile('uname')
    const b = await signupWithProfile('uname2')
    expect((await call('/profile/username', { method: 'PUT', token: a.token, body: { username: 'ab' } })).status).toBe(400)
    const taken = await call('/profile/username', { method: 'PUT', token: a.token, body: { username: b.username } })
    expect(taken.status).toBe(409)
    expect(taken.json.error).toBe('username_taken')
    const ok = await call('/profile/username', { method: 'PUT', token: a.token, body: { username: 'Fresh_Name' } })
    expect(ok.json.username).toBe('fresh_name')
  })

  it('search finds others, never yourself, treats % and _ literally', async () => {
    const a = await signupWithProfile('findme')
    const b = await signupWithProfile('seeker')
    const hit = await call(`/profile/search?q=${a.username.slice(0, 6)}`, { token: b.token })
    expect(hit.json.map((p: any) => p.id)).toContain(a.id)
    const self = await call(`/profile/search?q=${b.username}`, { token: b.token })
    expect(self.json.map((p: any) => p.id)).not.toContain(b.id)
    for (const q of ['%', '%%', 'a%', '%a']) {
      const r = await call(`/profile/search?q=${encodeURIComponent(q)}`, { token: b.token })
      expect(r.status).toBe(200)
      expect(r.json).toEqual([]) // '%' must not act as a wildcard that dumps every user
    }
    // '_' is a legal username character, so it may match -- but only literally, never as "any char".
    const under = await call(`/profile/search?q=${encodeURIComponent('_')}`, { token: b.token })
    expect(under.status).toBe(200)
    for (const p of under.json) expect(p.username).toContain('_')
    expect((await call('/profile/search', { token: b.token })).json).toEqual([])
  })

  it('last-seen touches the caller only', async () => {
    const a = await signupWithProfile('seen')
    expect((await call('/profile/last-seen', { token: a.token, method: 'POST' })).status).toBe(200)
  })

  it('getProfileById returns profile or null', async () => {
    const a = await signupWithProfile('byid')
    const b = await signup('viewer')
    expect((await call(`/profile/${a.id}`, { token: b.token })).json.id).toBe(a.id)
    expect((await call(`/profile/${GHOST}`, { token: b.token })).json).toBeNull()
  })
})

describe('follows', () => {
  it('follow / list / unfollow, both directions of the graph', async () => {
    const a = await signupWithProfile('fa')
    const b = await signupWithProfile('fb')
    expect((await call(`/follows/${b.id}`, { method: 'PUT', token: a.token })).status).toBe(200)
    // idempotent
    expect((await call(`/follows/${b.id}`, { method: 'PUT', token: a.token })).status).toBe(200)
    expect((await call('/follows', { token: a.token })).json.map((p: any) => p.id)).toEqual([b.id])
    expect((await call('/followers', { token: b.token })).json.map((p: any) => p.id)).toEqual([a.id])
    expect((await call('/follows', { token: b.token })).json).toEqual([])
    expect((await call(`/follows/${b.id}`, { method: 'DELETE', token: a.token })).status).toBe(200)
    expect((await call('/follows', { token: a.token })).json).toEqual([])
  })

  it('rejects self-follow and unknown users with proper status codes (not 500)', async () => {
    const a = await signupWithProfile('fself')
    expect((await call(`/follows/${a.id}`, { method: 'PUT', token: a.token })).status).toBe(400)
    expect((await call(`/follows/${GHOST}`, { method: 'PUT', token: a.token })).status).toBe(404)
  })

  it('users cannot remove other people’s follows', async () => {
    const a = await signupWithProfile('fo1')
    const b = await signupWithProfile('fo2')
    const c = await signupWithProfile('fo3')
    await call(`/follows/${b.id}`, { method: 'PUT', token: a.token })
    await call(`/follows/${b.id}`, { method: 'DELETE', token: c.token }) // c has no such follow
    expect((await call('/follows', { token: a.token })).json.length).toBe(1)
  })
})

describe('blocking', () => {
  it('block severs follows both ways, hides from search, stops messaging both directions', async () => {
    const a = await signupWithProfile('ba')
    const b = await signupWithProfile('bb')
    await call(`/follows/${b.id}`, { method: 'PUT', token: a.token })
    await call(`/follows/${a.id}`, { method: 'PUT', token: b.token })
    expect((await call(`/blocks/${b.id}`, { method: 'PUT', token: a.token })).status).toBe(200)
    expect((await call('/follows', { token: a.token })).json).toEqual([])
    expect((await call('/follows', { token: b.token })).json).toEqual([])
    expect((await call('/blocks', { token: a.token })).json.map((r: any) => r.blocked_id)).toEqual([b.id])
    const search = await call(`/profile/search?q=${b.username}`, { token: a.token })
    expect(search.json.map((p: any) => p.id)).not.toContain(b.id)

    const fromB = await call('/messages', { token: b.token, body: { recipient_id: a.id, body: 'hi' } })
    expect(fromB.status).toBe(403)
    const fromA = await call('/messages', { token: a.token, body: { recipient_id: b.id, body: 'hi' } })
    expect(fromA.status).toBe(403)

    expect((await call(`/blocks/${b.id}`, { method: 'DELETE', token: a.token })).status).toBe(200)
    expect((await call('/messages', { token: b.token, body: { recipient_id: a.id, body: 'hi again' } })).status).toBe(200)
  })

  it('validates targets', async () => {
    const a = await signupWithProfile('bv')
    expect((await call(`/blocks/${a.id}`, { method: 'PUT', token: a.token })).status).toBe(400)
    expect((await call(`/blocks/${GHOST}`, { method: 'PUT', token: a.token })).status).toBe(404)
  })

  it('hides blocked users from the inbox and conversation lists', async () => {
    const a = await signupWithProfile('bi1')
    const b = await signupWithProfile('bi2')
    await call('/messages', { token: b.token, body: { recipient_id: a.id, body: 'before block' } })
    expect((await call('/messages/inbox', { token: a.token })).json.length).toBe(1)
    await call(`/blocks/${b.id}`, { method: 'PUT', token: a.token })
    expect((await call('/messages/inbox', { token: a.token })).json).toEqual([])
  })
})

describe('messages', () => {
  it('send, read conversation (both sides), unread counts, mark read', async () => {
    const a = await signupWithProfile('ma')
    const b = await signupWithProfile('mb')
    await call('/messages', { token: a.token, body: { recipient_id: b.id, body: 'one' } })
    await call('/messages', { token: a.token, body: { recipient_id: b.id, body: 'two' } })
    await call('/messages', { token: b.token, body: { recipient_id: a.id, body: 'reply' } })

    const convA = await call(`/messages/${b.id}`, { token: a.token })
    expect(convA.json.map((m: any) => m.body)).toEqual(['one', 'two', 'reply'])
    expect((await call(`/messages/${a.id}`, { token: b.token })).json.length).toBe(3)

    const inboxB = await call('/messages/inbox', { token: b.token })
    expect(inboxB.json.length).toBe(1)
    expect(inboxB.json[0].unread).toBe(2)
    expect(inboxB.json[0].partner.id).toBe(a.id)

    await call(`/messages/${a.id}/read`, { token: b.token, method: 'POST' })
    expect((await call('/messages/inbox', { token: b.token })).json[0].unread).toBe(0)
    // marking read as B must not mark B's own sent messages, and A's unread (the reply) is untouched
    expect((await call('/messages/inbox', { token: a.token })).json[0].unread).toBe(1)
  })

  it('share-by-reference payloads round-trip; invalid share types rejected', async () => {
    const a = await signupWithProfile('sa')
    const b = await signupWithProfile('sb')
    const ok = await call('/messages', { token: a.token, body: { recipient_id: b.id, share: { type: 'mantra', ref: 'm4', title: 'I am enough' } } })
    expect(ok.status).toBe(200)
    expect(ok.json).toMatchObject({ share_type: 'mantra', share_ref: 'm4', share_title: 'I am enough', body: '' })
    const bad = await call('/messages', { token: a.token, body: { recipient_id: b.id, share: { type: 'virus', ref: 'x', title: 'x' } } })
    expect(bad.status).toBe(400)
  })

  it('validates content, size and recipients', async () => {
    const a = await signupWithProfile('va')
    const b = await signupWithProfile('vb')
    expect((await call('/messages', { token: a.token, body: { recipient_id: b.id, body: '   ' } })).status).toBe(400)
    expect((await call('/messages', { token: a.token, body: { recipient_id: b.id, body: 'x'.repeat(4001) } })).status).toBe(400)
    expect((await call('/messages', { token: a.token, body: { body: 'hi' } })).status).toBe(400)
    expect((await call('/messages', { token: a.token, body: { recipient_id: a.id, body: 'me' } })).status).toBe(400)
    expect((await call('/messages', { token: a.token, body: { recipient_id: GHOST, body: 'hi' } })).status).toBe(404)
  })

  it('a third user cannot read someone else’s conversation', async () => {
    const a = await signupWithProfile('ta')
    const b = await signupWithProfile('tb')
    const spy = await signupWithProfile('tc')
    await call('/messages', { token: a.token, body: { recipient_id: b.id, body: 'secret' } })
    expect((await call(`/messages/${b.id}`, { token: spy.token })).json).toEqual([])
    expect((await call(`/messages/${a.id}`, { token: spy.token })).json).toEqual([])
    expect((await call('/messages/inbox', { token: spy.token })).json).toEqual([])
  })

  it('a third user cannot mark someone else’s messages as read', async () => {
    const a = await signupWithProfile('ra')
    const b = await signupWithProfile('rb')
    const spy = await signupWithProfile('rc')
    await call('/messages', { token: a.token, body: { recipient_id: b.id, body: 'unread' } })
    await call(`/messages/${a.id}/read`, { token: spy.token, method: 'POST' })
    expect((await call('/messages/inbox', { token: b.token })).json[0].unread).toBe(1)
  })
})

describe('reports', () => {
  it('files a report; validates type, reason and target', async () => {
    const a = await signupWithProfile('rpa')
    const b = await signupWithProfile('rpb')
    const ok = await call('/reports', { token: a.token, body: { reported_user_id: b.id, content_type: 'user', reason: 'spam' } })
    expect(ok.status).toBe(200)
    expect(ok.json.id).toBeTruthy()
    expect((await call('/reports', { token: a.token, body: { content_type: 'nope', reason: 'x' } })).status).toBe(400)
    expect((await call('/reports', { token: a.token, body: { content_type: 'user', reason: '  ' } })).status).toBe(400)
    expect((await call('/reports', { token: a.token, body: { content_type: 'user', reason: 'x', reported_user_id: GHOST } })).status).toBe(404)
  })
})

describe('account deletion cascades through the social graph', () => {
  it('removes profile, follows, messages; the other user keeps a clean inbox', async () => {
    const a = await signupWithProfile('da')
    const b = await signupWithProfile('db')
    await call(`/follows/${a.id}`, { method: 'PUT', token: b.token })
    await call('/messages', { token: a.token, body: { recipient_id: b.id, body: 'bye' } })
    expect((await call('/account', { token: a.token, method: 'DELETE' })).status).toBe(200)
    expect((await call(`/profile/${a.id}`, { token: b.token })).json).toBeNull()
    expect((await call('/follows', { token: b.token })).json).toEqual([])
    expect((await call('/messages/inbox', { token: b.token })).json).toEqual([])
    expect((await getSession(b.token)).status).toBe(200)
  })
})
