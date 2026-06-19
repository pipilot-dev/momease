import { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Image,
  KeyboardAvoidingView, Platform, Modal,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { ArrowLeft, Send, Plus, X, Heart, Music, Brain, Sparkles, Check, CheckCheck } from "lucide-react-native";
import { useAuthStore } from "../lib/stores/auth-store";
import { useTheme } from "../lib/theme-context";
import { mockMantras, mockSounds, mockMeditations } from "../lib/mock-data";
import {
  ensureProfile, updateLastSeen, getConversation, sendMessage, markRead,
  getProfileById, isOnline, resolveShareRoute,
  type DirectMessage, type Profile, type ShareKind,
} from "../lib/social";

const EMOJIS = ["💗", "🌸", "🙏", "✨", "😊", "🫂", "💪", "☕", "🌙", "🥰", "👏", "🌿"];

export default function DMScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ userId: string; name: string; username: string }>();
  const { user } = useAuthStore();
  const meId = user?.id || "";
  const otherId = String(params.userId || "");

  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [partner, setPartner] = useState<Profile | null>(null);
  const [input, setInput] = useState("");
  const [showShare, setShowShare] = useState(false);
  const [shareTab, setShareTab] = useState<ShareKind>("mantra");
  const scrollRef = useRef<ScrollView>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    if (!meId || !otherId) return;
    const msgs = await getConversation(meId, otherId);
    setMessages(msgs);
    markRead(meId, otherId);
  }, [meId, otherId]);

  useEffect(() => {
    if (!user) return;
    ensureProfile(user);
    getProfileById(otherId).then(setPartner);
    load();
    updateLastSeen(user.id);
    timer.current = setInterval(() => {
      updateLastSeen(user.id);
      load();
      getProfileById(otherId).then(setPartner);
    }, 3000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [user, otherId, load]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages]);

  const doSend = async (payload: { body?: string; share?: { type: ShareKind; ref: string; title: string } }) => {
    if (!meId || !otherId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const optimistic: DirectMessage = {
      id: `tmp_${Date.now()}`, sender_id: meId, recipient_id: otherId,
      body: payload.body ?? "", share_type: payload.share?.type ?? null,
      share_ref: payload.share?.ref ?? null, share_title: payload.share?.title ?? null,
      read_at: null, created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    await sendMessage(meId, otherId, payload);
    load();
  };

  const sendText = () => {
    if (!input.trim()) return;
    const body = input.trim();
    setInput("");
    doSend({ body });
  };

  const sendShare = (type: ShareKind, ref: string, title: string) => {
    setShowShare(false);
    doSend({ share: { type, ref, title } });
  };

  const openShared = (m: DirectMessage) => {
    if (!m.share_type || !m.share_ref) return;
    Haptics.selectionAsync();
    router.push(resolveShareRoute(m.share_type, m.share_ref) as any);
  };

  const online = isOnline(partner?.last_seen);
  const lastMine = [...messages].reverse().find((m) => m.sender_id === meId);

  const ShareCard = ({ m, mine }: { m: DirectMessage; mine: boolean }) => {
    const Icon = m.share_type === "sound" ? Music : m.share_type === "meditation" ? Brain : Heart;
    const accent = mine ? "#FFFFFF" : theme.accent[500];
    return (
      <TouchableOpacity activeOpacity={0.9} onPress={() => openShared(m)}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: mine ? "rgba(255,255,255,0.18)" : (isDark ? theme.surfaceAlt : "#F5F3FF"), borderRadius: 14, padding: 12, marginTop: m.body ? 8 : 0, maxWidth: 250 }}>
          <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: mine ? "rgba(255,255,255,0.25)" : theme.accent[500] + "22", alignItems: "center", justifyContent: "center" }}>
            <Icon size={18} color={accent} fill={m.share_type === "mantra" ? accent : "transparent"} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 11, color: mine ? "rgba(255,255,255,0.85)" : theme.accent[500], textTransform: "uppercase", letterSpacing: 0.5 }}>
              {m.share_type}
            </Text>
            <Text numberOfLines={2} style={{ fontFamily: "Quicksand-SemiBold", fontSize: 13, color: mine ? "#fff" : theme.text.primary, marginTop: 2 }}>
              {m.share_title}
            </Text>
            <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 11, color: mine ? "rgba(255,255,255,0.8)" : theme.text.muted, marginTop: 3 }}>
              Tap to open ›
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const shareItems =
    shareTab === "mantra"
      ? mockMantras.map((x) => ({ ref: x.id, title: x.text }))
      : shareTab === "sound"
      ? mockSounds.map((x) => ({ ref: x.id, title: x.title }))
      : mockMeditations.map((x) => ({ ref: x.id, title: x.title }));

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Header */}
      <LinearGradient
        colors={isDark ? [theme.gradients.violetDream[0], theme.gradients.violetDream[1], theme.bg] : ["#EDE9FE", "#F5F3FF", theme.bg]}
        style={{ paddingTop: 56, paddingBottom: 14, paddingHorizontal: 20 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
          <Image source={partner?.avatar_url ? { uri: partner.avatar_url } : { uri: "https://api.a0.dev/assets/image?text=friendly%20mom%20avatar&aspect=1:1" }} style={{ width: 40, height: 40, borderRadius: 20 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 17, color: theme.text.primary }}>{params.name || partner?.display_name || "Friend"}</Text>
            <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 12, color: online ? "#10B981" : theme.text.muted }}>
              {online ? "● online" : `@${params.username || partner?.username || ""}`}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView ref={scrollRef} style={{ flex: 1, paddingHorizontal: 16 }} contentContainerStyle={{ paddingTop: 12 }} showsVerticalScrollIndicator={false}>
          {messages.length === 0 && (
            <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 14, color: theme.text.muted, textAlign: "center", paddingTop: 50 }}>
              Say hi 👋 or share a calming sound to break the ice.
            </Text>
          )}
          {messages.map((m) => {
            const mine = m.sender_id === meId;
            return (
              <View key={m.id} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "82%", marginBottom: 10 }}>
                <View style={{ borderRadius: 18, borderBottomRightRadius: mine ? 4 : 18, borderBottomLeftRadius: mine ? 18 : 4, overflow: "hidden" }}>
                  {mine ? (
                    <LinearGradient colors={["#A78BFA", "#8B5CF6"]} style={{ paddingHorizontal: 14, paddingVertical: 10 }}>
                      {m.body ? <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 15, color: "#fff" }}>{m.body}</Text> : null}
                      {m.share_type ? <ShareCard m={m} mine /> : null}
                    </LinearGradient>
                  ) : (
                    <View style={{ backgroundColor: theme.surface, paddingHorizontal: 14, paddingVertical: 10 }}>
                      {m.body ? <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 15, color: theme.text.primary }}>{m.body}</Text> : null}
                      {m.share_type ? <ShareCard m={m} mine={false} /> : null}
                    </View>
                  )}
                </View>
                {mine && m.id === lastMine?.id && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 3, alignSelf: "flex-end", marginTop: 3 }}>
                    {m.read_at ? <CheckCheck size={13} color={theme.accent[500]} /> : <Check size={13} color={theme.text.muted} />}
                    <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 10, color: theme.text.muted }}>{m.read_at ? "Read" : "Sent"}</Text>
                  </View>
                )}
              </View>
            );
          })}
          <View style={{ height: 8 }} />
        </ScrollView>

        {/* Emoji quick bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 46 }} contentContainerStyle={{ paddingHorizontal: 12, gap: 6, alignItems: "center" }}>
          {EMOJIS.map((e) => (
            <TouchableOpacity key={e} onPress={() => doSend({ body: e })} style={{ paddingHorizontal: 6, paddingVertical: 4 }}>
              <Text style={{ fontSize: 24 }}>{e}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Input */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingTop: 6, paddingBottom: Platform.OS === "ios" ? 28 : 12, backgroundColor: theme.surface, borderTopWidth: 1, borderTopColor: theme.border }}>
          <TouchableOpacity onPress={() => { Haptics.selectionAsync(); setShowShare(true); }} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: isDark ? theme.surfaceAlt : "#F3F4F6", alignItems: "center", justifyContent: "center" }}>
            <Plus size={22} color={theme.accent[500]} />
          </TouchableOpacity>
          <TextInput
            style={{ flex: 1, fontFamily: "Quicksand-Medium", fontSize: 15, color: theme.text.primary, backgroundColor: isDark ? theme.surfaceAlt : "#F3F4F6", borderRadius: 22, paddingHorizontal: 16, paddingVertical: 11, maxHeight: 100 }}
            placeholder="Message..."
            placeholderTextColor={theme.text.muted}
            value={input}
            onChangeText={setInput}
            multiline
          />
          <TouchableOpacity onPress={sendText} disabled={!input.trim()} activeOpacity={0.85}>
            <LinearGradient colors={["#A78BFA", "#8B5CF6"]} style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", opacity: input.trim() ? 1 : 0.5 }}>
              <Send size={19} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Share picker */}
      <Modal visible={showShare} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 20, paddingBottom: 32, maxHeight: "75%" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, marginBottom: 14 }}>
              <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 20, color: theme.text.primary }}>Share something calming</Text>
              <TouchableOpacity onPress={() => setShowShare(false)}><X size={24} color={theme.text.muted} /></TouchableOpacity>
            </View>
            <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 24, marginBottom: 12 }}>
              {([["mantra", "Mantras", Heart], ["sound", "Sounds", Music], ["meditation", "Meditations", Brain]] as const).map(([k, label, Icon]) => (
                <TouchableOpacity key={k} onPress={() => setShareTab(k)} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: shareTab === k ? theme.accent[500] + "20" : (isDark ? theme.surfaceAlt : "#F3F4F6"), borderWidth: 1, borderColor: shareTab === k ? theme.accent[500] : theme.border }}>
                  <Icon size={14} color={theme.accent[500]} />
                  <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 13, color: shareTab === k ? theme.accent[500] : theme.text.secondary }}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <ScrollView style={{ paddingHorizontal: 24 }} showsVerticalScrollIndicator={false}>
              {shareItems.map((it) => (
                <TouchableOpacity key={it.ref} activeOpacity={0.85} onPress={() => sendShare(shareTab, it.ref, it.title)} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: isDark ? theme.surfaceAlt : "#F9FAFB", borderRadius: 12, padding: 14, marginBottom: 8 }}>
                  <Sparkles size={16} color={theme.accent[500]} />
                  <Text numberOfLines={2} style={{ flex: 1, fontFamily: "Quicksand-SemiBold", fontSize: 14, color: theme.text.primary }}>{it.title}</Text>
                  <Send size={15} color={theme.text.muted} />
                </TouchableOpacity>
              ))}
              <View style={{ height: 16 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
