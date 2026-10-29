import { describe, expect, it } from "vitest";
import {
  buildWeeklyPlan,
  challengeLabel,
  challengesFor,
  fallbackName,
  goalLabel,
  goalsFor,
  isNotMom,
  personalizedGreeting,
  sanitizeForStage,
  CHALLENGE_META,
  GOAL_META,
  LIFE_STAGE_META,
} from "../../lib/personalization";
import type { LifeStage, PrimaryChallenge, WellnessGoal } from "../../lib/types";

const MOM_ONLY_CHALLENGES: PrimaryChallenge[] = ["guilt", "postpartum-recovery", "co-parenting"];
const MOM_STAGES: LifeStage[] = ["trying", "pregnant", "postpartum", "baby", "toddler", "school-age", "teen"];
const PARENTING_WORDS = /\b(mom|mother|moms|parent|parenting|child|kids?|baby|co-parent)/i;

describe("someone who is not (yet) a mom", () => {
  it("is offered a 'Not a mom (yet)' life stage", () => {
    expect(LIFE_STAGE_META["not-a-mom"].label).toBe("Not a mom (yet)");
    expect(isNotMom("not-a-mom")).toBe(true);
    for (const s of MOM_STAGES) expect(isNotMom(s)).toBe(false);
    expect(isNotMom(undefined)).toBe(false);
  });

  it("never sees parenting-only challenges or goals, and every option she sees has no parenting wording", () => {
    const cs = challengesFor("not-a-mom");
    for (const c of MOM_ONLY_CHALLENGES) expect(cs).not.toContain(c);
    expect(goalsFor("not-a-mom")).not.toContain("mindful-parenting");
    for (const c of cs) expect(challengeLabel(c, "not-a-mom")).not.toMatch(/\b(mom|parent|family|co-parent)/i);
    for (const g of goalsFor("not-a-mom")) {
      const label = goalLabel(g, "not-a-mom");
      if (g === "prepare-motherhood") continue; // the one option that is about motherhood, by design
      expect(label).not.toMatch(PARENTING_WORDS);
    }
    expect(cs).toContain("burnout");
    expect(cs).toContain("planning-ahead");
    expect(goalsFor("not-a-mom")).toContain("prepare-motherhood");
  });

  it("gets neutral wording for options she shares with moms", () => {
    expect(challengeLabel("career-balance", "not-a-mom")).toBe("Work + life feels impossible");
    expect(goalLabel("connect-community", "not-a-mom")).toBe("Connect with others");
  });

  it("gets a plan, headline and greeting for every challenge she can pick, with no parenting copy", () => {
    for (const c of challengesFor("not-a-mom")) {
      const plan = buildWeeklyPlan({ lifeStage: "not-a-mom", primaryChallenge: c, goals: goalsFor("not-a-mom") });
      expect(plan.items.length).toBeGreaterThanOrEqual(4);
      const aboutMotherhood = c === "planning-ahead"; // the one option that is about motherhood, by design
      if (!aboutMotherhood) {
        expect(plan.headline, c).not.toMatch(PARENTING_WORDS);
        expect(plan.intro, c).not.toMatch(/\b(mom|mother|parent|kids?|baby|family)/i);
      }
      const greeting = personalizedGreeting("ada", { lifeStage: "not-a-mom", primaryChallenge: c, goals: [] });
      expect(greeting, c).toMatch(/^Ada/);
      expect(greeting, c).not.toMatch(/\bmoms?\b/i);
      for (const it of plan.items) expect(`${it.title} ${it.detail}`).not.toMatch(/\b(baby|milestone|mom|kids?)\b/i);
    }
  });

  it("falls back to a neutral name", () => {
    expect(fallbackName("not-a-mom")).toBe("Friend");
    expect(fallbackName("toddler")).toBe("Mama");
    expect(personalizedGreeting("", { lifeStage: "not-a-mom", primaryChallenge: "burnout", goals: [] })).toMatch(/^Friend/);
  });

  it("changing stage drops answers that no longer exist for it, and keeps the ones that still do", () => {
    const fromMom = sanitizeForStage({
      lifeStage: "not-a-mom" as LifeStage,
      primaryChallenge: "guilt" as PrimaryChallenge,
      goals: ["mindful-parenting", "better-sleep"] as WellnessGoal[],
    });
    expect(fromMom.primaryChallenge).toBeUndefined();
    expect(fromMom.goals).toEqual(["better-sleep"]);

    const toMom = sanitizeForStage({
      lifeStage: "baby" as LifeStage,
      primaryChallenge: "burnout" as PrimaryChallenge,
      goals: ["prepare-motherhood", "reduce-stress"] as WellnessGoal[],
    });
    expect(toMom.primaryChallenge).toBeUndefined();
    expect(toMom.goals).toEqual(["reduce-stress"]);

    const keep = sanitizeForStage({ lifeStage: "not-a-mom" as LifeStage, primaryChallenge: "sleep" as PrimaryChallenge, goals: ["better-sleep"] as WellnessGoal[] });
    expect(keep.primaryChallenge).toBe("sleep");
  });
});

describe("moms are unaffected", () => {
  it.each(MOM_STAGES)("%s still gets the original parenting options", (stage) => {
    expect(challengesFor(stage)).toEqual(["overwhelm", "sleep", "mental-load", "guilt", "career-balance", "loneliness", "postpartum-recovery", "co-parenting"]);
    expect(goalsFor(stage)).toEqual(["reduce-stress", "better-sleep", "more-me-time", "connect-community", "healthier-habits", "stronger-boundaries", "mindful-parenting"]);
    expect(challengeLabel("career-balance", stage)).toBe(CHALLENGE_META["career-balance"].label);
    expect(goalLabel("connect-community", stage)).toBe(GOAL_META["connect-community"].label);
  });

  it("keeps the original plan copy for moms and for people who skipped onboarding", () => {
    expect(buildWeeklyPlan({ lifeStage: "baby", primaryChallenge: "guilt", goals: [] }).headline).toBe("You're a good mom. Let's practice believing it.");
    expect(buildWeeklyPlan({ lifeStage: "baby", primaryChallenge: "career-balance", goals: [] }).intro).toContain("your work and your family time");
    expect(personalizedGreeting("", { primaryChallenge: "loneliness", goals: [] })).toMatch(/^Mama, you belong here\. There are moms who get it\./);
  });

  it("every challenge and goal has copy (no gaps when a new option is added)", () => {
    const all: PrimaryChallenge[] = [...new Set([...challengesFor("baby"), ...challengesFor("not-a-mom")])];
    for (const c of all) {
      expect(CHALLENGE_META[c]).toBeTruthy();
      expect(buildWeeklyPlan({ primaryChallenge: c, goals: [] }).items.length).toBeGreaterThan(0);
      expect(personalizedGreeting("A", { primaryChallenge: c, goals: [] })).toBeTruthy();
    }
    for (const g of [...goalsFor("baby"), ...goalsFor("not-a-mom")]) expect(GOAL_META[g]).toBeTruthy();
  });
});
