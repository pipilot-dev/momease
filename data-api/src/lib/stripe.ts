// Minimal Stripe REST client + webhook signature verification for Workers.

import type { Env } from '../worker'

export async function stripe(
  env: Env,
  path: string,
  method: 'GET' | 'POST',
  form?: Record<string, string>,
): Promise<any> {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Basic ${btoa(`${env.STRIPE_SECRET_KEY}:`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form ? new URLSearchParams(form).toString() : undefined,
  })
  const data = (await res.json()) as any
  if (!res.ok) throw new Error(`stripe_${res.status}: ${data?.error?.message ?? 'error'}`)
  return data
}

/**
 * Stripe signs `${timestamp}.${rawBody}` with HMAC-SHA256. Header looks like
 * `t=123,v1=hex,v1=hex`. Accept if any v1 matches and the timestamp is within 5 minutes.
 */
export async function verifyStripeSignature(rawBody: string, header: string, secret: string): Promise<boolean> {
  const parts = header.split(',').map((p) => {
    const i = p.indexOf('=')
    return [p.slice(0, i), p.slice(i + 1)] as const
  })
  const ts = parts.find(([k]) => k === 't')?.[1]
  if (!ts || !/^\d+$/.test(ts)) return false
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false

  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${ts}.${rawBody}`))
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
  return parts.filter(([k]) => k === 'v1').some(([, v]) => timingSafeEqual(v, hex))
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
