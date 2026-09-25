// CORS: allow the origins configured in ALLOWED_ORIGINS (comma-separated),
// plus any request from a native app (Origin header absent).

import type { Env } from '../worker'

function pickOrigin(req: Request, env: Env): string | null {
  const origin = req.headers.get('Origin')
  if (!origin) return null
  const allowed = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
  return allowed.includes(origin) ? origin : null
}

function corsHeaders(req: Request, env: Env): Record<string, string> {
  const origin = pickOrigin(req, env)
  if (!origin) return {}
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  }
}

export function corsPreflight(req: Request, env: Env): Response {
  return new Response(null, { status: 204, headers: corsHeaders(req, env) })
}

export function withCors(req: Request, env: Env, res: Response): Response {
  const headers = new Headers(res.headers)
  for (const [k, v] of Object.entries(corsHeaders(req, env))) headers.set(k, v)
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers })
}
