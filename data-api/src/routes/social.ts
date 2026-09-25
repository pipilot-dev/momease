// Social routes — profiles, follows, messages, blocks, reports.
// All rows are scoped by the caller's uid, enforced here (no RLS in D1).

import type { Env } from '../worker'

type Handler = () => Promise<Response>

export async function handleSocial(req: Request, env: Env, url: URL, uid: string): Promise<Response | null> {
  const path = url.pathname
  const method = req.method

  const routes: Array<{ pattern: RegExp; method: string; handler: (m: RegExpMatchArray) => Handler }> = [
    { pattern: /^\/profile\/me$/,           method: 'GET',    handler: () => () => getMyProfile(env, uid) },
    { pattern: /^\/profile\/me$/,           method: 'POST',   handler: () => () => upsertMyProfile(req, env, uid) },
    { pattern: /^\/profile\/username$/,     method: 'PUT',    handler: () => () => setUsername(req, env, uid) },
    { pattern: /^\/profile\/last-seen$/,    method: 'POST',   handler: () => () => touchLastSeen(env, uid) },
    { pattern: /^\/profile\/search$/,       method: 'GET',    handler: () => () => searchProfiles(env, url, uid) },
    { pattern: /^\/profile\/([\w-]{36})$/,  method: 'GET',    handler: (m) => () => getProfileById(env, m[1], uid) },

    { pattern: /^\/follows$/,               method: 'GET',    handler: () => () => listFollowing(env, uid) },
    { pattern: /^\/followers$/,             method: 'GET',    handler: () => () => listFollowers(env, uid) },
    { pattern: /^\/follows\/([\w-]{36})$/,  method: 'PUT',    handler: (m) => () => follow(env, uid, m[1]) },
    { pattern: /^\/follows\/([\w-]{36})$/,  method: 'DELETE', handler: (m) => () => unfollow(env, uid, m[1]) },

    { pattern: /^\/blocks$/,                method: 'GET',    handler: () => () => listBlocks(env, uid) },
    { pattern: /^\/blocks\/([\w-]{36})$/,   method: 'PUT',    handler: (m) => () => block(env, uid, m[1]) },
    { pattern: /^\/blocks\/([\w-]{36})$/,   method: 'DELETE', handler: (m) => () => unblock(env, uid, m[1]) },

    { pattern: /^\/messages$/,              method: 'POST',   handler: () => () => sendMessage(req, env, uid) },
    { pattern: /^\/messages\/inbox$/,       method: 'GET',    handler: () => () => getInbox(env, uid) },
    { pattern: /^\/messages\/([\w-]{36})$/, method: 'GET',    handler: (m) => () => getConversation(env, uid, m[1]) },
    { pattern: /^\/messages\/([\w-]{36})\/read$/, method: 'POST', handler: (m) => () => markRead(env, uid, m[1]) },

    { pattern: /^\/reports$/,               method: 'POST',   handler: () => () => report(req, env, uid) },
  ]

  for (const r of routes) {
    const m = r.pattern.exec(path)
    if (!m || r.method !== method) continue
    return r.handler(m)()
  }
  return null
}

// ---------- profiles ----------

function slugify(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20) || 'mama'
}

async function getMyProfile(env: Env, uid: string): Promise<Response> {
  const row = await env.DB.prepare('SELECT * FROM profiles WHERE id = ?').bind(uid).first()
  return Response.json(row ?? null)
}

async function upsertMyProfile(req: Request, env: Env, uid: string): Promise<Response> {
  let body: { username?: string; display_name?: string; avatar_url?: string | null }
  try { body = await req.json() } catch { return Response.json({ error: 'invalid_json' }, { status: 400 }) }

  const existing = await env.DB.prepare('SELECT id FROM profiles WHERE id = ?').bind(uid).first<{ id: string }>()
  if (existing) {
    await env.DB.prepare(
      `UPDATE profiles SET display_name = ?, avatar_url = ? WHERE id = ?`,
    ).bind(body.display_name ?? '', body.avatar_url ?? null, uid).run()
    const updated = await env.DB.prepare('SELECT * FROM profiles WHERE id = ?').bind(uid).first()
    return Response.json(updated)
  }

  // Create — pick a unique username from the requested one or a default.
  const base = slugify(body.username ?? body.display_name ?? 'mama')
  for (let i = 0; i < 5; i++) {
    const username = i === 0 ? base : `${base}${1000 + Math.floor(Math.random() * 9000)}`
    try {
      await env.DB.prepare(
        `INSERT INTO profiles (id, username, display_name, avatar_url) VALUES (?, ?, ?, ?)`,
      ).bind(uid, username, body.display_name ?? '', body.avatar_url ?? null).run()
      const row = await env.DB.prepare('SELECT * FROM profiles WHERE id = ?').bind(uid).first()
      return Response.json(row)
    } catch (e) {
      if (!(e instanceof Error) || !/UNIQUE/.test(e.message)) throw e
    }
  }
  return Response.json({ error: 'username_generation_failed' }, { status: 500 })
}

