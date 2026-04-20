import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  Sun,
  Moon,
  Sunrise,
  ChevronRight,
  Sparkles,
  ListTodo,
  Heart,
  MessageCircle,
  UtensilsCrossed,
  Music,
  Users,
  Bell,
} from "lucide-react-native";
import { useAuthStore } from "../../lib/stores/auth-store";
import { useTaskStore } from "../../lib/stores/task-store";
import { getRandomMantra, getTimeOfDay, mockMeditations } from "../../lib/mock-data";
import { getAIGreeting } from "../../lib/mock-ai";

const { width } = Dimensions.get("window");

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { tasks, getPendingCount, getCompletedCount } = useTaskStore();
  const [greeting, setGreeting] = useState("");
  const [mantra, setMantra] = useState(getRandomMantra());
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const firstName = user?.name?.split(" ")[0] || "Mama";
  const timeOfDay = getTimeOfDay();
  const TimeIcon = timeOfDay === "morning" ? Sunrise : timeOfDay === "afternoon" ? Sun : Moon;

  useEffect(() => {
    getAIGreeting(firstName).then(setGreeting);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const quickActions = [
    { icon: MessageCircle, label: "AI Chat", color: "#C4B5FD", route: "/(tabs)/chat" },
    { icon: ListTodo, label: "Tasks", color: "#A7F3D0", route: "/(tabs)/tasks" },
    { icon: Music, label: "Sounds", color: "#F9A8D4", route: "/(tabs)/sounds" },
    { icon: UtensilsCrossed, label: "Meals", color: "#FDE68A", route: "/meals" },
  ];

  const todayTasks = tasks.filter((t) => t.status !== "completed").slice(0, 3);

  return (
    <View style={{ flex: 1, backgroundColor: "#FDFCFB" }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient
          colors={["#FDE5EC", "#FDF2F8", "#FDFCFB"]}
          style={{ paddingTop: 60, paddingBottom: 24, paddingHorizontal: 24 }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <TimeIcon size={20} color="#F472B6" />
                <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 14, color: "#F472B6" }}>
                  Good {timeOfDay}
                </Text>
              </View>
              <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 28, color: "#1F2937" }}>
                Hi, {firstName}!
              </Text>
            </View>
            <TouchableOpacity>
              <View style={{ position: "relative" }}>
                <Bell size={24} color="#6B7280" />
                <View
                  style={{
                    position: "absolute",
                    top: -2,
                    right: -2,
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: "#EF4444",
                    borderWidth: 2,
                    borderColor: "#FDE5EC",
                  }}
                />
              </View>
            </TouchableOpacity>
          </View>

          {/* AI Greeting */}
          {greeting ? (
            <Animated.View style={{ opacity: fadeAnim, marginTop: 16 }}>
              <View
                style={{
                  backgroundColor: "#FFFFFF",
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
                  <Sparkles size={16} color="#F472B6" />
                  <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 12, color: "#F472B6" }}>
                    AI GREETING
                  </Text>
                </View>
                <Text
                  style={{
                    fontFamily: "Quicksand-Medium",
                    fontSize: 15,
                    color: "#1F2937",
                    lineHeight: 22,
                  }}
                >
                  {greeting}
                </Text>
              </View>
            </Animated.View>
          ) : null}
        </LinearGradient>

        <View style={{ paddingHorizontal: 24 }}>
          {/* Daily Mantra */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setMantra(getRandomMantra())}
          >
            <LinearGradient
              colors={["#E0E7FF", "#F5F3FF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 16,
                padding: 20,
                marginBottom: 24,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Heart size={16} color="#8B5CF6" fill="#8B5CF6" />
                <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 12, color: "#8B5CF6", letterSpacing: 1 }}>
                  TODAY'S MANTRA
                </Text>
              </View>
              <Text
                style={{
                  fontFamily: "Quicksand-SemiBold",
                  fontSize: 18,
                  color: "#1F2937",
                  lineHeight: 26,
                  fontStyle: "italic",
                }}
              >
                "{mantra.text}"
              </Text>
              <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 12, color: "#6B7280", marginTop: 8 }}>
                Tap for a new mantra
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Quick Actions */}
          <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 20, color: "#1F2937", marginBottom: 16 }}>
            Quick Actions
          </Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 24 }}>
            {quickActions.map((action, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => router.push(action.route as any)}
                activeOpacity={0.85}
                style={{ alignItems: "center", width: (width - 72) / 4 }}
              >
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    backgroundColor: action.color + "30",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 8,
                  }}
                >
                  <action.icon size={24} color={action.color.replace("30", "")} />
                </View>
                <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 12, color: "#4B5563" }}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Task Summary */}
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              padding: 20,
              marginBottom: 24,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 18, color: "#1F2937" }}>
                Today's Tasks
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/tasks")}
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 14, color: "#F472B6" }}>
                  See All
                </Text>
                <ChevronRight size={16} color="#F472B6" />
              </TouchableOpacity>
            </View>

            {/* Progress */}
            <View style={{ flexDirection: "row", gap: 16, marginBottom: 16 }}>
              <View
                style={{
                  flex: 1,
                  backgroundColor: "#F0FDF4",
                  borderRadius: 12,
                  padding: 12,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 24, color: "#10B981" }}>
                  {getCompletedCount()}
                </Text>
                <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 12, color: "#6B7280" }}>
                  Done
                </Text>
              </View>
              <View
                style={{
                  flex: 1,
                  backgroundColor: "#FFF5F9",
                  borderRadius: 12,
                  padding: 12,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 24, color: "#F472B6" }}>
                  {getPendingCount()}
                </Text>
                <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 12, color: "#6B7280" }}>
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
                  borderTopColor: "#F3F4F6",
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
                        ? "#EF4444"
                        : task.priority === "high"
                        ? "#F59E0B"
                        : "#10B981",
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 15, color: "#1F2937" }}>
                    {task.title}
                  </Text>
                  <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 12, color: "#9CA3AF" }}>
                    {task.category}
                  </Text>
                </View>
                {task.aiSuggested && <Sparkles size={14} color="#C4B5FD" />}
              </View>
            ))}
          </View>

          {/* Meditation Suggestion */}
          <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 20, color: "#1F2937", marginBottom: 16 }}>
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

          {/* Community Peek */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push("/community" as any)}
            style={{ marginBottom: 40 }}
          >
            <LinearGradient
              colors={["#D1FAE5", "#ECFDF5"]}
              style={{ borderRadius: 16, padding: 20 }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: "#10B981" + "30",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Users size={24} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 16, color: "#1F2937" }}>
                    Join the Community
                  </Text>
                  <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 13, color: "#6B7280" }}>
                    Connect with 2,400+ moms who get it
                  </Text>
                </View>
                <ChevronRight size={20} color="#10B981" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
