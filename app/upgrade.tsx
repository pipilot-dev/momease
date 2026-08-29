import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Platform, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import {
  ChevronLeft,
  Crown,
  Check,
  Sparkles,
  Wind,
  Music2,
  BookOpen,
  MessageCircle,
  Moon,
  ShieldCheck,
  ExternalLink,
} from "lucide-react-native";
import { useAuthStore } from "../lib/stores/auth-store";
import { useSubscriptionStore } from "../lib/stores/subscription-store";
import { checkoutSession, portalSession, openBillingUrl } from "../lib/billing";
import { useTheme } from "../lib/theme-context";

const FEATURES = [
  { icon: MessageCircle, label: "Unlimited chat with your companion" },
  { icon: Wind, label: "Every guided breathing pattern & meditation" },
  { icon: Music2, label: "Offline sleep sounds & calming playlists" },
  { icon: BookOpen, label: "Unlimited journal entries + gentle prompts" },
  { icon: Moon, label: "Full sleep tracking & insights" },
  { icon: Sparkles, label: "Priority support from real humans" },
];

export default function UpgradeScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { user } = useAuthStore();
  const { status, refresh, loading } = useSubscriptionStore();
  const params = useLocalSearchParams<{ checkout?: string; session_id?: string }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pull fresh status on mount + when we return from a checkout redirect.
  useEffect(() => {
    if (user?.id) refresh(user.id);
  }, [user?.id, refresh]);

  useEffect(() => {
    // Stripe redirects with ?checkout=success once payment intent completes.
    // The webhook may take a moment; poll a few times before giving up.
    if (params.checkout !== "success" || !user?.id) return;
    let cancelled = false;
    (async () => {
      for (let i = 0; i < 6; i++) {
        await refresh(user.id);
        const cur = useSubscriptionStore.getState().status;
        if (cur.premium || cancelled) return;
        await new Promise((r) => setTimeout(r, 1500));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.checkout, user?.id, refresh]);

  const handleUpgrade = async () => {
    if (!user) {
      router.replace("/(auth)/sign-in");
      return;
    }
    setError(null);
    setBusy(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      const { url } = await checkoutSession({ id: user.id, email: user.email });
      await openBillingUrl(url);
    } catch (e) {
      setError((e as Error).message || "Something went wrong. Try again in a moment.");
      setBusy(false);
    }
  };

  const handleManage = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const { url } = await portalSession(user.id);
      await openBillingUrl(url);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  const isPremium = status.premium;
  const isTrialing = status.status === "trialing";
  const headerPadTop = Platform.OS === "ios" ? 52 : 36;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <LinearGradient
        colors={
          isDark
            ? [theme.gradients.roseGlow[0], theme.gradients.roseGlow[1], theme.bg]
            : ["#FDE5EC", "#FDF2F8", theme.bg]
        }
        style={{ paddingTop: headerPadTop, paddingBottom: 20, paddingHorizontal: 16 }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: isDark ? theme.surface : "rgba(255,255,255,0.7)",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 14,
          }}
        >
          <ChevronLeft size={22} color={theme.text.primary} />
        </TouchableOpacity>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "#F472B6",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#F472B6",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.35,
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            <Crown size={22} color="#FFFFFF" fill="#FFFFFF" />
          </View>
          <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 26, color: theme.text.primary }}>
            MomEase Premium
          </Text>
        </View>
        <Text
          style={{
            fontFamily: "Quicksand-Medium",
            fontSize: 15,
            color: theme.text.secondary,
            lineHeight: 21,
          }}
        >
          {isPremium
            ? isTrialing
              ? "You're on the 7-day free trial. Cancel anytime — no surprise charges."
              : "Thank you for supporting MomEase 💛"
            : "Everything you need to feel calm, cared for, and in control — for less than a coffee a month."}
        </Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Price + CTA card */}
        <View
          style={{
            backgroundColor: theme.surface,
            borderRadius: 20,
            padding: 22,
            borderWidth: isPremium ? 0 : 2,
            borderColor: "#F472B6",
            marginBottom: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 3,
          }}
        >
          {isPremium ? (
            <View style={{ alignItems: "center", gap: 6, marginBottom: 16 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: theme.success + "22",
                }}
              >
                <Check size={14} color={theme.success} />
                <Text
                  style={{
                    fontFamily: "Quicksand-Bold",
                    fontSize: 12,
                    color: theme.success,
                    letterSpacing: 0.5,
                  }}
                >
                  {isTrialing ? "TRIAL ACTIVE" : "PREMIUM ACTIVE"}
                </Text>
              </View>
              {status.current_period_end && (
                <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 13, color: theme.text.secondary }}>
                  {status.cancel_at_period_end ? "Ends" : isTrialing ? "Trial ends" : "Renews"}{" "}
                  {new Date(status.current_period_end * 1000).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>
              )}
            </View>
          ) : (
            <View style={{ alignItems: "center", marginBottom: 20 }}>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
                <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 46, color: theme.text.primary }}>
                  $7.99
                </Text>
                <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 16, color: theme.text.secondary }}>
                  /month
                </Text>
              </View>
              <View
                style={{
                  marginTop: 8,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  borderRadius: 999,
                  backgroundColor: theme.accent[500] + "18",
                }}
              >
                <Sparkles size={12} color={theme.accent[500]} />
                <Text
                  style={{
                    fontFamily: "Quicksand-Bold",
                    fontSize: 11,
                    color: theme.accent[500],
                    letterSpacing: 0.4,
                  }}
                >
                  7 DAYS FREE · CANCEL ANYTIME
                </Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            onPress={isPremium ? handleManage : handleUpgrade}
            disabled={busy || loading}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={isPremium ? [theme.accent[400], theme.accent[500]] : ["#F9A8D4", "#F472B6"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 8,
                opacity: busy || loading ? 0.7 : 1,
              }}
            >
              {busy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 16, color: "#FFFFFF" }}>
                    {isPremium ? "Manage subscription" : "Start free trial"}
                  </Text>
                  <ExternalLink size={16} color="#FFFFFF" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {error && (
            <Text
              style={{
                marginTop: 10,
                fontFamily: "Quicksand-Medium",
                fontSize: 13,
                color: theme.error,
                textAlign: "center",
              }}
            >
              {error}
            </Text>
          )}
        </View>

        {/* Features list */}
        <View
          style={{
            backgroundColor: theme.surface,
            borderRadius: 20,
            padding: 20,
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              fontFamily: "Quicksand-Bold",
              fontSize: 12,
              color: theme.text.muted,
              letterSpacing: 1,
              textTransform: "uppercase",
              marginBottom: 14,
            }}
          >
            What you get
          </Text>
          {FEATURES.map((f, i) => (
            <View
              key={i}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingVertical: 10,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: theme.border,
              }}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#F472B6" + "18",
                }}
              >
                <f.icon size={16} color="#F472B6" />
              </View>
              <Text
                style={{
                  flex: 1,
                  fontFamily: "Quicksand-Medium",
                  fontSize: 14,
                  color: theme.text.primary,
                  lineHeight: 20,
                }}
              >
                {f.label}
              </Text>
              <Check size={16} color={theme.success} />
            </View>
          ))}
        </View>

        {/* Trust */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 6 }}>
          <ShieldCheck size={16} color={theme.text.muted} />
          <Text
            style={{
              flex: 1,
              fontFamily: "Quicksand-Medium",
              fontSize: 12,
              color: theme.text.muted,
              lineHeight: 17,
            }}
          >
            Secured by Stripe. Cancel any time from Manage subscription. See our{" "}
            <Text style={{ color: theme.accent[500] }}>privacy policy</Text> and{" "}
            <Text style={{ color: theme.accent[500] }}>terms</Text>.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
