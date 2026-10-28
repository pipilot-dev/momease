// Validate where we are willing to send a freshly minted session token.
// Anything else would let an attacker craft /auth/google/start?redirect=https://evil
// and receive the victim's token.

interface RedirectEnv {
  APP_SCHEME: string
  ALLOWED_ORIGINS: string
}

export function isAllowedAppRedirect(raw: string, env: RedirectEnv): boolean {
  let u: URL
  try { u = new URL(raw) } catch { return false }
  if (u.username || u.password) return false

  if (u.protocol === `${env.APP_SCHEME}:`) {
    // Exactly <scheme>://auth-callback — no other hosts, no extra path.
    return u.hostname === 'auth-callback' && (u.pathname === '' || u.pathname === '/')
  }

  if (u.protocol === 'https:' || u.protocol === 'http:') {
    const allowed = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
    return allowed.includes(u.origin) && u.pathname === '/auth-callback'
  }
  return false
}

/** Tokens go in the fragment: never sent to servers, not logged, not in Referer. */
export function withSessionFragment(redirect: string, fields: Record<string, string>): string {
  const u = new URL(redirect)
  u.hash = new URLSearchParams(fields).toString()
  return u.toString()
}
