import { useEffect, useRef } from "react";
import { View, Text, Animated, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Heart } from "lucide-react-native";

const { width } = Dimensions.get("window");

export default function SplashEntry() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const textFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 80,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(textFade, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      router.replace("/(auth)/sign-in");
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <LinearGradient
      colors={["#FDE5EC", "#FDF2F8", "#F9F5FF"]}
      style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
    >
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
          alignItems: "center",
        }}
      >
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: "#F9A8D4",
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#F9A8D4",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.4,
            shadowRadius: 20,
            elevation: 8,
          }}
        >
          <Heart size={48} color="#FFFFFF" fill="#FFFFFF" />
        </View>
      </Animated.View>

      <Animated.View style={{ opacity: textFade, marginTop: 24, alignItems: "center" }}>
        <Text
          style={{
            fontFamily: "Quicksand-Bold",
            fontSize: 36,
            color: "#1F2937",
            letterSpacing: -0.5,
          }}
        >
          MomEase
        </Text>
        <Text
          style={{
            fontFamily: "Quicksand-Medium",
            fontSize: 16,
            color: "#6B7280",
            marginTop: 4,
          }}
        >
          Your daily dose of calm
        </Text>
      </Animated.View>
    </LinearGradient>
  );
}
