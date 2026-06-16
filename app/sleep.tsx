import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import {
  ChevronLeft,
  Moon,
  Star,
  Sun,
  Baby,
  Clock,
  TrendingUp,
  Lightbulb,
  Plus,
  Minus,
} from "lucide-react-native";
import { colors, gradients } from "../lib/theme";
import { useMilestoneStore } from "../lib/stores/milestone-store";

const { width } = Dimensions.get("window");

// Local types
interface SleepEntry {
  date: string;
  bedtime: string;
  wakeTime: string;
  hours: number;
  quality: number;
  factors: string[];
}

interface BabySleep {
  lastNightHours: number;
  napsToday: number;
  napDuration: number;
  quality: "rough" | "okay" | "great";
}

export default function SleepTrackerScreen() {
  const router = useRouter();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Mom's sleep state
  const [selectedBedtime, setSelectedBedtime] = useState<string | null>(null);
  const [selectedWakeTime, setSelectedWakeTime] = useState<string | null>(null);
  const [sleepQuality, setSleepQuality] = useState(0);
  const [sleepFactors, setSleepFactors] = useState<string[]>([]);

  // Baby's sleep state
  const babyName = useMilestoneStore((s) => s.baby.name) || "Baby";
  const [babySleep, setBabySleep] = useState<BabySleep>({
    lastNightHours: 8,
    napsToday: 2,
    napDuration: 1.5,
    quality: "okay",
  });

  // Mock 7-day history
  const [sleepHistory] = useState([
    { day: "Mon", hours: 6.5, date: "2026-04-13" },
    { day: "Tue", hours: 7, date: "2026-04-14" },
    { day: "Wed", hours: 5, date: "2026-04-15" },
    { day: "Thu", hours: 8, date: "2026-04-16" },
    { day: "Fri", hours: 6, date: "2026-04-17" },
    { day: "Sat", hours: 7.5, date: "2026-04-18" },
    { day: "Sun", hours: 6.5, date: "2026-04-19" },
  ]);

  const bedtimeOptions = ["9pm", "10pm", "11pm", "12am", "1am"];
  const wakeTimeOptions = ["4am", "5am", "6am", "7am", "8am"];

  const sleepFactorOptions = [
    "Woke up at night",
    "Had coffee after 3pm",
    "Exercised today",
    "Stressed",
    "Baby slept well",
  ];

  const sleepTips = [
    {
      icon: Moon,
      tip: "Avoid screens 1 hour before bed",
    },
    {
      icon: Clock,
      tip: "Cool room = better sleep (65-68°F)",
    },
    {
      icon: Sun,
      tip: "Try a 4-7-8 breathing exercise",
    },
    {
      icon: TrendingUp,
      tip: "Consistent bedtime matters more than duration",
    },
    {
      icon: Lightbulb,
      tip: "A warm bath 1 hour before bed deepens sleep",
    },
  ];

  // Pulse animation for moon
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Calculate sleep duration
  const calculateDuration = (): number | null => {
    if (!selectedBedtime || !selectedWakeTime) return null;

    const bedtimeMap: { [key: string]: number } = {
      "9pm": 21,
      "10pm": 22,
      "11pm": 23,
      "12am": 24,
      "1am": 25,
    };

    const wakeTimeMap: { [key: string]: number } = {
      "4am": 28,
      "5am": 29,
      "6am": 30,
      "7am": 31,
      "8am": 32,
    };

    const bedHour = bedtimeMap[selectedBedtime];
    const wakeHour = wakeTimeMap[selectedWakeTime];
    return wakeHour - bedHour;
  };

  const duration = calculateDuration();

  const getDurationColor = (hours: number | null) => {
    if (hours === null) return colors.text.muted;
    if (hours >= 7) return colors.secondary[500];
    if (hours >= 5) return colors.warning;
    return colors.error;
  };

  const getBarColor = (hours: number): readonly [string, string] => {
    if (hours >= 7) return [colors.accent[400], colors.accent[500]];
    if (hours >= 5) return [colors.warning, "#F59E0B"];
    return [colors.primary[400], colors.primary[500]];
  };

  const avgSleep =
    sleepHistory.reduce((acc, entry) => acc + entry.hours, 0) / sleepHistory.length;
  const sleepScore = Math.round((avgSleep / 8) * 100);

  const toggleFactor = (factor: string) => {
    Haptics.selectionAsync();
    setSleepFactors((prev) =>
      prev.includes(factor) ? prev.filter((f) => f !== factor) : [...prev, factor]
    );
  };

  const handleLogSleep = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // In real app, save to store
    console.log("Logging sleep:", {
      bedtime: selectedBedtime,
      wakeTime: selectedWakeTime,
      duration,
      quality: sleepQuality,
      factors: sleepFactors,
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient
          colors={gradients.calmingEvening}
          style={{ paddingTop: 56, paddingBottom: 24, paddingHorizontal: 24 }}
        >
          {/* Top Bar */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
            }}
          >
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "rgba(255,255,255,0.5)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ChevronLeft size={20} color={colors.text.primary} />
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text
                style={{
                  fontFamily: "Quicksand-Bold",
                  fontSize: 20,
                  color: colors.text.primary,
                }}
              >
                Sleep Tracker
              </Text>
              <Text
                style={{
                  fontFamily: "Quicksand-Medium",
                  fontSize: 13,
                  color: colors.text.secondary,
                  marginTop: 2,
                }}
              >
                Rest is your superpower
              </Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          {/* Moon & Stars Visual */}
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <View style={{ position: "relative", width: 80, height: 80 }}>
              <Animated.View
                style={{
                  position: "absolute",
                  width: 60,
                  height: 60,
                  left: 10,
                  top: 10,
                  transform: [{ scale: pulseAnim }],
                }}
              >
                <View
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 30,
                    backgroundColor: colors.accent[100],
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Moon size={30} color={colors.accent[500]} />
                </View>
              </Animated.View>
              {/* Stars around moon */}
              <View style={{ position: "absolute", top: 5, right: 10 }}>
                <Star size={12} color={colors.accent[300]} fill={colors.accent[200]} />
              </View>
              <View style={{ position: "absolute", bottom: 8, left: 5 }}>
                <Star size={10} color={colors.accent[300]} fill={colors.accent[200]} />
              </View>
              <View style={{ position: "absolute", top: 30, right: 0 }}>
                <Star size={8} color={colors.accent[300]} fill={colors.accent[200]} />
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={{ paddingHorizontal: 24 }}>
          {/* Sleep Score Card */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 20,
              padding: 24,
              marginTop: -20,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.08,
              shadowRadius: 16,
              elevation: 4,
              marginBottom: 20,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontFamily: "Quicksand-SemiBold",
                fontSize: 14,
                color: colors.text.secondary,
                marginBottom: 12,
              }}
            >
              Your Sleep Score
            </Text>
            <View
              style={{
                width: 120,
                height: 120,
                borderRadius: 60,
                borderWidth: 8,
                borderColor:
                  sleepScore >= 75
                    ? colors.secondary[400]
                    : sleepScore >= 50
                    ? colors.warning
                    : colors.error,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.bg,
              }}
            >
              <Text
                style={{
                  fontFamily: "Quicksand-Bold",
                  fontSize: 36,
                  color: colors.text.primary,
                }}
              >
                {sleepScore}
              </Text>
              <Text
                style={{
                  fontFamily: "Quicksand-Medium",
                  fontSize: 12,
                  color: colors.text.muted,
                }}
              >
                /100
              </Text>
            </View>
            <Text
              style={{
                fontFamily: "Quicksand-Medium",
                fontSize: 13,
                color: colors.text.secondary,
                marginTop: 12,
                textAlign: "center",
              }}
            >
              Based on 7-day average of {avgSleep.toFixed(1)} hours
            </Text>
          </View>

          {/* Log Last Night Section */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 20,
              padding: 20,
              marginBottom: 20,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <Text
              style={{
                fontFamily: "Quicksand-Bold",
                fontSize: 18,
                color: colors.text.primary,
                marginBottom: 16,
              }}
            >
              Log Last Night
            </Text>

            {/* Bedtime Picker */}
            <Text
              style={{
                fontFamily: "Quicksand-SemiBold",
                fontSize: 13,
                color: colors.text.secondary,
                marginBottom: 10,
              }}
            >
              Bedtime
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 16 }}
            >
              <View style={{ flexDirection: "row", gap: 8 }}>
                {bedtimeOptions.map((time) => {
                  const isSelected = selectedBedtime === time;
                  return (
                    <TouchableOpacity
                      key={time}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSelectedBedtime(time);
                      }}
                      style={{
                        paddingHorizontal: 20,
                        paddingVertical: 12,
                        borderRadius: 999,
                        backgroundColor: isSelected ? colors.accent[500] : colors.bg,
                        borderWidth: 1.5,
                        borderColor: isSelected ? colors.accent[500] : "#E5E7EB",
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "Quicksand-SemiBold",
                          fontSize: 14,
                          color: isSelected ? colors.surface : colors.text.primary,
                        }}
                      >
                        {time}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Wake Time Picker */}
            <Text
              style={{
                fontFamily: "Quicksand-SemiBold",
                fontSize: 13,
                color: colors.text.secondary,
                marginBottom: 10,
              }}
            >
              Wake Time
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 16 }}
            >
              <View style={{ flexDirection: "row", gap: 8 }}>
                {wakeTimeOptions.map((time) => {
                  const isSelected = selectedWakeTime === time;
                  return (
                    <TouchableOpacity
                      key={time}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSelectedWakeTime(time);
                      }}
                      style={{
                        paddingHorizontal: 20,
                        paddingVertical: 12,
                        borderRadius: 999,
                        backgroundColor: isSelected ? colors.accent[500] : colors.bg,
                        borderWidth: 1.5,
                        borderColor: isSelected ? colors.accent[500] : "#E5E7EB",
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "Quicksand-SemiBold",
                          fontSize: 14,
                          color: isSelected ? colors.surface : colors.text.primary,
                        }}
                      >
                        {time}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Duration Display */}
            {duration !== null && (
              <View
                style={{
                  backgroundColor: colors.bg,
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 16,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontFamily: "Quicksand-SemiBold",
                    fontSize: 13,
                    color: colors.text.secondary,
                    marginBottom: 4,
                  }}
                >
                  Sleep Duration
                </Text>
                <Text
                  style={{
                    fontFamily: "Quicksand-Bold",
                    fontSize: 32,
                    color: getDurationColor(duration),
                  }}
                >
                  {duration} {duration === 1 ? "hour" : "hours"}
                </Text>
              </View>
            )}

            {/* Sleep Quality */}
            <Text
              style={{
                fontFamily: "Quicksand-SemiBold",
                fontSize: 13,
                color: colors.text.secondary,
                marginBottom: 10,
              }}
            >
              Sleep Quality
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSleepQuality(star);
                  }}
                >
                  <Star
                    size={32}
                    color={star <= sleepQuality ? colors.accent[500] : colors.text.muted}
                    fill={star <= sleepQuality ? colors.accent[500] : "transparent"}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* Sleep Factors */}
            <Text
              style={{
                fontFamily: "Quicksand-SemiBold",
                fontSize: 13,
                color: colors.text.secondary,
                marginBottom: 10,
              }}
            >
              Sleep Factors
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
              {sleepFactorOptions.map((factor) => {
                const isSelected = sleepFactors.includes(factor);
                return (
                  <TouchableOpacity
                    key={factor}
                    onPress={() => toggleFactor(factor)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 999,
                      backgroundColor: isSelected ? colors.accent[100] : colors.bg,
                      borderWidth: 1.5,
                      borderColor: isSelected ? colors.accent[500] : "#E5E7EB",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Quicksand-SemiBold",
                        fontSize: 12,
                        color: isSelected ? colors.accent[500] : colors.text.secondary,
                      }}
                    >
                      {factor}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Log Button */}
            <TouchableOpacity
              onPress={handleLogSleep}
              activeOpacity={0.9}
              disabled={!duration || sleepQuality === 0}
              style={{ borderRadius: 16, overflow: "hidden" }}
            >
              <LinearGradient
                colors={gradients.violetDream}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  paddingVertical: 16,
                  alignItems: "center",
                  opacity: !duration || sleepQuality === 0 ? 0.5 : 1,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Quicksand-Bold",
                    fontSize: 16,
                    color: colors.accent[500],
                  }}
                >
                  Log Sleep
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Baby's Sleep Section */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 20,
              padding: 20,
              marginBottom: 20,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Baby size={20} color={colors.primary[500]} />
              <Text
                style={{
                  fontFamily: "Quicksand-Bold",
                  fontSize: 18,
                  color: colors.text.primary,
                }}
              >
                {babyName}'s Sleep
              </Text>
            </View>

            {/* Last Night Hours */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
                paddingBottom: 16,
                borderBottomWidth: 1,
                borderBottomColor: "#F3F4F6",
              }}
            >
              <Text
                style={{
                  fontFamily: "Quicksand-SemiBold",
                  fontSize: 14,
                  color: colors.text.secondary,
                }}
              >
                Last Night
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.selectionAsync();
                    setBabySleep((prev) => ({
                      ...prev,
                      lastNightHours: Math.max(0, prev.lastNightHours - 0.5),
                    }));
                  }}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: colors.bg,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Minus size={16} color={colors.text.primary} />
                </TouchableOpacity>
                <Text
                  style={{
                    fontFamily: "Quicksand-Bold",
                    fontSize: 18,
                    color: colors.text.primary,
                    minWidth: 60,
                    textAlign: "center",
                  }}
                >
                  {babySleep.lastNightHours}h
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.selectionAsync();
                    setBabySleep((prev) => ({
                      ...prev,
                      lastNightHours: Math.min(16, prev.lastNightHours + 0.5),
                    }));
                  }}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: colors.bg,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Plus size={16} color={colors.text.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Naps Today */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
                paddingBottom: 16,
                borderBottomWidth: 1,
                borderBottomColor: "#F3F4F6",
              }}
            >
              <Text
                style={{
                  fontFamily: "Quicksand-SemiBold",
                  fontSize: 14,
                  color: colors.text.secondary,
                }}
              >
                Naps Today
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.selectionAsync();
                    setBabySleep((prev) => ({
                      ...prev,
                      napsToday: Math.max(0, prev.napsToday - 1),
                    }));
                  }}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: colors.bg,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Minus size={16} color={colors.text.primary} />
                </TouchableOpacity>
                <Text
                  style={{
                    fontFamily: "Quicksand-Bold",
                    fontSize: 18,
                    color: colors.text.primary,
                    minWidth: 60,
                    textAlign: "center",
                  }}
                >
                  {babySleep.napsToday}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.selectionAsync();
                    setBabySleep((prev) => ({
                      ...prev,
                      napsToday: Math.min(5, prev.napsToday + 1),
                    }));
                  }}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: colors.bg,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Plus size={16} color={colors.text.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Nap Duration */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
                paddingBottom: 16,
                borderBottomWidth: 1,
                borderBottomColor: "#F3F4F6",
              }}
            >
              <Text
                style={{
                  fontFamily: "Quicksand-SemiBold",
                  fontSize: 14,
                  color: colors.text.secondary,
                }}
              >
                Total Nap Duration
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.selectionAsync();
                    setBabySleep((prev) => ({
                      ...prev,
                      napDuration: Math.max(0, prev.napDuration - 0.5),
                    }));
                  }}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: colors.bg,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Minus size={16} color={colors.text.primary} />
                </TouchableOpacity>
                <Text
                  style={{
                    fontFamily: "Quicksand-Bold",
                    fontSize: 18,
                    color: colors.text.primary,
                    minWidth: 60,
                    textAlign: "center",
                  }}
                >
                  {babySleep.napDuration}h
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.selectionAsync();
                    setBabySleep((prev) => ({
                      ...prev,
                      napDuration: Math.min(3, prev.napDuration + 0.5),
                    }));
                  }}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: colors.bg,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Plus size={16} color={colors.text.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Quality Buttons */}
            <Text
              style={{
                fontFamily: "Quicksand-SemiBold",
                fontSize: 14,
                color: colors.text.secondary,
                marginBottom: 10,
              }}
            >
              Night Quality
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {(["rough", "okay", "great"] as const).map((quality) => {
                const isSelected = babySleep.quality === quality;
                const bgColor =
                  quality === "rough"
                    ? colors.error
                    : quality === "okay"
                    ? colors.warning
                    : colors.secondary[500];
                return (
                  <TouchableOpacity
                    key={quality}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setBabySleep((prev) => ({ ...prev, quality }));
                    }}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 12,
                      backgroundColor: isSelected ? bgColor : colors.bg,
                      borderWidth: 1.5,
                      borderColor: isSelected ? bgColor : "#E5E7EB",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Quicksand-Bold",
                        fontSize: 14,
                        color: isSelected ? colors.surface : colors.text.secondary,
                        textTransform: "capitalize",
                      }}
                    >
                      {quality}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 7-Night Sleep History Chart */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 20,
              padding: 20,
              marginBottom: 20,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  fontFamily: "Quicksand-Bold",
                  fontSize: 18,
                  color: colors.text.primary,
                }}
              >
                This Week's Sleep
              </Text>
              <View
                style={{
                  backgroundColor: colors.secondary[50],
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 999,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Quicksand-Bold",
                    fontSize: 12,
                    color: colors.secondary[500],
                  }}
                >
                  Avg: {avgSleep.toFixed(1)} hrs
                </Text>
              </View>
            </View>

            {/* Chart */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-end",
                height: 200,
                paddingTop: 20,
              }}
            >
              {sleepHistory.map((entry) => {
                const barHeight = (entry.hours / 10) * 100; // Max 10h = 100% height
                const barColors = getBarColor(entry.hours);
                return (
                  <View
                    key={entry.date}
                    style={{
                      flex: 1,
                      alignItems: "center",
                      justifyContent: "flex-end",
                      marginHorizontal: 3,
                    }}
                  >
                    {/* Hours label on top */}
                    <Text
                      style={{
                        fontFamily: "Quicksand-Bold",
                        fontSize: 11,
                        color: colors.text.primary,
                        marginBottom: 4,
                      }}
                    >
                      {entry.hours}h
                    </Text>
                    {/* Bar */}
                    <LinearGradient
                      colors={barColors}
                      style={{
                        width: "100%",
                        height: `${barHeight}%`,
                        borderRadius: 8,
                        minHeight: 20,
                      }}
                    />
                    {/* Day label */}
                    <Text
                      style={{
                        fontFamily: "Quicksand-Medium",
                        fontSize: 11,
                        color: colors.text.muted,
                        marginTop: 6,
                      }}
                    >
                      {entry.day}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Sleep Tips Section */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontFamily: "Quicksand-Bold",
                fontSize: 18,
                color: colors.text.primary,
                marginBottom: 12,
              }}
            >
              Sleep Tips
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 12 }}>
                {sleepTips.map((tip, index) => (
                  <LinearGradient
                    key={index}
                    colors={gradients.violetDream}
                    style={{
                      width: 200,
                      padding: 16,
                      borderRadius: 20,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.06,
                      shadowRadius: 8,
                      elevation: 2,
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: colors.accent[100],
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 12,
                      }}
                    >
                      <tip.icon size={20} color={colors.accent[500]} />
                    </View>
                    <Text
                      style={{
                        fontFamily: "Quicksand-SemiBold",
                        fontSize: 14,
                        color: colors.accent[500],
                        lineHeight: 20,
                      }}
                    >
                      {tip.tip}
                    </Text>
                  </LinearGradient>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>

        {/* Bottom padding */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}
