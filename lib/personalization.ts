// Personalization engine.
//
// Turns the onboarding answers (life stage + primary challenge + goals) into
// a concrete weekly action plan, greeting tone, and content mix that drives
// the dashboard. Deterministic — the same answers always produce the same
// plan — so we can demo confidently and iterate without surprises.
import type { LifeStage, PrimaryChallenge, WellnessGoal, Personalization } from "./types";

export interface ActionItem {
  id: string;
  title: string;
  detail: string;
  // Icon name from lucide-react-native. Rendered by the caller so we can keep
  // this file free of RN imports.
  icon:
    | "Wind"
    | "Moon"
    | "Heart"
    | "BookOpen"
    | "MessageCircle"
    | "Music"
    | "Users"
    | "Sparkles"
    | "Smile"
    | "Baby"
    | "Sun"
    | "ListTodo";
  accent: "coral" | "mint" | "violet" | "rose" | "amber";
  route: string;
  minutes: number;
}

export interface WeeklyPlan {
  headline: string;
  intro: string;
  items: ActionItem[];
  focusChallenge?: PrimaryChallenge;
  stageLabel?: string;
}

/** Human labels for the life-stage picker + dashboard chrome. */
export const LIFE_STAGE_META: Record<LifeStage, { label: string; blurb: string; emoji?: string }> = {
  trying: { label: "Trying to conceive", blurb: "The waiting can be heavy — we've got you." },
  pregnant: { label: "Pregnant", blurb: "Growing a human is real work. Let's care for you first." },
  postpartum: { label: "Just gave birth", blurb: "The 4th trimester is intense. Small wins count." },
  baby: { label: "Mom to a baby (0–1yr)", blurb: "The sleep, the feeds, the love. All of it." },
  toddler: { label: "Mom to a toddler (1–3yr)", blurb: "Big feelings, tiny humans, endless energy." },
  "school-age": { label: "Mom to school-age kids", blurb: "Balancing schedules, growth, and independence." },
  teen: { label: "Mom to a teen", blurb: "New chapter — you're still their safe place." },
  "not-a-mom": { label: "Not a mom (yet)", blurb: "Just here to feel calmer, sleep better and look after me." },
};

/** True for someone who is not (yet) a mom: she gets general wellbeing content, no parenting copy. */
export function isNotMom(stage?: LifeStage): boolean {
  return stage === "not-a-mom";
}

/** Name used when we have none. */
export function fallbackName(stage?: LifeStage): string {
  return isNotMom(stage) ? "Friend" : "Mama";
}

export const CHALLENGE_META: Record<PrimaryChallenge, { label: string; icon: string }> = {
  overwhelm: { label: "I feel overwhelmed most days", icon: "Waves" },
  sleep: { label: "I'm exhausted / sleep is broken", icon: "Moon" },
  "mental-load": { label: "The mental load is crushing me", icon: "Brain" },
  guilt: { label: "Mom guilt eats at me", icon: "Heart" },
  "career-balance": { label: "Work + family feels impossible", icon: "Briefcase" },
  loneliness: { label: "I feel isolated / need connection", icon: "Users" },
  "postpartum-recovery": { label: "I'm recovering physically & emotionally", icon: "Sparkles" },
  "co-parenting": { label: "Co-parenting is stressful", icon: "MessageCircle" },
  burnout: { label: "I'm burned out / running on empty", icon: "Waves" },
  "self-care": { label: "I want a real self-care routine", icon: "Sparkles" },
  "planning-ahead": { label: "I'm planning ahead for motherhood", icon: "Heart" },
};

export const GOAL_META: Record<WellnessGoal, { label: string; icon: string }> = {
  "reduce-stress": { label: "Reduce daily stress", icon: "Wind" },
  "better-sleep": { label: "Sleep better", icon: "Moon" },
  "more-me-time": { label: "More me-time", icon: "Heart" },
  "connect-community": { label: "Connect with other moms", icon: "Users" },
  "healthier-habits": { label: "Healthier daily habits", icon: "Sun" },
  "stronger-boundaries": { label: "Stronger boundaries", icon: "Shield" },
  "mindful-parenting": { label: "Be a more present parent", icon: "Sparkles" },
  "prepare-motherhood": { label: "Prepare for motherhood", icon: "Heart" },
};

