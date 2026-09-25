// MomEase API client. Replaces @supabase/supabase-js.
// The bearer token lives in AsyncStorage; every authed call attaches it.

import AsyncStorage from "@react-native-async-storage/async-storage";

export const API_BASE = "https://momease-data-api.pipilot-rpc.workers.dev";
const TOKEN_KEY = "momease.auth.token.v1";

let currentToken: string | null = null;
let hydrated = false;

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
  currentToken = token;
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

export interface ApiError { error: string; detail?: string }

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  opts: { auth?: boolean } = { auth: true },
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.auth !== false && currentToken) headers.Authorization = `Bearer ${currentToken}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? (JSON.parse(text) as T | ApiError) : ({} as T);
  if (!res.ok) {
    if (res.status === 401 && currentToken) await setToken(null);
    const err = data as ApiError;
    throw new Error(err.detail || err.error || `HTTP ${res.status}`);
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
