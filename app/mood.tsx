import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import {
  ChevronLeft,
  Droplets,
  Moon,
  Zap,
  Flame,
  Plus,
  Minus,
  CheckCircle,
} from "lucide-react-native";
import { useMoodStore } from "../lib/stores/mood-store";
import {
  moodLabels,
  energyLabels,
  moodTags,
  getMoodStats,
  getWeeklyMoodData,
  MoodEntry,
  MoodLevel,
  EnergyLevel,
} from "../lib/mock-mood";
import { colors, gradients, shadows, radius, spacing } from "../lib/theme";

const { width } = Dimensions.get("window");

export default function MoodScreen() {
  const router = useRouter();
  const { entries, streak, loadEntries, addEntry, getTodayEntry, isLoaded } =
    useMoodStore();

  // Check-in form state
  const [selectedMood, setSelectedMood] = useState<MoodLevel | null>(null);
  const [selectedEnergy, setSelectedEnergy] = useState<EnergyLevel | null>(null);
  const [sleepHours, setSleepHours] = useState(7);
  const [waterGlasses, setWaterGlasses] = useState(4);
  const [exercised, setExercised] = useState(false);
  const [note, setNote] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    loadEntries();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      // Check if there's already an entry for today
      const todayEntry = getTodayEntry();
      if (todayEntry) {
        // Pre-fill form with today's entry
        setSelectedMood(todayEntry.mood);
        setSelectedEnergy(todayEntry.energy);
        setSleepHours(todayEntry.sleepHours);
        setWaterGlasses(todayEntry.waterGlasses);
        setExercised(todayEntry.exercised);
        setNote(todayEntry.note || "");
        setSelectedTags(todayEntry.tags);
      }

      // Entrance animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isLoaded]);

  const todayEntry = getTodayEntry();
  const last7DaysEntries = entries.slice(0, 7);
  const stats = getMoodStats(last7DaysEntries);
  const weeklyData = getWeeklyMoodData(entries);
  const recentEntries = entries.slice(0, 5);

  const handleSaveCheckIn = async () => {
    if (!selectedMood || !selectedEnergy) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const newEntry: MoodEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      mood: selectedMood,
      energy: selectedEnergy,
      sleepHours,
      waterGlasses,
      exercised,
      note: note.trim(),
      tags: selectedTags,
    };

    try {
      await addEntry(newEntry);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Error saving mood entry:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleTag = (tag: string) => {
    Haptics.selectionAsync();
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const adjustSleep = (delta: number) => {
    Haptics.selectionAsync();
    setSleepHours(Math.max(0, Math.min(12, sleepHours + delta)));
  };

  const adjustWater = (delta: number) => {
    Haptics.selectionAsync();
    setWaterGlasses(Math.max(0, Math.min(8, waterGlasses + delta)));
  };

  const selectMood = (mood: MoodLevel) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMood(mood);
  };

  const selectEnergy = (energy: EnergyLevel) => {
    Haptics.selectionAsync();
    setSelectedEnergy(energy);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  const getStreakMessage = (streakCount: number) => {
    if (streakCount === 0) return "Start your wellness streak today!";
    if (streakCount === 1) return "Great start! Keep it up!";
    if (streakCount < 7) return "You're building momentum!";
    if (streakCount < 14) return "Amazing consistency!";
    if (streakCount < 30) return "You're on fire!";
    return "Legendary streak!";
  };

  if (!isLoaded) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontFamily: "Quicksand-Medium",
            fontSize: 16,
            color: colors.text.secondary,
          }}
        >
          Loading...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <LinearGradient
        colors={gradients.warmMorning}
        style={{
          paddingTop: Platform.OS === "ios" ? 60 : 40,
          paddingBottom: spacing.lg,
          paddingHorizontal: spacing.lg,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            style={{
              marginRight: spacing.md,
              padding: spacing.sm,
            }}
          >
            <ChevronLeft size={28} color={colors.text.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: "Quicksand-Bold",
                fontSize: 28,
                color: colors.text.primary,
                marginBottom: 4,
              }}
            >
              Mood Check-In
            </Text>
            <Text
              style={{
                fontFamily: "Quicksand-Medium",
                fontSize: 15,
                color: colors.text.secondary,
              }}
            >
              How are you feeling today?
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: spacing.lg,
          paddingBottom: 40,
          paddingHorizontal: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          {/* Check-in Form Card */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.lg,
              padding: spacing.lg,
              marginBottom: spacing.lg,
              ...shadows.medium,
            }}
          >
            {/* Mood Selector */}
            <Text
              style={{
                fontFamily: "Quicksand-SemiBold",
                fontSize: 16,
                color: colors.text.primary,
                marginBottom: spacing.md,
              }}
            >
              How's your mood?
            </Text>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: spacing.lg,
              }}
            >
              {(Object.keys(moodLabels) as Array<keyof typeof moodLabels>).map(
                (moodKey) => {
                  const mood = parseInt(moodKey) as MoodLevel;
                  const moodData = moodLabels[mood];
                  const isSelected = selectedMood === mood;

                  return (
                    <TouchableOpacity
                      key={mood}
                      onPress={() => selectMood(mood)}
                      style={{
                        alignItems: "center",
                        padding: spacing.sm,
                        borderRadius: radius.lg,
                        backgroundColor: isSelected
                          ? moodData.color + "15"
                          : "transparent",
                        borderWidth: isSelected ? 2 : 1,
                        borderColor: isSelected
                          ? moodData.color
                          : colors.text.muted + "30",
                        width: (width - spacing.lg * 2 - spacing.lg * 2 - spacing.sm * 4) / 5,
                        transform: [{ scale: isSelected ? 1.05 : 1 }],
                      }}
                    >
                      <Text style={{ fontSize: 32, marginBottom: 4 }}>
                        {moodData.emoji}
                      </Text>
                      <Text
                        style={{
                          fontFamily: "Quicksand-SemiBold",
                          fontSize: 11,
                          color: isSelected ? moodData.color : colors.text.secondary,
                          textAlign: "center",
                        }}
                      >
                        {moodData.label}
                      </Text>
                    </TouchableOpacity>
                  );
                }
              )}
            </View>

            {/* Energy Level */}
            <Text
              style={{
                fontFamily: "Quicksand-SemiBold",
                fontSize: 16,
                color: colors.text.primary,
                marginBottom: spacing.md,
              }}
            >
              Energy level
            </Text>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: spacing.lg,
              }}
            >
              {(
                Object.keys(energyLabels) as Array<keyof typeof energyLabels>
              ).map((energyKey) => {
                const energy = parseInt(energyKey) as EnergyLevel;
                const energyData = energyLabels[energy];
                const isSelected = selectedEnergy === energy;

                return (
                  <TouchableOpacity
                    key={energy}
                    onPress={() => selectEnergy(energy)}
                    style={{
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                      borderRadius: radius.pill,
                      backgroundColor: isSelected
                        ? energyData.color
                        : colors.bg,
                      borderWidth: 1,
                      borderColor: isSelected
                        ? energyData.color
                        : colors.text.muted + "30",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Quicksand-SemiBold",
                        fontSize: 12,
                        color: isSelected ? colors.surface : colors.text.secondary,
                      }}
                    >
                      {energyData.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Sleep Hours */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: spacing.lg,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Moon size={20} color={colors.accent.DEFAULT} />
                <Text
                  style={{
                    fontFamily: "Quicksand-SemiBold",
                    fontSize: 16,
                    color: colors.text.primary,
                    marginLeft: spacing.sm,
                  }}
                >
                  Sleep
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <TouchableOpacity
                  onPress={() => adjustSleep(-0.5)}
                  style={{
                    backgroundColor: colors.bg,
                    borderRadius: radius.pill,
                    padding: spacing.sm,
                  }}
                >
                  <Minus size={16} color={colors.text.primary} />
                </TouchableOpacity>
                <Text
                  style={{
                    fontFamily: "Quicksand-Bold",
                    fontSize: 18,
                    color: colors.text.primary,
                    marginHorizontal: spacing.base,
                    minWidth: 70,
                    textAlign: "center",
                  }}
                >
                  {sleepHours} hrs
                </Text>
                <TouchableOpacity
                  onPress={() => adjustSleep(0.5)}
                  style={{
                    backgroundColor: colors.bg,
                    borderRadius: radius.pill,
                    padding: spacing.sm,
                  }}
                >
                  <Plus size={16} color={colors.text.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Water Glasses */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: spacing.lg,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Droplets size={20} color={colors.secondary.DEFAULT} />
                <Text
                  style={{
                    fontFamily: "Quicksand-SemiBold",
                    fontSize: 16,
                    color: colors.text.primary,
                    marginLeft: spacing.sm,
                  }}
                >
                  Water
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <TouchableOpacity
                  onPress={() => adjustWater(-1)}
                  style={{
                    backgroundColor: colors.bg,
                    borderRadius: radius.pill,
                    padding: spacing.sm,
                  }}
                >
                  <Minus size={16} color={colors.text.primary} />
                </TouchableOpacity>
                <Text
                  style={{
                    fontFamily: "Quicksand-Bold",
                    fontSize: 18,
                    color: colors.text.primary,
                    marginHorizontal: spacing.base,
                    minWidth: 70,
                    textAlign: "center",
                  }}
                >
                  {waterGlasses} glasses
                </Text>
                <TouchableOpacity
                  onPress={() => adjustWater(1)}
                  style={{
                    backgroundColor: colors.bg,
                    borderRadius: radius.pill,
                    padding: spacing.sm,
                  }}
                >
                  <Plus size={16} color={colors.text.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Exercise Toggle */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: spacing.lg,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Zap size={20} color={colors.primary.DEFAULT} />
                <Text
                  style={{
                    fontFamily: "Quicksand-SemiBold",
                    fontSize: 16,
                    color: colors.text.primary,
                    marginLeft: spacing.sm,
                  }}
                >
                  Exercise
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: spacing.sm }}>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.selectionAsync();
                    setExercised(false);
                  }}
                  style={{
                    paddingHorizontal: spacing.base,
                    paddingVertical: spacing.sm,
                    borderRadius: radius.pill,
                    backgroundColor: !exercised
                      ? colors.text.muted + "20"
                      : colors.bg,
                    borderWidth: 1,
                    borderColor: !exercised
                      ? colors.text.secondary
                      : colors.text.muted + "30",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Quicksand-SemiBold",
                      fontSize: 14,
                      color: colors.text.primary,
                    }}
                  >
                    No
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.selectionAsync();
                    setExercised(true);
                  }}
                  style={{
                    paddingHorizontal: spacing.base,
                    paddingVertical: spacing.sm,
                    borderRadius: radius.pill,
                    backgroundColor: exercised
                      ? colors.primary.DEFAULT
                      : colors.bg,
                    borderWidth: 1,
                    borderColor: exercised
                      ? colors.primary.DEFAULT
                      : colors.text.muted + "30",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Quicksand-SemiBold",
                      fontSize: 14,
                      color: exercised ? colors.surface : colors.text.primary,
                    }}
                  >
                    Yes
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Note Input */}
            <Text
              style={{
                fontFamily: "Quicksand-SemiBold",
                fontSize: 16,
                color: colors.text.primary,
                marginBottom: spacing.sm,
              }}
            >
              Notes
            </Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="How are you feeling? Any thoughts..."
              placeholderTextColor={colors.text.muted}
              multiline
              numberOfLines={3}
              style={{
                backgroundColor: colors.bg,
                borderRadius: radius.card,
                padding: spacing.md,
                fontFamily: "Quicksand-Medium",
                fontSize: 15,
                color: colors.text.primary,
                minHeight: 80,
                textAlignVertical: "top",
                marginBottom: spacing.lg,
              }}
            />

            {/* Tags */}
            <Text
              style={{
                fontFamily: "Quicksand-SemiBold",
                fontSize: 16,
                color: colors.text.primary,
                marginBottom: spacing.md,
              }}
            >
              Tags
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: spacing.sm,
                marginBottom: spacing.lg,
              }}
            >
              {moodTags.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    onPress={() => toggleTag(tag)}
                    style={{
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                      borderRadius: radius.pill,
                      backgroundColor: isSelected
                        ? colors.accent.DEFAULT + "15"
                        : "transparent",
                      borderWidth: 1.5,
                      borderColor: isSelected
                        ? colors.accent.DEFAULT
                        : colors.text.muted + "40",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Quicksand-SemiBold",
                        fontSize: 13,
                        color: isSelected
                          ? colors.accent.DEFAULT
                          : colors.text.secondary,
                      }}
                    >
                      {tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Save Button */}
            <TouchableOpacity
              onPress={handleSaveCheckIn}
              disabled={!selectedMood || !selectedEnergy || isSaving}
              style={{
                opacity: !selectedMood || !selectedEnergy || isSaving ? 0.5 : 1,
              }}
            >
              <LinearGradient
                colors={[colors.primary[400], colors.primary[500]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  paddingVertical: spacing.base,
                  borderRadius: radius.lg,
                  alignItems: "center",
                  ...shadows.soft,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Quicksand-Bold",
                    fontSize: 16,
                    color: colors.surface,
                  }}
                >
                  {isSaving
                    ? "Saving..."
                    : todayEntry
                    ? "Update Check-In"
                    : "Save Check-In"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Wellness Stats */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.lg,
              padding: spacing.lg,
              marginBottom: spacing.lg,
              ...shadows.soft,
            }}
          >
            <Text
              style={{
                fontFamily: "Quicksand-Bold",
                fontSize: 18,
                color: colors.text.primary,
                marginBottom: spacing.base,
              }}
            >
              7-Day Wellness Stats
            </Text>

            {/* Mini Stat Cards */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: spacing.lg,
              }}
            >
              {/* Avg Mood */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: colors.bg,
                  borderRadius: radius.card,
                  padding: spacing.md,
                  marginRight: spacing.sm,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 28,
                    marginBottom: 4,
                  }}
                >
                  {stats.totalEntries > 0
                    ? moodLabels[Math.round(stats.avgMood) as MoodLevel].emoji
                    : "—"}
                </Text>
                <Text
                  style={{
                    fontFamily: "Quicksand-Bold",
                    fontSize: 16,
                    color: colors.text.primary,
                  }}
                >
                  {stats.totalEntries > 0 ? stats.avgMood.toFixed(1) : "—"}
                </Text>
                <Text
                  style={{
                    fontFamily: "Quicksand-Medium",
                    fontSize: 11,
                    color: colors.text.secondary,
                  }}
                >
                  Mood
                </Text>
              </View>

              {/* Avg Energy */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: colors.bg,
                  borderRadius: radius.card,
                  padding: spacing.md,
                  marginRight: spacing.sm,
                  alignItems: "center",
                }}
              >
                <Zap size={20} color={colors.primary.DEFAULT} />
                <Text
                  style={{
                    fontFamily: "Quicksand-Bold",
                    fontSize: 16,
                    color: colors.text.primary,
                    marginTop: 4,
                  }}
                >
                  {stats.totalEntries > 0 ? stats.avgEnergy.toFixed(1) : "—"}
                </Text>
                <Text
                  style={{
                    fontFamily: "Quicksand-Medium",
                    fontSize: 11,
                    color: colors.text.secondary,
                  }}
                >
                  Energy
                </Text>
              </View>

              {/* Avg Sleep */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: colors.bg,
                  borderRadius: radius.card,
                  padding: spacing.md,
                  marginRight: spacing.sm,
                  alignItems: "center",
                }}
              >
                <Moon size={20} color={colors.accent.DEFAULT} />
                <Text
                  style={{
                    fontFamily: "Quicksand-Bold",
                    fontSize: 16,
                    color: colors.text.primary,
                    marginTop: 4,
                  }}
                >
                  {stats.totalEntries > 0 ? stats.avgSleep.toFixed(1) : "—"}
                </Text>
                <Text
                  style={{
                    fontFamily: "Quicksand-Medium",
                    fontSize: 11,
                    color: colors.text.secondary,
                  }}
                >
                  Sleep
                </Text>
              </View>

              {/* Avg Water */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: colors.bg,
                  borderRadius: radius.card,
                  padding: spacing.md,
                  alignItems: "center",
                }}
              >
                <Droplets size={20} color={colors.secondary.DEFAULT} />
                <Text
                  style={{
                    fontFamily: "Quicksand-Bold",
                    fontSize: 16,
                    color: colors.text.primary,
                    marginTop: 4,
                  }}
                >
                  {stats.totalEntries > 0 ? stats.avgWater.toFixed(1) : "—"}
                </Text>
                <Text
                  style={{
                    fontFamily: "Quicksand-Medium",
                    fontSize: 11,
                    color: colors.text.secondary,
                  }}
                >
                  Water
                </Text>
              </View>
            </View>

            {/* Weekly Mood Chart */}
            <Text
              style={{
                fontFamily: "Quicksand-SemiBold",
                fontSize: 14,
                color: colors.text.secondary,
                marginBottom: spacing.md,
              }}
            >
              Weekly Mood Trend
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-end",
                justifyContent: "space-between",
                height: 120,
                backgroundColor: colors.bg,
                borderRadius: radius.card,
                padding: spacing.md,
                paddingBottom: spacing.lg,
              }}
            >
              {weeklyData.map((day, index) => {
                const barHeight = day.mood ? (day.mood / 5) * 80 : 8;
                const barColor = day.mood
                  ? moodLabels[day.mood as MoodLevel].color
                  : colors.text.muted + "20";

                return (
                  <View
                    key={index}
                    style={{
                      flex: 1,
                      alignItems: "center",
                      justifyContent: "flex-end",
                    }}
                  >
                    <View
                      style={{
                        width: "70%",
                        height: barHeight,
                        backgroundColor: barColor,
                        borderRadius: radius.sm,
                        marginBottom: spacing.sm,
                      }}
                    />
                    <Text
                      style={{
                        fontFamily: "Quicksand-Medium",
                        fontSize: 11,
                        color: colors.text.secondary,
                      }}
                    >
                      {day.day}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Streak Card */}
          {streak.currentStreak > 0 && (
            <View
              style={{
                marginBottom: spacing.lg,
                overflow: "hidden",
                borderRadius: radius.lg,
                ...shadows.soft,
              }}
            >
              <LinearGradient
                colors={[colors.primary[400], colors.primary[500]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  padding: spacing.lg,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Flame size={32} color={colors.surface} />
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text
                    style={{
                      fontFamily: "Quicksand-Bold",
                      fontSize: 24,
                      color: colors.surface,
                    }}
                  >
                    {streak.currentStreak} Day Streak
                  </Text>
                  <Text
                    style={{
                      fontFamily: "Quicksand-Medium",
                      fontSize: 14,
                      color: colors.surface,
                      opacity: 0.9,
                    }}
                  >
                    {getStreakMessage(streak.currentStreak)}
                  </Text>
                </View>
                <CheckCircle size={24} color={colors.surface} />
              </LinearGradient>
            </View>
          )}

          {/* Recent Entries */}
          {recentEntries.length > 0 && (
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: radius.lg,
                padding: spacing.lg,
                ...shadows.soft,
              }}
            >
              <Text
                style={{
                  fontFamily: "Quicksand-Bold",
                  fontSize: 18,
                  color: colors.text.primary,
                  marginBottom: spacing.base,
                }}
              >
                Recent Entries
              </Text>

              {recentEntries.map((entry, index) => {
                const moodData = moodLabels[entry.mood];
                const energyData = energyLabels[entry.energy];

                return (
                  <View
                    key={entry.id}
                    style={{
                      borderLeftWidth: 4,
                      borderLeftColor: moodData.color,
                      backgroundColor: colors.bg,
                      borderRadius: radius.card,
                      padding: spacing.md,
                      marginBottom:
                        index < recentEntries.length - 1 ? spacing.md : 0,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: spacing.sm,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ fontSize: 24, marginRight: spacing.sm }}>
                          {moodData.emoji}
                        </Text>
                        <Text
                          style={{
                            fontFamily: "Quicksand-Bold",
                            fontSize: 15,
                            color: colors.text.primary,
                          }}
                        >
                          {moodData.label}
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontFamily: "Quicksand-Medium",
                          fontSize: 13,
                          color: colors.text.secondary,
                        }}
                      >
                        {formatDate(entry.date)}
                      </Text>
                    </View>

                    {/* Energy Pill */}
                    <View
                      style={{
                        alignSelf: "flex-start",
                        paddingHorizontal: spacing.md,
                        paddingVertical: 4,
                        borderRadius: radius.pill,
                        backgroundColor: energyData.color + "20",
                        marginBottom: entry.tags.length > 0 ? spacing.sm : 0,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "Quicksand-SemiBold",
                          fontSize: 12,
                          color: energyData.color,
                        }}
                      >
                        {energyData.label}
                      </Text>
                    </View>

                    {/* Tags */}
                    {entry.tags.length > 0 && (
                      <View
                        style={{
                          flexDirection: "row",
                          flexWrap: "wrap",
                          gap: spacing.xs,
                          marginBottom: entry.note ? spacing.sm : 0,
                        }}
                      >
                        {entry.tags.slice(0, 3).map((tag) => (
                          <View
                            key={tag}
                            style={{
                              paddingHorizontal: spacing.sm,
                              paddingVertical: 2,
                              borderRadius: radius.pill,
                              backgroundColor: colors.text.muted + "15",
                            }}
                          >
                            <Text
                              style={{
                                fontFamily: "Quicksand-Medium",
                                fontSize: 11,
                                color: colors.text.secondary,
                              }}
                            >
                              {tag}
                            </Text>
                          </View>
                        ))}
                        {entry.tags.length > 3 && (
                          <Text
                            style={{
                              fontFamily: "Quicksand-Medium",
                              fontSize: 11,
                              color: colors.text.muted,
                              alignSelf: "center",
                            }}
                          >
                            +{entry.tags.length - 3}
                          </Text>
                        )}
                      </View>
                    )}

                    {/* Note Excerpt */}
                    {entry.note && (
                      <Text
                        style={{
                          fontFamily: "Quicksand-Medium",
                          fontSize: 13,
                          color: colors.text.secondary,
                          fontStyle: "italic",
                        }}
                        numberOfLines={2}
                      >
                        "{entry.note}"
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}
