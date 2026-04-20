import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
  TextInput,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowLeft,
  Baby,
  Plus,
  Star,
  ChevronRight,
  Sparkles,
  Calendar,
  Heart,
  Camera,
  Filter,
  Trophy,
  Milestone as MilestoneIcon,
  Clock,
  X,
  Check,
  Footprints,
  Brain,
  MessageCircle,
  Smile,
  Activity,
  Sparkle,
} from "lucide-react-native";
import { useMilestoneStore } from "../lib/stores/milestone-store";
import {
  getBabyAge,
  getUpcomingMilestones,
  categoryColors,
  categoryLabels,
  milestoneTemplates,
} from "../lib/mock-milestones";
import type { Milestone } from "../lib/types";

const { width } = Dimensions.get("window");

const categoryIcons: Record<string, any> = {
  motor: Footprints,
  language: MessageCircle,
  social: Smile,
  cognitive: Brain,
  health: Activity,
  first: Sparkle,
};

export default function MilestonesScreen() {
  const router = useRouter();
  const {
    baby,
    milestones,
    filter,
    setFilter,
    getFilteredMilestones,
    getCompletedCount,
    addMilestone,
  } = useMilestoneStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"timeline" | "upcoming">("timeline");
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const babyAge = getBabyAge(baby.birthDate);
  const filteredMilestones = getFilteredMilestones();
  const upcoming = getUpcomingMilestones(
    baby.birthDate,
    milestones.filter((m) => m.completed).map((m) => m.title)
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const categories = ["all", "motor", "language", "social", "cognitive", "health", "first"];

  return (
    <View style={{ flex: 1, backgroundColor: "#FDFCFB" }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient
          colors={["#FCE7F3", "#FDF2F8", "#FDFCFB"]}
          style={{ paddingTop: 56, paddingBottom: 20, paddingHorizontal: 24 }}
        >
          {/* Top Bar */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "#FFFFFF80",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ArrowLeft size={20} color="#1F2937" />
            </TouchableOpacity>
            <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 18, color: "#1F2937" }}>
              Baby Milestones
            </Text>
            <TouchableOpacity
              onPress={() => setShowAddModal(true)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "#F472B6",
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#F472B6",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <Plus size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Baby Card */}
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 20,
                padding: 20,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 16,
                elevation: 4,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: "#FCE7F3",
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 3,
                    borderColor: "#F9A8D4",
                  }}
                >
                  <Baby size={28} color="#EC4899" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 22, color: "#1F2937" }}>
                    {baby.name}
                  </Text>
                  <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 14, color: "#6B7280", marginTop: 2 }}>
                    {babyAge.label} old
                  </Text>
                </View>
                <View style={{ alignItems: "center" }}>
                  <View
                    style={{
                      backgroundColor: "#F0FDF4",
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                    }}
                  >
                    <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 20, color: "#10B981", textAlign: "center" }}>
                      {getCompletedCount()}
                    </Text>
                    <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 10, color: "#6B7280" }}>
                      recorded
                    </Text>
                  </View>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={{ marginTop: 16 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                  <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 12, color: "#6B7280" }}>
                    Milestone Progress
                  </Text>
                  <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 12, color: "#F472B6" }}>
                    {getCompletedCount()}/{milestoneTemplates.length}
                  </Text>
                </View>
                <View style={{ height: 8, borderRadius: 4, backgroundColor: "#F3F4F6" }}>
                  <LinearGradient
                    colors={["#F9A8D4", "#F472B6"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      height: 8,
                      borderRadius: 4,
                      width: `${Math.min((getCompletedCount() / milestoneTemplates.length) * 100, 100)}%`,
                    }}
                  />
                </View>
              </View>
            </View>
          </Animated.View>
        </LinearGradient>

        <View style={{ paddingHorizontal: 24 }}>
          {/* Tab Switcher */}
          <View
            style={{
              flexDirection: "row",
              backgroundColor: "#F3F4F6",
              borderRadius: 12,
              padding: 4,
              marginBottom: 20,
            }}
          >
            {(["timeline", "upcoming"] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: activeTab === tab ? "#FFFFFF" : "transparent",
                  shadowColor: activeTab === tab ? "#000" : "transparent",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: activeTab === tab ? 0.08 : 0,
                  shadowRadius: 4,
                  elevation: activeTab === tab ? 2 : 0,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Quicksand-Bold",
                    fontSize: 14,
                    color: activeTab === tab ? "#1F2937" : "#9CA3AF",
                    textAlign: "center",
                  }}
                >
                  {tab === "timeline" ? "Timeline" : "Coming Up"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {activeTab === "timeline" ? (
            <>
              {/* Category Filters */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 20 }}
              >
                {categories.map((cat) => {
                  const isActive = filter === cat;
                  const colors = cat !== "all" ? categoryColors[cat] : null;
                  return (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setFilter(cat as any)}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 20,
                        backgroundColor: isActive
                          ? cat === "all"
                            ? "#1F2937"
                            : colors?.bg
                          : "#F3F4F6",
                        marginRight: 8,
                        borderWidth: isActive && cat !== "all" ? 1.5 : 0,
                        borderColor: isActive && cat !== "all" ? colors?.text : "transparent",
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "Quicksand-SemiBold",
                          fontSize: 13,
                          color: isActive
                            ? cat === "all"
                              ? "#FFFFFF"
                              : colors?.text
                            : "#6B7280",
                        }}
                      >
                        {cat === "all" ? "All" : categoryLabels[cat]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Timeline */}
              <View style={{ paddingBottom: 32 }}>
                {filteredMilestones.map((milestone, index) => {
                  const colors = categoryColors[milestone.category];
                  const IconComp = categoryIcons[milestone.category] || Star;
                  const isLast = index === filteredMilestones.length - 1;

                  return (
                    <View key={milestone.id} style={{ flexDirection: "row", marginBottom: 0 }}>
                      {/* Timeline Line */}
                      <View style={{ alignItems: "center", width: 48 }}>
                        <View
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: colors.bg,
                            alignItems: "center",
                            justifyContent: "center",
                            borderWidth: 2,
                            borderColor: colors.icon,
                            zIndex: 1,
                          }}
                        >
                          <IconComp size={16} color={colors.icon} />
                        </View>
                        {!isLast && (
                          <View
                            style={{
                              width: 2,
                              flex: 1,
                              backgroundColor: "#E5E7EB",
                              minHeight: 20,
                            }}
                          />
                        )}
                      </View>

                      {/* Content */}
                      <View
                        style={{
                          flex: 1,
                          backgroundColor: "#FFFFFF",
                          borderRadius: 16,
                          padding: 16,
                          marginBottom: 12,
                          marginLeft: 8,
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.04,
                          shadowRadius: 8,
                          elevation: 1,
                          borderLeftWidth: 3,
                          borderLeftColor: colors.icon,
                        }}
                      >
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 16, color: "#1F2937" }}>
                              {milestone.title}
                            </Text>
                            {milestone.description && (
                              <Text
                                style={{
                                  fontFamily: "Quicksand-Medium",
                                  fontSize: 13,
                                  color: "#6B7280",
                                  marginTop: 4,
                                  lineHeight: 20,
                                }}
                              >
                                {milestone.description}
                              </Text>
                            )}
                          </View>
                          {milestone.isCustom && (
                            <View
                              style={{
                                backgroundColor: "#FCE7F3",
                                borderRadius: 8,
                                paddingHorizontal: 8,
                                paddingVertical: 3,
                              }}
                            >
                              <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 10, color: "#BE185D" }}>
                                CUSTOM
                              </Text>
                            </View>
                          )}
                        </View>

                        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 10 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Calendar size={12} color="#9CA3AF" />
                            <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 12, color: "#9CA3AF" }}>
                              {new Date(milestone.date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </Text>
                          </View>
                          {milestone.ageAtMilestone && (
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                              <Clock size={12} color="#9CA3AF" />
                              <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 12, color: "#9CA3AF" }}>
                                {milestone.ageAtMilestone}
                              </Text>
                            </View>
                          )}
                          <View
                            style={{
                              backgroundColor: colors.bg,
                              borderRadius: 6,
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                            }}
                          >
                            <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 10, color: colors.text }}>
                              {categoryLabels[milestone.category]}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })}

                {filteredMilestones.length === 0 && (
                  <View style={{ alignItems: "center", paddingVertical: 48 }}>
                    <View
                      style={{
                        width: 80,
                        height: 80,
                        borderRadius: 40,
                        backgroundColor: "#F3F4F6",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 16,
                      }}
                    >
                      <Star size={32} color="#D1D5DB" />
                    </View>
                    <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 18, color: "#6B7280" }}>
                      No milestones yet
                    </Text>
                    <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 14, color: "#9CA3AF", marginTop: 4, textAlign: "center" }}>
                      Tap + to record your baby's{"\n"}first special moment
                    </Text>
                  </View>
                )}
              </View>
            </>
          ) : (
            /* Upcoming Milestones */
            <View style={{ paddingBottom: 32 }}>
              <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 14, color: "#6B7280", marginBottom: 16 }}>
                Based on {baby.name}'s age ({babyAge.label}), here's what to look forward to:
              </Text>
              {upcoming.map((template, index) => {
                const colors = categoryColors[template.category];
                const IconComp = categoryIcons[template.category] || Star;
                return (
                  <TouchableOpacity
                    key={template.id}
                    activeOpacity={0.85}
                    onPress={() => {
                      addMilestone({
                        babyId: baby.id,
                        title: template.title,
                        description: "",
                        category: template.category,
                        date: new Date().toISOString().split("T")[0],
                        ageAtMilestone: babyAge.label,
                        isCustom: false,
                      });
                    }}
                    style={{
                      backgroundColor: "#FFFFFF",
                      borderRadius: 16,
                      padding: 16,
                      marginBottom: 12,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.04,
                      shadowRadius: 8,
                      elevation: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 14,
                    }}
                  >
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: colors.bg,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <IconComp size={20} color={colors.icon} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 15, color: "#1F2937" }}>
                        {template.title}
                      </Text>
                      <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 12, color: "#6B7280", marginTop: 2 }}>
                        {template.description}
                      </Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 }}>
                        <Clock size={11} color="#9CA3AF" />
                        <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 11, color: "#9CA3AF" }}>
                          Typical: ~{template.typicalAgeMonths} months
                        </Text>
                      </View>
                    </View>
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: "#F0FDF4",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Check size={16} color="#10B981" />
                    </View>
                  </TouchableOpacity>
                );
              })}

              {upcoming.length === 0 && (
                <View style={{ alignItems: "center", paddingVertical: 48 }}>
                  <Trophy size={48} color="#F59E0B" />
                  <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 18, color: "#1F2937", marginTop: 16 }}>
                    Amazing progress!
                  </Text>
                  <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 14, color: "#6B7280", marginTop: 4, textAlign: "center" }}>
                    {baby.name} has reached all the upcoming{"\n"}milestones for this age range!
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Milestone Modal */}
      <AddMilestoneModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={(data) => {
          addMilestone(data);
          setShowAddModal(false);
        }}
        babyId={baby.id}
        babyAge={babyAge.label}
      />
    </View>
  );
}

