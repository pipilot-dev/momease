// Social layer: usernames, follows, and 1:1 direct messages (with
// share-by-reference payloads) backed by Supabase. Multi-user — unlike the
// per-account `user_state` sync, these rows are read/written across users,
// scoped by row-level security (see supabase/migrations/0002_social.sql).
//
// Delivery is poll-based: screens re-fetch on an interval / focus.
import { supabase } from "./supabase";
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

function slugify(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20) || "mama";
}

/**
 * Ensure the signed-in user has a profile row (creating one with a sensible
 * default username on first run). Returns the profile, or null if no backend.
 */
export async function ensureProfile(user: User): Promise<Profile | null> {
  if (!supabase) return null;
  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (existing) return existing as Profile;

  // Generate a unique-ish default username from the email/name.
  const base = slugify(user.email?.split("@")[0] || user.name || "mama");
  for (let attempt = 0; attempt < 5; attempt++) {
    const username = attempt === 0 ? base : `${base}${Math.floor(1000 + Math.random() * 9000)}`;
    const { data, error } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        username,
        display_name: user.name || base,
        avatar_url: user.avatarUrl ?? null,
      })
      .select("*")
      .single();
    if (!error && data) return data as Profile;
    // 23505 = unique violation -> try another username
    if ((error as any)?.code !== "23505") break;
  }
  return null;
}

export async function getMyProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  return (data as Profile) ?? null;
}

/** Fetch any user's profile by id (e.g. the person you're chatting with). */
export async function getProfileById(id: string): Promise<Profile | null> {
  if (!supabase) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  return (data as Profile) ?? null;
}

/** Returns an error string if the username is taken/invalid, else null. */
export async function setUsername(userId: string, username: string): Promise<string | null> {
  if (!supabase) return "Not connected";
  const clean = slugify(username);
  if (clean.length < 3) return "Username must be at least 3 characters";
  const { error } = await supabase.from("profiles").update({ username: clean }).eq("id", userId);
  if (error) return (error as any).code === "23505" ? "That username is taken" : error.message;
  return null;
}

export async function updateLastSeen(userId: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("profiles").update({ last_seen: new Date().toISOString() }).eq("id", userId);
}

export async function searchUsers(query: string, meId: string): Promise<Profile[]> {
  if (!supabase || !query.trim()) return [];
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .ilike("username", `%${query.trim().toLowerCase()}%`)
    .neq("id", meId)
    .limit(20);
  return (data as Profile[]) ?? [];
}

export async function follow(meId: string, targetId: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("follows").upsert(
    { follower_id: meId, following_id: targetId },
    { onConflict: "follower_id,following_id" }
  );
}

export async function unfollow(meId: string, targetId: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("follows").delete().eq("follower_id", meId).eq("following_id", targetId);
}

export async function getFollowingIds(meId: string): Promise<Set<string>> {
  if (!supabase) return new Set();
  const { data } = await supabase.from("follows").select("following_id").eq("follower_id", meId);
  return new Set((data ?? []).map((r: any) => r.following_id));
}

/** Profiles the user follows (their "friends" list). */
export async function getFollowing(meId: string): Promise<Profile[]> {
  if (!supabase) return [];
  const { data } = await supabase.from("follows").select("following_id").eq("follower_id", meId);
  const ids = (data ?? []).map((r: any) => r.following_id);
  if (!ids.length) return [];
  const { data: profs } = await supabase.from("profiles").select("*").in("id", ids);
  return (profs as Profile[]) ?? [];
}

export async function getFollowers(meId: string): Promise<Profile[]> {
  if (!supabase) return [];
  const { data } = await supabase.from("follows").select("follower_id").eq("following_id", meId);
  const ids = (data ?? []).map((r: any) => r.follower_id);
  if (!ids.length) return [];
  const { data: profs } = await supabase.from("profiles").select("*").in("id", ids);
  return (profs as Profile[]) ?? [];
}

export interface SendPayload {
  body?: string;
  share?: { type: ShareKind; ref: string; title: string };
}

export async function sendMessage(
  meId: string,
  recipientId: string,
  payload: SendPayload
): Promise<DirectMessage | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("messages")
    .insert({
      sender_id: meId,
      recipient_id: recipientId,
      body: payload.body ?? "",
      share_type: payload.share?.type ?? null,
      share_ref: payload.share?.ref ?? null,
      share_title: payload.share?.title ?? null,
    })
    .select("*")
    .single();
  if (error) {
    console.warn("[social] sendMessage failed:", error.message);
    return null;
  }
  return data as DirectMessage;
}

/** Full 1:1 thread between me and `otherId`, oldest first. */
export async function getConversation(meId: string, otherId: string): Promise<DirectMessage[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("messages")
    .select("*")
    .or(
      `and(sender_id.eq.${meId},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${meId})`
    )
    .order("created_at", { ascending: true });
  return (data as DirectMessage[]) ?? [];
}

/** Mark all messages from `otherId` to me as read. */
export async function markRead(meId: string, otherId: string): Promise<void> {
  if (!supabase) return;
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", meId)
    .eq("sender_id", otherId)
    .is("read_at", null);
}

/** Inbox: one row per conversation partner, newest first, with unread counts. */
export async function getInbox(meId: string): Promise<ConversationSummary[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("messages")
    .select("*")
    .or(`sender_id.eq.${meId},recipient_id.eq.${meId}`)
    .order("created_at", { ascending: false })
    .limit(500);
  const msgs = (data as DirectMessage[]) ?? [];
  if (!msgs.length) return [];

  const byPartner = new Map<string, { last: DirectMessage; unread: number }>();
  for (const m of msgs) {
    const partnerId = m.sender_id === meId ? m.recipient_id : m.sender_id;
    let entry = byPartner.get(partnerId);
    if (!entry) {
      entry = { last: m, unread: 0 };
      byPartner.set(partnerId, entry);
    }
    if (m.recipient_id === meId && !m.read_at) entry.unread++;
  }

  const ids = [...byPartner.keys()];
  const { data: profs } = await supabase.from("profiles").select("*").in("id", ids);
  const profMap = new Map((profs as Profile[] ?? []).map((p) => [p.id, p]));

  return [...byPartner.entries()]
    .map(([pid, e]) => {
      const partner = profMap.get(pid);
      return partner ? { partner, lastMessage: e.last, unread: e.unread } : null;
    })
    .filter((x): x is ConversationSummary => x !== null)
    .sort(
      (a, b) =>
        new Date(b.lastMessage.created_at).getTime() -
        new Date(a.lastMessage.created_at).getTime()
    );
}

/** Resolve a shared reference to a deep-link route + display info. */
export function resolveShareRoute(type: ShareKind, ref: string): string {
  switch (type) {
    case "sound":
      return "/(tabs)/sounds";
    case "meditation":
      return "/(tabs)/sounds?tab=meditate";
    case "mantra":
    default:
      return "/(tabs)/home";
  }
}
