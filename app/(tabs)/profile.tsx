import { View, Text, ScrollView, TouchableOpacity, Image, Switch, Alert } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import {
  User,
  Bell,
  Moon,
  Shield,
  HelpCircle,
  LogOut,
  ChevronRight,
  Crown,
  Settings,
  MessageSquare,
  Star,
} from "lucide-react-native";
import { useAuthStore } from "../../lib/stores/auth-store";
import { useTaskStore } from "../../lib/stores/task-store";
import { useTheme } from "../../lib/theme-context";

export default function ProfileScreen() {
  const router = useRouter();
  const { theme, isDark, toggle } = useTheme();
  const { user, signOut } = useAuthStore();
  const { getCompletedCount } = useTaskStore();
  const [notifications, setNotifications] = useState(true);

  const tasksDone = 142 + getCompletedCount();

  const handleSignOut = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(auth)/sign-in");
        },
      },
    ]);
  };

  const info = (title: string, message: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(title, message);
  };

  const menuSections = [
    {
      title: "Account",
      items: [
        {
          icon: User,
          label: "Edit Profile",
          color: "#F472B6",
          onPress: () => info("Edit Profile", "Update your name, photo, and family details. (Demo)"),
        },
        {
          icon: Crown,
          label: "Upgrade to Premium",
          color: "#F59E0B",
          badge: "PRO",
          onPress: () =>
            info(
              "MomEase Premium",
              "Unlock unlimited AI chats, all meditations, and offline sounds for $7.99/mo. (Demo)"
            ),
        },
        {
          icon: Bell,
          label: "Notifications",
          color: "#8B5CF6",
          toggle: true,
          value: notifications,
          onToggle: (v: boolean) => {
            Haptics.selectionAsync();
            setNotifications(v);
          },
        },
      ],
    },
    {
      title: "Preferences",
      items: [
        {
          icon: Moon,
          label: "Dark Mode",
          color: "#6366F1",
          toggle: true,
          value: isDark,
          onToggle: () => {
            Haptics.selectionAsync();
            toggle();
          },
        },
        {
          icon: Settings,
          label: "App Settings",
          color: "#6B7280",
          onPress: () => info("App Settings", "Manage language, units, and data preferences. (Demo)"),
        },
      ],
    },
    {
      title: "Support",
      items: [
        { icon: HelpCircle, label: "Help Center", color: "#10B981", onPress: () => info("Help Center", "Browse FAQs and guides for getting the most out of MomEase.") },
        { icon: MessageSquare, label: "Send Feedback", color: "#3B82F6", onPress: () => info("Send Feedback", "We'd love to hear from you at hello@momease.app") },
        { icon: Star, label: "Rate MomEase", color: "#F59E0B", onPress: () => info("Rate MomEase", "Enjoying the app? A 5-star review helps other moms find us!") },
        { icon: Shield, label: "Privacy Policy", color: "#6B7280", onPress: () => info("Privacy", "Your data stays yours. We never sell personal information.") },
      ],
    },
  ];

  const premium = user?.role === "premium";

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient
          colors={isDark ? [theme.surfaceAlt, theme.bgElevated, theme.bg] : ["#FDE5EC", "#FDF2F8", theme.bg]}
          style={{ paddingTop: 60, paddingBottom: 32, alignItems: "center" }}
        >
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              borderWidth: 3,
              borderColor: "#F9A8D4",
              overflow: "hidden",
              marginBottom: 16,
              shadowColor: "#F9A8D4",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            <Image
              source={{
                uri: user?.avatarUrl || "https://api.a0.dev/assets/image?text=warm%20portrait%20of%20a%20smiling%20professional%20mother%20soft%20lighting&aspect=1:1",
              }}
              style={{ width: 96, height: 96 }}
            />
          </View>

          <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 24, color: theme.text.primary }}>
            {user?.name || "Sarah Mitchell"}
          </Text>
          <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 14, color: theme.text.secondary, marginTop: 2 }}>
            {user?.email || "sarah@momease.app"}
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              backgroundColor: premium ? "#FEF3C7" : theme.surfaceAlt,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 999,
              marginTop: 12,
            }}
          >
            {premium && <Crown size={14} color="#F59E0B" />}
            <Text
              style={{
                fontFamily: "Quicksand-Bold",
                fontSize: 12,
                color: premium ? "#B45309" : theme.text.secondary,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {user?.role || "Premium"} Member
            </Text>
          </View>

          <View style={{ flexDirection: "row", marginTop: 24, gap: 32 }}>
            {[
              { value: "28", label: "Day Streak" },
              { value: String(tasksDone), label: "Tasks Done" },
              { value: "4.5h", label: "Self-Care" },
            ].map((stat, i) => (
              <View key={stat.label} style={{ flexDirection: "row", alignItems: "center", gap: 32 }}>
                {i > 0 && <View style={{ width: 1, height: 32, backgroundColor: theme.border, marginLeft: -32 }} />}
                <View style={{ alignItems: "center" }}>
                  <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 22, color: theme.text.primary }}>
                    {stat.value}
                  </Text>
                  <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 12, color: theme.text.secondary }}>
                    {stat.label}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Menu Sections */}
        <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>
          {menuSections.map((section) => (
            <View key={section.title} style={{ marginBottom: 24 }}>
              <Text
                style={{
                  fontFamily: "Quicksand-Bold",
                  fontSize: 14,
                  color: theme.text.muted,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  marginBottom: 12,
                }}
              >
                {section.title}
              </Text>
              <View
                style={{
                  backgroundColor: theme.surface,
                  borderRadius: 16,
                  overflow: "hidden",
                  borderWidth: isDark ? 1 : 0,
                  borderColor: theme.border,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isDark ? 0 : 0.04,
                  shadowRadius: 4,
                  elevation: 1,
                }}
              >
                {section.items.map((item, i) => (
                  <TouchableOpacity
                    key={item.label}
                    activeOpacity={item.toggle ? 1 : 0.7}
                    onPress={item.toggle ? undefined : (item as any).onPress}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      padding: 16,
                      borderTopWidth: i > 0 ? 1 : 0,
                      borderTopColor: theme.border,
                      gap: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: item.color + (isDark ? "28" : "15"),
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <item.icon size={18} color={item.color} />
                    </View>
                    <Text
                      style={{
                        flex: 1,
                        fontFamily: "Quicksand-SemiBold",
                        fontSize: 16,
                        color: theme.text.primary,
                      }}
                    >
                      {item.label}
                    </Text>
                    {item.badge && (
                      <View
                        style={{
                          backgroundColor: "#FEF3C7",
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 999,
                        }}
                      >
                        <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 10, color: "#B45309" }}>
                          {item.badge}
                        </Text>
                      </View>
                    )}
                    {item.toggle ? (
                      <Switch
                        value={item.value}
                        onValueChange={item.onToggle}
                        trackColor={{ false: theme.border, true: "#F9A8D4" }}
                        thumbColor="#FFFFFF"
                      />
                    ) : (
                      <ChevronRight size={18} color={theme.text.muted} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          <TouchableOpacity
            onPress={handleSignOut}
            activeOpacity={0.85}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              paddingVertical: 16,
              marginBottom: 48,
              backgroundColor: isDark ? "#3A2424" : "#FEF2F2",
              borderRadius: 16,
            }}
          >
            <LogOut size={18} color={theme.error} />
            <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 16, color: theme.error }}>
              Sign Out
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
