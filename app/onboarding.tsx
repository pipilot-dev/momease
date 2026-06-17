import { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Animated,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Sparkles, Heart, ListTodo, Brain } from "lucide-react-native";
import { useAuthStore } from "../lib/stores/auth-store";
import { useTheme } from "../lib/theme-context";

const { width } = Dimensions.get("window");

const onboardingHero = require("../assets/onboarding-hero.png");
const aiAssistant = require("../assets/ai-assistant.png");
const wellnessMeditation = require("../assets/wellness-meditation.png");
const sleepSounds = require("../assets/sleep-sounds.png");

const steps = [
  {
    id: "1",
    title: "Welcome, Mama",
    subtitle: "MomEase is your personal wellness companion, built with love for the incredible working mother that you are.",
    image: onboardingHero,
    gradient: ["#FDE5EC", "#FDF2F8"] as const,
    Icon: Heart,
    iconColor: "#F472B6",
  },
  {
    id: "2",
    title: "AI-Powered Support",
    subtitle: "Chat with your 24/7 AI wellness companion. Get personalized mantras, stress relief tips, and emotional support anytime.",
    image: aiAssistant,
    gradient: ["#EDE9FE", "#F5F3FF"] as const,
    Icon: Brain,
    iconColor: "#8B5CF6",
  },
  {
    id: "3",
    title: "Smart Task Manager",
    subtitle: "Let AI help you prioritize your day. Balance work deadlines, family time, and self-care effortlessly.",
    image: wellnessMeditation,
    gradient: ["#D1FAE5", "#ECFDF5"] as const,
    Icon: ListTodo,
    iconColor: "#10B981",
  },
  {
    id: "4",
    title: "Your Calm Space",
    subtitle: "Calming sounds, guided meditation, and community support — everything you need to recharge and thrive.",
    image: sleepSounds,
    gradient: ["#FDE5EC", "#F9F5FF"] as const,
    Icon: Sparkles,
    iconColor: "#F9A8D4",
  },
];

export default function Onboarding() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const { completeOnboarding } = useAuthStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleNext = () => {
    if (currentIndex < steps.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      completeOnboarding();
      router.replace("/(tabs)/home");
    }
  };

  const handleSkip = () => {
    completeOnboarding();
    router.replace("/(tabs)/home");
  };

  const renderStep = ({ item }: { item: (typeof steps)[0] }) => (
    <View style={{ width, paddingHorizontal: 32, alignItems: "center", justifyContent: "center" }}>
      <View
        style={{
          width: 200,
          height: 200,
          borderRadius: 100,
          overflow: "hidden",
          marginBottom: 32,
          shadowColor: item.iconColor,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.25,
          shadowRadius: 20,
          elevation: 8,
        }}
      >
        <Image
          source={item.image}
          style={{ width: 200, height: 200 }}
          resizeMode="cover"
        />
      </View>

      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: item.iconColor + "20",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
        }}
      >
        <item.Icon size={28} color={item.iconColor} />
      </View>

      <Text
        style={{
          fontFamily: "Quicksand-Bold",
          fontSize: 28,
          color: theme.text.primary,
          textAlign: "center",
          marginBottom: 12,
        }}
      >
        {item.title}
      </Text>
      <Text
        style={{
          fontFamily: "Quicksand-Medium",
          fontSize: 16,
          color: theme.text.secondary,
          textAlign: "center",
          lineHeight: 24,
        }}
      >
        {item.subtitle}
      </Text>
    </View>
  );

  const currentStep = steps[currentIndex];

  return (
    <LinearGradient
      colors={isDark ? [theme.gradients.roseGlow[0], theme.gradients.roseGlow[1], theme.bg] : [currentStep.gradient[0], currentStep.gradient[1], "#FDFCFB"]}
      style={{ flex: 1 }}
    >
      {/* Skip */}
      <View
        style={{
          paddingTop: 60,
          paddingHorizontal: 24,
          alignItems: "flex-end",
        }}
      >
        <TouchableOpacity onPress={handleSkip}>
          <Text
            style={{
              fontFamily: "Quicksand-SemiBold",
              fontSize: 16,
              color: theme.text.secondary,
            }}
          >
            Skip
          </Text>
        </TouchableOpacity>
      </View>

      {/* Steps */}
      <View style={{ flex: 1, justifyContent: "center" }}>
        <FlatList
          ref={flatListRef}
          data={steps}
          renderItem={renderStep}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
            useNativeDriver: false,
          })}
        />
      </View>

      {/* Bottom */}
      <View style={{ paddingHorizontal: 32, paddingBottom: 48 }}>
        {/* Dots */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            marginBottom: 32,
            gap: 8,
          }}
        >
          {steps.map((_, i) => (
            <View
              key={i}
              style={{
                width: currentIndex === i ? 24 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: currentIndex === i ? currentStep.iconColor : theme.border,
              }}
            />
          ))}
        </View>

        {/* Button */}
        <TouchableOpacity onPress={handleNext} activeOpacity={0.85}>
          <LinearGradient
            colors={[currentStep.iconColor, currentStep.iconColor + "CC"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              borderRadius: 16,
              paddingVertical: 18,
              alignItems: "center",
              shadowColor: currentStep.iconColor,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.35,
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            <Text
              style={{
                fontFamily: "Quicksand-Bold",
                fontSize: 18,
                color: "#FFFFFF",
              }}
            >
              {currentIndex === steps.length - 1 ? "Get Started" : "Next"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}
