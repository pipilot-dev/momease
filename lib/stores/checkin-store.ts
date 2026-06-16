import { create } from "zustand";
import { attachPersistence } from "../persist";

export interface CheckinEntry {
  date: string; // YYYY-MM-DD
  mood: number; // 0-4
  gratitude: string;
  intention: string;
}

interface CheckinState {
  entries: CheckinEntry[];
  currentStreak: number;
  longestStreak: number;
  hydrated: boolean;
  todayKey: () => string;
  hasCheckedInToday: () => boolean;
  complete: (entry: Omit<CheckinEntry, "date">) => void;
}

function dayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** Count consecutive days ending today (or yesterday) from sorted entries. */
function computeStreak(entries: CheckinEntry[]): { current: number; longest: number } {
  if (entries.length === 0) return { current: 0, longest: 0 };
  const days = [...new Set(entries.map((e) => e.date))].sort(); // ascending
  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1]);
    const cur = new Date(days[i]);
    const diff = Math.round((cur.getTime() - prev.getTime()) / 86400000);
    run = diff === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  // current streak: walk back from today
  const today = dayKey();
  const yesterday = dayKey(new Date(Date.now() - 86400000));
  const set = new Set(days);
  let current = 0;
  if (set.has(today) || set.has(yesterday)) {
    let cursor = set.has(today) ? new Date() : new Date(Date.now() - 86400000);
    while (set.has(dayKey(cursor))) {
      current++;
      cursor = new Date(cursor.getTime() - 86400000);
    }
  }
  return { current, longest: Math.max(longest, current) };
}

export const useCheckinStore = create<CheckinState>((set, get) => ({
      entries: [],
      currentStreak: 0,
      longestStreak: 0,
      hydrated: false,

      todayKey: () => dayKey(),
      hasCheckedInToday: () => get().entries.some((e) => e.date === dayKey()),

      complete: (entry) => {
        const today = dayKey();
        const others = get().entries.filter((e) => e.date !== today);
        const entries = [{ ...entry, date: today }, ...others].sort((a, b) =>
          b.date.localeCompare(a.date)
        );
        const { current, longest } = computeStreak(entries);
        set({ entries, currentStreak: current, longestStreak: longest });
      },
}));

attachPersistence(
  useCheckinStore,
  "momease-checkin",
  (s) => ({ entries: s.entries, currentStreak: s.currentStreak, longestStreak: s.longestStreak }),
  {
    onHydrated: (state) => {
      const { current, longest } = computeStreak(state.entries);
      useCheckinStore.setState({ currentStreak: current, longestStreak: longest, hydrated: true });
    },
  }
);