async function setUsername(req: Request, env: Env, uid: string): Promise<Response> {
  const b = await req.json<{ username?: string }>().catch(() => ({} as { username?: string }))
  const clean = slugify(b.username ?? '')
  if (clean.length < 3) return Response.json({ error: 'username_too_short' }, { status: 400 })
  try {
    await env.DB.prepare('UPDATE profiles SET username = ? WHERE id = ?').bind(clean, uid).run()
    return Response.json({ ok: true, username: clean })
  } catch (e) {
    if (e instanceof Error && /UNIQUE/.test(e.message)) return Response.json({ error: 'username_taken' }, { status: 409 })
    throw e
  }
}

async function touchLastSeen(env: Env, uid: string): Promise<Response> {
  await env.DB.prepare("UPDATE profiles SET last_seen = datetime('now') WHERE id = ?").bind(uid).run()
  return Response.json({ ok: true })
}

async function searchProfiles(env: Env, url: URL, uid: string): Promise<Response> {
  const q = (url.searchParams.get('q') ?? '').trim().toLowerCase()
  if (!q) return Response.json([])
  const like = `%${q}%`
  const rows = await env.DB.prepare(
    `SELECT p.* FROM profiles p
     WHERE lower(p.username) LIKE ?
       AND p.id != ?
       AND p.id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = ?)
     LIMIT 30`,
  ).bind(like, uid, uid).all()
  return Response.json((rows.results ?? []).slice(0, 20))
}

async function getProfileById(env: Env, id: string, _uid: string): Promise<Response> {
  const row = await env.DB.prepare('SELECT * FROM profiles WHERE id = ?').bind(id).first()
  return Response.json(row ?? null)
}

// ---------- follows ----------

async function listFollowing(env: Env, uid: string): Promise<Response> {
  const rows = await env.DB.prepare(
    `SELECT p.* FROM follows f
     JOIN profiles p ON p.id = f.following_id
     WHERE f.follower_id = ?
       AND p.id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = ?)`,
  ).bind(uid, uid).all()
  return Response.json(rows.results ?? [])
}

async function listFollowers(env: Env, uid: string): Promise<Response> {
  const rows = await env.DB.prepare(
    `SELECT p.* FROM follows f
     JOIN profiles p ON p.id = f.follower_id
     WHERE f.following_id = ?
       AND p.id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = ?)`,
  ).bind(uid, uid).all()
  return Response.json(rows.results ?? [])
}

async function follow(env: Env, uid: string, target: string): Promise<Response> {
  if (target === uid) return Response.json({ error: 'cannot_follow_self' }, { status: 400 })
  await env.DB.prepare(
    `INSERT INTO follows (follower_id, following_id) VALUES (?, ?)
     ON CONFLICT(follower_id, following_id) DO NOTHING`,
  ).bind(uid, target).run()
  return Response.json({ ok: true })
}

async function unfollow(env: Env, uid: string, target: string): Promise<Response> {
  await env.DB.prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?')
    .bind(uid, target).run()
  return Response.json({ ok: true })
}

// ---------- blocks ----------

async function listBlocks(env: Env, uid: string): Promise<Response> {
  const rows = await env.DB.prepare('SELECT blocked_id, created_at FROM blocks WHERE blocker_id = ?')
    .bind(uid).all()
  return Response.json(rows.results ?? [])
}

