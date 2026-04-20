import { create } from 'zustand';
import {
  MoodEntry,
  loadMoodEntries,
  saveMoodEntry,
  getWellnessStreak,
  WellnessStreak,
} from '../mock-mood';

interface MoodStore {
  entries: MoodEntry[];
  isLoaded: boolean;
  streak: WellnessStreak;
  loadEntries: () => Promise<void>;
  addEntry: (entry: MoodEntry) => Promise<void>;
  getTodayEntry: () => MoodEntry | undefined;
}

export const useMoodStore = create<MoodStore>((set, get) => ({
  entries: [],
  isLoaded: false,
  streak: {
    currentStreak: 0,
    longestStreak: 0,
    lastCheckinDate: '',
  },

  loadEntries: async () => {
    try {
      const entries = await loadMoodEntries();
      const streak = getWellnessStreak(entries);
      set({
        entries,
        streak,
        isLoaded: true,
      });
    } catch (error) {
      console.error('Error loading mood entries:', error);
      set({ isLoaded: true });
    }
  },

  addEntry: async (entry: MoodEntry) => {
    try {
      await saveMoodEntry(entry);

      // Update local state
      const currentEntries = get().entries;

      // Check if we're updating today's entry or adding a new one
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);

      const existingIndex = currentEntries.findIndex((e) => {
        const eDate = new Date(e.date);
        eDate.setHours(0, 0, 0, 0);
        return eDate.getTime() === entryDate.getTime();
      });

      let updatedEntries: MoodEntry[];

      if (existingIndex >= 0) {
        // Update existing entry
        updatedEntries = [...currentEntries];
        updatedEntries[existingIndex] = entry;
      } else {
        // Add new entry
        updatedEntries = [entry, ...currentEntries];
      }

      // Sort by date (newest first)
      updatedEntries.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      // Recalculate streak
      const streak = getWellnessStreak(updatedEntries);

      set({
        entries: updatedEntries,
        streak,
      });
    } catch (error) {
      console.error('Error adding mood entry:', error);
      throw error;
    }
  },

  getTodayEntry: () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const entries = get().entries;

    return entries.find((entry) => {
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate.getTime() === today.getTime();
    });
  },
}));
