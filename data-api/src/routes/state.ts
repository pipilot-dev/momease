// /state[/:key] — per-user KV JSON store. Mirrors AsyncStorage keys.
//
//   GET    /state           → { [key]: data }  (all keys for this user)
//   PUT    /state/:key      → { ok }           (upsert one key's JSON blob)
//   DELETE /state/:key      → { ok }

import type { Env } from '../worker'

export async function handleState(req: Request, env: Env, url: URL, uid: string): Promise<Response> {
  const path = url.pathname

  if (path === '/state' && req.method === 'GET') {
    const rows = await env.DB.prepare('SELECT key, data FROM user_state WHERE user_id = ?').bind(uid).all<{ key: string; data: string }>()
    const out: Record<string, unknown> = {}
    for (const r of rows.results ?? []) {
      try { out[r.key] = JSON.parse(r.data) } catch { out[r.key] = null }
    }
    return Response.json(out)
  }

  const m = /^\/state\/([A-Za-z0-9_.:-]{1,120})$/.exec(path)
  if (m) {
    const key = m[1]
    if (req.method === 'PUT') {
      let data: unknown
      try { data = await req.json() } catch {
        return Response.json({ error: 'invalid_json' }, { status: 400 })
      }
      await env.DB.prepare(
        `INSERT INTO user_state (user_id, key, data, updated_at)
         VALUES (?, ?, ?, datetime('now'))
         ON CONFLICT(user_id, key) DO UPDATE SET
           data = excluded.data, updated_at = datetime('now')`,
      ).bind(uid, key, JSON.stringify(data ?? {})).run()
      return Response.json({ ok: true })
    }
    if (req.method === 'DELETE') {
      await env.DB.prepare('DELETE FROM user_state WHERE user_id = ? AND key = ?').bind(uid, key).run()
      return Response.json({ ok: true })
    }
  }

  return Response.json({ error: 'not_found' }, { status: 404 })
}
