// Core types for MomEase

// ImageSource supports both require() (number) and { uri: string }
export type ImageSource = number | { uri: string };

/** Where the mom is in her journey — drives content, tone, and dashboard. */
export type LifeStage =
  | "trying"
  | "pregnant"
  | "postpartum"
  | "baby"         // 0–12mo
  | "toddler"      // 1–3y
  | "school-age"   // 4–12y
  | "teen";        // 13+

/** The biggest challenge right now — anchors the weekly action plan. */
export type PrimaryChallenge =
  | "overwhelm"
  | "sleep"
  | "mental-load"
  | "guilt"
  | "career-balance"
  | "loneliness"
  | "postpartum-recovery"
  | "co-parenting";

/** Longer-term wellness goals — the mom can pick multiple. */
export type WellnessGoal =
  | "reduce-stress"
  | "better-sleep"
  | "more-me-time"
  | "connect-community"
  | "healthier-habits"
  | "stronger-boundaries"
  | "mindful-parenting";

export interface Personalization {
  lifeStage?: LifeStage;
  primaryChallenge?: PrimaryChallenge;
  goals: WellnessGoal[];
  /** ISO date when the personalization was captured / last updated. */
  updatedAt?: string;
  /** Whether the user opted in to daily notification reminders. */
  notificationsEnabled?: boolean;
  /** Local time (HH:MM) they want their daily check-in nudge. */
  preferredCheckinTime?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: "free" | "premium";
  childrenAges?: string[];
  workSchedule?: "full-time" | "part-time" | "freelance" | "stay-at-home";
  interests?: string[];
  personalization?: Personalization;
  createdAt: string;
  onboardingCompleted: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  category: "work" | "family" | "self-care" | "household" | "health";
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "in_progress" | "completed";
  dueDate?: string;
  aiSuggested?: boolean;
  createdAt: string;
  completedAt?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface Mantra {
  id: string;
  text: string;
  author?: string;
  category: "confidence" | "calm" | "strength" | "gratitude" | "joy";
}

export interface MealPlan {
  id: string;
  name: string;
  description: string;
  prepTime: string;
  servings: number;
  ingredients: string[];
  steps: string[];
  category: "breakfast" | "lunch" | "dinner" | "snack";
  imageUrl: ImageSource;
  kidFriendly: boolean;
}

export interface ForumPost {
  id: string;
  authorName: string;
  authorAvatar: ImageSource;
  title: string;
  content: string;
  category: "tips" | "support" | "wins" | "questions" | "resources";
  likes: number;
  comments: number;
  createdAt: string;
}

export interface Sound {
  id: string;
  title: string;
  description: string;
  duration: string;
  category: "nature" | "white-noise" | "lullaby" | "meditation" | "ambient";
  imageUrl: ImageSource;
  /** require()'d local audio module — real, generated, seamless-looping audio. */
  audioSource: number;
}

/** One spoken/visual step in a guided meditation. */
export interface MeditationStep {
  /** Seconds this step is shown. */
  seconds: number;
  /** Short cue shown to the user. */
  text: string;
  /** Optional breathing pattern that drives the on-screen orb animation. */
  breath?: "in" | "hold" | "out" | "rest";
}

export interface MeditationSession {
  id: string;
  title: string;
  description: string;
  duration: string;
  category: "stress" | "sleep" | "focus" | "gratitude" | "body-scan";
  imageUrl: ImageSource;
  level: "beginner" | "intermediate" | "advanced";
  /** Background ambient pad (require()'d local audio). */
  audioSource: number;
  /** Guided script that plays out over the session. */
  script: MeditationStep[];
}

export interface BabyProfile {
  id: string;
  name: string;
  birthDate: string;
  avatarUrl?: ImageSource;
  gender: "boy" | "girl" | "other";
}

export interface Milestone {
  id: string;
  babyId: string;
  title: string;
  description?: string;
  category: "motor" | "language" | "social" | "cognitive" | "health" | "first";
  date: string;
  ageAtMilestone?: string;
  imageUrl?: ImageSource;
  isCustom: boolean;
  completed: boolean;
}

export interface MilestoneTemplate {
  id: string;
  title: string;
  description: string;
  category: Milestone["category"];
  typicalAgeMonths: number;
  icon: string;
}

export type TabRoute = "home" | "tasks" | "chat" | "sounds" | "profile";
