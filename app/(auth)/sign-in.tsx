import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  ActivityIndicator,
} from "react-native";
import { useRouter, Link } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Heart, Mail, Lock, Eye, EyeOff } from "lucide-react-native";
import { useAuthStore } from "../../lib/stores/auth-store";

export default function SignIn() {
  const router = useRouter();
  const { signIn, signInWithGoogle, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState("sarah@momease.app");
  const [password, setPassword] = useState("password123");
  const [showPassword, setShowPassword] = useState(false);

  const handleGoogle = async () => {
    clearError();
    const ok = await signInWithGoogle();
    if (ok) router.replace("/(tabs)/home");
  };

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
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
  }, []);

  const handleSignIn = async () => {
    clearError();
    const success = await signIn(email, password);
    if (success) {
      router.replace("/(tabs)/home");
    }
  };

  return (
    <LinearGradient colors={["#FDE5EC", "#FDFCFB"]} style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            {/* Logo */}
            <View style={{ alignItems: "center", marginBottom: 40 }}>
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  backgroundColor: "#F9A8D4",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                  shadowColor: "#F9A8D4",
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.35,
                  shadowRadius: 16,
                  elevation: 6,
                }}
              >
                <Heart size={36} color="#fff" fill="#fff" />
              </View>
              <Text
                style={{
                  fontFamily: "Quicksand-Bold",
                  fontSize: 32,
                  color: "#1F2937",
                }}
              >
                Welcome Back
              </Text>
              <Text
                style={{
                  fontFamily: "Quicksand-Medium",
                  fontSize: 16,
                  color: "#6B7280",
                  marginTop: 4,
                }}
              >
                Your calm space is waiting
              </Text>
            </View>

            {/* Form */}
            <View style={{ gap: 16 }}>
              {/* Email */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#FFFFFF",
                  borderRadius: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 4,
                  borderWidth: 1.5,
                  borderColor: "#FBC8DC",
                }}
              >
                <Mail size={20} color="#F9A8D4" />
                <TextInput
                  style={{
                    flex: 1,
                    fontFamily: "Quicksand-Medium",
                    fontSize: 16,
                    color: "#1F2937",
                    paddingVertical: 14,
                    marginLeft: 12,
                  }}
                  placeholder="Email address"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {/* Password */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#FFFFFF",
                  borderRadius: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 4,
                  borderWidth: 1.5,
                  borderColor: "#FBC8DC",
                }}
              >
                <Lock size={20} color="#F9A8D4" />
                <TextInput
                  style={{
                    flex: 1,
                    fontFamily: "Quicksand-Medium",
                    fontSize: 16,
                    color: "#1F2937",
                    paddingVertical: 14,
                    marginLeft: 12,
                  }}
                  placeholder="Password"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  {showPassword ? (
                    <EyeOff size={20} color="#9CA3AF" />
                  ) : (
                    <Eye size={20} color="#9CA3AF" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Error */}
              {error && (
                <Text
                  style={{
                    fontFamily: "Quicksand-Medium",
                    fontSize: 14,
                    color: "#EF4444",
                    textAlign: "center",
                  }}
                >
                  {error}
                </Text>
              )}

              {/* Forgot password */}
              <TouchableOpacity style={{ alignSelf: "flex-end" }}>
                <Text
                  style={{
                    fontFamily: "Quicksand-SemiBold",
                    fontSize: 14,
                    color: "#EC4899",
                  }}
                >
                  Forgot password?
                </Text>
              </TouchableOpacity>

              {/* Sign In Button */}
              <TouchableOpacity
                onPress={handleSignIn}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={["#F9A8D4", "#F472B6"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    borderRadius: 16,
                    paddingVertical: 16,
                    alignItems: "center",
                    shadowColor: "#F472B6",
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.35,
                    shadowRadius: 12,
                    elevation: 6,
                  }}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text
                      style={{
                        fontFamily: "Quicksand-Bold",
                        fontSize: 18,
                        color: "#FFFFFF",
                      }}
                    >
                      Sign In
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 24, gap: 12 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: "#F3D6E2" }} />
              <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 13, color: "#9CA3AF" }}>or</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: "#F3D6E2" }} />
            </View>

            {/* Google Sign In */}
            <TouchableOpacity
              onPress={handleGoogle}
              disabled={isLoading}
              activeOpacity={0.85}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                backgroundColor: "#FFFFFF",
                borderRadius: 16,
                paddingVertical: 15,
                marginTop: 16,
                borderWidth: 1.5,
                borderColor: "#E5E7EB",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              {/* Multi-color Google "G" mark */}
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  borderWidth: 2.5,
                  borderColor: "#4285F4",
                  borderRightColor: "#34A853",
                  borderBottomColor: "#FBBC05",
                  borderLeftColor: "#EA4335",
                  transform: [{ rotate: "45deg" }],
                }}
              />
              <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 16, color: "#374151" }}>
                Continue with Google
              </Text>
            </TouchableOpacity>

            {/* Sign Up link */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                marginTop: 32,
                gap: 4,
              }}
            >
              <Text
                style={{
                  fontFamily: "Quicksand-Medium",
                  fontSize: 15,
                  color: "#6B7280",
                }}
              >
                New to MomEase?
              </Text>
              <Link href="/(auth)/sign-up" asChild>
                <TouchableOpacity>
                  <Text
                    style={{
                      fontFamily: "Quicksand-Bold",
                      fontSize: 15,
                      color: "#EC4899",
                    }}
                  >
                    Create Account
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
