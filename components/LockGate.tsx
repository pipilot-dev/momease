import { useState, useEffect, useRef } from "react";
import { View, Text, AppState, type AppStateStatus } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Lock } from "lucide-react-native";
import { useSettingsStore } from "../lib/stores/settings-store";
import { useTheme } from "../lib/theme-context";
import { PinPad } from "./PinPad";

/**
 * Wraps the app and, when an app-lock PIN is set, gates everything behind an
 * unlock screen — on cold launch and again whenever the app returns from the
 * background. The PIN itself is verified against the (cloud-synced) hash in the
 * settings store, so it works the same on every signed-in device.
 */
export function LockGate({ children }: { children: React.ReactNode }) {
  const { theme, isDark } = useTheme();
  const { hydrated, pin, locked, verifyPin, unlock, lock } = useSettingsStore();
  const [error, setError] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState(0);
  const appState = useRef(AppState.currentState);

  // Re-lock when the app comes back to the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      const prev = appState.current;
      appState.current = next;
      if (prev.match(/inactive|background/) && next === "active") {
        lock();
      }
    });
    return () => sub.remove();
  }, [lock]);

  // Avoid flashing app content before we know the lock state.
  if (!hydrated) {
    return <View style={{ flex: 1, backgroundColor: theme.bg }} />;
  }

  if (!pin || !locked) return <>{children}</>;

  const handle = async (entered: string) => {
    const ok = await verifyPin(entered);
    if (ok) {
      setError(null);
      unlock();
    } else {
      setError("Incorrect PIN. Try again.");
      setResetToken((t) => t + 1);
    }
  };

  return (
    <LinearGradient
      colors={isDark ? [theme.gradients.roseGlow[0], theme.gradients.roseGlow[1], theme.bg] : ["#FDE5EC", "#FDF2F8", theme.bg]}
      style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}
    >
      <View style={{ alignItems: "center", marginBottom: 28 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#F9A8D4", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
          <Lock size={30} color="#fff" />
        </View>
        <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 22, color: theme.text.primary }}>MomEase</Text>
      </View>
      <PinPad
        title="Enter your PIN"
        subtitle="Your calm space is locked"
        error={error}
        resetToken={resetToken}
        onComplete={handle}
      />
    </LinearGradient>
  );
}
