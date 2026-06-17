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
  Modal,
} from "react-native";
import { useRouter, Link } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Heart, Mail, Lock, Eye, EyeOff, CheckCircle2, X } from "lucide-react-native";
import { useAuthStore } from "../../lib/stores/auth-store";
import { authService } from "../../lib/auth-service";
import { useTheme } from "../../lib/theme-context";

export default function SignIn() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const { signIn, signInWithGoogle, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState("sarah@momease.app");
  const [password, setPassword] = useState("password123");
  const [showPassword, setShowPassword] = useState(false);

  // Forgot-password reset flow
  const [resetVisible, setResetVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const openReset = () => {
    setResetEmail(email);
    setResetSent(false);
    setResetError(null);
    setResetVisible(true);
  };

  const handleReset = async () => {
    if (!resetEmail.trim()) {
      setResetError("Please enter your email address");
      return;
    }
    setResetLoading(true);
    setResetError(null);
    const result = await authService.resetPassword(resetEmail.trim());
    setResetLoading(false);
    if (result.success) {
      setResetSent(true);
    } else {
      setResetError(result.error || "Couldn't send reset email. Try again.");
    }
  };

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
    <LinearGradient colors={isDark ? [theme.gradients.roseGlow[0], theme.gradients.roseGlow[1], theme.bg] : ["#FDE5EC", "#FDFCFB"]} style={{ flex: 1 }}>
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
                  color: theme.text.primary,
                }}
              >
                Welcome Back
              </Text>
              <Text
                style={{
                  fontFamily: "Quicksand-Medium",
                  fontSize: 16,
                  color: theme.text.secondary,
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
                  backgroundColor: isDark ? theme.surfaceAlt : "#FFFFFF",
                  borderRadius: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 4,
                  borderWidth: 1.5,
                  borderColor: isDark ? theme.border : "#FBC8DC",
                }}
              >
                <Mail size={20} color="#F9A8D4" />
                <TextInput
                  style={{
                    flex: 1,
                    fontFamily: "Quicksand-Medium",
                    fontSize: 16,
                    color: theme.text.primary,
                    paddingVertical: 14,
                    marginLeft: 12,
                  }}
                  placeholder="Email address"
                  placeholderTextColor={theme.text.muted}
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
                  backgroundColor: isDark ? theme.surfaceAlt : "#FFFFFF",
                  borderRadius: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 4,
                  borderWidth: 1.5,
                  borderColor: isDark ? theme.border : "#FBC8DC",
                }}
              >
                <Lock size={20} color="#F9A8D4" />
                <TextInput
                  style={{
                    flex: 1,
                    fontFamily: "Quicksand-Medium",
                    fontSize: 16,
                    color: theme.text.primary,
                    paddingVertical: 14,
                    marginLeft: 12,
                  }}
                  placeholder="Password"
                  placeholderTextColor={theme.text.muted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  {showPassword ? (
                    <EyeOff size={20} color={theme.text.muted} />
                  ) : (
                    <Eye size={20} color={theme.text.muted} />
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
              <TouchableOpacity style={{ alignSelf: "flex-end" }} onPress={openReset}>
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
              <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
              <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 13, color: theme.text.muted }}>or</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
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
                backgroundColor: isDark ? theme.surfaceAlt : "#FFFFFF",
                borderRadius: 16,
                paddingVertical: 15,
                marginTop: 16,
                borderWidth: 1.5,
                borderColor: isDark ? theme.border : "#E5E7EB",
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
              <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 16, color: theme.text.primary }}>
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
                  color: theme.text.secondary,
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

      {/* Forgot-password reset modal */}
      <Modal visible={resetVisible} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.4)",
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
        >
          <View style={{ backgroundColor: theme.surface, borderRadius: 24, padding: 24 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 22, color: theme.text.primary }}>
                Reset password
              </Text>
              <TouchableOpacity onPress={() => setResetVisible(false)}>
                <X size={24} color={theme.text.muted} />
              </TouchableOpacity>
            </View>

            {resetSent ? (
              <View style={{ alignItems: "center", paddingVertical: 16 }}>
                <CheckCircle2 size={48} color="#10B981" />
                <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 16, color: theme.text.primary, textAlign: "center", marginTop: 12 }}>
                  Check your inbox
                </Text>
                <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 14, color: theme.text.secondary, textAlign: "center", marginTop: 6 }}>
                  We've sent a password reset link to {resetEmail}.
                </Text>
                <TouchableOpacity onPress={() => setResetVisible(false)} style={{ marginTop: 20 }} activeOpacity={0.85}>
                  <LinearGradient
                    colors={["#F9A8D4", "#F472B6"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40, alignItems: "center" }}
                  >
                    <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 16, color: "#FFFFFF" }}>Done</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 14, color: theme.text.secondary, marginBottom: 16 }}>
                  Enter your email and we'll send you a link to reset your password.
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: isDark ? theme.surfaceAlt : "#FFFFFF",
                    borderRadius: 16,
                    paddingHorizontal: 16,
                    paddingVertical: 4,
                    borderWidth: 1.5,
                    borderColor: isDark ? theme.border : "#FBC8DC",
                  }}
                >
                  <Mail size={20} color="#F9A8D4" />
                  <TextInput
                    style={{
                      flex: 1,
                      fontFamily: "Quicksand-Medium",
                      fontSize: 16,
                      color: theme.text.primary,
                      paddingVertical: 14,
                      marginLeft: 12,
                    }}
                    placeholder="Email address"
                    placeholderTextColor={theme.text.muted}
                    value={resetEmail}
                    onChangeText={setResetEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                {resetError && (
                  <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 13, color: "#EF4444", marginTop: 10 }}>
                    {resetError}
                  </Text>
                )}
                <TouchableOpacity onPress={handleReset} disabled={resetLoading} style={{ marginTop: 20 }} activeOpacity={0.85}>
                  <LinearGradient
                    colors={["#F9A8D4", "#F472B6"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ borderRadius: 16, paddingVertical: 16, alignItems: "center" }}
                  >
                    {resetLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 16, color: "#FFFFFF" }}>
                        Send reset link
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}
