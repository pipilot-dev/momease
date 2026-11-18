import { describe, expect, it } from "vitest";
import { rhythmFor } from "../../lib/rhythm-core";

describe("Right now for you", () => {
  const base = { hour: 10, pendingTasks: 3 };
  it("at night it suggests winding down, whatever else is true", () => {
    expect(rhythmFor({ ...base, hour: 22, mood: 0 }).id).toBe("wind-down");
    expect(rhythmFor({ ...base, hour: 3 }).id).toBe("wind-down");
  });
  it("asks for a check-in in the morning if there is none yet, and not in the evening", () => {
    expect(rhythmFor(base).id).toBe("check-in");
    expect(rhythmFor({ ...base, hour: 16 }).id).toBe("reset");
  });
  it("a low mood gets breathing first", () => {
    expect(rhythmFor({ ...base, mood: 1 }).id).toBe("gentle-breath");
    expect(rhythmFor({ ...base, mood: 0, sleepHours: 4 }).id).toBe("gentle-breath");
  });
  it("a short night gets 'pick one must-do' and says how long she slept", () => {
    const r = rhythmFor({ ...base, mood: 2, sleepHours: 5.5 });
    expect(r.id).toBe("short-night");
    expect(r.detail).toContain("5.5");
    expect(rhythmFor({ ...base, mood: 2, sleepHours: 7 }).id).toBe("reset");
  });
  it("a good mood suggests writing it down", () => {
    expect(rhythmFor({ ...base, mood: 4, sleepHours: 8 }).id).toBe("keep-going");
  });
  it("with nothing open on the list it suggests one small thing for her", () => {
    expect(rhythmFor({ ...base, mood: 2, pendingTasks: 0 }).id).toBe("small-win");
  });
  it("every step points at a real screen", () => {
    const routes = new Set<string>();
    for (const hour of [2, 10, 16, 22]) for (const mood of [undefined, 0, 2, 4]) for (const sleepHours of [undefined, 4, 8]) for (const pendingTasks of [0, 3]) routes.add(rhythmFor({ hour, mood, sleepHours, pendingTasks }).route);
    expect([...routes].sort()).toEqual(["/(tabs)/sounds", "/(tabs)/tasks", "/breathe", "/checkin", "/journal"].sort());
  });
});
