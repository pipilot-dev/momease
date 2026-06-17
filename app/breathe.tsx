import { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { ChevronLeft, Play, Pause, RotateCcw, Wind } from "lucide-react-native";
import { useTheme } from "../lib/theme-context";

const { width } = Dimensions.get("window");
const ORB = Math.min(width * 0.62, 260);

type Phase = { label: string; seconds: number; scaleTo: number };

type Pattern = {
  id: string;
  name: string;
  tagline: string;
  gradient: [string, string, string];
  accent: string;
  phases: Phase[];
};

// scaleTo is the orb scale the phase animates *towards* (1 = fully expanded).
const PATTERNS: Pattern[] = [
  {
    id: "box",
    name: "Box Breathing",
    tagline: "Steady focus · 4-4-4-4",
    gradient: ["#EDE9FE", "#DDD6FE", "#F5F3FF"],
    accent: "#8B5CF6",
    phases: [
      { label: "Breathe in", seconds: 4, scaleTo: 1 },
      { label: "Hold", seconds: 4, scaleTo: 1 },
      { label: "Breathe out", seconds: 4, scaleTo: 0.5 },
      { label: "Hold", seconds: 4, scaleTo: 0.5 },
    ],
  },
  {
    id: "calm",
    name: "Calming Breath",
    tagline: "Melt stress away · 4-7-8",
    gradient: ["#FFF1F2", "#FFE4E6", "#FFF7ED"],
    accent: "#F472B6",
    phases: [
      { label: "Breathe in", seconds: 4, scaleTo: 1 },
      { label: "Hold", seconds: 7, scaleTo: 1 },
      { label: "Breathe out", seconds: 8, scaleTo: 0.5 },
    ],
  },
  {
    id: "relax",
    name: "Gentle Relax",
    tagline: "Easy & soothing · 4-6",
    gradient: ["#ECFDF5", "#D1FAE5", "#FDFBF7"],
    accent: "#10B981",
    phases: [
      { label: "Breathe in", seconds: 4, scaleTo: 1 },
      { label: "Breathe out", seconds: 6, scaleTo: 0.5 },
    ],
  },
];

export default function BreatheScreen() {
  const { theme, isDark } = useTheme();
  const colors = theme;
  const router = useRouter();
  const [pattern, setPattern] = useState<Pattern>(PATTERNS[0]);
  const [running, setRunning] = useState(false);
  const [phaseLabel, setPhaseLabel] = useState("Ready?");
  const [count, setCount] = useState(0); // countdown shown in orb
  const [cycles, setCycles] = useState(0);
  const [elapsed, setElapsed] = useState(0); // seconds in session

  const scale = useRef(new Animated.Value(0.5)).current;
  const glow = useRef(new Animated.Value(0.3)).current;
  const runningRef = useRef(false);
  const phaseIdx = useRef(0);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentAnim = useRef<Animated.CompositeAnimation | null>(null);

  const clearTimers = useCallback(() => {
    if (countdownTimer.current) clearInterval(countdownTimer.current);
    if (elapsedTimer.current) clearInterval(elapsedTimer.current);
    countdownTimer.current = null;
    elapsedTimer.current = null;
  }, []);

  const runPhase = useCallback(
    (idx: number) => {
      if (!runningRef.current) return;
      const phase = pattern.phases[idx];
      setPhaseLabel(phase.label);
      setCount(phase.seconds);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

      // Per-phase second-by-second countdown shown inside the orb.
      if (countdownTimer.current) clearInterval(countdownTimer.current);
      let remaining = phase.seconds;
      countdownTimer.current = setInterval(() => {
        remaining -= 1;
        setCount(Math.max(remaining, 0));
        if (remaining <= 0 && countdownTimer.current) {
          clearInterval(countdownTimer.current);
          countdownTimer.current = null;
        }
      }, 1000);

      const anim = Animated.parallel([
        Animated.timing(scale, {
          toValue: phase.scaleTo,
          duration: phase.seconds * 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: phase.scaleTo === 1 ? 0.85 : 0.3,
          duration: phase.seconds * 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]);
      currentAnim.current = anim;
      anim.start(({ finished }) => {
        if (!finished || !runningRef.current) return;
        const next = (idx + 1) % pattern.phases.length;
        if (next === 0) setCycles((c) => c + 1);
        phaseIdx.current = next;
        runPhase(next);
      });
    },
    [pattern, scale, glow]
  );

  const start = useCallback(() => {
    runningRef.current = true;
    setRunning(true);
    if (!elapsedTimer.current) {
      elapsedTimer.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    }
    runPhase(phaseIdx.current);
  }, [runPhase]);

  const pause = useCallback(() => {
    runningRef.current = false;
    setRunning(false);
    setPhaseLabel("Paused");
    currentAnim.current?.stop();
    clearTimers();
  }, [clearTimers]);

  const reset = useCallback(() => {
    runningRef.current = false;
    setRunning(false);
    currentAnim.current?.stop();
    clearTimers();
    phaseIdx.current = 0;
    setPhaseLabel("Ready?");
    setCount(0);
    setCycles(0);
    setElapsed(0);
    Animated.spring(scale, { toValue: 0.5, useNativeDriver: true }).start();
    Animated.timing(glow, { toValue: 0.3, duration: 300, useNativeDriver: true }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }, [clearTimers, scale, glow]);

  // Switching pattern resets the session.
  const choosePattern = (p: Pattern) => {
    if (p.id === pattern.id) return;
    runningRef.current = false;
    setRunning(false);
    currentAnim.current?.stop();
    clearTimers();
    phaseIdx.current = 0;
    setPattern(p);
    setPhaseLabel("Ready?");
    setCount(0);
    setCycles(0);
    setElapsed(0);
    Animated.spring(scale, { toValue: 0.5, useNativeDriver: true }).start();
    Haptics.selectionAsync().catch(() => {});
  };

  useEffect(() => {
    return () => {
      runningRef.current = false;
      currentAnim.current?.stop();
      clearTimers();
    };
  }, [clearTimers]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  // Dark-aware screen gradient: keep the brand-hued pattern gradient in light
  // mode, swap to a tinted dark gradient (by hue) in dark mode.
  const darkPatternGradients: Record<string, [string, string, string]> = {
    box: [theme.gradients.violetDream[0], theme.gradients.violetDream[1], theme.bg],
    calm: [theme.gradients.roseGlow[0], theme.gradients.roseGlow[1], theme.bg],
    relax: [theme.gradients.mintGlow[0], theme.gradients.mintGlow[1], theme.bg],
  };
  const screenGradient = isDark
    ? (darkPatternGradients[pattern.id] || pattern.gradient)
    : pattern.gradient;
  // Surfaces that sit on the light gradient as translucent white -> dark surface.
  const chipBg = isDark ? theme.surfaceAlt : "rgba(255,255,255,0.7)";
  const ctrlBg = isDark ? theme.surfaceAlt : "rgba(255,255,255,0.8)";
  const cardSelectedBg = isDark ? theme.surface : "#FFFFFF";
  const cardBg = isDark ? theme.surfaceAlt : "rgba(255,255,255,0.6)";

  return (
    <LinearGradient colors={screenGradient} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ paddingTop: 60, paddingHorizontal: 24, flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: chipBg,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ChevronLeft size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <View>
            <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 24, color: colors.text.primary }}>Breathe</Text>
            <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 13, color: colors.text.secondary }}>
              A moment of calm, just for you
            </Text>
          </View>
        </View>

        {/* Session stats */}
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 32, marginTop: 24 }}>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 22, color: pattern.accent }}>{cycles}</Text>
            <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 12, color: colors.text.secondary }}>cycles</Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 22, color: pattern.accent }}>
              {mins}:{secs.toString().padStart(2, "0")}
            </Text>
            <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 12, color: colors.text.secondary }}>elapsed</Text>
          </View>
        </View>

        {/* Breathing orb */}
        <View style={{ height: ORB + 80, alignItems: "center", justifyContent: "center", marginVertical: 16 }}>
          {/* Outer glow ring */}
          <Animated.View
            style={{
              position: "absolute",
              width: ORB,
              height: ORB,
              borderRadius: ORB / 2,
              backgroundColor: pattern.accent,
              opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.22] }),
              transform: [{ scale: Animated.multiply(scale, 1.25) }],
            }}
          />
          <Animated.View
            style={{
              width: ORB,
              height: ORB,
              borderRadius: ORB / 2,
              alignItems: "center",
              justifyContent: "center",
              transform: [{ scale }],
              shadowColor: pattern.accent,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.5,
              shadowRadius: 40,
              elevation: 12,
            }}
          >
            <LinearGradient
              colors={[pattern.accent + "F0", pattern.accent + "AA"]}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.8, y: 1 }}
              style={{
                width: ORB,
                height: ORB,
                borderRadius: ORB / 2,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 26, color: "#FFFFFF" }}>{phaseLabel}</Text>
              {count > 0 && (
                <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 48, color: "#FFFFFF", marginTop: 4 }}>{count}</Text>
              )}
              {count === 0 && !running && (
                <Wind size={40} color="#FFFFFF" style={{ marginTop: 8 }} />
              )}
            </LinearGradient>
          </Animated.View>
        </View>

        {/* Controls */}
        <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 20, marginTop: 8 }}>
          <TouchableOpacity
            onPress={reset}
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: ctrlBg,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <RotateCcw size={22} color={colors.text.secondary} />
          </TouchableOpacity>

          <TouchableOpacity onPress={running ? pause : start} activeOpacity={0.85}>
            <LinearGradient
              colors={[pattern.accent, pattern.accent + "CC"]}
              style={{
                width: 84,
                height: 84,
                borderRadius: 42,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: pattern.accent,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.4,
                shadowRadius: 16,
                elevation: 8,
              }}
            >
              {running ? <Pause size={36} color="#FFFFFF" fill="#FFFFFF" /> : <Play size={36} color="#FFFFFF" fill="#FFFFFF" />}
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ width: 56 }} />
        </View>

        {/* Pattern picker */}
        <Text
          style={{
            fontFamily: "Quicksand-Bold",
            fontSize: 13,
            color: colors.text.secondary,
            letterSpacing: 1,
            marginTop: 36,
            marginBottom: 12,
            paddingHorizontal: 24,
          }}
        >
          CHOOSE A RHYTHM
        </Text>
        <View style={{ paddingHorizontal: 24, gap: 12 }}>
          {PATTERNS.map((p) => {
            const selected = p.id === pattern.id;
            return (
              <TouchableOpacity key={p.id} activeOpacity={0.9} onPress={() => choosePattern(p)}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: selected ? cardSelectedBg : cardBg,
                    borderRadius: 16,
                    padding: 16,
                    borderWidth: 2,
                    borderColor: selected ? p.accent : "transparent",
                    gap: 14,
                  }}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: p.accent + "22",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Wind size={22} color={p.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 16, color: colors.text.primary }}>{p.name}</Text>
                    <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 13, color: colors.text.secondary }}>
                      {p.tagline}
                    </Text>
                  </View>
                  {selected && (
                    <View
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: p.accent,
                      }}
                    />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}
