import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft, LucideIcon } from "lucide-react-native";
import { colors, gradients, spacing } from "../../lib/theme";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  gradient?: keyof typeof gradients;
  showBack?: boolean;
  rightAction?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  gradient = "freshStart",
  showBack = true,
  rightAction,
}: PageHeaderProps) {
  const router = useRouter();

  return (
    <LinearGradient
      colors={gradients[gradient] as [string, string, string]}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.leftSection}>
          {showBack && (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ArrowLeft size={24} color={colors.text.primary} />
            </TouchableOpacity>
          )}
          <View>
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
        </View>
        {rightAction && <View style={styles.rightSection}>{rightAction}</View>}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 60,
    paddingBottom: spacing.base,
    paddingHorizontal: spacing.lg,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
  },
  backButton: {
    padding: spacing.xs,
  },
  title: {
    fontFamily: "Quicksand-Bold",
    fontSize: 28,
    color: colors.text.primary,
  },
  subtitle: {
    fontFamily: "Quicksand-Medium",
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 2,
  },
  rightSection: {
    flexShrink: 0,
  },
});
