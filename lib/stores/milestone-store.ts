import { create } from "zustand";
import type { Milestone, BabyProfile } from "../types";
import { attachPersistence } from "../persist";

// A neutral default baby profile so the tracker renders before the parent
// personalizes it — no demo persona, just an editable placeholder.
const defaultBaby: BabyProfile = {
  id: "baby_1",
  name: "Baby",
  birthDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 180).toISOString().slice(0, 10),
  gender: "girl",
};

interface MilestoneState {
  baby: BabyProfile;
  milestones: Milestone[];
  filter: "all" | Milestone["category"];

  addMilestone: (milestone: Omit<Milestone, "id" | "completed">) => void;
  updateMilestone: (id: string, updates: Partial<Milestone>) => void;
  deleteMilestone: (id: string) => void;
  setFilter: (filter: "all" | Milestone["category"]) => void;
  updateBaby: (updates: Partial<BabyProfile>) => void;
  getFilteredMilestones: () => Milestone[];
  getCompletedCount: () => number;
  getMilestonesByCategory: (category: Milestone["category"]) => Milestone[];
}

export const useMilestoneStore = create<MilestoneState>((set, get) => ({
  baby: { ...defaultBaby },
  // New users start with no logged milestones — they add their own.
  milestones: [],
  filter: "all",

  addMilestone: (data) => {
    const newMilestone: Milestone = {
      ...data,
      id: `m_${Date.now()}`,
      completed: true,
    };
    set((state) => ({ milestones: [newMilestone, ...state.milestones] }));
  },

  updateMilestone: (id, updates) => {
    set((state) => ({
      milestones: state.milestones.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    }));
  },

  deleteMilestone: (id) => {
    set((state) => ({ milestones: state.milestones.filter((m) => m.id !== id) }));
  },

  setFilter: (filter) => set({ filter }),

  updateBaby: (updates) => {
    set((state) => ({ baby: { ...state.baby, ...updates } }));
  },

  getFilteredMilestones: () => {
    const { milestones, filter } = get();
    if (filter === "all") return milestones.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return milestones
      .filter((m) => m.category === filter)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  getCompletedCount: () => get().milestones.filter((m) => m.completed).length,

  getMilestonesByCategory: (category) =>
    get().milestones.filter((m) => m.category === category),
}));

attachPersistence(useMilestoneStore, "momease-milestones", (s) => ({
  baby: s.baby,
  milestones: s.milestones,
}));
