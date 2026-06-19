import { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { ArrowLeft, Users, MessageCircle } from "lucide-react-native";
import { useAuthStore } from "../lib/stores/auth-store";
import { useTheme } from "../lib/theme-context";
import {
  ensureProfile,
  updateLastSeen,
  getInbox,
  isOnline,
  type ConversationSummary,
} from "../lib/social";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function MessagesScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const meId = user?.id || "";
  const [inbox, setInbox] = useState<ConversationSummary[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    if (!meId) return;
    setInbox(await getInbox(meId));
  }, [meId]);

  useEffect(() => {
    if (!user) return;
    ensureProfile(user).then(load);
    updateLastSeen(user.id);
    // Poll every 5s for new conversations / messages.
    timer.current = setInterval(() => {
      updateLastSeen(user.id);
      load();
    }, 5000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [user, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const previewText = (c: ConversationSummary) => {
    const m = c.lastMessage;
    const mine = m.sender_id === meId;
    const prefix = mine ? "You: " : "";
    if (m.share_type) return `${prefix}shared a ${m.share_type} ✨`;
    return `${prefix}${m.body}`;
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <LinearGradient
        colors={isDark ? [theme.gradients.violetDream[0], theme.gradients.violetDream[1], theme.bg] : ["#EDE9FE", "#F5F3FF", theme.bg]}
        style={{ paddingTop: 60, paddingBottom: 16, paddingHorizontal: 24 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color={theme.text.primary} />
            </TouchableOpacity>
            <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 28, color: theme.text.primary }}>Messages</Text>
          </View>
          <TouchableOpacity
            onPress={() => { Haptics.selectionAsync(); router.push("/friends" as any); }}
            style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: isDark ? theme.surfaceAlt : "#FFFFFF", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 }}
          >
            <Users size={16} color={theme.accent[500]} />
            <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 13, color: theme.accent[500] }}>Friends</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1, paddingHorizontal: 24, paddingTop: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent[500]} />}
      >
        {inbox.length === 0 && (
          <View style={{ alignItems: "center", paddingTop: 70 }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: isDark ? theme.surfaceAlt : "#EDE9FE", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <MessageCircle size={36} color={theme.accent[500]} />
            </View>
            <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 18, color: theme.text.primary, marginBottom: 8 }}>No messages yet</Text>
            <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 14, color: theme.text.secondary, textAlign: "center", paddingHorizontal: 24 }}>
              Find friends and share a mantra or calming sound to start a conversation.
            </Text>
            <TouchableOpacity onPress={() => router.push("/friends" as any)} activeOpacity={0.85} style={{ marginTop: 20 }}>
              <LinearGradient colors={["#A78BFA", "#8B5CF6"]} style={{ paddingHorizontal: 28, paddingVertical: 14, borderRadius: 16 }}>
                <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 15, color: "#fff" }}>Find Friends</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {inbox.map((c) => {
          const online = isOnline(c.partner.last_seen);
          return (
            <TouchableOpacity
              key={c.partner.id}
              activeOpacity={0.85}
              onPress={() => {
                Haptics.selectionAsync();
                router.push({ pathname: "/dm", params: { userId: c.partner.id, name: c.partner.display_name || c.partner.username, username: c.partner.username } } as any);
              }}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}
            >
              <View>
                <Image source={c.partner.avatar_url ? { uri: c.partner.avatar_url } : { uri: "https://api.a0.dev/assets/image?text=friendly%20mom%20avatar&aspect=1:1" }} style={{ width: 52, height: 52, borderRadius: 26 }} />
                {online && <View style={{ position: "absolute", right: 0, bottom: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: "#34D399", borderWidth: 2, borderColor: theme.bg }} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 15, color: theme.text.primary }}>{c.partner.display_name || c.partner.username}</Text>
                <Text numberOfLines={1} style={{ fontFamily: c.unread ? "Quicksand-SemiBold" : "Quicksand-Medium", fontSize: 13, color: c.unread ? theme.text.primary : theme.text.muted, marginTop: 2 }}>
                  {previewText(c)}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 4 }}>
                <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 11, color: theme.text.muted }}>{timeAgo(c.lastMessage.created_at)}</Text>
                {c.unread > 0 && (
                  <View style={{ minWidth: 20, height: 20, borderRadius: 10, backgroundColor: "#F472B6", alignItems: "center", justifyContent: "center", paddingHorizontal: 6 }}>
                    <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 11, color: "#fff" }}>{c.unread}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}
