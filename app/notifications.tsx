import { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Platform } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  ChevronLeft,
  BellOff,
  BellRing,
  Sparkles,
  Wind,
  BookOpen,
  Users,
  ListTodo,
  Baby,
  Heart,
  Check,
  Trash2,
  Bell,
} from "lucide-react-native";
import {
  useNotificationStore,
  type AppNotification,
  type NotificationType,
} from "../lib/stores/notification-store";
import { useTheme } from "../lib/theme-context";
import {
  isPushSupported,
  getPermission,
  requestPermission,
  showNotification,
  type PushPermission,
} from "../lib/web-push";

const iconFor: Record<NotificationType, any> = {
  reminder: BookOpen,
  motivation: Sparkles,
  community: Users,
  task: ListTodo,
  milestone: Baby,
  wellness: Wind,
};

const relativeTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { notifications, markAsRead, markAllAsRead, remove, clearAll, add } = useNotificationStore();
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );
  const isEmpty = notifications.length === 0;
  const headerPadTop = Platform.OS === "ios" ? 52 : 36;

  const [pushPerm, setPushPerm] = useState<PushPermission>("default");
  useEffect(() => {
    if (isPushSupported) setPushPerm(getPermission());
  }, []);

  const handleEnablePush = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const result = await requestPermission();
    setPushPerm(result);
    if (result === "granted") {
      add({
        title: "Notifications enabled",
        body: "You'll get gentle daily nudges and reminders — right here on your device.",
        type: "motivation",
      });
      await showNotification("You're all set 💛", {
        body: "MomEase will nudge you gently when it matters.",
        tag: "momease-welcome",
      });
    }
  };

  const handleTestPush = async () => {
    Haptics.selectionAsync().catch(() => {});
    await showNotification("Test notification", {
      body: "This is what a real MomEase notification looks like.",
      tag: "momease-test",
      url: "/notifications",
    });
  };

  const openNotification = (n: AppNotification) => {
    if (!n.read) markAsRead(n.id);
    Haptics.selectionAsync().catch(() => {});
    if (n.route) router.push(n.route as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View
        style={{
          paddingTop: headerPadTop,
          paddingBottom: 10,
          paddingHorizontal: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          backgroundColor: theme.surface,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ChevronLeft size={22} color={theme.text.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{ fontFamily: "Quicksand-Bold", fontSize: 17, color: theme.text.primary }}
            numberOfLines={1}
          >
            Notifications
          </Text>
          <Text
            style={{
              fontFamily: "Quicksand-Medium",
              fontSize: 12,
              color: theme.text.muted,
              marginTop: -1,
            }}
            numberOfLines={1}
          >
            {unreadCount > 0
              ? `${unreadCount} unread`
              : notifications.length > 0
                ? "All caught up"
                : "Inbox is empty"}
          </Text>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={() => {
              markAllAsRead();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            }}
            hitSlop={8}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: theme.accent[500] + "15",
            }}
          >
            <Check size={13} color={theme.accent[500]} />
            <Text
              style={{
                fontFamily: "Quicksand-SemiBold",
                fontSize: 11,
                color: theme.accent[500],
              }}
            >
              Mark all read
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {isEmpty ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 32,
          }}
        >
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: isDark ? theme.surfaceAlt : theme.primary[50],
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <BellOff size={30} color={theme.text.muted} />
          </View>
          <Text
            style={{
              fontFamily: "Quicksand-Bold",
              fontSize: 18,
              color: theme.text.primary,
              marginBottom: 6,
            }}
          >
            All caught up
          </Text>
          <Text
            style={{
              fontFamily: "Quicksand-Medium",
              fontSize: 14,
              color: theme.text.secondary,
              textAlign: "center",
              lineHeight: 20,
            }}
          >
            When we have something meaningful for you — a reminder, a milestone, a gentle nudge — it'll show up here.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingVertical: 8 }}
          showsVerticalScrollIndicator={false}
        >
          {isPushSupported && (pushPerm === "default" || pushPerm === "denied") && (
            <View
              style={{
                marginHorizontal: 12,
                marginBottom: 10,
                padding: 14,
                borderRadius: 14,
                backgroundColor: theme.accent[500] + "0F",
                borderWidth: 1,
                borderColor: theme.accent[500] + "33",
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: theme.accent[500] + "22",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <BellRing size={20} color={theme.accent[500]} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={{
                    fontFamily: "Quicksand-Bold",
                    fontSize: 14,
                    color: theme.text.primary,
                  }}
                  numberOfLines={1}
                >
                  {pushPerm === "denied" ? "Notifications blocked" : "Enable gentle nudges"}
                </Text>
                <Text
                  style={{
                    fontFamily: "Quicksand-Medium",
                    fontSize: 12,
                    color: theme.text.secondary,
                    marginTop: 2,
                    lineHeight: 16,
                  }}
                  numberOfLines={2}
                >
                  {pushPerm === "denied"
                    ? "Enable notifications in your browser settings to get daily reminders."
                    : "Daily check-in reminders, wellness nudges, and streak celebrations — nothing spammy."}
                </Text>
              </View>
              {pushPerm !== "denied" && (
                <TouchableOpacity
                  onPress={handleEnablePush}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 999,
                    backgroundColor: theme.accent[500],
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Quicksand-Bold",
                      fontSize: 12,
                      color: "#FFFFFF",
                    }}
                  >
                    Enable
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          {isPushSupported && pushPerm === "granted" && (
            <TouchableOpacity
              onPress={handleTestPush}
              activeOpacity={0.85}
              style={{
                marginHorizontal: 12,
                marginBottom: 10,
                padding: 10,
                borderRadius: 12,
                backgroundColor: theme.success + "15",
                borderWidth: 1,
                borderColor: theme.success + "33",
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
              <View
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: theme.success,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Bell size={13} color="#FFFFFF" />
              </View>
              <Text
                style={{
                  flex: 1,
                  fontFamily: "Quicksand-SemiBold",
                  fontSize: 12,
                  color: theme.success,
                }}
              >
                Notifications on · tap to send a test
              </Text>
            </TouchableOpacity>
          )}

          {notifications.map((n) => {
            const Icon = iconFor[n.type] ?? Heart;
            return (
              <TouchableOpacity
                key={n.id}
                activeOpacity={0.85}
                onPress={() => openNotification(n)}
                onLongPress={() => {
                  remove(n.id);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                }}
                style={{
                  marginHorizontal: 12,
                  marginBottom: 8,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderRadius: 14,
                  backgroundColor: n.read ? theme.surface : theme.accent[500] + "0F",
                  borderWidth: 1,
                  borderColor: n.read ? theme.border : theme.accent[500] + "33",
                  flexDirection: "row",
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    backgroundColor: n.read
                      ? isDark
                        ? theme.surfaceAlt
                        : theme.primary[50]
                      : theme.accent[500] + "22",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={18} color={n.read ? theme.text.muted : theme.accent[500]} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 2,
                    }}
                  >
                    <Text
                      style={{
                        flex: 1,
                        fontFamily: "Quicksand-Bold",
                        fontSize: 14,
                        color: theme.text.primary,
                      }}
                      numberOfLines={1}
                    >
                      {n.title}
                    </Text>
                    {!n.read && (
                      <View
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: 4,
                          backgroundColor: theme.accent[500],
                        }}
                      />
                    )}
                  </View>
                  <Text
                    style={{
                      fontFamily: "Quicksand-Medium",
                      fontSize: 13,
                      color: theme.text.secondary,
                      lineHeight: 18,
                    }}
                    numberOfLines={3}
                  >
                    {n.body}
                  </Text>
                  <Text
                    style={{
                      fontFamily: "Quicksand-Medium",
                      fontSize: 11,
                      color: theme.text.muted,
                      marginTop: 6,
                    }}
                  >
                    {relativeTime(n.createdAt)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {notifications.length >= 3 && (
            <TouchableOpacity
              onPress={() => {
                clearAll();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
              }}
              style={{
                marginHorizontal: 12,
                marginTop: 8,
                marginBottom: 24,
                padding: 12,
                borderRadius: 12,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <Trash2 size={14} color={theme.text.muted} />
              <Text
                style={{
                  fontFamily: "Quicksand-SemiBold",
                  fontSize: 13,
                  color: theme.text.muted,
                }}
              >
                Clear all
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </View>
  );
}
