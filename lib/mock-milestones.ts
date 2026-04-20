// Mock milestone data for Baby Milestone Tracker
import type { BabyProfile, Milestone, MilestoneTemplate } from "./types";

export const mockBaby: BabyProfile = {
  id: "baby_1",
  name: "Lily",
  birthDate: "2025-10-15",
  gender: "girl",
};

// Age-based milestone templates
export const milestoneTemplates: MilestoneTemplate[] = [
  // Motor milestones
  { id: "mt_1", title: "First Smile", description: "Baby's first real social smile", category: "social", typicalAgeMonths: 2, icon: "Smile" },
  { id: "mt_2", title: "Holds Head Up", description: "Can hold head steady without support", category: "motor", typicalAgeMonths: 3, icon: "ArrowUp" },
  { id: "mt_3", title: "Rolls Over", description: "Rolls from tummy to back or back to tummy", category: "motor", typicalAgeMonths: 4, icon: "RotateCw" },
  { id: "mt_4", title: "First Laugh", description: "Baby's first real belly laugh", category: "social", typicalAgeMonths: 4, icon: "Laugh" },
  { id: "mt_5", title: "Sits Without Support", description: "Can sit up without being held", category: "motor", typicalAgeMonths: 6, icon: "Armchair" },
  { id: "mt_6", title: "First Tooth", description: "First baby tooth appears", category: "health", typicalAgeMonths: 6, icon: "Sparkle" },
  { id: "mt_7", title: "First Solid Food", description: "Tried solid food for the first time", category: "health", typicalAgeMonths: 6, icon: "Apple" },
  { id: "mt_8", title: "Crawling", description: "Moves around on hands and knees", category: "motor", typicalAgeMonths: 8, icon: "Baby" },
  { id: "mt_9", title: "Says 'Mama' or 'Dada'", description: "First meaningful word", category: "language", typicalAgeMonths: 9, icon: "MessageCircle" },
  { id: "mt_10", title: "Waves Bye-Bye", description: "Waves hello or goodbye", category: "social", typicalAgeMonths: 9, icon: "Hand" },
  { id: "mt_11", title: "Pulls to Stand", description: "Pulls up to standing using furniture", category: "motor", typicalAgeMonths: 10, icon: "ArrowUpCircle" },
  { id: "mt_12", title: "First Steps", description: "Takes first independent steps", category: "motor", typicalAgeMonths: 12, icon: "Footprints" },
  { id: "mt_13", title: "First Word", description: "Says a recognizable word with meaning", category: "language", typicalAgeMonths: 12, icon: "Quote" },
  { id: "mt_14", title: "Claps Hands", description: "Claps hands together", category: "social", typicalAgeMonths: 10, icon: "HandMetal" },
  { id: "mt_15", title: "Points at Things", description: "Points to objects of interest", category: "cognitive", typicalAgeMonths: 12, icon: "MousePointer" },
  { id: "mt_16", title: "Stacks Blocks", description: "Can stack 2-3 blocks on top of each other", category: "cognitive", typicalAgeMonths: 14, icon: "Layers" },
  { id: "mt_17", title: "Walks Confidently", description: "Walks well without help", category: "motor", typicalAgeMonths: 15, icon: "PersonStanding" },
  { id: "mt_18", title: "Uses Spoon", description: "Feeds self with a spoon", category: "motor", typicalAgeMonths: 15, icon: "Utensils" },
  { id: "mt_19", title: "Says 10+ Words", description: "Vocabulary of 10 or more words", category: "language", typicalAgeMonths: 18, icon: "BookOpen" },
  { id: "mt_20", title: "Runs", description: "Runs with coordination", category: "motor", typicalAgeMonths: 18, icon: "Zap" },
  { id: "mt_21", title: "Says 2-Word Phrases", description: "Says phrases like 'more milk'", category: "language", typicalAgeMonths: 20, icon: "MessageSquare" },
  { id: "mt_22", title: "Says First Name", description: "Says baby's own name", category: "language", typicalAgeMonths: 24, icon: "User" },
  { id: "mt_23", title: "Says 50+ Words", description: "Vocabulary of 50 or more words", category: "language", typicalAgeMonths: 24, icon: "BookOpen" },
  { id: "mt_24", title: "Says 2-3 Word Sentences", description: "Says simple sentences like 'I want milk'", category: "language", typicalAgeMonths: 24, icon: "MessageSquare" },
  { id: "mt_25", title: "Says 100+ Words", description: "Vocabulary of 100 or more words", category: "language", typicalAgeMonths: 30, icon: "BookOpen" },
  { id: "mt_26", title: "Says 4-5 Word Sentences", description: "Says longer sentences like 'I want more milk'", category: "language", typicalAgeMonths: 30, icon: "MessageSquare" },
  { id: "mt_27", title: "Says 200+ Words", description: "Vocabulary of 200 or more words", category: "language", typicalAgeMonths: 36, icon: "BookOpen" },
  { id: "mt_28", title: "Says 6-10 Word Sentences", description: "Says longer sentences like 'I want more milk and a cookie'", category: "language", typicalAgeMonths: 36, icon: "MessageSquare" },
  { id: "mt_29", title: "Says 300+ Words", description: "Vocabulary of 300 or more words", category: "language", typicalAgeMonths: 42, icon: "BookOpen" },
  { id: "mt_30", title: "Says 10+ Word Sentences", description: "Says longer sentences like 'I want more milk and a cookie and a nap'", category: "language", typicalAgeMonths: 42, icon: "MessageSquare" }
];

