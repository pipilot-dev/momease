// Mock data for the entire app
import type { Task, Mantra, MealPlan, ForumPost, Sound, MeditationSession } from "./types";

// ── Local image assets (generated) ──────────────────────────────
const images = {
  // Meals
  overnightOats: require("../assets/meal-overnight-oats.png"),
  veggieWraps: require("../assets/meal-veggie-wraps.png"),
  lemonChicken: require("../assets/meal-lemon-chicken.png"),
  blissBalls: require("../assets/meal-bliss-balls.png"),
  // Sounds
  gentleRain: require("../assets/sound-gentle-rain.png"),
  oceanWaves: require("../assets/sound-ocean-waves.png"),
  whiteNoise: require("../assets/sound-white-noise.png"),
  lullaby: require("../assets/sound-lullaby.png"),
  forest: require("../assets/sound-forest.png"),
  bodyScan: require("../assets/sound-body-scan.png"),
  // Meditations
  morningCalm: require("../assets/med-morning-calm.png"),
  stressRelease: require("../assets/med-stress-release.png"),
  deepSleep: require("../assets/med-deep-sleep.png"),
  gratitude: require("../assets/med-gratitude.png"),
  bodyScanMed: require("../assets/med-body-scan.png"),
  // Avatars
  jessica: require("../assets/avatar-jessica.png"),
  aisha: require("../assets/avatar-aisha.png"),
  emily: require("../assets/avatar-emily.png"),
  lauren: require("../assets/avatar-lauren.png"),
};

export const mockTasks: Task[] = [
  {
    id: "t1",
    title: "Prepare school lunches",
    description: "Pack healthy lunches for Emma and Jake",
    category: "family",
    priority: "high",
    status: "pending",
    dueDate: "2026-04-16T07:00:00Z",
    createdAt: "2026-04-15T20:00:00Z",
  },
  

  {
    id: "t2",
    title: "Team standup presentation",
    description: "Prepare slides for Q2 review",
    category: "work",
    priority: "urgent",
    status: "in_progress",
    dueDate: "2026-04-16T10:00:00Z",
    createdAt: "2026-04-15T18:00:00Z",
  },
  {
    id: "t3",
    title: "15-min meditation",
    description: "Morning mindfulness session",
    category: "self-care",
    priority: "medium",
    status: "pending",
    aiSuggested: true,
    createdAt: "2026-04-16T06:00:00Z",
  },
  {
    id: "t4",
    title: "Grocery shopping",
    description: "Weekly grocery run — organic produce & snacks",
    category: "household",
    priority: "medium",
    status: "pending",
    dueDate: "2026-04-17T14:00:00Z",
    createdAt: "2026-04-15T12:00:00Z",
  },
  {
    id: "t5",
    title: "Schedule pediatrician visit",
    description: "Annual checkup for Jake",
    category: "health",
    priority: "high",
    status: "pending",
    dueDate: "2026-04-18T09:00:00Z",
    createdAt: "2026-04-14T10:00:00Z",
  },
  {
    id: "t6",
    title: "Yoga class at 6pm",
    description: "Restorative yoga — remember mat and water",
    category: "self-care",
    priority: "low",
    status: "pending",
    dueDate: "2026-04-16T18:00:00Z",
    aiSuggested: true,
    createdAt: "2026-04-16T06:00:00Z",
  },
  
]

export const mockMantras: Mantra[] = [
  { id: "m1", text: "I am enough, exactly as I am today.", category: "confidence" },
  { id: "m2", text: "My peace is more important than perfection.", category: "calm" },
  { id: "m3", text: "I give myself permission to rest without guilt.", category: "calm" },
  { id: "m4", text: "I am creating a beautiful life, one moment at a time.", category: "gratitude" },
  { id: "m5", text: "My children don't need a perfect mother — they need a happy one.", category: "joy" },
  { id: "m6", text: "I am strong, capable, and worthy of all good things.", category: "strength" },
  { id: "m7", text: "Today I choose grace over guilt.", category: "confidence" },
  { id: "m8", text: "I trust my instincts as a mother and a professional.", category: "strength" },

  
];

