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
import { Heart, Mail, Lock, User, Eye, EyeOff } from "lucide-react-native";
import { useAuthStore } from "../../lib/stores/auth-store";

export default function SignUp() {
  const router = useRouter();
  const { signUp, isLoading, error, clearError } = useAuthStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleSignUp = async () => {
    clearError();
    const success = await signUp(email, password, name);
    if (success) {
      router.replace("/onboarding");
    }
  };

  const inputStyle = {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: "#FBC8DC",
  };

  const textInputStyle = {
    flex: 1,
    fontFamily: "Quicksand-Medium",
    fontSize: 16,
    color: "#1F2937",
    paddingVertical: 14,
    marginLeft: 12,
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
            style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
          >
            {/* Header */}
            <View style={{ alignItems: "center", marginBottom: 40 }}>
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  backgroundColor: "#A7F3D0",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                  shadowColor: "#A7F3D0",
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
                Join MomEase
              </Text>
              <Text
                style={{
                  fontFamily: "Quicksand-Medium",
                  fontSize: 16,
                  color: "#6B7280",
                  marginTop: 4,
                }}
              >
                Start your self-care journey today
              </Text>
            </View>

            {/* Form */}
            <View style={{ gap: 16 }}>
              <View style={inputStyle}>
                <User size={20} color="#A7F3D0" />
                <TextInput
                  style={textInputStyle}
                  placeholder="Full name"
                  placeholderTextColor="#9CA3AF"
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View style={inputStyle}>
                <Mail size={20} color="#A7F3D0" />
                <TextInput
                  style={textInputStyle}
                  placeholder="Email address"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={inputStyle}>
                <Lock size={20} color="#A7F3D0" />
                <TextInput
                  style={textInputStyle}
                  placeholder="Password (min 6 characters)"
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

              <TouchableOpacity
                onPress={handleSignUp}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={["#A7F3D0", "#34D399"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    borderRadius: 16,
                    paddingVertical: 16,
                    alignItems: "center",
                    shadowColor: "#34D399",
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
                      Create Account
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

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
                Already have an account?
              </Text>
              <Link href="/(auth)/sign-in" asChild>
                <TouchableOpacity>
                  <Text
                    style={{
                      fontFamily: "Quicksand-Bold",
                      fontSize: 15,
                      color: "#10B981",
                    }}
                  >
                    Sign In
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
