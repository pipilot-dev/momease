import React, { memo } from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { ArrowRight, ThumbsUp, MessageCircle, LucideIcon } from "lucide-react-native";
import { colors, spacing } from "../../lib/theme";

interface ForumPostProps {
  post: {
    id: string;
    title: string;
    excerpt: string;
    category: string;
    authorName: string;
    authorAvatar: { uri: string };
    createdAt: string;
    likes: number;
    comments: number;
  };
  config: {
    icon: LucideIcon;
    color: string;
  };
  onPress?: () => void;
}

export const ForumPost = memo(function ForumPost({
  post,
  config,
  onPress,
}: ForumPostProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={styles.container}
    >
      <View style={styles.authorRow}>
        <Image
          source={post.authorAvatar}
          style={styles.avatar}
        />
        <View style={styles.authorInfo}>
          <Text style={styles.authorName}>{post.authorName}</Text>
          <Text style={styles.authorDate}>{formatDate(post.createdAt)}</Text>
        </View>
        <View
          style={[styles.categoryBadge, { backgroundColor: config.color + "15" }]}
        >
          <config.icon size={12} color={config.color} />
          <Text style={[styles.categoryText, { color: config.color }]}>
            {post.category}
          </Text>
        </View>
      </View>

      <Text style={styles.title}>{post.title}</Text>
      <Text style={styles.excerpt} numberOfLines={2}>
        {post.excerpt}
      </Text>

      <View style={styles.footer}>
        <View style={styles.stats}>
          <ThumbsUp size={14} color={colors.text.muted} />
          <Text style={styles.statText}>{post.likes}</Text>
          <MessageCircle size={14} color={colors.text.muted} style={styles.statIcon} />
          <Text style={styles.statText}>{post.comments}</Text>
        </View>
        <ArrowRight size={16} color={colors.text.muted} />
      </View>
    </TouchableOpacity>
  );
});

const styles = {
  container: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.base,
    marginBottom: spacing.md,
    shadowColor: "#000" as const,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  authorRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontFamily: "Quicksand-Bold",
    fontSize: 14,
    color: colors.text.primary,
  },
  authorDate: {
    fontFamily: "Quicksand-Medium",
    fontSize: 12,
    color: colors.text.muted,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.xs,
  },
  categoryText: {
    fontFamily: "Quicksand-SemiBold",
    fontSize: 11,
    textTransform: "capitalize" as const,
  },
  title: {
    fontFamily: "Quicksand-Bold",
    fontSize: 16,
    color: colors.text.primary,
    marginBottom: 6,
  },
  excerpt: {
    fontFamily: "Quicksand-Medium",
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  footer: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  stats: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  statText: {
    fontFamily: "Quicksand-Medium",
    fontSize: 12,
    color: colors.text.muted,
  },
  statIcon: {
    marginLeft: spacing.sm,
  },
};