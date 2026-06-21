import { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, AppState, type AppStateStatus } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Lock, ScanFace } from "lucide-react-native";
import { useSettingsStore } from "../lib/stores/settings-store";
import { useTheme } from "../lib/theme-context";
import { isBiometricAvailable, biometricLabel, authenticateBiometric } from "../lib/biometrics";
import { PinPad } from "./PinPad";

/**
 * Wraps the app and, when an app-lock PIN is set, gates everything behind an
 * unlock screen — on cold launch and again whenever the app returns from the
 * background. If biometric unlock is enabled, the device prompt (Face ID /
 * fingerprint) fires automatically, with the PIN always available as fallback.
 */
export function LockGate({ children }: { children: React.ReactNode }) {
  const { theme, isDark } = useTheme();
  const { hydrated, pin, locked, biometricEnabled, verifyPin, unlock, lock } = useSettingsStore();
  const [error, setError] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState(0);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioName, setBioName] = useState("Face ID");
  const appState = useRef(AppState.currentState);
  const promptedFor = useRef<boolean>(false);

  // Detect biometric capability once.
  useEffect(() => {
    isBiometricAvailable().then(setBioAvailable);
    biometricLabel().then(setBioName);
  }, []);

  // Re-lock when the app returns to the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      const prev = appState.current;
      appState.current = next;
      if (prev.match(/inactive|background/) && next === "active") lock();
    });
    return () => sub.remove();
  }, [lock]);

  const promptBiometric = async () => {
    const ok = await authenticateBiometric("Unlock MomEase");
    if (ok) {
      setError(null);
      unlock();
    }
  };

  // Auto-prompt biometric each time the app becomes locked.
  useEffect(() => {
    const showing = hydrated && pin && locked;
    if (showing && biometricEnabled && bioAvailable && !promptedFor.current) {
      promptedFor.current = true;
      promptBiometric();
    }
    if (!locked) promptedFor.current = false;
  }, [hydrated, pin, locked, biometricEnabled, bioAvailable]);

  // Avoid flashing app content before we know the lock state.
  if (!hydrated) return <View style={{ flex: 1, backgroundColor: theme.bg }} />;
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

      {biometricEnabled && bioAvailable && (
        <TouchableOpacity
          onPress={promptBiometric}
          activeOpacity={0.8}
          style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 24, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 999, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }}
        >
          <ScanFace size={20} color="#F472B6" />
          <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 15, color: theme.text.primary }}>Unlock with {bioName}</Text>
        </TouchableOpacity>
      )}
    </LinearGradient>
  );
}
