import { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, Image, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { ArrowLeft, Search, UserPlus, UserCheck, MessageCircle, AtSign } from "lucide-react-native";
import { useAuthStore } from "../lib/stores/auth-store";
import { useTheme } from "../lib/theme-context";
import {
  ensureProfile,
  updateLastSeen,
  searchUsers,
  follow,
  unfollow,
  getFollowing,
  getFollowers,
  getFollowingIds,
  isOnline,
  type Profile,
} from "../lib/social";

export default function FriendsScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const meId = user?.id || "";

  const [tab, setTab] = useState<"discover" | "following" | "followers">("discover");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [following, setFollowing] = useState<Profile[]>([]);
  const [followers, setFollowers] = useState<Profile[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [searching, setSearching] = useState(false);

  const refresh = useCallback(async () => {
    if (!meId) return;
    const [fg, fr, ids] = await Promise.all([
      getFollowing(meId),
      getFollowers(meId),
      getFollowingIds(meId),
    ]);
    setFollowing(fg);
    setFollowers(fr);
    setFollowingIds(ids);
  }, [meId]);

  useEffect(() => {
    if (!user) return;
    ensureProfile(user).then(() => refresh());
    updateLastSeen(user.id);
  }, [user, refresh]);

  // Debounced search
  useEffect(() => {
    if (tab !== "discover") return;
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      const r = await searchUsers(query, meId);
      setResults(r);
      setSearching(false);
    }, 350);
    return () => clearTimeout(t);
  }, [query, tab, meId]);

  const toggleFollow = async (p: Profile) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const isF = followingIds.has(p.id);
    const next = new Set(followingIds);
    if (isF) {
      next.delete(p.id);
      await unfollow(meId, p.id);
    } else {
      next.add(p.id);
      await follow(meId, p.id);
    }
    setFollowingIds(next);
    refresh();
  };

  const openChat = (p: Profile) => {
    Haptics.selectionAsync();
    router.push({ pathname: "/dm", params: { userId: p.id, name: p.display_name || p.username, username: p.username } } as any);
  };

  const list = tab === "discover" ? results : tab === "following" ? following : followers;

  const Row = ({ p }: { p: Profile }) => {
    const online = isOnline(p.last_seen);
    const isF = followingIds.has(p.id);
    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: theme.surface,
          borderRadius: 16,
          padding: 12,
          marginBottom: 10,
          gap: 12,
        }}
      >
        <View>
          <Image
            source={p.avatar_url ? { uri: p.avatar_url } : { uri: "https://api.a0.dev/assets/image?text=friendly%20mom%20avatar&aspect=1:1" }}
            style={{ width: 46, height: 46, borderRadius: 23 }}
          />
          {online && (
            <View style={{ position: "absolute", right: 0, bottom: 0, width: 13, height: 13, borderRadius: 7, backgroundColor: "#34D399", borderWidth: 2, borderColor: theme.surface }} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 15, color: theme.text.primary }}>
            {p.display_name || p.username}
          </Text>
          <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 13, color: theme.text.muted }}>
            @{p.username}{online ? " · online" : ""}
          </Text>
        </View>
        <TouchableOpacity onPress={() => openChat(p)} style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: isDark ? theme.surfaceAlt : "#F3F4F6" }}>
          <MessageCircle size={18} color={theme.primary[500]} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => toggleFollow(p)} activeOpacity={0.85}>
          {isF ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1.5, borderColor: theme.border }}>
              <UserCheck size={15} color={theme.text.secondary} />
              <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 13, color: theme.text.secondary }}>Following</Text>
            </View>
          ) : (
            <LinearGradient colors={["#F9A8D4", "#F472B6"]} style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 }}>
              <UserPlus size={15} color="#fff" />
              <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 13, color: "#fff" }}>Follow</Text>
            </LinearGradient>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <LinearGradient
        colors={isDark ? [theme.gradients.roseGlow[0], theme.gradients.roseGlow[1], theme.bg] : ["#FDE5EC", "#FDF2F8", theme.bg]}
        style={{ paddingTop: 60, paddingBottom: 16, paddingHorizontal: 24 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
          <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 28, color: theme.text.primary }}>Friends</Text>
        </View>

        {/* Search */}
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: isDark ? theme.surfaceAlt : "#FFFFFF", borderRadius: 12, paddingHorizontal: 14, gap: 8 }}>
          <Search size={18} color={theme.text.muted} />
          <TextInput
            style={{ flex: 1, fontFamily: "Quicksand-Medium", fontSize: 15, color: theme.text.primary, paddingVertical: 12 }}
            placeholder="Search by @username"
            placeholderTextColor={theme.text.muted}
            value={query}
            onChangeText={(t) => { setQuery(t); setTab("discover"); }}
            autoCapitalize="none"
          />
        </View>

        {/* Tabs */}
        <View style={{ flexDirection: "row", marginTop: 14, gap: 8 }}>
          {(["discover", "following", "followers"] as const).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => { setTab(t); Haptics.selectionAsync(); }}
              style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: tab === t ? "#F472B6" : theme.surface, borderWidth: 1, borderColor: tab === t ? "#F472B6" : theme.border }}
            >
              <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 13, color: tab === t ? "#fff" : theme.text.secondary, textTransform: "capitalize" }}>
                {t === "following" ? `Following ${following.length || ""}` : t === "followers" ? `Followers ${followers.length || ""}` : "Discover"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      <ScrollView style={{ flex: 1, paddingHorizontal: 24, paddingTop: 16 }} showsVerticalScrollIndicator={false}>
        {tab === "discover" && searching && <ActivityIndicator color={theme.primary[500]} style={{ marginTop: 24 }} />}
        {tab === "discover" && !query.trim() && !searching && (
          <View style={{ alignItems: "center", paddingTop: 60 }}>
            <AtSign size={40} color={theme.text.muted} />
            <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 15, color: theme.text.secondary, marginTop: 12, textAlign: "center" }}>
              Search for friends by their username
            </Text>
            <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 13, color: theme.text.muted, marginTop: 4, textAlign: "center" }}>
              Share your @{""}handle so other moms can find you
            </Text>
          </View>
        )}
        {list.map((p) => <Row key={p.id} p={p} />)}
        {((tab === "following" && following.length === 0) || (tab === "followers" && followers.length === 0)) && (
          <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 14, color: theme.text.muted, textAlign: "center", paddingTop: 50 }}>
            {tab === "following" ? "You're not following anyone yet." : "No followers yet."}
          </Text>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}
