import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Animated,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  Sparkles,
  Briefcase,
  Baby,
  Heart,
  Home as HomeIcon,
  Stethoscope,
  X,
  Filter,
} from "lucide-react-native";
import { useTaskStore } from "../../lib/stores/task-store";
import type { Task } from "../../lib/types";

const categoryIcons: Record<Task["category"], any> = {
  work: Briefcase,
  family: Baby,
  "self-care": Heart,
  household: HomeIcon,
  health: Stethoscope,
};

const categoryColors: Record<Task["category"], string> = {
  work: "#8B5CF6",
  family: "#F472B6",
  "self-care": "#10B981",
  household: "#F59E0B",
  health: "#EF4444",
};

const priorityColors: Record<Task["priority"], string> = {
  low: "#10B981",
  medium: "#F59E0B",
  high: "#F97316",
  urgent: "#EF4444",
};

export default function TasksScreen() {
  const { tasks, filter, setFilter, toggleComplete, deleteTask, addTask, getFilteredTasks } =
    useTaskStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<Task["category"]>("work");
  const [newPriority, setNewPriority] = useState<Task["priority"]>("medium");

  const filteredTasks = getFilteredTasks();
  const categories: Array<"all" | Task["category"]> = [
    "all",
    "work",
    "family",
    "self-care",
    "household",
    "health",
  ];

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    addTask({
      title: newTitle.trim(),
      category: newCategory,
      priority: newPriority,
      status: "pending",
    });
    setNewTitle("");
    setShowAddModal(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#FDFCFB" }}>
      {/* Header */}
      <LinearGradient
        colors={["#D1FAE5", "#ECFDF5", "#FDFCFB"]}
        style={{ paddingTop: 60, paddingBottom: 16, paddingHorizontal: 24 }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 28, color: "#1F2937" }}>
              My Tasks
            </Text>
            <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 14, color: "#6B7280", marginTop: 2 }}>
              {filteredTasks.filter((t) => t.status !== "completed").length} tasks remaining
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#A7F3D0", "#34D399"]}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#34D399",
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
              onPress={() => setFilter(cat)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: filter === cat ? "#10B981" : "#FFFFFF",
                marginRight: 8,
                borderWidth: 1,
                borderColor: filter === cat ? "#10B981" : "#E5E7EB",
              }}
            >
              <Text
                style={{
                  fontFamily: "Quicksand-SemiBold",
                  fontSize: 13,
                  color: filter === cat ? "#FFFFFF" : "#6B7280",
                  textTransform: "capitalize",
                }}
              >
                {cat === "all" ? "All" : cat.replace("-", " ")}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>

      {/* Task List */}
      <ScrollView style={{ flex: 1, paddingHorizontal: 24 }} showsVerticalScrollIndicator={false}>
        {filteredTasks.map((task) => {
          const CatIcon = categoryIcons[task.category];
          const catColor = categoryColors[task.category];
          const isCompleted = task.status === "completed";

          return (
            <View
              key={task.id}
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 16,
                padding: 16,
                marginBottom: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 1,
                opacity: isCompleted ? 0.6 : 1,
              }}
            >
              {/* Checkbox */}
              <TouchableOpacity onPress={() => toggleComplete(task.id)}>
                {isCompleted ? (
                  <CheckCircle2 size={24} color="#10B981" fill="#10B981" />
                ) : (
                  <Circle size={24} color="#D1D5DB" />
                )}
              </TouchableOpacity>

              {/* Content */}
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: "Quicksand-SemiBold",
                    fontSize: 16,
                    color: isCompleted ? "#9CA3AF" : "#1F2937",
                    textDecorationLine: isCompleted ? "line-through" : "none",
                  }}
                >
                  {task.title}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <CatIcon size={12} color={catColor} />
                    <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 12, color: catColor }}>
                      {task.category}
                    </Text>
                  </View>
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 999,
                      backgroundColor: priorityColors[task.priority] + "20",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Quicksand-SemiBold",
                        fontSize: 10,
                        color: priorityColors[task.priority],
                        textTransform: "uppercase",
                      }}
                    >
                      {task.priority}
                    </Text>
                  </View>
                  {task.aiSuggested && <Sparkles size={12} color="#C4B5FD" />}
                </View>
              </View>

              {/* Delete */}
              <TouchableOpacity onPress={() => deleteTask(task.id)}>
                <Trash2 size={18} color="#D1D5DB" />
              </TouchableOpacity>
            </View>
          );
        })}
        <View style={{ height: 24 }} />
      </ScrollView>

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
              backgroundColor: "#FFFFFF",
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
              <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 22, color: "#1F2937" }}>
                New Task
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Title */}
            <TextInput
              style={{
                fontFamily: "Quicksand-Medium",
                fontSize: 16,
                color: "#1F2937",
                backgroundColor: "#F9FAFB",
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: "#E5E7EB",
                marginBottom: 16,
              }}
              placeholder="What do you need to do?"
              placeholderTextColor="#9CA3AF"
              value={newTitle}
              onChangeText={setNewTitle}
            />

            {/* Category */}
            <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 14, color: "#6B7280", marginBottom: 8 }}>
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
                      backgroundColor: newCategory === cat ? categoryColors[cat] + "20" : "#F9FAFB",
                      borderWidth: 1,
                      borderColor: newCategory === cat ? categoryColors[cat] : "#E5E7EB",
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
            <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 14, color: "#6B7280", marginBottom: 8 }}>
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
                    backgroundColor: newPriority === p ? priorityColors[p] + "20" : "#F9FAFB",
                    borderWidth: 1,
                    borderColor: newPriority === p ? priorityColors[p] : "#E5E7EB",
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
                colors={["#A7F3D0", "#34D399"]}
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
