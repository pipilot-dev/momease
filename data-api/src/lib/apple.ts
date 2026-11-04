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

// ---------------------------------------------------------------------------------------------------
// Revoking a person's Apple sign-in when they delete their account (App Store requirement).
//
// Needs a "Sign in with Apple" key from the Apple developer portal, set as Worker secrets:
//   APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY (the .p8 file's text).
// Without them everything below quietly does nothing, and sign-in and deletion work as before.
// ---------------------------------------------------------------------------------------------------

const APPLE_TOKEN_URL = 'https://appleid.apple.com/auth/token'
const APPLE_REVOKE_URL = 'https://appleid.apple.com/auth/revoke'
const MAX_AUTH_CODE_CHARS = 2048

export interface AppleServiceEnv {
  DB: D1Database
  APPLE_BUNDLE_ID?: string
  APPLE_TEAM_ID?: string
  APPLE_KEY_ID?: string
  APPLE_PRIVATE_KEY?: string
}

export function appleServiceConfigured(env: AppleServiceEnv): boolean {
  return Boolean(env.APPLE_TEAM_ID && env.APPLE_KEY_ID && env.APPLE_PRIVATE_KEY)
}

function clientIdOf(env: AppleServiceEnv): string {
  return (env.APPLE_BUNDLE_ID ?? 'com.momease.app').split(',')[0].trim()
}

function bytesToB64url(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function pemToDer(pem: string): Uint8Array {
  const body = pem.replace(/\\n/g, '\n').replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s+/g, '')
  return Uint8Array.from(atob(body), (c) => c.charCodeAt(0))
}

/** The short-lived ES256 JWT that proves to Apple that this server owns the app's Sign in with Apple key. */
async function appleClientSecret(env: AppleServiceEnv, nowSec = Math.floor(Date.now() / 1000)): Promise<string> {
  const enc = (o: object) => bytesToB64url(new TextEncoder().encode(JSON.stringify(o)))
  const head = enc({ alg: 'ES256', kid: env.APPLE_KEY_ID, typ: 'JWT' })
  const claims = enc({ iss: env.APPLE_TEAM_ID, iat: nowSec, exp: nowSec + 300, aud: APPLE_ISS, sub: clientIdOf(env) })
  const key = await crypto.subtle.importKey('pkcs8', pemToDer(env.APPLE_PRIVATE_KEY!), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  // WebCrypto already returns the raw r||s signature that JWT ES256 wants.
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(`${head}.${claims}`))
  return `${head}.${claims}.${bytesToB64url(new Uint8Array(sig))}`
}

/** Trade the one-time authorization code from the iPhone for a refresh token. Null on any problem. */
export async function exchangeAppleAuthCode(env: AppleServiceEnv, code: string): Promise<string | null> {
  try {
    if (!appleServiceConfigured(env) || typeof code !== 'string' || !code || code.length > MAX_AUTH_CODE_CHARS) return null
    const res = await fetch(APPLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientIdOf(env), client_secret: await appleClientSecret(env), code, grant_type: 'authorization_code',
      }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { refresh_token?: unknown }
    return typeof data.refresh_token === 'string' && data.refresh_token ? data.refresh_token : null
  } catch {
    return null
  }
}

/** Tell Apple this person no longer uses the app with Apple. True when Apple accepted it. */
export async function revokeAppleRefreshToken(env: AppleServiceEnv, refreshToken: string): Promise<boolean> {
  try {
    if (!appleServiceConfigured(env) || !refreshToken) return false
    const res = await fetch(APPLE_REVOKE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientIdOf(env), client_secret: await appleClientSecret(env), token: refreshToken, token_type_hint: 'refresh_token',
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

/** After a successful Apple sign-in/link: keep the refresh token so a later account deletion can revoke it. Never throws. */
export async function rememberAppleRefreshToken(env: AppleServiceEnv, userId: string, authorizationCode: unknown): Promise<void> {
  if (typeof authorizationCode !== 'string' || !authorizationCode) return
  const token = await exchangeAppleAuthCode(env, authorizationCode)
  if (!token) return
  try {
    await env.DB.prepare('UPDATE users SET apple_refresh_token = ? WHERE id = ?').bind(token, userId).run()
  } catch (e) {
    console.warn('[apple] could not store refresh token:', e instanceof Error ? e.message : e)
  }
}

/** Before an account is deleted: revoke its Apple token if we hold one. Never throws, never blocks deletion. */
export async function revokeAppleForUser(env: AppleServiceEnv, userId: string): Promise<void> {
  try {
    const r = await env.DB.prepare('SELECT apple_refresh_token FROM users WHERE id = ?').bind(userId).first<{ apple_refresh_token: string | null }>()
    if (!r?.apple_refresh_token) return
    const ok = await revokeAppleRefreshToken(env, r.apple_refresh_token)
    if (!ok) console.warn('[apple] revoke failed for a deleted account')
  } catch (e) {
    console.warn('[apple] revoke error:', e instanceof Error ? e.message : e)
  }
}
