import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowLeft,
  Clock,
  Users,
  ChefHat,
  Baby,
  ChevronDown,
  ChevronUp,
} from "lucide-react-native";
import { mockMealPlans } from "../lib/mock-data";

const categoryColors: Record<string, string> = {
  breakfast: "#F59E0B",
  lunch: "#10B981",
  dinner: "#8B5CF6",
  snack: "#F472B6",
};

export default function MealsScreen() {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState<string>("all");

  const categories = ["all", "breakfast", "lunch", "dinner", "snack"];
  const filtered = filterCat === "all" ? mockMealPlans : mockMealPlans.filter((m) => m.category === filterCat);

  return (
    <View style={{ flex: 1, backgroundColor: "#FDFCFB" }}>
      {/* Header */}
      <LinearGradient
        colors={["#FEF3C7", "#FFFBEB", "#FDFCFB"]}
        style={{ paddingTop: 60, paddingBottom: 16, paddingHorizontal: 24 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#1F2937" />
          </TouchableOpacity>
          <View>
            <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 28, color: "#1F2937" }}>
              Meal Prep
            </Text>
            <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 14, color: "#6B7280", marginTop: 2 }}>
              Quick, healthy meals the whole family will love
            </Text>
          </View>
        </View>

        {/* Category Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setFilterCat(cat)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: filterCat === cat ? "#F59E0B" : "#FFFFFF",
                marginRight: 8,
                borderWidth: 1,
                borderColor: filterCat === cat ? "#F59E0B" : "#E5E7EB",
              }}
            >
              <Text
                style={{
                  fontFamily: "Quicksand-SemiBold",
                  fontSize: 13,
                  color: filterCat === cat ? "#FFFFFF" : "#6B7280",
                  textTransform: "capitalize",
                }}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>

      <ScrollView style={{ flex: 1, paddingHorizontal: 24 }} showsVerticalScrollIndicator={false}>
        {filtered.map((meal) => {
          const isExpanded = expandedId === meal.id;
          const catColor = categoryColors[meal.category] || "#6B7280";

          return (
            <View
              key={meal.id}
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 20,
                marginBottom: 16,
                overflow: "hidden",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <Image source={meal.imageUrl} style={{ width: "100%", height: 160 }} />
              <View style={{ padding: 16 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <View
                    style={{
                      backgroundColor: catColor + "20",
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 999,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Quicksand-Bold",
                        fontSize: 11,
                        color: catColor,
                        textTransform: "uppercase",
                      }}
                    >
                      {meal.category}
                    </Text>
                  </View>
                  {meal.kidFriendly && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        backgroundColor: "#FFF5F9",
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 999,
                      }}
                    >
                      <Baby size={12} color="#F472B6" />
                      <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 10, color: "#F472B6" }}>
                        Kid Friendly
                      </Text>
                    </View>
                  )}
                </View>

                <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 18, color: "#1F2937" }}>
                  {meal.name}
                </Text>
                <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 14, color: "#6B7280", marginTop: 4 }}>
                  {meal.description}
                </Text>

                <View style={{ flexDirection: "row", gap: 16, marginTop: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Clock size={14} color="#9CA3AF" />
                    <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 13, color: "#9CA3AF" }}>
                      {meal.prepTime}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Users size={14} color="#9CA3AF" />
                    <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 13, color: "#9CA3AF" }}>
                      Serves {meal.servings}
                    </Text>
                  </View>
                </View>

                {/* Expand/Collapse */}
                <TouchableOpacity
                  onPress={() => setExpandedId(isExpanded ? null : meal.id)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    marginTop: 16,
                    paddingVertical: 8,
                    backgroundColor: "#F9FAFB",
                    borderRadius: 12,
                  }}
                >
                  <ChefHat size={16} color={catColor} />
                  <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 14, color: catColor }}>
                    {isExpanded ? "Hide Recipe" : "View Recipe"}
                  </Text>
                  {isExpanded ? (
                    <ChevronUp size={16} color={catColor} />
                  ) : (
                    <ChevronDown size={16} color={catColor} />
                  )}
                </TouchableOpacity>

                {isExpanded && (
                  <View style={{ marginTop: 16 }}>
                    <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 15, color: "#1F2937", marginBottom: 8 }}>
                      Ingredients
                    </Text>
                    {meal.ingredients.map((ing, i) => (
                      <View key={i} style={{ flexDirection: "row", gap: 8, marginBottom: 4 }}>
                        <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 14, color: catColor }}>
                          *
                        </Text>
                        <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 14, color: "#4B5563" }}>
                          {ing}
                        </Text>
                      </View>
                    ))}

                    <Text
                      style={{
                        fontFamily: "Quicksand-Bold",
                        fontSize: 15,
                        color: "#1F2937",
                        marginTop: 16,
                        marginBottom: 8,
                      }}
                    >
                      Steps
                    </Text>
                    {meal.steps.map((step, i) => (
                      <View key={i} style={{ flexDirection: "row", gap: 12, marginBottom: 8 }}>
                        <View
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            backgroundColor: catColor + "20",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 12, color: catColor }}>
                            {i + 1}
                          </Text>
                        </View>
                        <Text style={{ flex: 1, fontFamily: "Quicksand-Medium", fontSize: 14, color: "#4B5563", lineHeight: 22 }}>
                          {step}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          );
        })}
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}
