import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import {
  Play,
  Pause,
  Clock,
  TreePine,
  Waves,
  Music2,
  Brain,
  Volume2,
  X,
  Loader,
} from "lucide-react-native";
import { useLocalSearchParams } from "expo-router";
import { mockSounds, mockMeditations } from "../../lib/mock-data";
import { useAudioStore } from "../../lib/stores/audio-store";
import { MeditationPlayer } from "../../components/meditation/MeditationPlayer";
import type { MeditationSession } from "../../lib/types";
import { useTheme } from "../../lib/theme-context";

const categoryIcons: Record<string, any> = {
  nature: TreePine,
  "white-noise": Volume2,
  lullaby: Music2,
  meditation: Brain,
  ambient: Waves,
};

const SLEEP_OPTIONS = [15, 30, 45, 60];

// Animated equalizer bars shown on the now-playing card.
function Equalizer({ active }: { active: boolean }) {
  const bars = [useRef(new Animated.Value(0.4)).current, useRef(new Animated.Value(0.7)).current, useRef(new Animated.Value(0.5)).current];
  useEffect(() => {
    if (!active) {
      bars.forEach((b) => b.stopAnimation());
      return;
    }
    const loops = bars.map((b, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(b, { toValue: 1, duration: 380 + i * 90, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
          Animated.timing(b, { toValue: 0.3, duration: 380 + i * 90, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [active]);

  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 3, height: 20 }}>
      {bars.map((b, i) => (
        <Animated.View
          key={i}
          style={{
            width: 3,
            borderRadius: 2,
            backgroundColor: "#F9A8D4",
            height: b.interpolate({ inputRange: [0, 1], outputRange: [5, 20] }),
          }}
        />
      ))}
    </View>
  );
}

export default function SoundsScreen() {
  const { theme, isDark } = useTheme();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<"sounds" | "meditate">(
    params.tab === "meditate" ? "meditate" : "sounds"
  );
  const [activeMeditation, setActiveMeditation] = useState<MeditationSession | null>(null);

  const { currentId, isPlaying, isLoading, sleepMinutes, play, toggle, stop, setSleepTimer } =
    useAudioStore();

  const nowPlaying = mockSounds.find((s) => s.id === currentId);

  const handleTap = (id: string, source: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    play(id, source);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Header */}
      <LinearGradient
        colors={
          isDark
            ? [theme.gradients.roseGlow[0], theme.gradients.roseGlow[1], theme.bg]
            : ["#FDE5EC", "#FDF2F8", theme.bg]
        }
        style={{ paddingTop: 60, paddingBottom: 16, paddingHorizontal: 24 }}
      >
        <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 28, color: theme.text.primary }}>
          Calm Space
        </Text>
        <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 14, color: theme.text.secondary, marginTop: 2 }}>
          Sounds & meditations to help you unwind
        </Text>

        {/* Tabs */}
        <View
          style={{
            flexDirection: "row",
            marginTop: 20,
            backgroundColor: theme.surface,
            borderRadius: 12,
            padding: 4,
          }}
        >
          {(["sounds", "meditate"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: activeTab === tab ? "#F9A8D4" : "transparent",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: "Quicksand-Bold",
                  fontSize: 14,
                  color: activeTab === tab ? "#FFFFFF" : theme.text.secondary,
                }}
              >
                {tab === "sounds" ? "Calming Sounds" : "Meditate"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {activeTab === "sounds" ? (
          <View style={{ paddingHorizontal: 24, paddingTop: 16 }}>
            {/* Now Playing */}
            {nowPlaying && (
              <View
                style={{
                  backgroundColor: "#1F2937",
                  borderRadius: 20,
                  padding: 20,
                  marginBottom: 16,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                  <Image
                    source={nowPlaying.imageUrl}
                    style={{ width: 56, height: 56, borderRadius: 12 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 16, color: "#FFFFFF" }}>
                      {nowPlaying.title}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                      <Equalizer active={isPlaying} />
                      <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 12, color: "#9CA3AF" }}>
                        {isPlaying ? "Now playing · looping" : "Paused"}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => toggle()}>
                    <View
                      style={{
                        width: 44, height: 44, borderRadius: 22,
                        backgroundColor: "#F472B6",
                        alignItems: "center", justifyContent: "center",
                      }}
                    >
                      {isPlaying ? (
                        <Pause size={20} color="#fff" fill="#fff" />
                      ) : (
                        <Play size={20} color="#fff" fill="#fff" />
                      )}
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => stop()}>
                    <View
                      style={{
                        width: 36, height: 36, borderRadius: 18,
                        backgroundColor: "rgba(255,255,255,0.12)",
                        alignItems: "center", justifyContent: "center",
                      }}
                    >
                      <X size={18} color="#fff" />
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Sleep timer */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
                  <Clock size={14} color="#9CA3AF" />
                  <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 12, color: "#9CA3AF", marginRight: 4 }}>
                    Sleep timer
                  </Text>
                  {SLEEP_OPTIONS.map((min) => {
                    const on = sleepMinutes === min;
                    return (
                      <TouchableOpacity
                        key={min}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setSleepTimer(on ? null : min);
                        }}
                        style={{
                          paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
                          backgroundColor: on ? "#F472B6" : "rgba(255,255,255,0.1)",
                        }}
                      >
                        <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 12, color: on ? "#fff" : "#D1D5DB" }}>
                          {min}m
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Sound Cards */}
            {mockSounds.map((sound) => {
              const CatIcon = categoryIcons[sound.category] || Volume2;
              const isCurrent = currentId === sound.id;
              const cardPlaying = isCurrent && isPlaying;
              const cardLoading = isCurrent && isLoading;

              return (
                <TouchableOpacity
                  key={sound.id}
                  onPress={() => handleTap(sound.id, sound.audioSource)}
                  activeOpacity={0.9}
                  style={{
                    backgroundColor: theme.surface,
                    borderRadius: 16,
                    marginBottom: 12,
                    flexDirection: "row",
                    overflow: "hidden",
                    borderWidth: isCurrent ? 2 : 0,
                    borderColor: "#F9A8D4",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.04,
                    shadowRadius: 4,
                    elevation: 1,
                  }}
                >
                  <Image source={sound.imageUrl} style={{ width: 80, height: 80 }} />
                  <View style={{ flex: 1, padding: 14, justifyContent: "center" }}>
                    <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 15, color: theme.text.primary }}>
                      {sound.title}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                      <CatIcon size={12} color={theme.text.muted} />
                      <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 12, color: theme.text.muted }}>
                        {sound.category}
                      </Text>
                    </View>
                  </View>
                  <View style={{ justifyContent: "center", paddingRight: 16 }}>
                    <View
                      style={{
                        width: 40, height: 40, borderRadius: 20,
                        backgroundColor: cardPlaying ? "#F472B6" : (isDark ? theme.surfaceAlt : "#F3F4F6"),
                        alignItems: "center", justifyContent: "center",
                      }}
                    >
                      {cardLoading ? (
                        <Loader size={18} color={theme.text.secondary} />
                      ) : cardPlaying ? (
                        <Pause size={18} color="#fff" fill="#fff" />
                      ) : (
                        <Play size={18} color={theme.text.secondary} fill={theme.text.secondary} />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}

            <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 12, color: theme.text.muted, textAlign: "center", marginTop: 8 }}>
              Sounds loop seamlessly — set a timer and drift off.
            </Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 24, paddingTop: 16 }}>
            {/* Meditation Cards */}
            {mockMeditations.map((med) => (
              <TouchableOpacity
                key={med.id}
                activeOpacity={0.9}
                style={{ marginBottom: 16 }}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  stop(); // don't overlap ambient audio with the guided session
                  setActiveMeditation(med);
                }}
              >
                <View style={{ borderRadius: 20, overflow: "hidden" }}>
                  <Image source={med.imageUrl} style={{ width: "100%", height: 160 }} />
                  <LinearGradient
                    colors={["transparent", "rgba(0,0,0,0.7)"]}
                    style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 20 }}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
                      <View style={{ flex: 1 }}>
                        <View
                          style={{
                            backgroundColor: "#FFFFFF30", borderRadius: 999,
                            paddingHorizontal: 10, paddingVertical: 4,
                            alignSelf: "flex-start", marginBottom: 8,
                          }}
                        >
                          <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 11, color: "#FFFFFF", textTransform: "capitalize" }}>
                            {med.category}
                          </Text>
                        </View>
                        <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 18, color: "#FFFFFF" }}>
                          {med.title}
                        </Text>
                        <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 13, color: "#D1D5DB", marginTop: 2 }}>
                          {med.duration} · {med.level}
                        </Text>
                      </View>
                      <View
                        style={{
                          width: 48, height: 48, borderRadius: 24,
                          backgroundColor: "#F472B6",
                          alignItems: "center", justifyContent: "center",
                        }}
                      >
                        <Play size={22} color="#fff" fill="#fff" />
                      </View>
                    </View>
                  </LinearGradient>
                </View>
                <Text
                  style={{
                    fontFamily: "Quicksand-Medium", fontSize: 13, color: theme.text.secondary,
                    marginTop: 8, lineHeight: 20,
                  }}
                >
                  {med.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>

      <MeditationPlayer session={activeMeditation} onClose={() => setActiveMeditation(null)} />
    </View>
  );
}
