import { create } from "zustand";
import type { JournalEntry } from "../mock-journal";
import {
  loadJournalEntries,
  saveJournalEntry as saveToDisk,
  deleteJournalEntry as deleteFromDisk,
} from "../mock-journal";

interface JournalStore {
  entries: JournalEntry[];
  isLoaded: boolean;
  loadEntries: () => Promise<void>;
  addEntry: (entry: JournalEntry) => Promise<void>;
  updateEntry: (id: string, updates: Partial<JournalEntry>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  getFilteredEntries: (search: string, tag?: string) => JournalEntry[];
}

export const useJournalStore = create<JournalStore>((set, get) => ({
  entries: [],
  isLoaded: false,

  loadEntries: async () => {
    try {
      const entries = await loadJournalEntries();
      set({ entries, isLoaded: true });
    } catch (error) {
      console.error("Failed to load journal entries:", error);
      set({ isLoaded: true });
    }
  },

  addEntry: async (entry) => {
    try {
      await saveToDisk(entry);
      set((state) => ({
        entries: [entry, ...state.entries].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        ),
      }));
    } catch (error) {
      console.error("Failed to add journal entry:", error);
      throw error;
    }
  },

  updateEntry: async (id, updates) => {
    try {
      const { entries } = get();
      const existing = entries.find((e) => e.id === id);
      if (!existing) throw new Error("Entry not found");

      const updated: JournalEntry = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      await saveToDisk(updated);
      set((state) => ({
        entries: state.entries.map((e) => (e.id === id ? updated : e)),
      }));
    } catch (error) {
      console.error("Failed to update journal entry:", error);
      throw error;
    }
  },

  deleteEntry: async (id) => {
    try {
      await deleteFromDisk(id);
      set((state) => ({
        entries: state.entries.filter((e) => e.id !== id),
      }));
    } catch (error) {
      console.error("Failed to delete journal entry:", error);
      throw error;
    }
  },

  toggleFavorite: async (id) => {
    try {
      const { entries } = get();
      const entry = entries.find((e) => e.id === id);
      if (!entry) throw new Error("Entry not found");

      const updated: JournalEntry = {
        ...entry,
        isFavorite: !entry.isFavorite,
        updatedAt: new Date().toISOString(),
      };

      await saveToDisk(updated);
      set((state) => ({
        entries: state.entries.map((e) => (e.id === id ? updated : e)),
      }));
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
      throw error;
    }
  },

  getFilteredEntries: (search, tag) => {
    const { entries } = get();

    return entries.filter((entry) => {
      // Search filter (title, content, tags)
      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search ||
        entry.title.toLowerCase().includes(searchLower) ||
        entry.content.toLowerCase().includes(searchLower) ||
        entry.tags.some((t) => t.toLowerCase().includes(searchLower));

      // Tag filter
      const matchesTag = !tag || entry.tags.includes(tag);

      return matchesSearch && matchesTag;
    });
  },
}));
