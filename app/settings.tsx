import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ChevronLeft, Bell, Clock, Moon, Trash2, Lock, ChevronRight, ScanFace, UserX } from "lucide-react-native";
import { useSettingsStore } from "../lib/stores/settings-store";
import { useAuthStore } from "../lib/stores/auth-store";
import { useTheme } from "../lib/theme-context";
import { isBiometricAvailable, biometricLabel, authenticateBiometric } from "../lib/biometrics";
import { deleteAccount } from "../lib/social";

// Preset reminder times shown as selectable chips.
const TIME_OPTIONS: { label: string; hour: number; minute: number }[] = [
  { label: "7:00 AM", hour: 7, minute: 0 },
  { label: "8:00 AM", hour: 8, minute: 0 },
  { label: "9:00 AM", hour: 9, minute: 0 },
  { label: "12:00 PM", hour: 12, minute: 0 },
  { label: "6:00 PM", hour: 18, minute: 0 },
  { label: "9:00 PM", hour: 21, minute: 0 },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { theme, isDark, toggle } = useTheme();
  const {
    notificationsEnabled,
    setNotificationsEnabled,
    reminderHour,
    reminderMinute,
    setReminderTime,
    pin,
    biometricEnabled,
    setBiometricEnabled,
  } = useSettingsStore();
  const pinEnabled = pin !== null;

  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioName, setBioName] = useState("Face ID");
  useEffect(() => {
    isBiometricAvailable().then(setBioAvailable);
    biometricLabel().then(setBioName);
  }, []);

  const toggleBiometric = async (on: boolean) => {
    Haptics.selectionAsync();
    if (on) {
      // Confirm the biometric works before turning it on.
      const ok = await authenticateBiometric("Confirm to enable biometric unlock");
      if (!ok) {
        Alert.alert("Couldn't verify", "We couldn't confirm your biometrics. Please try again.");
        return;
      }
      await setBiometricEnabled(true);
    } else {
      await setBiometricEnabled(false);
    }
  };

  const Card = ({ children }: { children: React.ReactNode }) => (
    <View
      style={{
        backgroundColor: theme.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: isDark ? 1 : 0,
        borderColor: theme.border,
      }}
    >
      {children}
    </View>
  );

  const rowHeader = (Icon: any, title: string, subtitle: string) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 }}>
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          backgroundColor: theme.primary[500] + (isDark ? "28" : "15"),
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={20} color={theme.primary[500]} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 16, color: theme.text.primary }}>{title}</Text>
        <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 12, color: theme.text.secondary }}>{subtitle}</Text>
      </View>
    </View>
  );

  const { user, signOut } = useAuthStore();

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete account",
      "This permanently deletes your account and all your data — journal, mood history, tasks, messages, and profile. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete forever",
          style: "destructive",
          onPress: async () => {
            if (user) await deleteAccount(user.id);
            await signOut();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace("/(auth)/sign-in");
          },
        },
      ]
    );
  };

  // All persisted store keys — kept in sync with attachPersistence() calls
  // across lib/stores/*. Clearing these removes local caches and signs the
  // user out on next launch; auth state also gets wiped so the app returns
  // to its clean, pre-onboarding state.
  const CLEARABLE_KEYS = [
    "momease-auth",
    "momease-chat",
    "momease-audio",
    "momease-notifications",
    "momease-checkin",
    "momease-milestones",
    "momease-sleep",
    "momease-community",
    "momease-tasks",
    "momease-settings",
    "momease-reminder-lastFired",
  ];

  const doClearLocal = async () => {
    try {
      await Promise.all(CLEARABLE_KEYS.map((k) => AsyncStorage.removeItem(k)));
    } catch {
      // AsyncStorage on web writes to localStorage — mirror the wipe directly
      // in case it fails.
      if (typeof localStorage !== "undefined") {
        for (const k of CLEARABLE_KEYS) localStorage.removeItem(k);
      }
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Bounce to the splash so persisted stores re-initialize from defaults.
    router.replace("/");
  };

  const handleClearLocal = () => {
    Alert.alert(
      "Clear cached data",
      "This clears all locally cached data — sign-in, mood check-ins, tasks, journal entries, notifications, community drafts. You'll be signed out. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear everything", style: "destructive", onPress: doClearLocal },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <LinearGradient
        colors={
          isDark
            ? [theme.gradients.violetDream[0], theme.gradients.violetDream[1], theme.bg]
            : ["#EDE9FE", "#F5F3FF", theme.bg]
        }
        style={{ paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: isDark ? theme.surface : "rgba(255,255,255,0.6)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ChevronLeft size={22} color={theme.text.primary} />
          </TouchableOpacity>
          <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 24, color: theme.text.primary }}>
            App Settings
          </Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        {/* Notifications */}
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ flex: 1 }}>{rowHeader(Bell, "Daily reminders", "A gentle nudge to check in")}</View>
            <Switch
              value={notificationsEnabled}
              onValueChange={async (v) => {
                Haptics.selectionAsync();
                const ok = await setNotificationsEnabled(v);
                if (v && !ok) {
                  Alert.alert(
                    "Notifications blocked",
                    "Enable notifications for MomEase in your device settings to receive reminders."
                  );
                }
              }}
              trackColor={{ false: theme.border, true: "#F9A8D4" }}
              thumbColor="#FFFFFF"
            />
          </View>
        </Card>

        {/* Reminder time */}
        <Card>
          {rowHeader(Clock, "Reminder time", "When your daily check-in nudge arrives")}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {TIME_OPTIONS.map((opt) => {
              const active = reminderHour === opt.hour && reminderMinute === opt.minute;
              return (
                <TouchableOpacity
                  key={opt.label}
                  disabled={!notificationsEnabled}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setReminderTime(opt.hour, opt.minute);
                  }}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 999,
                    opacity: notificationsEnabled ? 1 : 0.4,
                    backgroundColor: active ? theme.primary[500] : isDark ? theme.surfaceAlt : theme.bg,
                    borderWidth: 1,
                    borderColor: active ? theme.primary[500] : theme.border,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Quicksand-SemiBold",
                      fontSize: 14,
                      color: active ? "#FFFFFF" : theme.text.secondary,
                    }}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Appearance */}
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ flex: 1 }}>{rowHeader(Moon, "Dark mode", isDark ? "On" : "Off")}</View>
            <Switch
              value={isDark}
              onValueChange={() => {
                Haptics.selectionAsync();
                toggle();
              }}
              trackColor={{ false: theme.border, true: "#F9A8D4" }}
              thumbColor="#FFFFFF"
            />
          </View>
        </Card>

        {/* App Lock (PIN) */}
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ flex: 1 }}>{rowHeader(Lock, "App Lock", pinEnabled ? "PIN required to open the app" : "Protect the app with a PIN")}</View>
            <Switch
              value={pinEnabled}
              onValueChange={(v) => {
                Haptics.selectionAsync();
                if (v) router.push("/set-pin");
                else router.push({ pathname: "/set-pin", params: { mode: "disable" } });
              }}
              trackColor={{ false: theme.border, true: "#F9A8D4" }}
              thumbColor="#FFFFFF"
            />
          </View>
          {pinEnabled && (
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: theme.border }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                <ScanFace size={20} color={bioAvailable ? "#F472B6" : theme.text.muted} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 15, color: theme.text.primary }}>
                    {bioAvailable ? `${bioName} unlock` : "Biometric unlock"}
                  </Text>
                  <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 12, color: theme.text.secondary }}>
                    {bioAvailable ? "Skip the PIN with your face or fingerprint" : "Not available on this device"}
                  </Text>
                </View>
              </View>
              <Switch
                value={biometricEnabled && bioAvailable}
                disabled={!bioAvailable}
                onValueChange={toggleBiometric}
                trackColor={{ false: theme.border, true: "#F9A8D4" }}
                thumbColor="#FFFFFF"
              />
            </View>
          )}

          {pinEnabled && (
            <TouchableOpacity
              onPress={() => { Haptics.selectionAsync(); router.push({ pathname: "/set-pin", params: { mode: "change" } }); }}
              activeOpacity={0.7}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: theme.border }}
            >
              <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 15, color: theme.text.primary }}>Change PIN</Text>
              <ChevronRight size={18} color={theme.text.muted} />
            </TouchableOpacity>
          )}
        </Card>

        {/* Data */}
        <Card>
          <TouchableOpacity onPress={handleClearLocal} activeOpacity={0.7}>
            {rowHeader(Trash2, "Clear cached data", "Free up space on this device")}
          </TouchableOpacity>
        </Card>

        {/* Danger zone */}
        <Card>
          <TouchableOpacity onPress={handleDeleteAccount} activeOpacity={0.7} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: theme.error + (isDark ? "28" : "15"), alignItems: "center", justifyContent: "center" }}>
              <UserX size={20} color={theme.error} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 16, color: theme.error }}>Delete account</Text>
              <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 12, color: theme.text.secondary }}>Permanently remove your account and data</Text>
            </View>
          </TouchableOpacity>
        </Card>

        <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 12, color: theme.text.muted, textAlign: "center", marginTop: 8 }}>
          MomEase v1.0.0
        </Text>
      </ScrollView>
    </View>
  );
}
