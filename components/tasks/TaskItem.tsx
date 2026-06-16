import React, { memo, useCallback } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import * as Haptics from "expo-haptics";
import {
  CheckCircle2,
  Circle,
  Trash2,
  Sparkles,
  LucideIcon,
  Briefcase,
  Baby,
  Heart,
  Home,
  Stethoscope,
} from "lucide-react-native";
import type { Task } from "../../lib/types";
import { colors, spacing } from "../../lib/theme";

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}
const categoryIcons: Record<Task["category"], LucideIcon> = {
  work: Briefcase,
  family: Baby,
  "self-care": Heart,
  household: Home,
  health: Stethoscope,
};

const categoryColors: Record<Task["category"], string> = {
  work: colors.accent[500],
  family: colors.primary[500],
  "self-care": colors.secondary[500],
  household: colors.warning,
  health: colors.error,
};

const priorityColors: Record<Task["priority"], string> = {
  low: colors.success,
  medium: colors.warning,
  high: "#F97316",
  urgent: colors.error,
};

export const TaskItem = memo(function TaskItem({
  task,
  onToggle,
  onDelete,
}: TaskItemProps) {
  const CatIcon = categoryIcons[task.category];
  const catColor = categoryColors[task.category];
  const isCompleted = task.status === "completed";

  const handleToggle = useCallback(() => {
    onToggle(task.id);
    Haptics.impactAsync(
      isCompleted
        ? Haptics.ImpactFeedbackStyle.Light
        : Haptics.ImpactFeedbackStyle.Medium
    );
  }, [onToggle, task.id, isCompleted]);

  const handleDelete = useCallback(() => {
    onDelete(task.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [onDelete, task.id]);

  return (
    <View
      style={[
        styles.container,
        isCompleted && styles.completed,
      ]}
    >
      <TouchableOpacity onPress={handleToggle} style={styles.checkbox}>
        {isCompleted ? (
          <CheckCircle2 size={24} color={colors.success} fill={colors.success} />
        ) : (
          <Circle size={24} color={colors.text.muted} />
        )}
      </TouchableOpacity>

      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            isCompleted && styles.titleCompleted,
          ]}
          numberOfLines={2}
        >
          {task.title}
        </Text>
        <View style={styles.metaRow}>
          <View style={styles.categoryTag}>
            <CatIcon size={12} color={catColor} />
            <Text style={[styles.categoryText, { color: catColor }]}>
              {task.category}
            </Text>
          </View>
          <View
            style={[
              styles.priorityBadge,
              { backgroundColor: priorityColors[task.priority] + "20" },
            ]}
          >
            <Text
              style={[
                styles.priorityText,
                { color: priorityColors[task.priority] },
              ]}
            >
              {task.priority}
            </Text>
          </View>
          {task.aiSuggested && <Sparkles size={12} color={colors.accent[400]} />}
        </View>
      </View>

      <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
        <Trash2 size={18} color={colors.text.muted} />
      </TouchableOpacity>
    </View>
  );
});

const styles = {
  container: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.base,
    marginBottom: spacing.md,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.md,
    shadowColor: "#000" as const,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  completed: {
    opacity: 0.6,
  },
  checkbox: {
    padding: spacing.xs,
  },
  content: {
    flex: 1,
  },
  title: {
    fontFamily: "Quicksand-SemiBold",
    fontSize: 16,
    color: colors.text.primary,
  },
  titleCompleted: {
    color: colors.text.muted,
    textDecorationLine: "line-through" as const,
  },
  metaRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  categoryTag: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.xs,
  },
  categoryText: {
    fontFamily: "Quicksand-Medium",
    fontSize: 12,
  },
  priorityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
  },
  priorityText: {
    fontFamily: "Quicksand-SemiBold",
    fontSize: 10,
    textTransform: "uppercase" as const,
  },
  deleteButton: {
    padding: spacing.xs,
  },
};