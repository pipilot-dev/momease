import React, { memo } from "react";
import { View, Text } from "react-native";
import { Heart } from "lucide-react-native";
import { colors, spacing } from "../../lib/theme";

interface ChatMessageProps {
  content: string;
  role: "user" | "assistant";
  timestamp: number;
}

export const ChatMessage = memo(function ChatMessage({
  content,
  role,
  timestamp,
}: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <View
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.assistantContainer,
      ]}
    >
      {!isUser && (
        <View style={styles.avatarRow}>
          <Heart size={12} color={colors.accent[400]} fill={colors.accent[400]} />
          <Text style={styles.avatarText}>MomEase AI</Text>
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        <Text style={[styles.content, isUser && styles.userContent]}>
          {content}
        </Text>
      </View>
      <Text style={[styles.timestamp, isUser && styles.timestampUser]}>
        {new Date(timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </Text>
    </View>
  );
});

const styles = {
  container: {
    maxWidth: "80%" as const,
    marginBottom: spacing.md,
  },
  userContainer: {
    alignSelf: "flex-end" as const,
  },
  assistantContainer: {
    alignSelf: "flex-start" as const,
  },
  avatarRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  avatarText: {
    fontFamily: "Quicksand-SemiBold",
    fontSize: 11,
    color: colors.text.muted,
  },
  bubble: {
    borderRadius: 20,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  userBubble: {
    backgroundColor: colors.primary[500],
    borderBottomRightRadius: 4,
    borderBottomLeftRadius: 20,
  },
  assistantBubble: {
    backgroundColor: colors.surface,
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 4,
  },
  content: {
    fontFamily: "Quicksand-Medium",
    fontSize: 15,
    color: colors.text.primary,
    lineHeight: 22,
  },
  userContent: {
    color: "#FFFFFF",
  },
  timestamp: {
    fontFamily: "Quicksand-Medium",
    fontSize: 10,
    color: colors.text.muted,
    marginTop: spacing.xs,
    alignSelf: "flex-start" as const,
  },
  timestampUser: {
    alignSelf: "flex-end" as const,
  },
};
