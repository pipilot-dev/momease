import { View, Text, ScrollView, TouchableOpacity, Image, Switch } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  User,
  Bell,
  Moon,
  Shield,
  HelpCircle,
  LogOut,
  ChevronRight,
  Crown,
  Heart,
  Settings,
  MessageSquare,
  Star,
} from "lucide-react-native";
import { useAuthStore } from "../../lib/stores/auth-store";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);

  const handleSignOut = async () => {
    await signOut();
    router.replace("/(auth)/sign-in");
  };

  const menuSections = [
    {
      title: "Account",
      items: [
        { icon: User, label: "Edit Profile", color: "#F472B6" },
        { icon: Crown, label: "Upgrade to Premium", color: "#F59E0B", badge: "PRO" },
        { icon: Bell, label: "Notifications", color: "#8B5CF6", toggle: true, value: notifications, onToggle: setNotifications },
      ],
    },
    {
      title: "Preferences",
      items: [
        { icon: Moon, label: "Dark Mode", color: "#6366F1", toggle: true, value: darkMode, onToggle: setDarkMode },
        { icon: Settings, label: "App Settings", color: "#6B7280" },
      ],
    },
    {
      title: "Support",
      items: [
        { icon: HelpCircle, label: "Help Center", color: "#10B981" },
        { icon: MessageSquare, label: "Send Feedback", color: "#3B82F6" },
        { icon: Star, label: "Rate MomEase", color: "#F59E0B" },
        { icon: Shield, label: "Privacy Policy", color: "#6B7280" },
      ],
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: "#FDFCFB" }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient
          colors={["#FDE5EC", "#FDF2F8", "#FDFCFB"]}
          style={{ paddingTop: 60, paddingBottom: 32, alignItems: "center" }}
        >
          {/* Avatar */}
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

          <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 24, color: "#1F2937" }}>
            {user?.name || "Sarah Mitchell"}
          </Text>
          <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 14, color: "#6B7280", marginTop: 2 }}>
            {user?.email || "sarah@momease.app"}
          </Text>

          {/* Role Badge */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              backgroundColor: user?.role === "premium" ? "#FEF3C7" : "#F3F4F6",
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 999,
              marginTop: 12,
            }}
          >
            {user?.role === "premium" && <Crown size={14} color="#F59E0B" />}
            <Text
              style={{
                fontFamily: "Quicksand-Bold",
                fontSize: 12,
                color: user?.role === "premium" ? "#B45309" : "#6B7280",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {user?.role || "Premium"} Member
            </Text>
          </View>

          {/* Stats */}
          <View
            style={{
              flexDirection: "row",
              marginTop: 24,
              gap: 32,
            }}
          >
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 22, color: "#1F2937" }}>
                28
              </Text>
              <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 12, color: "#6B7280" }}>
                Day Streak
              </Text>
            </View>
            <View style={{ width: 1, backgroundColor: "#E5E7EB" }} />
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 22, color: "#1F2937" }}>
                142
              </Text>
              <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 12, color: "#6B7280" }}>
                Tasks Done
              </Text>
            </View>
            <View style={{ width: 1, backgroundColor: "#E5E7EB" }} />
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 22, color: "#1F2937" }}>
                4.5h
              </Text>
              <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 12, color: "#6B7280" }}>
                Self-Care
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Menu Sections */}
        <View style={{ paddingHorizontal: 24 }}>
          {menuSections.map((section) => (
            <View key={section.title} style={{ marginBottom: 24 }}>
              <Text
                style={{
                  fontFamily: "Quicksand-Bold",
                  fontSize: 14,
                  color: "#9CA3AF",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  marginBottom: 12,
                }}
              >
                {section.title}
              </Text>
              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 16,
                  overflow: "hidden",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 4,
                  elevation: 1,
                }}
              >
                {section.items.map((item, i) => (
                  <TouchableOpacity
                    key={item.label}
                    activeOpacity={item.toggle ? 1 : 0.7}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      padding: 16,
                      borderTopWidth: i > 0 ? 1 : 0,
                      borderTopColor: "#F3F4F6",
                      gap: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: item.color + "15",
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
                        color: "#1F2937",
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
                        <Text
                          style={{
                            fontFamily: "Quicksand-Bold",
                            fontSize: 10,
                            color: "#B45309",
                          }}
                        >
                          {item.badge}
                        </Text>
                      </View>
                    )}
                    {item.toggle ? (
                      <Switch
                        value={item.value}
                        onValueChange={item.onToggle}
                        trackColor={{ false: "#E5E7EB", true: "#F9A8D4" }}
                        thumbColor="#FFFFFF"
                      />
                    ) : (
                      <ChevronRight size={18} color="#D1D5DB" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          {/* Sign Out */}
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
              backgroundColor: "#FEF2F2",
              borderRadius: 16,
            }}
          >
            <LogOut size={18} color="#EF4444" />
            <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 16, color: "#EF4444" }}>
              Sign Out
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
