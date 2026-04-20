import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  ThumbsUp,
  Send,
  Search,
  TrendingUp,
  Award,
  HelpCircle,
  Lightbulb,
  BookOpen,
} from "lucide-react-native";
import { mockForumPosts } from "../lib/mock-data";

const categoryConfig: Record<string, { icon: any; color: string }> = {
  tips: { icon: Lightbulb, color: "#F59E0B" },
  support: { icon: Heart, color: "#F472B6" },
  wins: { icon: Award, color: "#10B981" },
  questions: { icon: HelpCircle, color: "#8B5CF6" },
  resources: { icon: BookOpen, color: "#3B82F6" },
};

export default function CommunityScreen() {
  const router = useRouter();
  const [filterCat, setFilterCat] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const categories = ["all", "tips", "support", "wins", "questions", "resources"];
  const filtered = mockForumPosts.filter((post) => {
    const catMatch = filterCat === "all" || post.category === filterCat;
    const searchMatch = !searchQuery || post.title.toLowerCase().includes(searchQuery.toLowerCase());
    return catMatch && searchMatch;
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#FDFCFB" }}>
      {/* Header */}
      <LinearGradient
        colors={["#D1FAE5", "#ECFDF5", "#FDFCFB"]}
        style={{ paddingTop: 60, paddingBottom: 16, paddingHorizontal: 24 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#1F2937" />
          </TouchableOpacity>
          <View>
            <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 28, color: "#1F2937" }}>
              Community
            </Text>
            <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 14, color: "#6B7280" }}>
              2,400+ moms sharing & supporting
            </Text>
          </View>
        </View>

        {/* Search */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#FFFFFF",
            borderRadius: 12,
            paddingHorizontal: 14,
            gap: 8,
            marginBottom: 12,
          }}
        >
          <Search size={18} color="#9CA3AF" />
          <TextInput
            style={{
              flex: 1,
              fontFamily: "Quicksand-Medium",
              fontSize: 15,
              color: "#1F2937",
              paddingVertical: 12,
            }}
            placeholder="Search conversations..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Category Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {categories.map((cat) => {
            const config = categoryConfig[cat];
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setFilterCat(cat)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: filterCat === cat ? (config?.color || "#10B981") : "#FFFFFF",
                  marginRight: 8,
                  borderWidth: 1,
                  borderColor: filterCat === cat ? (config?.color || "#10B981") : "#E5E7EB",
                }}
              >
                {config && <config.icon size={14} color={filterCat === cat ? "#FFFFFF" : config.color} />}
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
            );
          })}
        </ScrollView>
      </LinearGradient>

      <ScrollView style={{ flex: 1, paddingHorizontal: 24 }} showsVerticalScrollIndicator={false}>
        {/* Trending Banner */}
        <View
          style={{
            backgroundColor: "#FEF3C7",
            borderRadius: 12,
            padding: 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginTop: 16,
            marginBottom: 20,
          }}
        >
          <TrendingUp size={18} color="#F59E0B" />
          <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 13, color: "#92400E", flex: 1 }}>
            Trending: Sunday meal prep tips are getting lots of love this week!
          </Text>
        </View>

        {/* Posts */}
        {filtered.map((post) => {
          const config = categoryConfig[post.category];
          return (
            <TouchableOpacity
              key={post.id}
              activeOpacity={0.9}
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 16,
                padding: 16,
                marginBottom: 12,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 1,
              }}
            >
              {/* Author */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <Image
                  source={post.authorAvatar}
                  style={{ width: 40, height: 40, borderRadius: 20 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 14, color: "#1F2937" }}>
                    {post.authorName}
                  </Text>
                  <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 12, color: "#9CA3AF" }}>
                    {formatDate(post.createdAt)}
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: config.color + "15",
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 999,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <config.icon size={12} color={config.color} />
                  <Text
                    style={{
                      fontFamily: "Quicksand-SemiBold",
                      fontSize: 11,
                      color: config.color,
                      textTransform: "capitalize",
                    }}
                  >
                    {post.category}
                  </Text>
                </View>
              </View>

              {/* Content */}
              <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 16, color: "#1F2937", marginBottom: 6 }}>
                {post.title}
              </Text>
              <Text
                style={{
                  fontFamily: "Quicksand-Medium",
                  fontSize: 14,
                  color: "#6B7280",
                  lineHeight: 22,
                }}
                numberOfLines={3}
              >
                {post.content}
              </Text>

              {/* Actions */}
              <View style={{ flexDirection: "row", gap: 20, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: "#F3F4F6" }}>
                <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <ThumbsUp size={16} color="#9CA3AF" />
                  <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 13, color: "#9CA3AF" }}>
                    {post.likes}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <MessageCircle size={16} color="#9CA3AF" />
                  <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 13, color: "#9CA3AF" }}>
                    {post.comments}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}
