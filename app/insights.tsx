import { useState, useEffect, useRef } from "react";
import { View, Text, ScrollView, TouchableOpacity, Dimensions, Animated, Platform } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import {
  ChevronLeft,
  Activity,
  Brain,
  Heart,
  Droplets,
  Moon,
  Zap,
  Sparkles,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
} from "lucide-react-native";
import { useMoodStore } from "../lib/stores/mood-store";
import { useJournalStore } from "../lib/stores/journal-store";
import {
  getWeeklySummary,
  getMonthlySummary,
  getInsightPatterns,
} from "../lib/mock-insights";
import { shadows, radius, spacing, animation } from "../lib/theme";
import { useTheme } from "../lib/theme-context";

const { width } = Dimensions.get("window");

type Period = "week" | "month";

export default function InsightsScreen() {
  const { theme, isDark } = useTheme();
  const colors = theme;
  const router = useRouter();
  const { entries: moodEntries, loadEntries: loadMood } = useMoodStore();
  const { entries: journalEntries, loadEntries: loadJournal } = useJournalStore();
  const [period, setPeriod] = useState<Period>("week");
  const [isLoaded, setIsLoaded] = useState(false);

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const loadAll = async () => {
      await Promise.all([loadMood(), loadJournal()]);
      setIsLoaded(true);

      Animated.parallel([
        Animated.timing(headerOpacity, {
          toValue: 1,
          duration: animation.duration.normal,
          useNativeDriver: true,
        }),
        Animated.spring(headerSlide, {
          toValue: 0,
          ...animation.spring,
          useNativeDriver: true,
        }),
      ]).start();
    };
    loadAll();
  }, []);

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
            fontFamily: "Quicksand-Bold",
            fontSize: 18,
            color: colors.text.primary,
          }}
        >
          Loading insights...
        </Text>
      </View>
    );
  }

  const weekly = getWeeklySummary(moodEntries);
  const monthly = getMonthlySummary(moodEntries);
  const summary = period === "week" ? weekly : monthly;
  const patterns = getInsightPatterns(moodEntries);
  const moodTrend = period === "week" ? weekly.moodTrend : undefined;
  const sleepTrend = period === "week" ? weekly.sleepTrend : undefined;

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();
  const label = period === "week" ? "This Week" : `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

  const TrendIcon = ({ trend }: { trend: "up" | "down" | "stable" }) => {
    if (trend === "up") return <TrendingUp size={16} color={colors.secondary[500]} />;
    if (trend === "down") return <TrendingDown size={16} color={colors.error} />;
    return <Minus size={16} color={colors.text.muted} />;
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <LinearGradient
        colors={isDark ? [theme.gradients.violetDream[0], theme.gradients.violetDream[1], theme.bg] : ["#EDE9FE", "#DDD6FE", "#F5F3FF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: Platform.OS === "ios" ? 60 : 48,
          paddingBottom: spacing.lg,
          paddingHorizontal: spacing.lg,
          borderBottomLeftRadius: radius.xl,
          borderBottomRightRadius: radius.xl,
        }}
      >
        <Animated.View
          style={{
            opacity: headerOpacity,
            transform: [{ translateY: headerSlide }],
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.sm }}>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }}
              style={{
                width: 40,
                height: 40,
                borderRadius: radius.pill,
                backgroundColor: colors.surface + "CC",
                justifyContent: "center",
                alignItems: "center",
                marginRight: spacing.sm,
              }}
            >
              <ChevronLeft size={20} color={colors.text.primary} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: "Quicksand-Bold",
                  fontSize: 24,
                  color: colors.text.primary,
                  lineHeight: 30,
                }}
              >
                Wellness Insights
              </Text>
              <Text
                style={{
                  fontFamily: "Quicksand-Medium",
                  fontSize: 14,
                  color: colors.text.secondary,
                  marginTop: 2,
                }}
              >
                {label}
              </Text>
            </View>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: radius.card,
                backgroundColor: colors.accent[500] + "18",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <BarChart3 size={22} color={colors.accent[500]} />
            </View>
          </View>

          {/* Period toggle */}
          <View
            style={{
              flexDirection: "row",
              backgroundColor: colors.surface,
              borderRadius: radius.pill,
              padding: 4,
              marginTop: spacing.xs,
            }}
          >
            {(["week", "month"] as const).map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setPeriod(p);
                }}
                style={{
                  flex: 1,
                  paddingVertical: spacing.sm,
                  borderRadius: radius.pill,
                  backgroundColor: period === p ? colors.accent[500] : "transparent",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontFamily: period === p ? "Quicksand-Bold" : "Quicksand-Medium",
                    fontSize: 14,
                    color: period === p ? colors.surface : colors.text.secondary,
                  }}
                >
                  {p === "week" ? "Weekly" : "Monthly"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 32 }}
      >
        {/* Stats Grid */}
        <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg }}>
          {[
            { value: summary.avgMood || "—", label: "Avg Mood", color: colors.accent[500], trend: moodTrend },
            { value: summary.avgSleep ? `${summary.avgSleep}h` : "—", label: "Avg Sleep", color: colors.primary[400], trend: sleepTrend },
          ].map((stat, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                backgroundColor: colors.surface,
                borderRadius: radius.card,
                padding: spacing.lg,
                ...shadows.soft,
                borderWidth: 1,
                borderColor: stat.color + "18",
              }}
            >
              <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 26, color: stat.color, lineHeight: 32, marginBottom: 4 }}>
                {stat.value}
              </Text>
              <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 12, color: colors.text.secondary, lineHeight: 16 }}>
                {stat.label}
              </Text>
              {stat.trend && (
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, gap: 4 }}>
                  <TrendIcon trend={stat.trend} />
                  <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 11, color: colors.text.muted }}>
                    {stat.trend === "up" ? "Improving" : stat.trend === "down" ? "Declining" : "Steady"}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>

        <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg }}>
          {[
            { value: summary.avgEnergy || "—", label: "Avg Energy", color: colors.secondary[500] },
            { value: summary.avgWater ? `${summary.avgWater}` : "—", label: "Avg Water", color: "#38BDF8" },
          ].map((stat, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                backgroundColor: colors.surface,
                borderRadius: radius.card,
                padding: spacing.lg,
                ...shadows.soft,
                borderWidth: 1,
                borderColor: stat.color + "18",
              }}
            >
              <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 26, color: stat.color, lineHeight: 32, marginBottom: 4 }}>
                {stat.value}
              </Text>
              <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 12, color: colors.text.secondary, lineHeight: 16 }}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Exercise Days */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: radius.card,
            padding: spacing.lg,
            ...shadows.soft,
            marginBottom: spacing.lg,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: radius.card,
                  backgroundColor: isDark ? theme.surfaceAlt : colors.primary[100],
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Zap size={20} color={colors.primary[500]} />
              </View>
              <View>
                <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 16, color: colors.text.primary, lineHeight: 22 }}>
                  Active Days
                </Text>
                <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 13, color: colors.text.secondary, lineHeight: 18 }}>
                  {summary.exerciseDays} of {period === "week" ? "7" : "30"} days
                </Text>
              </View>
            </View>
            <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 28, color: colors.primary[500] }}>
              {Math.round((summary.exerciseDays / (period === "week" ? 7 : 30)) * 100)}%
            </Text>
          </View>

          <View style={{ height: 8, backgroundColor: isDark ? theme.surfaceAlt : colors.primary[100], borderRadius: radius.pill, overflow: "hidden" }}>
            <View
              style={{
                height: "100%",
                width: `${Math.round((summary.exerciseDays / (period === "week" ? 7 : 30)) * 100)}%`,
                backgroundColor: colors.primary[400],
                borderRadius: radius.pill,
              }}
            />
          </View>
        </View>

        {/* Monthly: Best & Challenging Day */}
        {period === "month" && monthly.bestDay.day && (
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.card,
              padding: spacing.lg,
              ...shadows.soft,
              marginBottom: spacing.lg,
            }}
          >
            <Text
              style={{
                fontFamily: "Quicksand-Bold",
                fontSize: 16,
                color: colors.text.primary,
                marginBottom: spacing.md,
              }}
            >
              Month Highlights
            </Text>

            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <View
                style={{
                  flex: 1,
                  backgroundColor: isDark ? theme.surfaceAlt : colors.secondary[50],
                  borderRadius: radius.card,
                  padding: spacing.md,
                  borderLeftWidth: 3,
                  borderLeftColor: colors.secondary[500],
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 }}>
                  <Heart size={14} color={colors.secondary[500]} />
                  <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 12, color: colors.secondary[500], textTransform: "uppercase" }}>
                    Best Day
                  </Text>
                </View>
                <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 15, color: colors.text.primary, marginBottom: 2 }}>
                  {monthly.bestDay.day}
                </Text>
                <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 13, color: colors.text.secondary }}>
                  Mood {monthly.bestDay.mood}/5
                </Text>
              </View>

              <View
                style={{
                  flex: 1,
                  backgroundColor: colors.error + "0A",
                  borderRadius: radius.card,
                  padding: spacing.md,
                  borderLeftWidth: 3,
                  borderLeftColor: colors.error,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 }}>
                  <AlertTriangle size={14} color={colors.error} />
                  <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 12, color: colors.error, textTransform: "uppercase" }}>
                    Hard Day
                  </Text>
                </View>
                <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 15, color: colors.text.primary, marginBottom: 2 }}>
                  {monthly.challengingDay.day}
                </Text>
                <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 13, color: colors.text.secondary }}>
                  Mood {monthly.challengingDay.mood}/5
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Top Tags */}
        {(weekly.topTags.length > 0 || monthly.topTags.length > 0) && (
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.card,
              padding: spacing.lg,
              ...shadows.soft,
              marginBottom: spacing.lg,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: radius.card,
                  backgroundColor: isDark ? theme.surfaceAlt : colors.accent[100],
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Activity size={20} color={colors.accent[500]} />
              </View>
              <View>
                <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 16, color: colors.text.primary, lineHeight: 22 }}>
                  Top Emotions
                </Text>
                <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 13, color: colors.text.secondary }}>
                  Things you felt this {period === "week" ? "week" : "month"}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {(period === "week" ? weekly.topTags : monthly.topTags).map((tag, i) => {
                const tagIcons: Record<string, string> = {
                  happy: "😊", grateful: "🙏", calm: "🧘", stressed: "😰", tired: "😴",
                  overwhelmed: "😵", proud: "💪", anxious: "😟", excited: "✨", content: "🌿", motivated: "🔥", lonely: "💙",
                };
                const tagColors: Record<string, string> = {
                  happy: colors.secondary[400], grateful: colors.accent[400], calm: colors.primary[300],
                  stressed: colors.warning, tired: colors.text.muted, overwhelmed: colors.error,
                  proud: colors.accent[500], anxious: colors.error + "CC", excited: colors.primary[500],
                  content: colors.secondary[500], motivated: colors.accent[500], lonely: colors.accent[300],
                };
                return (
                  <View
                    key={tag.tag}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      backgroundColor: (tagColors[tag.tag] || colors.accent[500]) + "14",
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm + 2,
                      borderRadius: radius.pill,
                      borderWidth: 1,
                      borderColor: (tagColors[tag.tag] || colors.accent[500]) + "30",
                    }}
                  >
                    <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 13, color: tagColors[tag.tag] || colors.accent[500] }}>
                      {tagIcons[tag.tag] ? `${tagIcons[tag.tag]} ` : ""}{tag.tag}
                    </Text>
                    <Text
                      style={{
                        fontFamily: "Quicksand-Bold",
                        fontSize: 12,
                        color: (tagColors[tag.tag] || colors.accent[500]) + "CC",
                        backgroundColor: (tagColors[tag.tag] || colors.accent[500]) + "24",
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: radius.pill,
                      }}
                    >
                      {tag.count}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Insights */}
        {(weekly.insights.length > 0 || monthly.insights.length > 0) && (
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.card,
              padding: spacing.lg,
              ...shadows.soft,
              marginBottom: spacing.lg,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: radius.card,
                  backgroundColor: isDark ? theme.surfaceAlt : colors.primary[100],
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Sparkles size={20} color={colors.primary[500]} />
              </View>
              <View>
                <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 16, color: colors.text.primary, lineHeight: 22 }}>
                  Personalized Insights
                </Text>
                <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 13, color: colors.text.secondary }}>
                  Based on your check-ins
                </Text>
              </View>
            </View>

            {(period === "week" ? weekly.insights : monthly.insights).map((insight, i) => (
              <View
                key={i}
                style={{
                  flexDirection: "row",
                  gap: spacing.sm,
                  paddingVertical: spacing.sm,
                  borderBottomWidth: i < (period === "week" ? weekly.insights : monthly.insights).length - 1 ? 1 : 0,
                  borderBottomColor: colors.bg,
                }}
              >
                <View style={{ paddingTop: 2 }}>
                  <Activity size={16} color={colors.primary[400]} />
                </View>
                <Text style={{ flex: 1, fontFamily: "Quicksand-Medium", fontSize: 14, color: colors.text.primary, lineHeight: 20 }}>
                  {insight}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Pattern Detection */}
        {patterns.length > 0 && (
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.card,
              padding: spacing.lg,
              ...shadows.soft,
              marginBottom: spacing.lg,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: radius.card,
                  backgroundColor: isDark ? theme.surfaceAlt : colors.accent[100],
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Brain size={20} color={colors.accent[500]} />
              </View>
              <View>
                <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 16, color: colors.text.primary, lineHeight: 22 }}>
                  Patterns Detected
                </Text>
                <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 13, color: colors.text.secondary }}>
                  Connections we noticed
                </Text>
              </View>
            </View>

            {patterns.map((pattern, i) => {
              const iconMap: Record<string, any> = {
                sparkles: Sparkles,
                "trending-up": TrendingUp,
                droplets: Droplets,
                "alert-triangle": AlertTriangle,
                zap: Zap,
                heart: Heart,
              };
              const IconComponent = iconMap[pattern.icon] || Activity;
              const colorMap = { positive: colors.secondary[500], caution: colors.warning, actionable: colors.primary[500] };
              const bgMap = isDark
                ? { positive: theme.surfaceAlt, caution: colors.warning + "18", actionable: theme.surfaceAlt }
                : { positive: colors.secondary[50], caution: colors.warning + "18", actionable: colors.primary[50] };

              return (
                <View
                  key={i}
                  style={{
                    flexDirection: "row",
                    gap: spacing.sm,
                    paddingVertical: spacing.md,
                    borderBottomWidth: i < patterns.length - 1 ? 1 : 0,
                    borderBottomColor: colors.bg,
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: radius.sm,
                      backgroundColor: bgMap[pattern.type],
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <IconComponent size={18} color={colorMap[pattern.type]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 14, color: colors.text.primary, marginBottom: 3 }}>
                      {pattern.title}
                    </Text>
                    <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 13, color: colors.text.secondary, lineHeight: 19 }}>
                      {pattern.description}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Empty state */}
        {summary.totalEntries === 0 && (
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.card,
              padding: spacing.xl,
              alignItems: "center",
              marginTop: spacing.xl,
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: radius.lg,
                backgroundColor: isDark ? theme.surfaceAlt : colors.accent[100],
                justifyContent: "center",
                alignItems: "center",
                marginBottom: spacing.lg,
              }}
            >
              <BarChart3 size={28} color={colors.accent[500]} />
            </View>
            <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 18, color: colors.text.primary, marginBottom: spacing.sm, textAlign: "center" }}>
              Not enough data yet
            </Text>
            <Text
              style={{
                fontFamily: "Quicksand-Medium",
                fontSize: 14,
                color: colors.text.secondary,
                textAlign: "center",
                lineHeight: 22,
                marginBottom: spacing.lg,
              }}
            >
              Start checking in daily from the Mood tab to see your personalized wellness insights.
            </Text>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/mood");
              }}
              style={{
                backgroundColor: colors.accent[500],
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.lg,
                borderRadius: radius.pill,
              }}
            >
              <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 14, color: colors.surface }}>
                Go to Mood Check-in
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Journal entries count */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: radius.card,
            padding: spacing.md,
            ...shadows.soft,
            alignItems: "center",
            marginTop: spacing.sm,
          }}
        >
          <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 20, color: colors.accent[500] }}>
            {journalEntries.length}
          </Text>
          <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 12, color: colors.text.secondary }}>
            Journal Entries
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
