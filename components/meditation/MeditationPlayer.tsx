import { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  Easing,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { Play, Pause, X, Check } from "lucide-react-native";
import type { MeditationSession, MeditationStep } from "../../lib/types";
import { colors } from "../../lib/theme";

const { width } = Dimensions.get("window");
const ORB = Math.min(width * 0.6, 260);

const breathLabel: Record<NonNullable<MeditationStep["breath"]>, string> = {
  in: "Breathe in",
  hold: "Hold",
  out: "Breathe out",
  rest: "Rest",
};

// Target orb scale per breath phase — drives the expand/contract animation.
const breathScale: Record<NonNullable<MeditationStep["breath"]>, number> = {
  in: 1.0,
  hold: 1.0,
  out: 0.62,
  rest: 0.82,
};

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function MeditationPlayer({
  session,
  onClose,
}: {
  session: MeditationSession | null;
  onClose: () => void;
}) {
  const script = session?.script ?? [];
  const total = script.reduce((sum, s) => sum + s.seconds, 0);

  const [stepIndex, setStepIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [done, setDone] = useState(false);

  const scale = useRef(new Animated.Value(0.82)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const soundRef = useRef<Audio.Sound | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepStartElapsed = useRef(0);

  const step = script[stepIndex];

  // ── load + tear down background audio with the modal lifecycle ──
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      } catch {}
      try {
        const { sound } = await Audio.Sound.createAsync(session.audioSource, {
          isLooping: true,
          shouldPlay: true,
          volume: 0.7,
        });
        if (cancelled) {
          await sound.unloadAsync();
          return;
        }
        soundRef.current = sound;
      } catch {}
    })();

    // reset session state
    setStepIndex(0);
    setElapsed(0);
    setIsPlaying(true);
    setDone(false);
    stepStartElapsed.current = 0;

    return () => {
      cancelled = true;
      if (tickRef.current) clearInterval(tickRef.current);
      const s = soundRef.current;
      soundRef.current = null;
      if (s) s.unloadAsync().catch(() => {});
    };
  }, [session]);

  // ── animate the orb whenever the step (breath phase) changes ──
  useEffect(() => {
    if (!step || done) return;
    const target = breathScale[step.breath ?? "rest"];
    Animated.parallel([
      Animated.timing(scale, {
        toValue: target,
        duration: step.seconds * 1000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(glow, {
        toValue: step.breath === "in" || step.breath === "hold" ? 1 : 0.3,
        duration: step.seconds * 1000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      }),
    ]).start();
    if (step.breath === "in") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, [stepIndex, step, done]);

  // ── the per-second clock ──
  useEffect(() => {
    if (!session || done || !isPlaying) return;
    tickRef.current = setInterval(() => {
      setElapsed((e) => {
        const next = e + 1;
        if (next >= total) {
          finish();
          return total;
        }
        return next;
      });
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, done, isPlaying, total]);

  // advance the step pointer as elapsed crosses each step boundary
  useEffect(() => {
    let acc = 0;
    for (let i = 0; i < script.length; i++) {
      acc += script[i].seconds;
      if (elapsed < acc) {
        if (i !== stepIndex) setStepIndex(i);
        break;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed]);

  const finish = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    setDone(true);
    setIsPlaying(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const s = soundRef.current;
    if (s) {
      // gentle fade then stop
      s.setVolumeAsync(0.2).catch(() => {});
      setTimeout(() => s.pauseAsync().catch(() => {}), 600);
    }
    Animated.timing(scale, { toValue: 1, duration: 1200, useNativeDriver: true }).start();
  }, [scale]);

  const togglePlay = useCallback(async () => {
    const s = soundRef.current;
    setIsPlaying((p) => {
      const next = !p;
      if (s) (next ? s.playAsync() : s.pauseAsync()).catch(() => {});
      return next;
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }, []);

  if (!session) return null;

  const remaining = Math.max(0, total - elapsed);
  const progress = total ? elapsed / total : 0;
  const label = step?.breath ? breathLabel[step.breath] : "";

  const glowColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(167,139,250,0.25)", "rgba(167,139,250,0.65)"],
  });

  return (
    <Modal visible animationType="slide" onRequestClose={onClose} transparent={false}>
      <LinearGradient
        colors={["#1E1B2E", "#2A2342", "#1E1B2E"]}
        style={{ flex: 1, paddingTop: 56, paddingHorizontal: 24 }}
      >
        {/* top bar */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 22, color: "#FFFFFF" }}>
              {session.title}
            </Text>
            <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 13, color: "#B8B2D0", marginTop: 2 }}>
              {session.duration} · {session.level}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={{
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: "rgba(255,255,255,0.12)",
              alignItems: "center", justifyContent: "center",
            }}
          >
            <X size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* breathing orb */}
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Animated.View
            style={{
              width: ORB, height: ORB, borderRadius: ORB / 2,
              backgroundColor: glowColor,
              alignItems: "center", justifyContent: "center",
              transform: [{ scale }],
            }}
          >
            <View
              style={{
                width: ORB * 0.72, height: ORB * 0.72, borderRadius: ORB,
                backgroundColor: "rgba(196,181,253,0.35)",
                alignItems: "center", justifyContent: "center",
              }}
            >
              <LinearGradient
                colors={["#C4B5FD", "#A78BFA", "#8B5CF6"]}
                style={{
                  width: ORB * 0.46, height: ORB * 0.46, borderRadius: ORB,
                  alignItems: "center", justifyContent: "center",
                }}
              >
                {done ? (
                  <Check size={44} color="#FFFFFF" />
                ) : (
                  <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 18, color: "#FFFFFF" }}>
                    {label}
                  </Text>
                )}
              </LinearGradient>
            </View>
          </Animated.View>

          {/* cue text */}
          <Text
            style={{
              fontFamily: "Quicksand-SemiBold",
              fontSize: 17,
              color: "#E9E5F8",
              textAlign: "center",
              marginTop: 40,
              minHeight: 48,
              paddingHorizontal: 12,
              lineHeight: 24,
            }}
          >
            {done ? "Session complete 🌿" : step?.text}
          </Text>
        </View>

        {/* progress + controls */}
        <View style={{ paddingBottom: 48 }}>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.15)", overflow: "hidden" }}>
            <View style={{ width: `${progress * 100}%`, height: 6, backgroundColor: "#A78BFA" }} />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
            <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 12, color: "#B8B2D0" }}>{fmt(elapsed)}</Text>
            <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 12, color: "#B8B2D0" }}>-{fmt(remaining)}</Text>
          </View>

          <View style={{ alignItems: "center", marginTop: 24 }}>
            {done ? (
              <TouchableOpacity
                onPress={onClose}
                style={{
                  paddingHorizontal: 40, paddingVertical: 16, borderRadius: 999,
                  backgroundColor: "#A78BFA",
                }}
              >
                <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 16, color: "#FFFFFF" }}>Done</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={togglePlay}
                style={{
                  width: 72, height: 72, borderRadius: 36,
                  backgroundColor: "#A78BFA",
                  alignItems: "center", justifyContent: "center",
                  shadowColor: "#A78BFA", shadowOpacity: 0.5, shadowRadius: 16,
                  shadowOffset: { width: 0, height: 6 },
                }}
              >
                {isPlaying ? <Pause size={30} color="#FFFFFF" fill="#FFFFFF" /> : <Play size={30} color="#FFFFFF" fill="#FFFFFF" />}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>
    </Modal>
  );
}
