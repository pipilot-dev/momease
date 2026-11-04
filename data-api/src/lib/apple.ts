// Verifies the identity token Apple issues to the iPhone app ("Sign in with Apple").
// RS256 JWT, signed with one of the keys at https://appleid.apple.com/auth/keys.

const APPLE_ISS = 'https://appleid.apple.com'
const APPLE_KEYS_URL = 'https://appleid.apple.com/auth/keys'
const KEYS_TTL_MS = 60 * 60 * 1000
const MAX_TOKEN_CHARS = 4096
const CLOCK_SKEW_SEC = 60

type AppleJwk = JsonWebKey & { kid: string }
let cache: { keys: AppleJwk[]; at: number } | null = null

async function fetchKeys(): Promise<AppleJwk[]> {
  const res = await fetch(APPLE_KEYS_URL)
  if (!res.ok) throw new Error(`apple_keys_${res.status}`)
  const data = (await res.json()) as { keys?: AppleJwk[] }
  const keys = (data.keys ?? []).filter((k) => k.kty === 'RSA' && typeof k.kid === 'string')
  cache = { keys, at: Date.now() }
  return keys
}

/** Cached for an hour; an unknown key id forces one refresh (Apple rotates keys). */
async function keyFor(kid: string): Promise<AppleJwk | undefined> {
  const fresh = cache && Date.now() - cache.at < KEYS_TTL_MS
  const found = fresh ? cache!.keys.find((k) => k.kid === kid) : undefined
  if (found) return found
  return (await fetchKeys()).find((k) => k.kid === kid)
}

function b64urlToBytes(s: string): Uint8Array {
  const pad = '='.repeat((4 - (s.length % 4)) % 4)
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad)
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

function parseJson(s: string): any {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(s)))
}

export interface AppleClaims {
  sub: string
  email?: string
  emailVerified: boolean
  isPrivateEmail: boolean
  nonce?: string
}

/** Returns the verified claims, or null for ANY problem (bad signature, wrong app, expired, malformed…). */
export async function verifyAppleIdentityToken(token: string, audiences: string[], nowMs = Date.now()): Promise<AppleClaims | null> {
  try {
    if (typeof token !== 'string' || token.length > MAX_TOKEN_CHARS) return null
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const header = parseJson(parts[0])
    if (header.alg !== 'RS256' || typeof header.kid !== 'string') return null
    const jwk = await keyFor(header.kid)
    if (!jwk) return null

    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'])
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlToBytes(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`))
    if (!ok) return null

    const p = parseJson(parts[1])
    const now = Math.floor(nowMs / 1000)
    if (p.iss !== APPLE_ISS) return null
    const aud: string[] = Array.isArray(p.aud) ? p.aud : [p.aud]
    if (!aud.some((a) => audiences.includes(a))) return null
    if (typeof p.exp !== 'number' || p.exp <= now) return null
    if (typeof p.iat === 'number' && p.iat > now + CLOCK_SKEW_SEC) return null
    if (typeof p.sub !== 'string' || !p.sub) return null

    return {
      sub: p.sub,
      email: typeof p.email === 'string' ? p.email : undefined,
      emailVerified: p.email_verified === true || p.email_verified === 'true',
      isPrivateEmail: p.is_private_email === true || p.is_private_email === 'true',
      nonce: typeof p.nonce === 'string' ? p.nonce : undefined,
    }
  } catch {
    return null
  }
}

/** Test hook: forget the cached keys. */
export function resetAppleKeyCache() {
  cache = null
}
