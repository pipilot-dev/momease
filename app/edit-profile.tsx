import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { ChevronLeft, User as UserIcon, Baby, Check } from "lucide-react-native";
import { useAuthStore } from "../lib/stores/auth-store";
import { useMilestoneStore } from "../lib/stores/milestone-store";
import { useTheme } from "../lib/theme-context";

export default function EditProfileScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { user, updateUser } = useAuthStore();
  const { baby, updateBaby } = useMilestoneStore();

  const [name, setName] = useState(user?.name ?? "");
  const [babyName, setBabyName] = useState(baby.name);
  const [babyBirth, setBabyBirth] = useState(baby.birthDate);
  const [babyGender, setBabyGender] = useState<"girl" | "boy">(baby.gender === "boy" ? "boy" : "girl");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fieldBg = isDark ? theme.surfaceAlt : theme.surface;

  const onSave = async () => {
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (name.trim()) updateUser({ name: name.trim() });
    updateBaby({ name: babyName.trim() || "Baby", birthDate: babyBirth.trim(), gender: babyGender });
    // Brief confirmation, then return.
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => router.back(), 600);
    }, 500);
  };

  const label = (text: string) => (
    <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 13, color: theme.text.secondary, marginBottom: 8, marginTop: 20 }}>
      {text}
    </Text>
  );

  const inputStyle = {
    fontFamily: "Quicksand-Medium",
    fontSize: 16,
    color: theme.text.primary,
    backgroundColor: fieldBg,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: theme.border,
  } as const;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <LinearGradient
        colors={
          isDark
            ? [theme.gradients.roseGlow[0], theme.gradients.roseGlow[1], theme.bg]
            : ["#FDE5EC", "#FDF2F8", theme.bg]
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
            Edit Profile
          </Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
          {/* Your details */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <UserIcon size={18} color={theme.primary[500]} />
            <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 18, color: theme.text.primary }}>
              Your details
            </Text>
          </View>
          {label("Display name")}
          <TextInput
            style={inputStyle}
            placeholder="Your name"
            placeholderTextColor={theme.text.muted}
            value={name}
            onChangeText={setName}
          />
          {label("Email")}
          <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 15, color: theme.text.muted, paddingHorizontal: 4 }}>
            {user?.email ?? "—"}
          </Text>

          {/* Baby details */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 32 }}>
            <Baby size={18} color={theme.primary[500]} />
            <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 18, color: theme.text.primary }}>
              Your little one
            </Text>
          </View>
          {label("Baby's name")}
          <TextInput
            style={inputStyle}
            placeholder="Baby's name"
            placeholderTextColor={theme.text.muted}
            value={babyName}
            onChangeText={setBabyName}
          />
          {label("Birth date")}
          <TextInput
            style={inputStyle}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.text.muted}
            value={babyBirth}
            onChangeText={setBabyBirth}
            autoCapitalize="none"
          />
          {label("Gender")}
          <View style={{ flexDirection: "row", gap: 12 }}>
            {(["girl", "boy"] as const).map((g) => {
              const active = babyGender === g;
              return (
                <TouchableOpacity
                  key={g}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setBabyGender(g);
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    borderRadius: 14,
                    alignItems: "center",
                    backgroundColor: active ? theme.primary[500] : fieldBg,
                    borderWidth: 1,
                    borderColor: active ? theme.primary[500] : theme.border,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Quicksand-SemiBold",
                      fontSize: 15,
                      textTransform: "capitalize",
                      color: active ? "#FFFFFF" : theme.text.secondary,
                    }}
                  >
                    {g}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Save */}
          <TouchableOpacity onPress={onSave} disabled={saving} activeOpacity={0.85} style={{ marginTop: 36 }}>
            <LinearGradient
              colors={["#F9A8D4", "#F472B6"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ borderRadius: 16, paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : saved ? (
                <>
                  <Check size={20} color="#fff" />
                  <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 17, color: "#FFFFFF" }}>Saved</Text>
                </>
              ) : (
                <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 17, color: "#FFFFFF" }}>Save changes</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
