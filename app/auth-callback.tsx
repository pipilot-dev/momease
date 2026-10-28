// Landing route for Google sign-in. The API redirects here with the session in
// the URL fragment (web: https://app.mease.mom/auth-callback#token=...), and on
// native the deep link momease://auth-callback may also resolve here.
// It stores the token, loads the user, then hands off to the normal flow.
import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { parseCallbackUrl } from "../lib/auth-callback";
import { authService } from "../lib/auth-service";
import { setToken } from "../lib/api";
import { useAuthStore } from "../lib/stores/auth-store";

export default function AuthCallback() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const url =
        Platform.OS === "web" && typeof window !== "undefined" ? window.location.href : await Linking.getInitialURL();
      const { token } = parseCallbackUrl(url ?? "");

      if (Platform.OS === "web" && typeof window !== "undefined") {
        // Never leave the token sitting in the address bar / history.
        window.history.replaceState(null, "", window.location.pathname);
      }

      if (!token) {
        // Native: openAuthSessionAsync already stored the session; just continue.
        const { user } = await authService.restoreSession();
        if (cancelled) return;
        if (user) {
          useAuthStore.getState().setUser(user);
          router.replace(user.onboardingCompleted ? "/(tabs)/home" : "/onboarding");
        } else {
          setFailed(true);
        }
        return;
      }

      await setToken(token);
      const { user } = await authService.restoreSession();
      if (cancelled) return;
      if (!user) {
        await setToken(null);
        setFailed(true);
        return;
      }
      useAuthStore.getState().setUser(user);
      router.replace(user.onboardingCompleted ? "/(tabs)/home" : "/onboarding");
    })().catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!failed) return;
    const t = setTimeout(() => router.replace("/(auth)/sign-in"), 2500);
    return () => clearTimeout(t);
  }, [failed]);

  return (
    <View testID="auth-callback" style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FDE5EC", padding: 24 }}>
      {failed ? (
        <Text testID="auth-callback-error" style={{ color: "#9D174D", fontSize: 16, textAlign: "center" }}>
          We couldn't finish signing you in. Taking you back to sign in…
        </Text>
      ) : (
        <>
          <ActivityIndicator color="#DB2777" />
          <Text style={{ color: "#9D174D", marginTop: 12 }}>Signing you in…</Text>
        </>
      )}
    </View>
  );
}
