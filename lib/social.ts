// Social layer: usernames, follows, 1:1 direct messages (with share-by-
// reference payloads), blocks and reports. Backed by the momease-data-api
// Worker. Multi-user — unlike per-account `user_state`, these rows are
// read/written across users, scoped server-side by the caller's JWT.
//
// Delivery is poll-based: screens re-fetch on an interval / focus.

import { api, getToken } from "./api";
import type { User } from "./types";

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  last_seen: string;
}

export type ShareKind = "mantra" | "sound" | "meditation";

export interface DirectMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  share_type: ShareKind | null;
  share_ref: string | null;
  share_title: string | null;
  read_at: string | null;
  created_at: string;
}

export interface ConversationSummary {
  partner: Profile;
  lastMessage: DirectMessage;
  unread: number;
}

/** A user is considered "online" if seen within this window. */
const ONLINE_WINDOW_MS = 2 * 60 * 1000;

export function isOnline(lastSeen?: string | null): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < ONLINE_WINDOW_MS;
}

function ready(): boolean { return Boolean(getToken()) }
async function safe<T>(op: () => Promise<T>, fallback: T, tag: string): Promise<T> {
  try { return await op() } catch (e) {
    console.warn(`[social] ${tag} failed:`, e instanceof Error ? e.message : e);
    return fallback;
  }
}

// ---------- profiles ----------

export async function ensureProfile(user: User): Promise<Profile | null> {
  if (!ready()) return null;
  return safe(async () => {
    const existing = await api.get<Profile | null>("/profile/me");
    if (existing && existing.id) return existing;
    return await api.post<Profile>("/profile/me", {
      display_name: user.name || user.email?.split("@")[0] || "mama",
      avatar_url: user.avatarUrl ?? null,
    });
  }, null, "ensureProfile");
}

export async function getMyProfile(_userId: string): Promise<Profile | null> {
  if (!ready()) return null;
  return safe(() => api.get<Profile | null>("/profile/me"), null, "getMyProfile");
}

export async function getProfileById(id: string): Promise<Profile | null> {
  if (!ready()) return null;
  return safe(() => api.get<Profile | null>(`/profile/${id}`), null, "getProfileById");
}

export async function setUsername(_userId: string, username: string): Promise<string | null> {
  if (!ready()) return "Not connected";
  try {
    await api.put("/profile/username", { username });
    return null;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not set username";
    if (/taken/i.test(msg)) return "That username is taken";
    if (/too_short/i.test(msg)) return "Username must be at least 3 characters";
    return msg;
  }
}

export async function updateLastSeen(_userId: string): Promise<void> {
  if (!ready()) return;
  await safe(() => api.post("/profile/last-seen"), undefined, "updateLastSeen");
}

export async function searchUsers(query: string, _meId: string): Promise<Profile[]> {
  if (!ready() || !query.trim()) return [];
  return safe(
    () => api.get<Profile[]>(`/profile/search?q=${encodeURIComponent(query.trim())}`),
    [], "searchUsers",
  );
}

// ---------- follows ----------

export async function follow(_meId: string, targetId: string): Promise<void> {
  if (!ready()) return;
  await safe(() => api.put(`/follows/${targetId}`), undefined, "follow");
}

export async function unfollow(_meId: string, targetId: string): Promise<void> {
  if (!ready()) return;
  await safe(() => api.del(`/follows/${targetId}`), undefined, "unfollow");
}

export async function getFollowingIds(_meId: string): Promise<Set<string>> {
  if (!ready()) return new Set();
  const rows = await safe(() => api.get<Profile[]>("/follows"), [], "getFollowingIds");
  return new Set(rows.map((r) => r.id));
}

export async function getFollowing(_meId: string): Promise<Profile[]> {
  if (!ready()) return [];
  return safe(() => api.get<Profile[]>("/follows"), [], "getFollowing");
}

export async function getFollowers(_meId: string): Promise<Profile[]> {
  if (!ready()) return [];
  return safe(() => api.get<Profile[]>("/followers"), [], "getFollowers");
}

// ---------- blocking ----------

export async function getBlockedIds(_meId: string): Promise<Set<string>> {
  if (!ready()) return new Set();
  const rows = await safe(
    () => api.get<Array<{ blocked_id: string }>>("/blocks"),
    [] as Array<{ blocked_id: string }>,
    "getBlockedIds",
  );
  return new Set(rows.map((r) => r.blocked_id));
}

export async function blockUser(_meId: string, targetId: string): Promise<void> {
  if (!ready()) return;
  await safe(() => api.put(`/blocks/${targetId}`), undefined, "blockUser");
}

export async function unblockUser(_meId: string, targetId: string): Promise<void> {
  if (!ready()) return;
  await safe(() => api.del(`/blocks/${targetId}`), undefined, "unblockUser");
}

// ---------- reporting ----------

export type ReportContentType = "user" | "message" | "post" | "comment";

export async function reportContent(params: {
  reporterId: string;
  reportedUserId?: string | null;
  contentType: ReportContentType;
  contentRef?: string | null;
  reason: string;
}): Promise<boolean> {
  if (!ready()) return false;
  try {
    await api.post("/reports", {
      reported_user_id: params.reportedUserId ?? null,
      content_type: params.contentType,
      content_ref: params.contentRef ?? null,
      reason: params.reason,
    });
    return true;
  } catch (e) {
    console.warn("[social] report failed:", e instanceof Error ? e.message : e);
    return false;
  }
}

// ---------- account deletion ----------

export async function deleteAccount(_meId: string): Promise<{ dataDeleted: boolean; accountRemoved: boolean }> {
  if (!ready()) return { dataDeleted: false, accountRemoved: false };
  try {
    await api.del("/account");
    return { dataDeleted: true, accountRemoved: true };
  } catch (e) {
    console.warn("[social] deleteAccount failed:", e instanceof Error ? e.message : e);
    return { dataDeleted: false, accountRemoved: false };
  }
}

// ---------- messages ----------

export interface SendPayload {
  body?: string;
  share?: { type: ShareKind; ref: string; title: string };
}

export async function sendMessage(
  _meId: string,
  recipientId: string,
  payload: SendPayload,
): Promise<DirectMessage | null> {
  if (!ready()) return null;
  try {
    return await api.post<DirectMessage>("/messages", {
      recipient_id: recipientId,
      body: payload.body ?? "",
      share: payload.share,
    });
  } catch (e) {
    console.warn("[social] sendMessage failed:", e instanceof Error ? e.message : e);
    return null;
  }
}

export async function getConversation(_meId: string, otherId: string): Promise<DirectMessage[]> {
  if (!ready()) return [];
  return safe(() => api.get<DirectMessage[]>(`/messages/${otherId}`), [], "getConversation");
}

export async function markRead(_meId: string, otherId: string): Promise<void> {
  if (!ready()) return;
  await safe(() => api.post(`/messages/${otherId}/read`), undefined, "markRead");
}

export async function getInbox(_meId: string): Promise<ConversationSummary[]> {
  if (!ready()) return [];
  return safe(() => api.get<ConversationSummary[]>("/messages/inbox"), [], "getInbox");
}

/** Resolve a shared reference to a deep-link route + display info. */
export function resolveShareRoute(type: ShareKind, _ref: string): string {
  switch (type) {
    case "sound":       return "/(tabs)/sounds";
    case "meditation":  return "/(tabs)/sounds?tab=meditate";
    case "mantra":
    default:            return "/(tabs)/home";
  }
}