async function block(env: Env, uid: string, target: string): Promise<Response> {
  if (target === uid) return Response.json({ error: 'cannot_block_self' }, { status: 400 })
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO blocks (blocker_id, blocked_id) VALUES (?, ?)
       ON CONFLICT(blocker_id, blocked_id) DO NOTHING`,
    ).bind(uid, target),
    // Blocking severs the follow relationship both ways.
    env.DB.prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?').bind(uid, target),
    env.DB.prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?').bind(target, uid),
  ])
  return Response.json({ ok: true })
}

async function unblock(env: Env, uid: string, target: string): Promise<Response> {
  await env.DB.prepare('DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?')
    .bind(uid, target).run()
  return Response.json({ ok: true })
}

// ---------- messages ----------

interface SendBody {
  recipient_id?: string
  body?: string
  share?: { type: 'mantra' | 'sound' | 'meditation'; ref: string; title: string }
}

async function sendMessage(req: Request, env: Env, uid: string): Promise<Response> {
  const b = await req.json<SendBody>().catch(() => ({} as SendBody))
  if (!b.recipient_id) return Response.json({ error: 'recipient_required' }, { status: 400 })
  if (b.recipient_id === uid) return Response.json({ error: 'no_self_message' }, { status: 400 })

  const blocked = await env.DB.prepare(
    `SELECT 1 FROM blocks
     WHERE (blocker_id = ? AND blocked_id = ?)
        OR (blocker_id = ? AND blocked_id = ?)
     LIMIT 1`,
  ).bind(uid, b.recipient_id, b.recipient_id, uid).first()
  if (blocked) return Response.json({ error: 'blocked' }, { status: 403 })

  const id = crypto.randomUUID()
  await env.DB.prepare(
    `INSERT INTO messages (id, sender_id, recipient_id, body, share_type, share_ref, share_title)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    id, uid, b.recipient_id, b.body ?? '',
    b.share?.type ?? null, b.share?.ref ?? null, b.share?.title ?? null,
  ).run()
  const row = await env.DB.prepare('SELECT * FROM messages WHERE id = ?').bind(id).first()
  return Response.json(row)
}

async function getConversation(env: Env, uid: string, other: string): Promise<Response> {
  const rows = await env.DB.prepare(
    `SELECT * FROM messages
     WHERE (sender_id = ? AND recipient_id = ?)
        OR (sender_id = ? AND recipient_id = ?)
     ORDER BY created_at ASC`,
  ).bind(uid, other, other, uid).all()
  return Response.json(rows.results ?? [])
}

async function markRead(env: Env, uid: string, other: string): Promise<Response> {
  await env.DB.prepare(
    `UPDATE messages SET read_at = datetime('now')
     WHERE recipient_id = ? AND sender_id = ? AND read_at IS NULL`,
  ).bind(uid, other).run()
  return Response.json({ ok: true })
}

async function getInbox(env: Env, uid: string): Promise<Response> {
  // Grab the last 500 messages either party is involved in, group by partner.
  const rows = await env.DB.prepare(
    `SELECT * FROM messages
     WHERE (sender_id = ? OR recipient_id = ?)
     ORDER BY created_at DESC
     LIMIT 500`,
  ).bind(uid, uid).all<{
    id: string; sender_id: string; recipient_id: string; body: string;
    share_type: string | null; share_ref: string | null; share_title: string | null;
    read_at: string | null; created_at: string
  }>()

  interface Entry { last: typeof rows.results[number]; unread: number }
  const byPartner = new Map<string, Entry>()
  for (const m of rows.results ?? []) {
    const partnerId = m.sender_id === uid ? m.recipient_id : m.sender_id
    let e = byPartner.get(partnerId)
    if (!e) {
      e = { last: m, unread: 0 }
      byPartner.set(partnerId, e)
    }
    if (m.recipient_id === uid && !m.read_at) e.unread++
  }

  const partnerIds = [...byPartner.keys()]
  if (!partnerIds.length) return Response.json([])

  const placeholders = partnerIds.map(() => '?').join(',')
  const [profRows, blockedRows] = await Promise.all([
    env.DB.prepare(`SELECT * FROM profiles WHERE id IN (${placeholders})`).bind(...partnerIds).all(),
    env.DB.prepare('SELECT blocked_id FROM blocks WHERE blocker_id = ?').bind(uid).all<{ blocked_id: string }>(),
  ])
  const blocked = new Set((blockedRows.results ?? []).map((r) => r.blocked_id))
  const profs = new Map<string, unknown>()
  for (const p of profRows.results ?? []) profs.set((p as { id: string }).id, p)

  const summaries = [...byPartner.entries()]
    .filter(([pid]) => !blocked.has(pid) && profs.has(pid))
    .map(([pid, e]) => ({ partner: profs.get(pid), lastMessage: e.last, unread: e.unread }))
    .sort((a, b) =>
      new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime(),
    )
  return Response.json(summaries)
}

// ---------- reports ----------

interface ReportBody {
  reported_user_id?: string | null
  content_type?: string
  content_ref?: string | null
  reason?: string
}

async function report(req: Request, env: Env, uid: string): Promise<Response> {
  const b = await req.json<ReportBody>().catch(() => ({} as ReportBody))
  if (!b.content_type || !b.reason) return Response.json({ error: 'missing_fields' }, { status: 400 })
  const id = crypto.randomUUID()
  await env.DB.prepare(
    `INSERT INTO reports (id, reporter_id, reported_user_id, content_type, content_ref, reason)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).bind(id, uid, b.reported_user_id ?? null, b.content_type, b.content_ref ?? null, b.reason).run()
  return Response.json({ ok: true, id })
}
