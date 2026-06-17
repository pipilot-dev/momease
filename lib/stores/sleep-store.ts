import { create } from "zustand";
import { attachPersistence } from "../persist";

export interface SleepLog {
  date: string; // YYYY-MM-DD
  hours: number;
  quality: number; // 1-5
  factors: string[];
}

export interface BabySleep {
  lastNightHours: number;
  napsToday: number;
  napDuration: number;
  quality: "rough" | "okay" | "great";
}

type BabySleepUpdater = Partial<BabySleep> | ((prev: BabySleep) => BabySleep);

interface SleepState {
  entries: SleepLog[];
  babySleep: BabySleep;
  hydrated: boolean;
  logSleep: (entry: SleepLog) => void;
  setBabySleep: (updater: BabySleepUpdater) => void;
}

function dayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export const useSleepStore = create<SleepState>((set, get) => ({
  entries: [],
  babySleep: { lastNightHours: 8, napsToday: 2, napDuration: 1.5, quality: "okay" },
  hydrated: false,

  logSleep: (entry) => {
    const today = entry.date || dayKey();
    const others = get().entries.filter((e) => e.date !== today);
    const entries = [{ ...entry, date: today }, ...others].sort((a, b) =>
      b.date.localeCompare(a.date)
    );
    set({ entries });
  },

  // Accepts a partial patch OR a React-style updater so existing call sites work.
  setBabySleep: (updater) =>
    set((s) => ({
      babySleep:
        typeof updater === "function" ? updater(s.babySleep) : { ...s.babySleep, ...updater },
    })),
}));

attachPersistence(
  useSleepStore,
  "momease-sleep",
  (s) => ({ entries: s.entries, babySleep: s.babySleep }),
  { onHydrated: () => useSleepStore.setState({ hydrated: true }) }
);