// ─── Add Milestone Modal ────────────────────────────────────────
function AddMilestoneModal({
  visible,
  onClose,
  onAdd,
  babyId,
  babyAge,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (data: Omit<Milestone, "id" | "completed">) => void;
  babyId: string;
  babyAge: string;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Milestone["category"]>("first");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const categories: { key: Milestone["category"]; label: string }[] = [
    { key: "first", label: "Special First" },
    { key: "motor", label: "Motor Skills" },
    { key: "language", label: "Language" },
    { key: "social", label: "Social" },
    { key: "cognitive", label: "Cognitive" },
    { key: "health", label: "Health" },
  ];

  const handleAdd = () => {
    if (!title.trim()) return;
    onAdd({
      babyId,
      title: title.trim(),
      description: description.trim(),
      category,
      date,
      ageAtMilestone: babyAge,
      isCustom: true,
    });
    setTitle("");
    setDescription("");
    setCategory("first");
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.4)",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 20,
            paddingHorizontal: 24,
            paddingBottom: 40,
            maxHeight: "85%",
          }}
        >
          {/* Modal Header */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 20, color: "#1F2937" }}>
              Record a Milestone
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Handle bar */}
          <View
            style={{
              position: "absolute",
              top: 8,
              left: "50%",
              marginLeft: -20,
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: "#D1D5DB",
            }}
          />

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Title */}
            <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 14, color: "#4B5563", marginBottom: 8 }}>
              What happened?
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., First time at the beach"
              placeholderTextColor="#9CA3AF"
              style={{
                backgroundColor: "#F9FAFB",
                borderRadius: 12,
                padding: 14,
                fontFamily: "Quicksand-Medium",
                fontSize: 15,
                color: "#1F2937",
                borderWidth: 1.5,
                borderColor: "#E5E7EB",
                marginBottom: 16,
              }}
            />

            {/* Description */}
            <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 14, color: "#4B5563", marginBottom: 8 }}>
              Tell the story (optional)
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Write a little memory about this moment..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              style={{
                backgroundColor: "#F9FAFB",
                borderRadius: 12,
                padding: 14,
                fontFamily: "Quicksand-Medium",
                fontSize: 15,
                color: "#1F2937",
                borderWidth: 1.5,
                borderColor: "#E5E7EB",
                marginBottom: 16,
                minHeight: 80,
                textAlignVertical: "top",
              }}
            />

            {/* Category */}
            <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 14, color: "#4B5563", marginBottom: 8 }}>
              Category
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {categories.map((cat) => {
                const isActive = category === cat.key;
                const colors = categoryColors[cat.key];
                return (
                  <TouchableOpacity
                    key={cat.key}
                    onPress={() => setCategory(cat.key)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 20,
                      backgroundColor: isActive ? colors.bg : "#F3F4F6",
                      borderWidth: isActive ? 1.5 : 0,
                      borderColor: isActive ? colors.text : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Quicksand-SemiBold",
                        fontSize: 13,
                        color: isActive ? colors.text : "#6B7280",
                      }}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Date */}
            <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 14, color: "#4B5563", marginBottom: 8 }}>
              Date
            </Text>
            <TextInput
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9CA3AF"
              style={{
                backgroundColor: "#F9FAFB",
                borderRadius: 12,
                padding: 14,
                fontFamily: "Quicksand-Medium",
                fontSize: 15,
                color: "#1F2937",
                borderWidth: 1.5,
                borderColor: "#E5E7EB",
                marginBottom: 24,
              }}
            />

            {/* Add Button */}
            <TouchableOpacity
              onPress={handleAdd}
              activeOpacity={0.9}
              style={{ borderRadius: 16, overflow: "hidden" }}
            >
              <LinearGradient
                colors={["#F472B6", "#EC4899"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  paddingVertical: 16,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Sparkles size={18} color="#FFFFFF" />
                <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 16, color: "#FFFFFF" }}>
                  Save This Memory
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
