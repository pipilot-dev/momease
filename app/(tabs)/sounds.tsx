import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Play,
  Pause,
  Clock,
  TreePine,
  Waves,
  CloudRain,
  Music2,
  Brain,
  Volume2,
} from "lucide-react-native";
import { mockSounds, mockMeditations } from "../../lib/mock-data";

const { width } = Dimensions.get("window");

const categoryIcons: Record<string, any> = {
  nature: TreePine,
  "white-noise": Volume2,
  lullaby: Music2,
  meditation: Brain,
  ambient: Waves,
};

export default function SoundsScreen() {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"sounds" | "meditate">("sounds");

  const togglePlay = (id: string) => {
    setPlayingId(playingId === id ? null : id);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#FDFCFB" }}>
      {/* Header */}
      <LinearGradient
        colors={["#FDE5EC", "#FDF2F8", "#FDFCFB"]}
        style={{ paddingTop: 60, paddingBottom: 16, paddingHorizontal: 24 }}
      >
        <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 28, color: "#1F2937" }}>
          Calm Space
        </Text>
        <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 14, color: "#6B7280", marginTop: 2 }}>
          Sounds & meditations to help you unwind
        </Text>

        {/* Tabs */}
        <View
          style={{
            flexDirection: "row",
            marginTop: 20,
            backgroundColor: "#FFFFFF",
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
                  color: activeTab === tab ? "#FFFFFF" : "#6B7280",
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
            {playingId && (
              <View
                style={{
                  backgroundColor: "#1F2937",
                  borderRadius: 20,
                  padding: 20,
                  marginBottom: 24,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <Image
                  source={mockSounds.find((s) => s.id === playingId)?.imageUrl}
                  style={{ width: 56, height: 56, borderRadius: 12 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 16, color: "#FFFFFF" }}>
                    {mockSounds.find((s) => s.id === playingId)?.title}
                  </Text>
                  <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 12, color: "#9CA3AF" }}>
                    Now Playing
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setPlayingId(null)}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: "#F472B6",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Pause size={20} color="#fff" fill="#fff" />
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Sound Cards */}
            {mockSounds.map((sound) => {
              const CatIcon = categoryIcons[sound.category] || Volume2;
              const isPlaying = playingId === sound.id;

              return (
                <TouchableOpacity
                  key={sound.id}
                  onPress={() => togglePlay(sound.id)}
                  activeOpacity={0.9}
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: 16,
                    marginBottom: 12,
                    flexDirection: "row",
                    overflow: "hidden",
                    borderWidth: isPlaying ? 2 : 0,
                    borderColor: "#F9A8D4",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.04,
                    shadowRadius: 4,
                    elevation: 1,
                  }}
                >
                  <Image
                    source={sound.imageUrl}
                    style={{ width: 80, height: 80 }}
                  />
                  <View
                    style={{
                      flex: 1,
                      padding: 14,
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 15, color: "#1F2937" }}>
                      {sound.title}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                      <CatIcon size={12} color="#9CA3AF" />
                      <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 12, color: "#9CA3AF" }}>
                        {sound.category}
                      </Text>
                      <Clock size={12} color="#9CA3AF" />
                      <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 12, color: "#9CA3AF" }}>
                        {sound.duration}
                      </Text>
                    </View>
                  </View>
                  <View style={{ justifyContent: "center", paddingRight: 16 }}>
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: isPlaying ? "#F472B6" : "#F3F4F6",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {isPlaying ? (
                        <Pause size={18} color="#fff" fill="#fff" />
                      ) : (
                        <Play size={18} color="#6B7280" fill="#6B7280" />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={{ paddingHorizontal: 24, paddingTop: 16 }}>
            {/* Meditation Cards */}
            {mockMeditations.map((med) => (
              <TouchableOpacity
                key={med.id}
                activeOpacity={0.9}
                style={{ marginBottom: 16 }}
              >
                <View style={{ borderRadius: 20, overflow: "hidden" }}>
                  <Image
                    source={med.imageUrl}
                    style={{ width: "100%", height: 160 }}
                  />
                  <LinearGradient
                    colors={["transparent", "rgba(0,0,0,0.7)"]}
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      padding: 20,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "flex-end",
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <View
                          style={{
                            backgroundColor: "#FFFFFF30",
                            borderRadius: 999,
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            alignSelf: "flex-start",
                            marginBottom: 8,
                          }}
                        >
                          <Text
                            style={{
                              fontFamily: "Quicksand-SemiBold",
                              fontSize: 11,
                              color: "#FFFFFF",
                              textTransform: "capitalize",
                            }}
                          >
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
                          width: 48,
                          height: 48,
                          borderRadius: 24,
                          backgroundColor: "#F472B6",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Play size={22} color="#fff" fill="#fff" />
                      </View>
                    </View>
                  </LinearGradient>
                </View>
                <Text
                  style={{
                    fontFamily: "Quicksand-Medium",
                    fontSize: 13,
                    color: "#6B7280",
                    marginTop: 8,
                    lineHeight: 20,
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
    </View>
  );
}