const MOM_CHALLENGES: PrimaryChallenge[] = [
  "overwhelm", "sleep", "mental-load", "guilt", "career-balance", "loneliness", "postpartum-recovery", "co-parenting",
];
const NOT_MOM_CHALLENGES: PrimaryChallenge[] = [
  "overwhelm", "burnout", "sleep", "mental-load", "career-balance", "loneliness", "self-care", "planning-ahead",
];
const MOM_GOALS: WellnessGoal[] = [
  "reduce-stress", "better-sleep", "more-me-time", "connect-community", "healthier-habits", "stronger-boundaries", "mindful-parenting",
];
const NOT_MOM_GOALS: WellnessGoal[] = [
  "reduce-stress", "better-sleep", "more-me-time", "connect-community", "healthier-habits", "stronger-boundaries", "prepare-motherhood",
];

/** Challenges offered for a life stage (no parenting-only options for someone who is not a mom). */
export function challengesFor(stage?: LifeStage): PrimaryChallenge[] {
  return isNotMom(stage) ? NOT_MOM_CHALLENGES : MOM_CHALLENGES;
}

/** Goals offered for a life stage. */
export function goalsFor(stage?: LifeStage): WellnessGoal[] {
  return isNotMom(stage) ? NOT_MOM_GOALS : MOM_GOALS;
}

const NOT_MOM_CHALLENGE_LABEL: Partial<Record<PrimaryChallenge, string>> = {
  "career-balance": "Work + life feels impossible",
};
const NOT_MOM_GOAL_LABEL: Partial<Record<WellnessGoal, string>> = {
  "connect-community": "Connect with others",
};

export function challengeLabel(c: PrimaryChallenge, stage?: LifeStage): string {
  return (isNotMom(stage) && NOT_MOM_CHALLENGE_LABEL[c]) || CHALLENGE_META[c].label;
}

export function goalLabel(g: WellnessGoal, stage?: LifeStage): string {
  return (isNotMom(stage) && NOT_MOM_GOAL_LABEL[g]) || GOAL_META[g].label;
}

/** Drop answers that do not exist for the chosen stage (she went back and changed her stage). */
export function sanitizeForStage<T extends { lifeStage?: LifeStage; primaryChallenge?: PrimaryChallenge; goals: WellnessGoal[] }>(a: T): T {
  const okC = challengesFor(a.lifeStage);
  const okG = goalsFor(a.lifeStage);
  return {
    ...a,
    primaryChallenge: a.primaryChallenge && okC.includes(a.primaryChallenge) ? a.primaryChallenge : undefined,
    goals: a.goals.filter((g) => okG.includes(g)),
  };
}

// Reusable action-item recipes. Keeping them in one place makes it easy to
// tune tone/copy without touching the composition logic.
const ITEMS = {
  breathe4min: {
    id: "breathe4",
    title: "4-min guided breathing",
    detail: "Box breathing to reset your nervous system.",
    icon: "Wind" as const,
    accent: "violet" as const,
    route: "/breathe",
    minutes: 4,
  },
  moodCheckin: {
    id: "mood",
    title: "60-sec mood check-in",
    detail: "One tap to name how today actually feels.",
    icon: "Smile" as const,
    accent: "coral" as const,
    route: "/mood",
    minutes: 1,
  },
  sleepWinddown: {
    id: "sleep",
    title: "Sleep wind-down",
    detail: "Log last night + a 10-min rain soundtrack.",
    icon: "Moon" as const,
    accent: "violet" as const,
    route: "/sleep",
    minutes: 10,
  },
  journalPrompt: {
    id: "journal",
    title: "Guided journal prompt",
    detail: "Three lines. Just get it out of your head.",
    icon: "BookOpen" as const,
    accent: "rose" as const,
    route: "/journal",
    minutes: 5,
  },
  aiChat: {
    id: "chat",
    title: "Talk to your companion",
    detail: "Vent, plan the week, or ask for a reframe.",
    icon: "MessageCircle" as const,
    accent: "violet" as const,
    route: "/(tabs)/chat",
    minutes: 5,
  },
  meditation10: {
    id: "medit",
    title: "10-min stress-release meditation",
    detail: "For when your shoulders are up by your ears.",
    icon: "Music" as const,
    accent: "mint" as const,
    route: "/(tabs)/sounds",
    minutes: 10,
  },
  community: {
    id: "community",
    title: "Say hi in the community",
    detail: "One reply. You're not doing this alone.",
    icon: "Users" as const,
    accent: "mint" as const,
    route: "/community",
    minutes: 3,
  },
  milestone: {
    id: "milestone",
    title: "Log a small milestone",
    detail: "Capture one moment worth remembering.",
    icon: "Baby" as const,
    accent: "coral" as const,
    route: "/milestones",
    minutes: 2,
  },
  gratitude: {
    id: "grat",
    title: "Name 3 good things",
    detail: "Gratitude ritual — rewires the day.",
    icon: "Heart" as const,
    accent: "amber" as const,
    route: "/journal",
    minutes: 2,
  },
  planWeek: {
    id: "plan",
    title: "Plan tomorrow's 3 must-dos",
    detail: "Tiny list, no shame. Just the essentials.",
    icon: "ListTodo" as const,
    accent: "coral" as const,
    route: "/(tabs)/tasks",
    minutes: 5,
  },
} as const;

