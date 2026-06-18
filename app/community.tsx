import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
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
  Plus,
  X,
} from "lucide-react-native";
import { mockForumPosts } from "../lib/mock-data";
import type { ForumPost } from "../lib/types";
import { useTheme } from "../lib/theme-context";
import { useCommunityStore } from "../lib/stores/community-store";
import { useAuthStore } from "../lib/stores/auth-store";

const categoryConfig: Record<string, { icon: any; color: string }> = {
  tips: { icon: Lightbulb, color: "#F59E0B" },
  support: { icon: Heart, color: "#F472B6" },
  wins: { icon: Award, color: "#10B981" },
  questions: { icon: HelpCircle, color: "#8B5CF6" },
  resources: { icon: BookOpen, color: "#3B82F6" },
};

const POST_CATEGORIES: ForumPost["category"][] = ["tips", "support", "wins", "questions", "resources"];

export default function CommunityScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const { userPosts, addPost, toggleLike, isLiked, bonusLikes, addComment, commentsFor } =
    useCommunityStore();
  const [filterCat, setFilterCat] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Compose-post modal
  const [showCompose, setShowCompose] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCat, setNewCat] = useState<ForumPost["category"]>("support");

  // Comments modal
  const [activePost, setActivePost] = useState<ForumPost | null>(null);
  const [commentText, setCommentText] = useState("");

  const authorName = user?.name || "You";

  const submitPost = () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addPost({
      authorName,
      authorAvatar: user?.avatarUrl
        ? { uri: user.avatarUrl }
        : { uri: "https://api.a0.dev/assets/image?text=friendly%20mom%20avatar&aspect=1:1" },
      title: newTitle.trim(),
      content: newContent.trim(),
      category: newCat,
    });
    setNewTitle("");
    setNewContent("");
    setNewCat("support");
    setShowCompose(false);
  };

  const submitComment = () => {
    if (!activePost || !commentText.trim()) return;
    Haptics.selectionAsync();
    addComment(activePost.id, authorName, commentText.trim());
    setCommentText("");
  };

  const categories = ["all", "tips", "support", "wins", "questions", "resources"];
  const allPosts: ForumPost[] = [...userPosts, ...mockForumPosts];
  const filtered = allPosts.filter((post) => {
    const catMatch = filterCat === "all" || post.category === filterCat;
    const q = searchQuery.toLowerCase();
    const searchMatch =
      !searchQuery ||
      post.title.toLowerCase().includes(q) ||
      post.content.toLowerCase().includes(q);
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
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Header */}
      <LinearGradient
        colors={isDark ? [theme.gradients.mintGlow[0], theme.gradients.mintGlow[1], theme.bg] : ["#D1FAE5", "#ECFDF5", theme.bg]}
        style={{ paddingTop: 60, paddingBottom: 16, paddingHorizontal: 24 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme.text.primary} />
          </TouchableOpacity>
          <View>
            <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 28, color: theme.text.primary }}>
              Community
            </Text>
            <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 14, color: theme.text.secondary }}>
              2,400+ moms sharing & supporting
            </Text>
          </View>
        </View>

        {/* Search */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: isDark ? theme.surfaceAlt : "#FFFFFF",
            borderRadius: 12,
            paddingHorizontal: 14,
            gap: 8,
            marginBottom: 12,
          }}
        >
          <Search size={18} color={theme.text.muted} />
          <TextInput
            style={{
              flex: 1,
              fontFamily: "Quicksand-Medium",
              fontSize: 15,
              color: theme.text.primary,
              paddingVertical: 12,
            }}
            placeholder="Search conversations..."
            placeholderTextColor={theme.text.muted}
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
                  backgroundColor: filterCat === cat ? (config?.color || "#10B981") : theme.surface,
                  marginRight: 8,
                  borderWidth: 1,
                  borderColor: filterCat === cat ? (config?.color || "#10B981") : theme.border,
                }}
              >
                {config && <config.icon size={14} color={filterCat === cat ? "#FFFFFF" : config.color} />}
                <Text
                  style={{
                    fontFamily: "Quicksand-SemiBold",
                    fontSize: 13,
                    color: filterCat === cat ? "#FFFFFF" : theme.text.secondary,
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
            backgroundColor: isDark ? theme.surfaceAlt : "#FEF3C7",
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
          <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 13, color: isDark ? theme.text.secondary : "#92400E", flex: 1 }}>
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
                backgroundColor: theme.surface,
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
                  <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 14, color: theme.text.primary }}>
                    {post.authorName}
                  </Text>
                  <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 12, color: theme.text.muted }}>
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
              <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 16, color: theme.text.primary, marginBottom: 6 }}>
                {post.title}
              </Text>
              <Text
                style={{
                  fontFamily: "Quicksand-Medium",
                  fontSize: 14,
                  color: theme.text.secondary,
                  lineHeight: 22,
                }}
                numberOfLines={3}
              >
                {post.content}
              </Text>

              {/* Actions */}
              <View style={{ flexDirection: "row", gap: 20, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: theme.border }}>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    toggleLike(post.id);
                  }}
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <ThumbsUp
                    size={16}
                    color={isLiked(post.id) ? "#10B981" : theme.text.muted}
                    fill={isLiked(post.id) ? "#10B981" : "transparent"}
                  />
                  <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 13, color: isLiked(post.id) ? "#10B981" : theme.text.muted }}>
                    {post.likes + bonusLikes(post.id)}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setActivePost(post)}
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <MessageCircle size={16} color={theme.text.muted} />
                  <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 13, color: theme.text.muted }}>
                    {post.comments + commentsFor(post.id).length}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Compose FAB */}
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setShowCompose(true);
        }}
        activeOpacity={0.9}
        style={{ position: "absolute", right: 24, bottom: 32, borderRadius: 30, overflow: "hidden", shadowColor: "#10B981", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 }}
      >
        <LinearGradient colors={["#34D399", "#10B981"]} style={{ width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" }}>
          <Plus size={28} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Compose Post Modal */}
      <Modal visible={showCompose} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}>
            <View style={{ backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 22, color: theme.text.primary }}>Share with the community</Text>
                <TouchableOpacity onPress={() => setShowCompose(false)}>
                  <X size={24} color={theme.text.muted} />
                </TouchableOpacity>
              </View>

              {/* Category picker */}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                {POST_CATEGORIES.map((cat) => {
                  const cfg = categoryConfig[cat];
                  const active = newCat === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setNewCat(cat)}
                      style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: active ? cfg.color + "20" : (isDark ? theme.surfaceAlt : "#F3F4F6"), borderWidth: 1, borderColor: active ? cfg.color : theme.border }}
                    >
                      <cfg.icon size={14} color={cfg.color} />
                      <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 13, color: active ? cfg.color : theme.text.secondary, textTransform: "capitalize" }}>{cat}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TextInput
                style={{ fontFamily: "Quicksand-SemiBold", fontSize: 16, color: theme.text.primary, backgroundColor: isDark ? theme.surfaceAlt : "#F9FAFB", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: theme.border, marginBottom: 12 }}
                placeholder="Title"
                placeholderTextColor={theme.text.muted}
                value={newTitle}
                onChangeText={setNewTitle}
              />
              <TextInput
                style={{ fontFamily: "Quicksand-Medium", fontSize: 15, color: theme.text.primary, backgroundColor: isDark ? theme.surfaceAlt : "#F9FAFB", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: theme.border, minHeight: 100, textAlignVertical: "top", marginBottom: 20 }}
                placeholder="What's on your mind, mama?"
                placeholderTextColor={theme.text.muted}
                value={newContent}
                onChangeText={setNewContent}
                multiline
              />

              <TouchableOpacity onPress={submitPost} disabled={!newTitle.trim() || !newContent.trim()} activeOpacity={0.85}>
                <LinearGradient colors={["#34D399", "#10B981"]} style={{ borderRadius: 16, paddingVertical: 16, alignItems: "center", opacity: !newTitle.trim() || !newContent.trim() ? 0.5 : 1 }}>
                  <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 16, color: "#FFFFFF" }}>Post</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Comments Modal */}
      <Modal visible={!!activePost} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}>
            <View style={{ backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 20, paddingBottom: 32, maxHeight: "80%" }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, marginBottom: 12 }}>
                <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 20, color: theme.text.primary }}>Comments</Text>
                <TouchableOpacity onPress={() => { setActivePost(null); setCommentText(""); }}>
                  <X size={24} color={theme.text.muted} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ paddingHorizontal: 24 }} contentContainerStyle={{ paddingBottom: 12 }}>
                {activePost && commentsFor(activePost.id).length === 0 && (
                  <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 14, color: theme.text.muted, textAlign: "center", paddingVertical: 24 }}>
                    Be the first to comment 💬
                  </Text>
                )}
                {activePost && commentsFor(activePost.id).map((c) => (
                  <View key={c.id} style={{ backgroundColor: isDark ? theme.surfaceAlt : "#F9FAFB", borderRadius: 12, padding: 12, marginBottom: 10 }}>
                    <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 13, color: theme.text.primary, marginBottom: 4 }}>{c.author}</Text>
                    <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 14, color: theme.text.secondary, lineHeight: 20 }}>{c.text}</Text>
                  </View>
                ))}
              </ScrollView>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 24, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.border }}>
                <TextInput
                  style={{ flex: 1, fontFamily: "Quicksand-Medium", fontSize: 15, color: theme.text.primary, backgroundColor: isDark ? theme.surfaceAlt : "#F3F4F6", borderRadius: 24, paddingHorizontal: 16, paddingVertical: 12 }}
                  placeholder="Add a supportive comment..."
                  placeholderTextColor={theme.text.muted}
                  value={commentText}
                  onChangeText={setCommentText}
                />
                <TouchableOpacity onPress={submitComment} disabled={!commentText.trim()} activeOpacity={0.85}>
                  <LinearGradient colors={["#34D399", "#10B981"]} style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", opacity: commentText.trim() ? 1 : 0.5 }}>
                    <Send size={18} color="#FFFFFF" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
