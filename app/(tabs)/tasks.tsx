import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  RefreshControl,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import {
  Plus,
  X,
  ListTodo,
  Briefcase,
  Baby,
  Heart,
  Home as HomeIcon,
  Stethoscope,
} from "lucide-react-native";
import { useTaskStore } from "../../lib/stores/task-store";
import type { Task } from "../../lib/types";
import { colors, gradients } from "../../lib/theme";
import { useFadeIn } from "../../lib/useAnimations";
import { TaskItem } from "../../components/tasks/TaskItem";

// Local constants for modal (needed for icon rendering in modal)
const categoryIcons: Record<Task["category"], any> = {
  work: Briefcase,
  family: Baby,
  "self-care": Heart,
  household: HomeIcon,
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

export default function TasksScreen() {
  const { tasks, filter, setFilter, toggleComplete, deleteTask, addTask, getFilteredTasks } =
    useTaskStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<Task["category"]>("work");
  const [newPriority, setNewPriority] = useState<Task["priority"]>("medium");
  const [refreshing, setRefreshing] = useState(false);

  // Animation using existing hook
  const fadeAnim = useFadeIn(100);

  const filteredTasks = getFilteredTasks();
  const categories: Array<"all" | Task["category"]> = [
    "all",
    "work",
    "family",
    "self-care",
    "household",
    "health",
  ];

  const handleAdd = useCallback(() => {
    if (!newTitle.trim()) return;
    addTask({
      title: newTitle.trim(),
      category: newCategory,
      priority: newPriority,
      status: "pending",
    });
    setNewTitle("");
    setShowAddModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [newTitle, newCategory, newPriority, addTask]);

  const handleToggleComplete = useCallback((id: string) => {
    toggleComplete(id);
  }, [toggleComplete]);

  const handleDeleteTask = useCallback((id: string) => {
    deleteTask(id);
  }, [deleteTask]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <LinearGradient
        colors={[gradients.mintGlow[0], gradients.mintGlow[1], colors.bg]}
        style={{ paddingTop: 60, paddingBottom: 16, paddingHorizontal: 24 }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 28, color: colors.text.primary }}>
              My Tasks
            </Text>
            <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 14, color: colors.text.secondary, marginTop: 2 }}>
              {filteredTasks.filter((t) => t.status !== "completed").length} tasks remaining
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setShowAddModal(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[colors.secondary[400], colors.secondary[500]]}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: colors.secondary[500],
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <Plus size={24} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 16 }}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => {
                setFilter(cat);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: filter === cat ? colors.secondary[500] : colors.surface,
                marginRight: 8,
                borderWidth: 1,
                borderColor: filter === cat ? colors.secondary[500] : colors.primary[200],
              }}
            >
              <Text
                style={{
                  fontFamily: "Quicksand-SemiBold",
                  fontSize: 13,
                  color: filter === cat ? "#FFFFFF" : colors.text.secondary,
                  textTransform: "capitalize",
                }}
              >
                {cat === "all" ? "All" : cat.replace("-", " ")}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>

      {/* Task List or Empty State */}
      <Animated.ScrollView
        style={{ flex: 1, paddingHorizontal: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.secondary[500]}
            colors={[colors.secondary[500]]}
          />
        }
      >
        {/* Empty State */}
        {filteredTasks.length === 0 && (
          <Animated.View style={{ alignItems: "center", paddingTop: 80, opacity: fadeAnim }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: colors.secondary[50],
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <ListTodo size={36} color={colors.secondary[500]} />
            </View>
            <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 20, color: colors.text.primary, marginBottom: 8 }}>
              All Clear!
            </Text>
            <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 15, color: colors.text.secondary, textAlign: "center", paddingHorizontal: 32 }}>
              You have no tasks in this category. Tap + to add a new task
            </Text>
          </Animated.View>
        )}

        {filteredTasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onToggle={handleToggleComplete}
            onDelete={handleDeleteTask}
          />
        ))}
        <View style={{ height: 24 }} />
      </Animated.ScrollView>

      {/* Add Task Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.4)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              paddingBottom: 48,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 22, color: colors.text.primary }}>
                New Task
              </Text>
              <TouchableOpacity onPress={() => {
                setShowAddModal(false);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}>
                <X size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            {/* Title */}
            <TextInput
              style={{
                fontFamily: "Quicksand-Medium",
                fontSize: 16,
                color: colors.text.primary,
                backgroundColor: colors.primary[50],
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: colors.primary[200],
                marginBottom: 16,
              }}
              placeholder="What do you need to do?"
              placeholderTextColor={colors.text.muted}
              value={newTitle}
              onChangeText={setNewTitle}
            />

            {/* Category */}
            <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 14, color: colors.text.secondary, marginBottom: 8 }}>
              Category
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {(Object.keys(categoryIcons) as Task["category"][]).map((cat) => {
                const CatIcon = categoryIcons[cat];
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setNewCategory(cat)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 999,
                      backgroundColor: newCategory === cat ? categoryColors[cat] + "20" : colors.primary[50],
                      borderWidth: 1,
                      borderColor: newCategory === cat ? categoryColors[cat] : colors.primary[200],
                    }}
                  >
                    <CatIcon size={14} color={categoryColors[cat]} />
                    <Text
                      style={{
                        fontFamily: "Quicksand-SemiBold",
                        fontSize: 13,
                        color: categoryColors[cat],
                        textTransform: "capitalize",
                      }}
                    >
                      {cat.replace("-", " ")}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Priority */}
            <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 14, color: colors.text.secondary, marginBottom: 8 }}>
              Priority
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 24 }}>
              {(["low", "medium", "high", "urgent"] as Task["priority"][]).map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setNewPriority(p)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 12,
                    backgroundColor: newPriority === p ? priorityColors[p] + "20" : colors.primary[50],
                    borderWidth: 1,
                    borderColor: newPriority === p ? priorityColors[p] : colors.primary[200],
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Quicksand-SemiBold",
                      fontSize: 13,
                      color: priorityColors[p],
                      textTransform: "capitalize",
                    }}
                  >
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Add Button */}
            <TouchableOpacity onPress={handleAdd} activeOpacity={0.85}>
              <LinearGradient
                colors={[colors.secondary[400], colors.secondary[500]]}
                style={{
                  borderRadius: 16,
                  paddingVertical: 16,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 18, color: "#FFFFFF" }}>
                  Add Task
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