/** Per-challenge focus items — the top 2 always come first in the plan. */
const CHALLENGE_ITEMS: Record<PrimaryChallenge, ActionItem[]> = {
  overwhelm: [ITEMS.breathe4min, ITEMS.moodCheckin, ITEMS.meditation10, ITEMS.planWeek],
  sleep: [ITEMS.sleepWinddown, ITEMS.breathe4min, ITEMS.meditation10, ITEMS.gratitude],
  "mental-load": [ITEMS.planWeek, ITEMS.aiChat, ITEMS.breathe4min, ITEMS.moodCheckin],
  guilt: [ITEMS.journalPrompt, ITEMS.aiChat, ITEMS.gratitude, ITEMS.moodCheckin],
  "career-balance": [ITEMS.planWeek, ITEMS.breathe4min, ITEMS.aiChat, ITEMS.sleepWinddown],
  loneliness: [ITEMS.community, ITEMS.aiChat, ITEMS.journalPrompt, ITEMS.moodCheckin],
  "postpartum-recovery": [ITEMS.moodCheckin, ITEMS.sleepWinddown, ITEMS.breathe4min, ITEMS.journalPrompt],
  "co-parenting": [ITEMS.aiChat, ITEMS.journalPrompt, ITEMS.breathe4min, ITEMS.community],
  burnout: [ITEMS.meditation10, ITEMS.sleepWinddown, ITEMS.breathe4min, ITEMS.journalPrompt],
  "self-care": [ITEMS.moodCheckin, ITEMS.meditation10, ITEMS.gratitude, ITEMS.planWeek],
  "planning-ahead": [ITEMS.journalPrompt, ITEMS.aiChat, ITEMS.community, ITEMS.gratitude],
};

const CHALLENGE_HEADLINE: Record<PrimaryChallenge, string> = {
  overwhelm: "Let's turn the volume down this week",
  sleep: "Your sleep, protected. Starting tonight.",
  "mental-load": "Off your shoulders, onto the page",
  guilt: "You're a good mom. Let's practice believing it.",
  "career-balance": "Small rituals, big room for both",
  loneliness: "You're not doing this alone this week",
  "postpartum-recovery": "One recovery win a day",
  "co-parenting": "Steady ground, one step at a time",
  burnout: "Refill the tank, gently",
  "self-care": "A routine that is actually yours",
  "planning-ahead": "Room to dream, room to prepare",
};

/** Short second-person phrasing of the challenge — reads naturally in copy. */
const CHALLENGE_PHRASE: Record<PrimaryChallenge, string> = {
  overwhelm: "the daily overwhelm",
  sleep: "getting rest that actually restores you",
  "mental-load": "lightening your mental load",
  guilt: "quieting the guilt narrative",
  "career-balance": "protecting both your work and your family time",
  loneliness: "feeling less alone",
  "postpartum-recovery": "your postpartum recovery",
  "co-parenting": "steadier co-parenting",
  burnout: "recovering from burnout",
  "self-care": "building a self-care routine you will keep",
  "planning-ahead": "preparing for motherhood at your own pace",
};

