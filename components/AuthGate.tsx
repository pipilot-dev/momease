// AuthGate — the single source of truth for route access.
//
// Expo Router matches every URL directly, so a user hitting /home,
// /onboarding, /breathe, etc. in the browser bypasses the splash and would
// otherwise render protected content without ever authenticating. This
// component wraps the whole Stack and redirects based on:
//
//   authed?    onboarding done?    on public route?    →  action
//   ─────────  ─────────────────   ─────────────────   ───────────────
//   no         (n/a)               yes                 render
//   no         (n/a)               no                  redirect to sign-in
//   yes        no                  onboarding          render
//   yes        no                  anywhere else       redirect to /onboarding
//   yes        yes                 (auth) group        redirect to /(tabs)/home
//   yes        yes                 anywhere else       render
//
// Public routes: "/" (splash) and everything under "/(auth)/".
//
// We wait for `hydrated` before making decisions so a persisted session isn't
// clobbered by a mid-hydration redirect on hard reload.
import { useEffect, useState, type ReactNode } from "react";
import { View } from "react-native";
import { useRouter, useSegments } from "expo-router";
import { useAuthStore } from "../lib/stores/auth-store";
import { authService } from "../lib/auth-service";

export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, user, hydrated } = useAuthStore();
  const [restoreChecked, setRestoreChecked] = useState(false);

  // The stored "signed in" flag is a debounced cache; the session token is the
  // source of truth. Validate it on every start: this restores a lost flag,
  // signs out a revoked/expired/pre-migration session, restarts cloud sync, and
  // keeps the cached user when the server is simply unreachable.
  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    authService
      .restoreSession()
      .then(({ user: restored, offline }) => {
        if (cancelled) return;
        const st = useAuthStore.getState();
        if (restored) st.setUser(restored); // also (re)starts cloud sync after a reload
        else if (!offline && st.isAuthenticated) useAuthStore.setState({ user: null, isAuthenticated: false });
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setRestoreChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated || !restoreChecked) return;

    // segments[] is the route match. Root "/" gives []; "/(auth)/sign-in"
    // gives ["(auth)", "sign-in"]; "/(tabs)/home" gives ["(tabs)", "home"].
    const first = segments[0] as string | undefined;
    const inAuthGroup = first === "(auth)";
    const isSplash = !first; // matches "/"
    const isOnboarding = first === "onboarding";
    const isCallback = first === "auth-callback"; // finishes Google sign-in before we are authed
    const isPublic = isSplash || inAuthGroup || isCallback;

    if (!isAuthenticated) {
      // Splash owns its own redirect flow — don't step on it.
      if (!isPublic) router.replace("/(auth)/sign-in");
      return;
    }

    // Authed from here down.
    if (isCallback) return;
    if (inAuthGroup) {
      router.replace(user?.onboardingCompleted ? "/(tabs)/home" : "/onboarding");
      return;
    }
    if (user && !user.onboardingCompleted && !isOnboarding && !isSplash) {
      router.replace("/onboarding");
    }
  }, [hydrated, restoreChecked, isAuthenticated, user?.onboardingCompleted, segments.join("/")]);

  // Render children unconditionally — the effect's router.replace will swap
  // the mounted route on the next tick. Blocking with a spinner here caused a
  // flash of blank screen on hard reload; letting the outgoing route paint
  // then transitioning is smoother.
  return <View style={{ flex: 1 }}>{children}</View>;
}
