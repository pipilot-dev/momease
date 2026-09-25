// Minimal HS256 JWT: sign, verify, decode. No external deps.

export interface JwtPayload {
  sub: string           // user id
  jti: string           // session id — persisted in sessions_auth for revocation
  iat: number
  exp: number
}

function b64urlEncode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
}
function b64urlDecode(s: string): Uint8Array {
  s = s.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4) s += '='
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function key(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

export async function signJwt(payload: JwtPayload, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' }
  const enc = new TextEncoder()
  const h = b64urlEncode(enc.encode(JSON.stringify(header)))
  const p = b64urlEncode(enc.encode(JSON.stringify(payload)))
  const data = `${h}.${p}`
  const sig = await crypto.subtle.sign('HMAC', await key(secret), enc.encode(data))
  return `${data}.${b64urlEncode(sig)}`
}

export async function verifyJwt(token: string, secret: string): Promise<JwtPayload | null> {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [h, p, s] = parts
  const enc = new TextEncoder()
  const ok = await crypto.subtle.verify('HMAC', await key(secret), b64urlDecode(s), enc.encode(`${h}.${p}`))
  if (!ok) return null
  try {
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(p))) as JwtPayload
    if (typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) return null
    return payload
  } catch {
    return null
  }
}