/** Copy that would otherwise assume kids. Only used for someone who is not (yet) a mom. */
const NOT_MOM_HEADLINE: Partial<Record<PrimaryChallenge, string>> = {
  "career-balance": "Small rituals, big room for you",
  loneliness: "You're not alone this week",
};
const NOT_MOM_PHRASE: Partial<Record<PrimaryChallenge, string>> = {
  "career-balance": "protecting your energy between work and the rest of life",
};

/** Compose a personalized 4-item plan from a challenge, filling from goals if needed. */
export function buildWeeklyPlan(p?: Personalization): WeeklyPlan {
  const challenge = p?.primaryChallenge;
  const goals = p?.goals ?? [];
  const stageLabel = p?.lifeStage ? LIFE_STAGE_META[p.lifeStage].label : undefined;

  // If we have no personalization at all, ship a solid default plan.
  if (!challenge) {
    return {
      headline: "A gentle start this week",
      intro: "Four small actions to build your rhythm. Answer a few questions in Profile → Personalize to make this yours.",
      items: [ITEMS.moodCheckin, ITEMS.breathe4min, ITEMS.journalPrompt, ITEMS.community],
      stageLabel,
    };
  }

  const seeds = CHALLENGE_ITEMS[challenge];
  const items: ActionItem[] = [...seeds];

  // Add up to 2 goal-driven items if they aren't already in the list.
  const goalItems: Record<WellnessGoal, ActionItem | undefined> = {
    "prepare-motherhood": ITEMS.journalPrompt,
    "reduce-stress": ITEMS.breathe4min,
    "better-sleep": ITEMS.sleepWinddown,
    "more-me-time": ITEMS.meditation10,
    "connect-community": ITEMS.community,
    "healthier-habits": ITEMS.planWeek,
    "stronger-boundaries": ITEMS.aiChat,
    "mindful-parenting": ITEMS.gratitude,
  };
  for (const g of goals) {
    const it = goalItems[g];
    if (it && !items.find((x) => x.id === it.id)) items.push(it);
  }

  const notMom = isNotMom(p?.lifeStage);
  const headline = (notMom && NOT_MOM_HEADLINE[challenge]) || CHALLENGE_HEADLINE[challenge];
  const phrase = (notMom && NOT_MOM_PHRASE[challenge]) || CHALLENGE_PHRASE[challenge];
  return {
    headline,
    intro: `Your plan focuses on ${phrase}. Tap any card to start — most take under 5 minutes.`,
    items: items.slice(0, 5),
    focusChallenge: challenge,
    stageLabel,
  };
}

/** Warm, contextual greeting for the dashboard hero. */
export function personalizedGreeting(name: string, p?: Personalization): string {
  const raw = (name || fallbackName(p?.lifeStage)).split(" ")[0];
  const first = raw.charAt(0).toUpperCase() + raw.slice(1);
  if (!p?.primaryChallenge) return `Hi ${first}, glad you're here.`;
  const c = p.primaryChallenge;
  const openings: Record<PrimaryChallenge, string> = {
    overwhelm: `${first}, take a breath. We've got this together.`,
    sleep: `${first}, your rest matters. Tonight is a chance to reset.`,
    "mental-load": `${first}, let's move some of that off your plate.`,
    guilt: `${first}, you're showing up. That's what counts.`,
    "career-balance": `${first}, both roles matter — and so do you.`,
    loneliness: `${first}, you belong here. There are moms who get it.`,
    "postpartum-recovery": `${first}, healing is not linear. Be kind to you.`,
    "co-parenting": `${first}, steady wins. One conversation at a time.`,
    burnout: `${first}, running on empty is a signal, not a failure. Let's refill.`,
    "self-care": `${first}, small rituals add up. Let's start with one.`,
    "planning-ahead": `${first}, there's no rush. Let's make space for what's next.`,
  };
  if (isNotMom(p.lifeStage) && c === "loneliness") return `${first}, you belong here. There are people who get it.`;
  return openings[c];
}
