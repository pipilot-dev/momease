// MomEase API client. Replaces @supabase/supabase-js.
// The bearer token lives in AsyncStorage; every authed call attaches it.

import AsyncStorage from "@react-native-async-storage/async-storage";

// Overridable at build time (EXPO_PUBLIC_API_BASE) so end-to-end tests can run
// against a local Worker instead of production.
export const API_BASE = process.env.EXPO_PUBLIC_API_BASE || "https://momease-data-api.pipilot-rpc.workers.dev";
const TOKEN_KEY = "momease.auth.token.v1";

let currentToken: string | null = null;
let hydrated = false;
let unauthorizedHandler: (() => void) | null = null;

export async function loadToken(): Promise<string | null> {
  if (hydrated) return currentToken;
  hydrated = true;
  currentToken = await AsyncStorage.getItem(TOKEN_KEY);
  return currentToken;
}

export function getToken(): string | null {
  return currentToken;
}

export async function setToken(token: string | null): Promise<void> {
  hydrated = true;
  currentToken = token;
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

/** Called once when an authed request is rejected (expired / revoked / deleted account). */
export function setUnauthorizedHandler(fn: (() => void) | null): void {
  unauthorizedHandler = fn;
}

export class ApiError extends Error {
  constructor(public status: number, public code: string, message?: string) {
    super(message ?? code);
    this.name = "ApiError";
  }
}

/** True when the request never reached the server (offline, DNS, TLS). */
export function isNetworkError(e: unknown): boolean {
  return !(e instanceof ApiError);
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  opts: { auth?: boolean } = { auth: true },
): Promise<T> {
  const authed = opts.auth !== false;
  if (authed) await loadToken(); // a hard reload starts with the token still in storage
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authed && currentToken) headers.Authorization = `Bearer ${currentToken}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch { /* non-JSON error page */ }
  if (!res.ok) {
    if (res.status === 401 && authed && currentToken) {
      await setToken(null);
      unauthorizedHandler?.();
    }
    throw new ApiError(res.status, data?.error || `http_${res.status}`);
  }
  return data as T;
}

export const api = {
  get:   <T>(path: string) => request<T>("GET", path, undefined),
  post:  <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  put:   <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  del:   <T>(path: string) => request<T>("DELETE", path, undefined),
  postNoAuth: <T>(path: string, body?: unknown) => request<T>("POST", path, body, { auth: false }),
};

/** Human-friendly message for an API error code. */
export function friendlyError(e: unknown, fallback = "Something went wrong. Please try again."): string {
  if (!(e instanceof ApiError)) return "Can't reach MomEase right now. Check your connection and try again.";
  switch (e.code) {
    case "invalid_credentials": return "That email and password don't match.";
    case "email_in_use": return "An account with that email already exists. Try signing in.";
    case "password_too_short": return "Password must be at least 8 characters.";
    case "invalid_email": return "Please enter a valid email address.";
    case "too_many_attempts": return "Too many attempts. Please wait a few minutes and try again.";
    case "email_and_password_required": return "Please enter your email and password.";
    case "already_subscribed": return "You already have an active MomEase Premium subscription.";
    case "no_subscription": return "We couldn't find a subscription on this account.";
    case "checkout_failed":
    case "portal_failed":
    case "billing_not_configured": return "We couldn't open billing just now. Please try again in a moment.";
    case "email_not_verified": return "Your Google email isn't verified, so we can't sign you in with it.";
    default: return fallback;
  }
}
