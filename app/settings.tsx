import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { ChevronLeft, Bell, Clock, Moon, Trash2, Lock, ChevronRight } from "lucide-react-native";
import { useSettingsStore } from "../lib/stores/settings-store";
import { useTheme } from "../lib/theme-context";

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
  } = useSettingsStore();
  const pinEnabled = pin !== null;

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

  const handleClearLocal = () => {
    Alert.alert(
      "Clear cached data",
      "This clears locally cached app data on this device. Your account and cloud-synced data are not affected.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
        },
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

        <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 12, color: theme.text.muted, textAlign: "center", marginTop: 8 }}>
          MomEase v1.0.0
        </Text>
      </ScrollView>
    </View>
  );
}