// Some already-completed milestones for demo
export const mockMilestones: Milestone[] = [
  {
    id: "m_1",
    babyId: "baby_1",
    title: "First Smile",
    description: "Lily smiled at me right after her morning feed — my heart melted!",
    category: "social",
    date: "2025-12-10",
    ageAtMilestone: "2 months",
    isCustom: false,
    completed: true,
  },
  {
    id: "m_2",
    babyId: "baby_1",
    title: "Holds Head Up",
    description: "During tummy time, she held her head up for 30 seconds!",
    category: "motor",
    date: "2026-01-08",
    ageAtMilestone: "3 months",
    isCustom: false,
    completed: true,
  },
  {
    id: "m_3",
    babyId: "baby_1",
    title: "First Laugh",
    description: "Daddy made a funny face and she laughed for the first time. We all cried happy tears.",
    category: "social",
    date: "2026-02-05",
    ageAtMilestone: "4 months",
    isCustom: false,
    completed: true,
  },
  {
    id: "m_4",
    babyId: "baby_1",
    title: "Rolls Over",
    description: "Rolled from tummy to back during playtime!",
    category: "motor",
    date: "2026-02-20",
    ageAtMilestone: "4 months",
    isCustom: false,
    completed: true,
  },
  {
    id: "m_5",
    babyId: "baby_1",
    title: "First Sleepover at Grandma's",
    description: "Lily stayed overnight at grandma's for the first time. She did amazing!",
    category: "first",
    date: "2026-03-01",
    ageAtMilestone: "4.5 months",
    isCustom: true,
    completed: true,
  },
  {
    id: "m_6",
    babyId: "baby_1",
    title: "Sits Without Support",
    description: "She sat up on her own during playtime today!",
    category: "motor",
    date: "2026-04-10",
    ageAtMilestone: "6 months",
    isCustom: false,
    completed: true,
  },
  {
    id: "m_7",
    babyId: "baby_1",
    title: "First Solid Food",
    description: "Tried mashed avocado — she made the funniest face but ate it all!",
    category: "health",
    date: "2026-04-15",
    ageAtMilestone: "6 months",
    isCustom: false,
    completed: true,
  },
  {
    id: "m_8",
    babyId: "baby_1",
    title: "First Smile",
    description: "She smiled at me for the first time today!",
    category: "social",
    date: "2026-04-20",
    ageAtMilestone: "6 months",
    isCustom: false,
    completed: true,
  },
  {
    id: "m_9",
    babyId: "baby_1",
    title: "First Tooth",
    description: "She has her first tooth!",
    category: "health",
    date: "2026-04-25",
    ageAtMilestone: "6 months",
    isCustom: false,
    completed: true,
  },
  {
    id: "m_10",
    babyId: "baby_1",
    title: "First Walk",
    description: "She took her first steps today!",
    category: "development",
    date: "2026-05-01",
    ageAtMilestone: "6 months",
    isCustom: false,
    completed: true,
  },  {
    id: "m_11",
    babyId: "baby_1",
    title: "First Laugh",
    description: "She laughed for the first time today!",
    category: "social",
    date: "2026-05-05",
    ageAtMilestone: "6 months",
    isCustom: false,
    completed: true,
  },
  
  
];

// Helper to calculate baby age
export function getBabyAge(birthDate: string): { months: number; days: number; label: string } {
  const birth = new Date(birthDate);
  const now = new Date();
  let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  let days = now.getDate() - birth.getDate();
  if (days < 0) {
    months--;
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
  }
  const label = months < 1 ? `${days} days` : months === 1 ? "1 month" : `${months} months`;
  return { months, days, label };
}

/// Get upcoming milestones based on baby's age
export function getUpcomingMilestones(birthDate: string, completedIds: string[]): MilestoneTemplate[] {
  const { months } = getBabyAge(birthDate);
  return milestoneTemplates
    .filter((t) => t.typicalAgeMonths >= months && !completedIds.includes(t.id))
    .sort((a, b) => a.typicalAgeMonths - b.typicalAgeMonths)
    .slice(0, 5);
}

export const categoryColors: Record<string, { bg: string; text: string; icon: string }> = {
  motor: { bg: "#DBEAFE", text: "#2563EB", icon: "#3B82F6" },
  language: { bg: "#FDE5EC", text: "#DB2777", icon: "#F472B6" },
  social: { bg: "#D1FAE5", text: "#059669", icon: "#10B981" },
  cognitive: { bg: "#EDE9FE", text: "#7C3AED", icon: "#8B5CF6" },
  health: { bg: "#FEF3C7", text: "#D97706", icon: "#F59E0B" },
  first: { bg: "#FCE7F3", text: "#BE185D", icon: "#EC4899" },
};

export const categoryLabels: Record<string, string> = {
  motor: "Motor Skills",
  language: "Language",
  social: "Social & Emotional",
  cognitive: "Cognitive",
  health: "Health & Growth",
  first: "Special Firsts",
};
