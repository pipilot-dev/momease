// Failed-attempt throttle backed by D1. Cheap, per-bucket sliding window.

import type { Env } from '../worker'

const WINDOW_SEC = 15 * 60
const MAX_FAILURES = 10

export async function isThrottled(env: Env, buckets: string[]): Promise<boolean> {
  const since = Math.floor(Date.now() / 1000) - WINDOW_SEC
  for (const b of buckets) {
    const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM auth_attempts WHERE bucket = ? AND ts > ?')
      .bind(b, since).first<{ n: number }>()
    if ((row?.n ?? 0) >= MAX_FAILURES) return true
  }
  return false
}

export async function recordFailure(env: Env, buckets: string[]): Promise<void> {
  const now = Math.floor(Date.now() / 1000)
  await env.DB.batch([
    ...buckets.map((b) => env.DB.prepare('INSERT INTO auth_attempts (bucket, ts) VALUES (?, ?)').bind(b, now)),
    env.DB.prepare('DELETE FROM auth_attempts WHERE ts < ?').bind(now - WINDOW_SEC),
  ])
}

export async function clearFailures(env: Env, buckets: string[]): Promise<void> {
  await env.DB.batch(buckets.map((b) => env.DB.prepare('DELETE FROM auth_attempts WHERE bucket = ?').bind(b)))
}

export function throttleBuckets(req: Request, email: string | undefined): string[] {
  const ip = req.headers.get('CF-Connecting-IP') ?? 'unknown'
  return [`ip:${ip}`, ...(email ? [`email:${email}`] : [])]
}