export const mockMealPlans: MealPlan[] = [
  {
    id: "mp1",
    name: "Berry Overnight Oats",
    description: "Prep the night before, grab and go in the morning. Kids love it too!",
    prepTime: "5 min",
    servings: 4,
    ingredients: ["2 cups rolled oats", "2 cups almond milk", "1 cup mixed berries", "2 tbsp honey", "1 tsp vanilla extract", "4 tbsp chia seeds"],
    steps: ["Mix oats, milk, chia seeds, honey and vanilla in jars.", "Top with berries.", "Refrigerate overnight.", "Grab and enjoy in the morning!"],
    category: "breakfast",
    imageUrl: images.overnightOats,
    kidFriendly: true,
  },
  {
    id: "mp2",
    name: "Rainbow Veggie Wraps",
    description: "Colorful, healthy wraps that kids actually eat. Perfect for lunchboxes.",
    prepTime: "15 min",
    servings: 4,
    ingredients: ["4 large tortillas", "Hummus", "Shredded carrots", "Sliced cucumber", "Bell peppers", "Avocado", "Baby spinach"],
    steps: ["Spread hummus on each tortilla.", "Layer vegetables evenly.", "Roll tightly and slice in half.", "Wrap in parchment for lunchbox."],
    category: "lunch",
    imageUrl: images.veggieWraps,
    kidFriendly: true,
  },
  {
    id: "mp3",
    name: "One-Pot Lemon Herb Chicken",
    description: "Minimal cleanup, maximum flavor. Ready in 30 minutes.",
    prepTime: "30 min",
    servings: 4,
    ingredients: ["4 chicken thighs", "2 cups rice", "Lemon juice", "Fresh herbs (rosemary, thyme)", "Garlic", "Chicken broth", "Olive oil"],
    steps: ["Sear chicken in olive oil until golden.", "Add garlic, herbs, and rice.", "Pour in broth and lemon juice.", "Cover and simmer for 20 minutes."],
    category: "dinner",
    imageUrl: images.lemonChicken,
    kidFriendly: true,
  },
  {
    id: "mp4",
    name: "Energy Bliss Balls",
    description: "No-bake, freezer-friendly snack balls packed with energy.",
    prepTime: "10 min",
    servings: 12,
    ingredients: ["1 cup oats", "1/2 cup peanut butter", "1/3 cup honey", "1/2 cup chocolate chips", "2 tbsp flax seeds", "1 tsp vanilla"],
    steps: ["Mix all ingredients in a bowl.", "Roll into 1-inch balls.", "Place on parchment-lined tray.", "Freeze for 30 minutes. Store in airtight container."],
    category: "snack",
    imageUrl: images.blissBalls,
    kidFriendly: true,
  },
  
];

export const mockForumPosts: ForumPost[] = [
  {
    id: "fp1",
    authorName: "Jessica Rivera",
    authorAvatar: images.jessica,
    title: "How I finally stopped feeling guilty about screen time",
    content: "After months of beating myself up, I realized that 30 minutes of educational content while I cook dinner is perfectly fine. Here's what helped me let go of the guilt...",
    category: "tips",
    likes: 47,
    comments: 23,
    createdAt: "2026-04-15T14:30:00Z",
  },
  {
    id: "fp2",
    authorName: "Aisha Patel",
    authorAvatar: images.aisha,
    title: "Got promoted while working 4-day weeks!",
    content: "I negotiated a compressed work week 6 months ago and just got promoted. Proof that boundaries don't limit your career!",
    category: "wins",
    likes: 134,
    comments: 56,
    createdAt: "2026-04-14T09:15:00Z",
  },
  {
    id: "fp3",
    authorName: "Emily Chen",
    authorAvatar: images.emily,
    title: "Dealing with toddler tantrums at daycare pickup",
    content: "Every day, picking up my 3-year-old turns into a meltdown. Any tips from moms who've been through this?",
    category: "questions",
    likes: 28,
    comments: 41,
    createdAt: "2026-04-16T08:00:00Z",
  },
  {
    id: "fp4",
    authorName: "Lauren Brooks",
    authorAvatar: images.lauren,
    title: "Sunday meal prep changed my life",
    content: "I spend 2 hours every Sunday prepping lunches for the whole week. It saves me $200/month and at least 5 hours of weeknight stress. Here's my system...",
    category: "tips",
    likes: 89,
    comments: 34,
    createdAt: "2026-04-13T16:45:00Z",
  },
];

