import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { ChevronLeft, Flame, Check, Sparkles, Sun, Heart } from "lucide-react-native";
import { useCheckinStore } from "../lib/stores/checkin-store";
import { useTheme } from "../lib/theme-context";

const MOODS = [
  { emoji: "Rough", label: "Rough", color: "#F87171" },
  { emoji: "Meh", label: "Meh", color: "#FBBF24" },
  { emoji: "Okay", label: "Okay", color: "#FCD34D" },
  { emoji: "Good", label: "Good", color: "#34D399" },
  { emoji: "Great", label: "Great", color: "#F472B6" },
];

export default function CheckinScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { complete, currentStreak, longestStreak, hasCheckedInToday } = useCheckinStore();

  const alreadyDone = hasCheckedInToday();
  const [step, setStep] = useState(0);
  const [mood, setMood] = useState<number | null>(null);
  const [gratitude, setGratitude] = useState("");
  const [intention, setIntention] = useState("");
  const [done, setDone] = useState(false);

  const celebrate = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: (step + 1) / 3,
      duration: 350,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [step]);

  const finish = () => {
    complete({ mood: mood ?? 3, gratitude: gratitude.trim(), intention: intention.trim() });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setDone(true);
    Animated.spring(celebrate, { toValue: 1, stiffness: 140, damping: 12, useNativeDriver: true }).start();
  };

  const next = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (step < 2) setStep((s) => s + 1);
    else finish();
  };

  const canAdvance =
    (step === 0 && mood !== null) ||
    (step === 1 && gratitude.trim().length > 0) ||
    (step === 2 && intention.trim().length > 0);

  const newStreak = currentStreak + (alreadyDone ? 0 : 1);

  // ---- Completion / celebration view ----
  if (done || alreadyDone) {
    const streakToShow = done ? newStreak : currentStreak;
    return (
      <LinearGradient colors={theme.heroGradient} style={{ flex: 1 }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <Animated.View
            style={{
              transform: [{ scale: done ? celebrate : 1 }],
              alignItems: "center",
            }}
          >
            <LinearGradient
              colors={["#FB923C", "#F472B6"]}
              style={{
                width: 120,
                height: 120,
                borderRadius: 60,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 24,
                shadowColor: "#F472B6",
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.4,
                shadowRadius: 24,
                elevation: 10,
              }}
            >
              <Flame size={56} color="#FFFFFF" fill="#FFFFFF" />
            </LinearGradient>
            <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 40, color: theme.text.primary }}>
              {streakToShow}
            </Text>
            <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 20, color: theme.primary.DEFAULT, marginTop: 4 }}>
              day streak
            </Text>
            <Text
              style={{
                fontFamily: "Quicksand-Medium",
                fontSize: 16,
                color: theme.text.secondary,
                textAlign: "center",
                marginTop: 16,
                lineHeight: 24,
              }}
            >
              {done
                ? "Beautiful. You showed up for yourself today."
                : "You've already checked in today. See you tomorrow!"}
            </Text>
            <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 13, color: theme.text.muted, marginTop: 8 }}>
              Longest streak: {Math.max(longestStreak, streakToShow)} days
            </Text>
          </Animated.View>

          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.85}
            style={{ marginTop: 40, width: "100%" }}
          >
            <LinearGradient
              colors={["#FB923C", "#F472B6"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ borderRadius: 16, paddingVertical: 16, alignItems: "center" }}
            >
              <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 17, color: "#FFFFFF" }}>Done</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  const steps = [
    { icon: Sun, title: "How are you feeling?", subtitle: "Be honest — there's no wrong answer." },
    { icon: Heart, title: "One thing you're grateful for", subtitle: "Big or small, it all counts." },
    { icon: Sparkles, title: "Set an intention for today", subtitle: "What do you want to carry with you?" },
  ];
  const StepIcon = steps[step].icon;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={{ paddingTop: 60, paddingHorizontal: 24, flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: theme.surface,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: isDark ? 1 : 0,
              borderColor: theme.border,
            }}
          >
            <ChevronLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 22, color: theme.text.primary }}>
              Daily Check-in
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
              <Flame size={14} color={theme.primary.DEFAULT} />
              <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 13, color: theme.text.secondary }}>
                {currentStreak} day streak
              </Text>
            </View>
          </View>
        </View>

        {/* Progress bar */}
        <View style={{ paddingHorizontal: 24, marginTop: 24 }}>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.surfaceAlt, overflow: "hidden" }}>
            <Animated.View
              style={{
                height: 6,
                borderRadius: 3,
                backgroundColor: theme.primary.DEFAULT,
                width: progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
              }}
            />
          </View>
          <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 12, color: theme.text.muted, marginTop: 8 }}>
            Step {step + 1} of 3
          </Text>
        </View>

        {/* Step content */}
        <View style={{ paddingHorizontal: 24, marginTop: 32 }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 18,
              backgroundColor: theme.primary.DEFAULT + "22",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <StepIcon size={28} color={theme.primary.DEFAULT} />
          </View>
          <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 26, color: theme.text.primary }}>
            {steps[step].title}
          </Text>
          <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 15, color: theme.text.secondary, marginTop: 6 }}>
            {steps[step].subtitle}
          </Text>

          {step === 0 && (
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 28 }}>
              {MOODS.map((m, i) => {
                const selected = mood === i;
                return (
                  <TouchableOpacity
                    key={m.label}
                    activeOpacity={0.85}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setMood(i);
                    }}
                    style={{ alignItems: "center", gap: 8 }}
                  >
                    <View
                      style={{
                        width: 58,
                        height: 58,
                        borderRadius: 29,
                        backgroundColor: selected ? m.color : theme.surfaceAlt,
                        alignItems: "center",
                        justifyContent: "center",
                        borderWidth: selected ? 0 : 1,
                        borderColor: theme.border,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "Quicksand-Bold",
                          fontSize: 13,
                          color: selected ? "#FFFFFF" : theme.text.secondary,
                        }}
                      >
                        {m.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {step >= 1 && (
            <TextInput
              value={step === 1 ? gratitude : intention}
              onChangeText={step === 1 ? setGratitude : setIntention}
              placeholder={step === 1 ? "I'm grateful for..." : "Today, I will..."}
              placeholderTextColor={theme.text.muted}
              multiline
              style={{
                marginTop: 24,
                minHeight: 120,
                backgroundColor: theme.surface,
                borderRadius: 16,
                padding: 18,
                fontFamily: "Quicksand-Medium",
                fontSize: 16,
                color: theme.text.primary,
                textAlignVertical: "top",
                borderWidth: 1.5,
                borderColor: theme.border,
              }}
            />
          )}
        </View>
      </ScrollView>

      {/* Footer action */}
      <View style={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        <TouchableOpacity onPress={next} disabled={!canAdvance} activeOpacity={0.85}>
          <LinearGradient
            colors={canAdvance ? ["#FB923C", "#F472B6"] : [theme.surfaceAlt, theme.surfaceAlt]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ borderRadius: 16, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            {step === 2 && <Check size={20} color={canAdvance ? "#FFFFFF" : theme.text.muted} />}
            <Text
              style={{
                fontFamily: "Quicksand-Bold",
                fontSize: 17,
                color: canAdvance ? "#FFFFFF" : theme.text.muted,
              }}
            >
              {step === 2 ? "Complete Check-in" : "Continue"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}
