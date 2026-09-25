// Cloud sync: mirrors each store's persisted JSON blob to the momease-data-api
// Worker so user data survives reinstalls and follows the account across devices.
//
// Design: a single per-user KV store (`/state`) keyed by the same string the
// local store uses. Local-first — the app stays fully functional offline /
// signed-out (AsyncStorage only); when a user is signed in we pull their rows
// on login and write-through on change.

import { api, getToken } from "./api";

/** A store registered for cloud sync: its persistence key + how to read/apply. */
export interface SyncTarget {
  key: string;
  /** Current persisted snapshot to push. */
  read: () => Record<string, unknown>;
  /** Apply a snapshot pulled from the cloud into the store. */
  apply: (data: Record<string, unknown>) => void;
}

const targets = new Map<string, SyncTarget>();
let currentUserId: string | null = null;

// The auth blob holds the signed-in user record itself — syncing it is circular.
const SKIP_KEYS = new Set(["momease-auth"]);

export function registerSyncTarget(target: SyncTarget) {
  if (SKIP_KEYS.has(target.key)) return;
  targets.set(target.key, target);
}

/** Whether cloud sync is active (a user is signed in). */
export function isCloudSyncActive(): boolean {
  return Boolean(getToken() && currentUserId);
}

/** Push one store's snapshot to the cloud. Safe to call when inactive. */
export async function pushState(key: string, data: Record<string, unknown>): Promise<void> {
  if (!getToken() || !currentUserId) return;
  try {
    await api.put(`/state/${encodeURIComponent(key)}`, data ?? {});
  } catch (e) {
    console.warn(`[cloud-sync] push ${key} failed:`, e instanceof Error ? e.message : e);
  }
}

/**
 * Called when a user signs in (or a session is restored). Pulls every
 * registered store's cloud snapshot and applies it locally. For keys the cloud
 * doesn't have yet, seeds them from the current local state so the first
 * sign-in uploads existing on-device data instead of wiping it.
 */
export async function onSignedIn(userId: string): Promise<void> {
  currentUserId = userId;
  if (!getToken()) return;

  let cloud: Record<string, Record<string, unknown>> = {};
  try {
    cloud = await api.get<Record<string, Record<string, unknown>>>("/state");
  } catch (e) {
    console.warn("[cloud-sync] pull failed:", e instanceof Error ? e.message : e);
    return;
  }

  for (const target of targets.values()) {
    const remote = cloud[target.key];
    if (remote) target.apply(remote);
    else await pushState(target.key, target.read());
  }
}

/** Called on sign-out: stop syncing (local data stays for the next user/login). */
export function onSignedOut() {
  currentUserId = null;
}