export const mockSounds: Sound[] = [
  {
    id: "s1",
    title: "Gentle Rain",
    description: "Soft rainfall on leaves — perfect for winding down",
    duration: "30:00",
    category: "nature",
    imageUrl: images.gentleRain,
    audioUrl: "mock://rain.mp3",
  },
  {
    id: "s2",
    title: "Ocean Waves",
    description: "Rhythmic ocean waves for deep relaxation",
    duration: "45:00",
    category: "nature",
    imageUrl: images.oceanWaves,
    audioUrl: "mock://ocean.mp3",
  },
  {
    id: "s3",
    title: "Soft White Noise",
    description: "Consistent white noise to block distractions",
    duration: "60:00",
    category: "white-noise",
    imageUrl: images.whiteNoise,
    audioUrl: "mock://whitenoise.mp3",
  },
  {
    id: "s4",
    title: "Twinkle Star Lullaby",
    description: "Gentle music box rendition for bedtime",
    duration: "20:00",
    category: "lullaby",
    imageUrl: images.lullaby,
    audioUrl: "mock://lullaby.mp3",
  },
  {
    id: "s5",
    title: "Forest Morning",
    description: "Birds chirping in a peaceful forest at dawn",
    duration: "35:00",
    category: "ambient",
    imageUrl: images.forest,
    audioUrl: "mock://forest.mp3",
  },
  {
    id: "s6",
    title: "Guided Body Scan",
    description: "Release tension from head to toe",
    duration: "15:00",
    category: "meditation",
    imageUrl: images.bodyScan,
    audioUrl: "mock://bodyscan.mp3",
  },
  
];

export const mockMeditations: MeditationSession[] = [
  {
    id: "med1",
    title: "Morning Calm",
    description: "Start your day with 5 minutes of peaceful breathing and intention setting.",
    duration: "5 min",
    category: "focus",
    imageUrl: images.morningCalm,
    level: "beginner",
  },
  {
    id: "med2",
    title: "Stress Release",
    description: "Let go of the day's tension with guided progressive relaxation.",
    duration: "10 min",
    category: "stress",
    imageUrl: images.stressRelease,
    level: "beginner",
  },
  {
    id: "med3",
    title: "Deep Sleep Journey",
    description: "Drift into restful sleep with this calming visualization.",
    duration: "20 min",
    category: "sleep",
    imageUrl: images.deepSleep,
    level: "beginner",
  },
  {
    id: "med4",
    title: "Gratitude Practice",
    description: "Cultivate thankfulness and joy through guided reflection.",
    duration: "8 min",
    category: "gratitude",
    imageUrl: images.gratitude,
    level: "intermediate",
  },
  {
    id: "med5",
    title: "Body Scan Reset",
    description: "Full body awareness scan to release held tension.",
    duration: "15 min",
    category: "body-scan",
    imageUrl: images.bodyScanMed,
    level: "intermediate",
  },
];

export const greetings = {
  morning: [
    "Good morning, beautiful! Ready to conquer today?",
    "Rise and shine, mama! Today is full of possibilities.",
    "Morning, supermom! Remember, you're doing amazing.",
  ],
  afternoon: [
    "Hope your afternoon is going well! Take a breath.",
    "Halfway through the day — you're doing great!",
    "Afternoon check-in: don't forget to hydrate!",
  ],
  evening: [
    "You made it through another day! Be proud of yourself.",
    "Evening, mama. Time to unwind and recharge.",
    "What a day! You deserve some rest tonight.",
  ],
};

export function getTimeOfDay(): "morning" | "afternoon" | "evening" {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

export function getRandomGreeting(): string {
  const timeOfDay = getTimeOfDay();
  const options = greetings[timeOfDay];
  return options[Math.floor(Math.random() * options.length)];
}

export function getRandomMantra(): Mantra {
  return mockMantras[Math.floor(Math.random() * mockMantras.length)];
}
