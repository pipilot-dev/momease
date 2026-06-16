// Cloud sync: mirrors each store's persisted JSON blob to Supabase so user
// data survives reinstalls and follows the account across devices.
//
// Design: a single `user_state` table keyed by (user_id, key). Local-first —
// the app stays fully functional offline / signed-out (AsyncStorage only); when
// a user is signed in we pull their rows on login and write-through on change.
import { supabase } from "./supabase";

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

// The auth blob holds the signed-in user record itself — syncing it to the
// cloud keyed by that same user is circular and pointless, so we skip it.
const SKIP_KEYS = new Set(["momease-auth"]);

export function registerSyncTarget(target: SyncTarget) {
  if (SKIP_KEYS.has(target.key)) return;
  targets.set(target.key, target);
}

/** Whether cloud sync is active (configured + a user is signed in). */
export function isCloudSyncActive(): boolean {
  return Boolean(supabase && currentUserId);
}

/** Push one store's snapshot to the cloud. Safe to call when inactive. */
export async function pushState(key: string, data: Record<string, unknown>): Promise<void> {
  if (!supabase || !currentUserId) return;
  await supabase
    .from("user_state")
    .upsert({ user_id: currentUserId, key, data }, { onConflict: "user_id,key" })
    .then(({ error }) => {
      if (error) console.warn(`[cloud-sync] push ${key} failed:`, error.message);
    });
}

/**
 * Called when a user signs in (or a session is restored). Pulls every
 * registered store's cloud snapshot and applies it locally. For keys the cloud
 * doesn't have yet, seeds them from the current local state so the first
 * sign-in uploads existing on-device data instead of wiping it.
 */
export async function onSignedIn(userId: string): Promise<void> {
  currentUserId = userId;
  if (!supabase) return;

  const { data, error } = await supabase
    .from("user_state")
    .select("key, data")
    .eq("user_id", userId);

  if (error) {
    console.warn("[cloud-sync] pull failed:", error.message);
    return;
  }

  const cloud = new Map<string, Record<string, unknown>>(
    (data ?? []).map((row: any) => [row.key, row.data])
  );

  for (const target of targets.values()) {
    const remote = cloud.get(target.key);
    if (remote) {
      target.apply(remote);
    } else {
      // No cloud copy yet — seed it from whatever is on this device.
      await pushState(target.key, target.read());
    }
  }
}

/** Called on sign-out: stop syncing (local data stays for the next user/login). */
export function onSignedOut() {
  currentUserId = null;
}
