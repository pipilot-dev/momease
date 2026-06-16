import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import {
  Sun,
  Moon,
  Sunrise,
  ChevronRight,
  Sparkles,
  Heart,
  MessageCircle,
  UtensilsCrossed,
  Music,
  Users,
  Bell,
  Baby,
  Smile,
  BookOpen,
  BarChart3,
  Wind,
  Flame,
  CheckCircle2,
} from "lucide-react-native";
import { useAuthStore } from "../../lib/stores/auth-store";
import { useTaskStore } from "../../lib/stores/task-store";
import { useCheckinStore } from "../../lib/stores/checkin-store";
import { getRandomMantra, getTimeOfDay, mockMeditations } from "../../lib/mock-data";
import { getAIGreeting } from "../../lib/mock-ai";
import { animation } from "../../lib/theme";
import { useTheme } from "../../lib/theme-context";

const { width } = Dimensions.get("window");

export default function HomeScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  // The theme palette mirrors the static token shape, so aliasing it lets the
  // whole screen pick up light/dark colors without rewiring every reference.
  const colors = theme;
  const gradients = theme.gradients;
  const { user } = useAuthStore();
  const { tasks, getPendingCount, getCompletedCount } = useTaskStore();
  const { currentStreak, hasCheckedInToday } = useCheckinStore();
  const [greeting, setGreeting] = useState("");
  const [mantra, setMantra] = useState(getRandomMantra());
  const [refreshing, setRefreshing] = useState(false);

  // Staggered animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const greetingAnim = useRef(new Animated.Value(0)).current;
  const mantraAnim = useRef(new Animated.Value(0)).current;
  const actionsAnim = useRef(new Animated.Value(0)).current;
  const tasksAnim = useRef(new Animated.Value(0)).current;

  const firstName = user?.name?.split(" ")[0] || "Mama";
  const timeOfDay = getTimeOfDay();
  const TimeIcon = timeOfDay === "morning" ? Sunrise : timeOfDay === "afternoon" ? Sun : Moon;

  useEffect(() => {
    getAIGreeting(firstName).then(setGreeting);
    // Staggered entrance animations — run in parallel with increasing
    // delays so every section becomes visible quickly (~700ms total),
    // rather than chaining serially (which left the nav grids hidden).
    Animated.parallel([
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: animation.duration.normal,
        delay: 0,
        useNativeDriver: true,
      }),
      Animated.timing(greetingAnim, {
        toValue: 1,
        duration: animation.duration.normal,
        delay: animation.stagger.small,
        useNativeDriver: true,
      }),
      Animated.timing(mantraAnim, {
        toValue: 1,
        duration: animation.duration.normal,
        delay: animation.stagger.small * 2,
        useNativeDriver: true,
      }),
      Animated.timing(actionsAnim, {
        toValue: 1,
        duration: animation.duration.normal,
        delay: animation.stagger.small * 3,
        useNativeDriver: true,
      }),
      Animated.timing(tasksAnim, {
        toValue: 1,
        duration: animation.duration.normal,
        delay: animation.stagger.small * 4,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setRefreshing(false), 800);
  };

  const quickActions = [
    { icon: MessageCircle, label: "AI Chat", color: colors.accent[400], route: "/(tabs)/chat" },
    { icon: Smile, label: "Mood", color: colors.primary[400], route: "/mood" },
    { icon: Wind, label: "Breathe", color: colors.secondary[500], route: "/breathe" },
    { icon: Music, label: "Sounds", color: colors.secondary[400], route: "/(tabs)/sounds" },
    { icon: BookOpen, label: "Journal", color: "#8B5CF6", route: "/journal" },
  ];

  const todayTasks = tasks.filter((t) => t.status !== "completed").slice(0, 3);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary[500]}
            colors={[colors.primary[500]]}
          />
        }
      >
        {/* Header with animated entrance */}
        <Animated.View style={{ opacity: headerAnim }}>
          <LinearGradient
            colors={[gradients.warmMorning[0], gradients.warmMorning[1], colors.bg]}
            style={{ paddingTop: 60, paddingBottom: 24, paddingHorizontal: 24 }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <TimeIcon size={20} color={colors.primary[500]} />
                  <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 14, color: colors.primary[500] }}>
                    Good {timeOfDay}
                  </Text>
                </View>
                <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 28, color: colors.text.primary }}>
                  Hi, {firstName}!
                </Text>
              </View>
              <TouchableOpacity onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
                <View style={{ position: "relative" }}>
                  <Bell size={24} color={colors.text.secondary} />
                  <View
                    style={{
                      position: "absolute",
                      top: -2,
                      right: -2,
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: colors.error,
                      borderWidth: 2,
                      borderColor: colors.primary[50],
                    }}
                  />
                </View>
              </TouchableOpacity>
            </View>

            {/* AI Greeting */}
            {greeting ? (
              <Animated.View style={{ opacity: greetingAnim, marginTop: 16 }}>
                <View
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: 16,
                    padding: 16,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.06,
                    shadowRadius: 8,
                    elevation: 2,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <Sparkles size={16} color={colors.primary[500]} />
                    <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 12, color: colors.primary[500] }}>
                      AI GREETING
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontFamily: "Quicksand-Medium",
                      fontSize: 15,
                      color: colors.text.primary,
                      lineHeight: 22,
                    }}
                  >
                    {greeting}
                  </Text>
                </View>
              </Animated.View>
            ) : null}
          </LinearGradient>
        </Animated.View>

        <View style={{ paddingHorizontal: 24 }}>
          {/* Daily Mantra with animation */}
          <Animated.View style={{ opacity: mantraAnim, marginBottom: 24 }}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                setMantra(getRandomMantra());
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }}
            >
              <LinearGradient
                colors={[gradients.violetDream[0], gradients.violetDream[1]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  borderRadius: 16,
                  padding: 20,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Heart size={16} color={colors.accent[500]} fill={colors.accent[500]} />
                  <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 12, color: colors.accent[500], letterSpacing: 1 }}>
                    TODAY'S MANTRA
                  </Text>
                </View>
                <Text
                  style={{
                    fontFamily: "Quicksand-SemiBold",
                    fontSize: 18,
                    color: colors.text.primary,
                    lineHeight: 26,
                    fontStyle: "italic",
                  }}
                >
                  "{mantra.text}"
                </Text>
                <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 12, color: colors.text.secondary, marginTop: 8 }}>
                  Tap for a new mantra
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Daily Check-in CTA */}
          <Animated.View style={{ opacity: mantraAnim, marginBottom: 24 }}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                router.push("/checkin" as any);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <LinearGradient
                colors={["#FB923C", "#F472B6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ borderRadius: 16, padding: 18, flexDirection: "row", alignItems: "center", gap: 14 }}
              >
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: "rgba(255,255,255,0.25)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {hasCheckedInToday() ? (
                    <CheckCircle2 size={24} color="#FFFFFF" />
                  ) : (
                    <Flame size={24} color="#FFFFFF" fill="#FFFFFF" />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 16, color: "#FFFFFF" }}>
                    {hasCheckedInToday() ? "Checked in today!" : "Daily Check-in"}
                  </Text>
                  <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 13, color: "rgba(255,255,255,0.9)" }}>
                    {currentStreak > 0 ? `${currentStreak} day streak · keep it going` : "Take a mindful moment for you"}
                  </Text>
                </View>
                <ChevronRight size={20} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Quick Actions with animation */}
          <Animated.View style={{ opacity: actionsAnim }}>
            <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 20, color: colors.text.primary, marginBottom: 16 }}>
              Quick Actions
            </Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 24 }}>
            {quickActions.map((action, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => {
                  router.push(action.route as any);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                activeOpacity={0.85}
                style={{ alignItems: "center", width: (width - 56) / 5 }}
              >
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    backgroundColor: action.color + "20",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 8,
                  }}
                >
                  <action.icon size={24} color={action.color} />
                </View>
                <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 12, color: colors.text.secondary }}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          </Animated.View>

          {/* Second row quick actions */}
          <Animated.View style={{ opacity: actionsAnim, marginBottom: 24 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              {[
                { icon: Baby, label: "Milestones", color: colors.primary[400], route: "/milestones" },
                { icon: Moon, label: "Sleep", color: colors.accent[400], route: "/sleep" },
                { icon: UtensilsCrossed, label: "Meals", color: "#FBBF24", route: "/meals" },
                { icon: Users, label: "Community", color: colors.secondary[500], route: "/community" },
                { icon: BarChart3, label: "Insights", color: colors.accent[500], route: "/insights" },
              ].map((action, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => {
                    router.push(action.route as any);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  activeOpacity={0.85}
                  style={{ alignItems: "center", width: (width - 56) / 5 }}
                >
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 16,
                      backgroundColor: action.color + "20",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 8,
                    }}
                  >
                    <action.icon size={24} color={action.color} />
                  </View>
                  <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 12, color: colors.text.secondary }}>
                    {action.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* Task Summary */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: 20,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 18, color: colors.text.primary }}>
                Today's Tasks
              </Text>
              <TouchableOpacity
                onPress={() => {
                  router.push("/(tabs)/tasks");
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 14, color: colors.primary[500] }}>
                  See All
                </Text>
                <ChevronRight size={16} color={colors.primary[500]} />
              </TouchableOpacity>
            </View>

            {/* Progress */}
            <View style={{ flexDirection: "row", gap: 16, marginBottom: 16 }}>
              <View
                style={{
                  flex: 1,
                  backgroundColor: isDark ? colors.surfaceAlt : colors.secondary[50],
                  borderRadius: 12,
                  padding: 12,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 24, color: colors.success }}>
                  {getCompletedCount()}
                </Text>
                <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 12, color: colors.text.secondary }}>
                  Done
                </Text>
              </View>
              <View
                style={{
                  flex: 1,
                  backgroundColor: isDark ? colors.surfaceAlt : colors.primary[50],
                  borderRadius: 12,
                  padding: 12,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 24, color: colors.primary[500] }}>
                  {getPendingCount()}
                </Text>
                <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 12, color: colors.text.secondary }}>
                  Remaining
                </Text>
              </View>
            </View>

            {/* Task List */}
            {todayTasks.map((task, i) => (
              <View
                key={task.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 12,
                  borderTopWidth: i > 0 ? 1 : 0,
                  borderTopColor: colors.primary[100],
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor:
                      task.priority === "urgent"
                        ? colors.error
                        : task.priority === "high"
                        ? colors.warning
                        : colors.success,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 15, color: colors.text.primary }}>
                    {task.title}
                  </Text>
                  <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 12, color: colors.text.muted }}>
                    {task.category}
                  </Text>
                </View>
                {task.aiSuggested && <Sparkles size={14} color={colors.accent[400]} />}
              </View>
            ))}
          </View>

          {/* Meditation Suggestion */}
          <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 20, color: colors.text.primary, marginBottom: 16 }}>
            Recommended for You
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 32 }}
          >
            {mockMeditations.slice(0, 3).map((med, i) => (
              <TouchableOpacity
                key={med.id}
                activeOpacity={0.9}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({ pathname: "/(tabs)/sounds", params: { tab: "meditate" } } as any);
                }}
                style={{ marginRight: 16, width: 200 }}
              >
                <View style={{ borderRadius: 16, overflow: "hidden" }}>
                  <Image
                    source={med.imageUrl}
                    style={{ width: 200, height: 120, borderRadius: 16 }}
                  />
                  <LinearGradient
                    colors={["transparent", "rgba(0,0,0,0.6)"]}
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      padding: 12,
                      borderBottomLeftRadius: 16,
                      borderBottomRightRadius: 16,
                    }}
                  >
                    <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 14, color: "#FFFFFF" }}>
                      {med.title}
                    </Text>
                    <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 12, color: "#D1D5DB" }}>
                      {med.duration}
                    </Text>
                  </LinearGradient>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Baby Milestones Card */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              router.push("/milestones" as any);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={{ marginBottom: 24 }}
          >
            <LinearGradient
              colors={[gradients.roseGlow[0], gradients.roseGlow[1]]}
              style={{ borderRadius: 16, padding: 20 }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: colors.primary[400] + "25",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Baby size={24} color={colors.primary[500]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 16, color: colors.text.primary }}>
                    Baby Milestones
                  </Text>
                  <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 13, color: colors.text.secondary }}>
                    Track your baby's special moments and firsts
                  </Text>
                </View>
                <ChevronRight size={20} color={colors.primary[500]} />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Community Peek */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              router.push("/community" as any);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={{ marginBottom: 40 }}
          >
            <LinearGradient
              colors={[gradients.mintGlow[0], gradients.mintGlow[1]]}
              style={{ borderRadius: 16, padding: 20 }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: colors.secondary[500] + "25",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Users size={24} color={colors.secondary[500]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 16, color: colors.text.primary }}>
                    Join the Community
                  </Text>
                  <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 13, color: colors.text.secondary }}>
                    Connect with 2,400+ moms who get it
                  </Text>
                </View>
                <ChevronRight size={20} color={colors.secondary[500]} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
