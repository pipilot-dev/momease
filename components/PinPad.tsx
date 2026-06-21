import { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, Animated } from "react-native";
import * as Haptics from "expo-haptics";
import { Delete } from "lucide-react-native";
import { useTheme } from "../lib/theme-context";

interface PinPadProps {
  title: string;
  subtitle?: string;
  length?: number;
  error?: string | null;
  /** Change this value to clear the entered digits (e.g. after a wrong PIN). */
  resetToken?: unknown;
  onComplete: (pin: string) => void;
}

export function PinPad({ title, subtitle, length = 4, error, resetToken, onComplete }: PinPadProps) {
  const { theme, isDark } = useTheme();
  const [digits, setDigits] = useState("");
  const shake = useRef(new Animated.Value(0)).current;

  // Clear on reset signal (wrong PIN, step change, etc.)
  useEffect(() => {
    setDigits("");
  }, [resetToken]);

  // Shake the dots when an error appears.
  useEffect(() => {
    if (!error) return;
    setDigits("");
    Animated.sequence([
      Animated.timing(shake, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [error]);

  const press = (d: string) => {
    if (digits.length >= length) return;
    Haptics.selectionAsync();
    const next = digits + d;
    setDigits(next);
    if (next.length === length) {
      // Defer so the last dot paints before the parent reacts.
      setTimeout(() => onComplete(next), 120);
    }
  };

  const backspace = () => {
    if (!digits) return;
    Haptics.selectionAsync();
    setDigits((d) => d.slice(0, -1));
  };

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

  return (
    <View style={{ alignItems: "center" }}>
      <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 24, color: theme.text.primary, textAlign: "center" }}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 15, color: theme.text.secondary, marginTop: 8, textAlign: "center", paddingHorizontal: 24 }}>
          {subtitle}
        </Text>
      ) : null}

      {/* Dots */}
      <Animated.View style={{ flexDirection: "row", gap: 18, marginTop: 32, transform: [{ translateX: shake }] }}>
        {Array.from({ length }).map((_, i) => {
          const filled = i < digits.length;
          return (
            <View
              key={i}
              style={{
                width: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: filled ? (error ? theme.error : "#F472B6") : "transparent",
                borderWidth: 2,
                borderColor: error ? theme.error : filled ? "#F472B6" : theme.border,
              }}
            />
          );
        })}
      </Animated.View>

      <View style={{ height: 22, marginTop: 12 }}>
        {error ? (
          <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 14, color: theme.error }}>{error}</Text>
        ) : null}
      </View>

      {/* Keypad */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", width: 264, justifyContent: "space-between", rowGap: 18, marginTop: 8 }}>
        {keys.map((k, i) => {
          if (k === "") return <View key={i} style={{ width: 72, height: 72 }} />;
          if (k === "del") {
            return (
              <TouchableOpacity key={i} onPress={backspace} style={{ width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" }}>
                <Delete size={26} color={theme.text.secondary} />
              </TouchableOpacity>
            );
          }
          return (
            <TouchableOpacity
              key={i}
              onPress={() => press(k)}
              activeOpacity={0.6}
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isDark ? theme.surfaceAlt : theme.surface,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 26, color: theme.text.primary }}>{k}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
