import { create } from "zustand";
import type { Task } from "../types";
import { mockTasks } from "../mock-data";

interface TaskState {
  tasks: Task[];
  filter: "all" | Task["category"];
  statusFilter: "all" | Task["status"];

  addTask: (task: Omit<Task, "id" | "createdAt">) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleComplete: (id: string) => void;
  setFilter: (filter: "all" | Task["category"]) => void;
  setStatusFilter: (filter: "all" | Task["status"]) => void;
  getFilteredTasks: () => Task[];
  getTasksByCategory: (category: Task["category"]) => Task[];
  getCompletedCount: () => number;
  getPendingCount: () => number;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [...mockTasks],
  filter: "all",
  statusFilter: "all",

  addTask: (taskData) => {
    const newTask: Task = {
      ...taskData,
      id: `t_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ tasks: [newTask, ...state.tasks] }));
  },

  updateTask: (id, updates) => {
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
  },

  deleteTask: (id) => {
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
  },

  toggleComplete: (id) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id
          ? {
              ...t,
              status: t.status === "completed" ? "pending" : "completed",
              completedAt: t.status === "completed" ? undefined : new Date().toISOString(),
            }
          : t
      ),
    }));
  },

  setFilter: (filter) => set({ filter }),
  setStatusFilter: (filter) => set({ statusFilter: filter }),

  getFilteredTasks: () => {
    const { tasks, filter, statusFilter } = get();
    return tasks.filter((t) => {
      const categoryMatch = filter === "all" || t.category === filter;
      const statusMatch = statusFilter === "all" || t.status === statusFilter;
      return categoryMatch && statusMatch;
    });
  },

  getTasksByCategory: (category) => {
    return get().tasks.filter((t) => t.category === category);
  },

  getCompletedCount: () => get().tasks.filter((t) => t.status === "completed").length,
  getPendingCount: () => get().tasks.filter((t) => t.status !== "completed").length,
}));
