// Parse the URL the API redirects back to after Google sign-in.
// The session travels in the URL *fragment* (#token=...&user_id=...&email=...),
// but a query string is accepted too. Dependency-free on purpose: RN's built-in
// URL/URLSearchParams support is incomplete on some runtimes.

export interface CallbackParams {
  token: string | null;
  userId: string | null;
  email: string | null;
}

function decode(s: string): string {
  try { return decodeURIComponent(s.replace(/\+/g, " ")); } catch { return s; }
}

function pairs(chunk: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of chunk.split("&")) {
    if (!part) continue;
    const i = part.indexOf("=");
    out[decode(i < 0 ? part : part.slice(0, i))] = i < 0 ? "" : decode(part.slice(i + 1));
  }
  return out;
}

export function parseCallbackUrl(url: string): CallbackParams {
  const hashAt = url.indexOf("#");
  const beforeHash = hashAt < 0 ? url : url.slice(0, hashAt);
  const hash = hashAt < 0 ? "" : url.slice(hashAt + 1);
  const qAt = beforeHash.indexOf("?");
  const query = qAt < 0 ? "" : beforeHash.slice(qAt + 1);
  // Fragment wins over query.
  const all = { ...pairs(query), ...pairs(hash) };
  return { token: all.token || null, userId: all.user_id || null, email: all.email || null };
}
