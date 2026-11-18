// "Right now for you": one next step chosen from what the app knows about her day, instead of the same list for everyone.
// Inputs are the time of day, today's check-in mood (0 to 4), last night's sleep, and how many tasks are open.
// Deterministic, so the same day always gives the same suggestion.

export interface RhythmInput {
  /** Local hour, 0 to 23. */
  hour: number;
  /** Today's check-in mood, 0 (very low) to 4 (great). null/undefined = not checked in yet. */
  mood?: number | null;
  /** Hours slept last night, if logged. */
  sleepHours?: number | null;
  /** Open (not finished) tasks. */
  pendingTasks: number;
}

export interface RhythmStep {
  id: "wind-down" | "check-in" | "gentle-breath" | "short-night" | "small-win" | "keep-going" | "reset";
  title: string;
  detail: string;
  route: string;
  minutes: number;
}

const fmtHours = (h: number) => (Number.isInteger(h) ? String(h) : h.toFixed(1));

export function rhythmFor(i: RhythmInput): RhythmStep {
  const night = i.hour >= 21 || i.hour < 5;
  const checkedIn = typeof i.mood === "number";

  if (night) {
    return { id: "wind-down", title: "Wind down for the night", detail: "Put the day down. A calming sound or a short body scan helps your body switch off.", route: "/(tabs)/sounds", minutes: 10 };
  }
  if (!checkedIn && i.hour < 14) {
    return { id: "check-in", title: "Start with a 60-second check-in", detail: "Name how today actually feels. Everything else in the app adapts to it.", route: "/checkin", minutes: 1 };
  }
  if (checkedIn && (i.mood as number) <= 1) {
    return { id: "gentle-breath", title: "Be gentle with yourself", detail: "A low day is allowed. Four slow minutes of breathing first; everything else can wait.", route: "/breathe", minutes: 4 };
  }
  if (typeof i.sleepHours === "number" && i.sleepHours < 6) {
    return { id: "short-night", title: "Short night? Pick one must-do", detail: `You slept ${fmtHours(i.sleepHours)} hours. Choose the one thing that matters today and let the rest wait.`, route: "/(tabs)/tasks", minutes: 3 };
  }
  if (checkedIn && (i.mood as number) >= 3) {
    return { id: "keep-going", title: "Keep hold of the good moment", detail: "Write down what is going well today, so you can find it again on a harder day.", route: "/journal", minutes: 3 };
  }
  if (i.pendingTasks === 0) {
    return { id: "small-win", title: "Add one small thing for you", detail: "Your list is clear. Put one kind thing for yourself on it, like a walk or a warm drink.", route: "/(tabs)/tasks", minutes: 2 };
  }
  return { id: "reset", title: "Take a two-minute reset", detail: "A short breathing pause between tasks makes the rest of the day easier.", route: "/breathe", minutes: 2 };
}
