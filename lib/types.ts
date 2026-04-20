// Core types for MomEase

// ImageSource supports both require() (number) and { uri: string }
export type ImageSource = number | { uri: string };

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: "free" | "premium";
  childrenAges?: string[];
  workSchedule?: "full-time" | "part-time" | "freelance" | "stay-at-home";
  interests?: string[];
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
  audioUrl: string;
}

export interface MeditationSession {
  id: string;
  title: string;
  description: string;
  duration: string;
  category: "stress" | "sleep" | "focus" | "gratitude" | "body-scan";
  imageUrl: ImageSource;
  level: "beginner" | "intermediate" | "advanced";
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
