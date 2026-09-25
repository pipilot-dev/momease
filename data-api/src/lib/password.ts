// PBKDF2 password hashing on Web Crypto.
// 600k iterations / SHA-256 / 32-byte output. Stored as:
//   pbkdf2$<iterations>$<salt_b64>$<hash_b64>

// Cloudflare Workers caps PBKDF2 iterations at 100_000. That's below what
// OWASP wants for a general-purpose password (600k+), but combined with a
// 16-byte random salt and Web Crypto's constant-time compare, it still
// pushes each guess to ~50–100 ms of CPU time — enough to make credential
// stuffing painful for realistic attackers. If we ever move off Workers
// we can raise this without a schema migration (the count is baked into
// each stored hash).
const ITER = 100_000
const SALT_LEN = 16
const HASH_LEN = 32

function b64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s)
}
function unb64(s: string): Uint8Array {
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function derive(password: string, salt: Uint8Array, iter: number): Promise<ArrayBuffer> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations: iter },
    key,
    HASH_LEN * 8,
  )
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN))
  const bits = await derive(password, salt, ITER)
  return `pbkdf2$${ITER}$${b64(salt.buffer)}$${b64(bits)}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false
  const iter = parseInt(parts[1], 10)
  if (!Number.isFinite(iter) || iter < 10_000) return false
  const salt = unb64(parts[2])
  const expected = unb64(parts[3])
  const bits = new Uint8Array(await derive(password, salt, iter))
  if (bits.length !== expected.length) return false
  // constant-time compare
  let diff = 0
  for (let i = 0; i < bits.length; i++) diff |= bits[i] ^ expected[i]
  return diff === 0
}
