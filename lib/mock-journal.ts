// Mock data and service for Journal / Self-Care Diary
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "momease_journal_entries";

// ── Types ──────────────────────────────────────────────────────

export interface JournalEntry {
  id: string;
  date: string; // ISO string
  title: string;
  content: string;
  mood?: 1 | 2 | 3 | 4 | 5; // optional mood link
  tags: string[];
  prompt?: string; // the writing prompt used, if any
  isFavorite: boolean;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface JournalPrompt {
  id: string;
  text: string;
  category: 'gratitude' | 'reflection' | 'goals' | 'self-compassion' | 'memories';
}

export interface JournalStats {
  totalEntries: number;
  totalWords: number;
  streakDays: number;
  favoriteCount: number;
  topTags: string[];
}

// ── Journal Prompts ────────────────────────────────────────────

export const journalPrompts: JournalPrompt[] = [
  // Gratitude (4 prompts)
  {
    id: "jp1",
    text: "List three moments today where you felt loved or supported.",
    category: "gratitude",
  },
  {
    id: "jp2",
    text: "What small victory or win did you experience today? Celebrate it!",
    category: "gratitude",
  },
  {
    id: "jp3",
    text: "Write about someone who made your life easier this week. How did they help?",
    category: "gratitude",
  },
  {
    id: "jp4",
    text: "What are three things about your current season of life that you're thankful for?",
    category: "gratitude",
  },

  // Reflection (3 prompts)
  {
    id: "jp5",
    text: "What challenge did you face today, and what did it teach you?",
    category: "reflection",
  },
  {
    id: "jp6",
    text: "How do you feel about the balance between work and family right now?",
    category: "reflection",
  },
  {
    id: "jp7",
    text: "What patterns have you noticed in how you respond to stress?",
    category: "reflection",
  },

  // Goals (3 prompts)
  {
    id: "jp8",
    text: "What would you tell your future self about this season of life?",
    category: "goals",
  },
  {
    id: "jp9",
    text: "What is one small change you could make this week to feel more aligned with your values?",
    category: "goals",
  },
  {
    id: "jp10",
    text: "What does 'success' look like for you this month, both at work and at home?",
    category: "goals",
  },

  // Self-compassion (3 prompts)
  {
    id: "jp11",
    text: "Write a love letter to yourself — you deserve it.",
    category: "self-compassion",
  },
  {
    id: "jp12",
    text: "What would you say to a friend who was experiencing what you're going through?",
    category: "self-compassion",
  },
  {
    id: "jp13",
    text: "What are you holding onto that you need permission to let go of?",
    category: "self-compassion",
  },

  // Memories (3 prompts)
  {
    id: "jp14",
    text: "Describe a moment with your child you never want to forget.",
    category: "memories",
  },
  {
    id: "jp15",
    text: "What made you smile today? Capture that feeling in words.",
    category: "memories",
  },
  {
    id: "jp16",
    text: "Write about a recent conversation that stuck with you. Why was it meaningful?",
    category: "memories",
  },
];

// ── Mock Journal Entries ───────────────────────────────────────

export const mockJournalEntries: JournalEntry[] = [
  {
    id: "je1",
    date: "2026-04-19T08:30:00Z",
    title: "Morning gratitude",
    content: "Woke up to Emma singing in her room. That sweet, off-key voice before the rush of the day starts is everything. Made me realize how much I've been rushing through mornings lately. I want to hold onto these small moments more.",
    mood: 5,
    tags: ["gratitude", "parenting", "mindfulness"],
    prompt: "List three moments today where you felt loved or supported.",
    isFavorite: true,
    wordCount: 56,
    createdAt: "2026-04-19T08:30:00Z",
    updatedAt: "2026-04-19T08:30:00Z",
  },
  {
    id: "je2",
    date: "2026-04-17T21:15:00Z",
    title: "Letting go of perfection",
    content: "I've been holding onto this idea that I need to be the 'perfect' working mom — flawless presentations at work, Pinterest-worthy lunches, never losing my patience. But today I snapped at Jake over spilled juice, and then I apologized. And you know what? He hugged me and said 'it's okay, Mommy.' Maybe I need permission to be human. Maybe that's enough.",
    mood: 3,
    tags: ["self-compassion", "guilt", "parenting"],
    prompt: "What are you holding onto that you need permission to let go of?",
    isFavorite: true,
    wordCount: 89,
    createdAt: "2026-04-17T21:15:00Z",
    updatedAt: "2026-04-17T21:15:00Z",
  },
  {
    id: "je3",
    date: "2026-04-15T19:00:00Z",
    title: "The bedtime story moment",
    content: "Jake asked me to read 'Where the Wild Things Are' for the millionth time tonight. Halfway through, he put his little hand on my cheek and said, 'You're my favorite.' I don't want to forget how his hand felt, or the way his eyes were already half-closed but he was fighting sleep to stay with me. These are the moments that matter.",
    mood: 5,
    tags: ["memories", "parenting", "love"],
    prompt: "Describe a moment with your child you never want to forget.",
    isFavorite: true,
    wordCount: 87,
    createdAt: "2026-04-15T19:00:00Z",
    updatedAt: "2026-04-15T19:00:00Z",
  },
  {
    id: "je4",
    date: "2026-04-12T12:45:00Z",
    title: "Work-life reflection",
    content: "Been thinking about the balance between work and home. Honestly? It's messy. Some days I feel like I'm crushing it at work but dropping the ball at home. Other days I'm fully present with the kids but my inbox is a disaster. I'm learning that 'balance' might not be about equal time — it's about being intentional with where I am in the moment. Still figuring this out.",
    mood: 3,
    tags: ["reflection", "work-life balance", "growth"],
    prompt: "How do you feel about the balance between work and family right now?",
    isFavorite: false,
    wordCount: 92,
    createdAt: "2026-04-12T12:45:00Z",
    updatedAt: "2026-04-12T12:45:00Z",
  },
  {
    id: "je5",
    date: "2026-04-10T07:20:00Z",
    title: "Future self letter",
    content: "Dear future me: Right now you're in the thick of it. Jake is 3, Emma is 6, and you're juggling deadlines with daycare pickups. You're tired. You're overwhelmed. But you're also so deeply in love with this life you've built. One day you'll miss the chaos. The sticky hands. The endless snack requests. So take a breath. You're doing better than you think.",
    mood: 4,
    tags: ["goals", "perspective", "self-compassion"],
    prompt: "What would you tell your future self about this season of life?",
    isFavorite: true,
    wordCount: 85,
    createdAt: "2026-04-10T07:20:00Z",
    updatedAt: "2026-04-10T07:20:00Z",
  },
  {
    id: "je6",
    date: "2026-04-08T20:30:00Z",
    title: "Quick check-in",
    content: "Today was a blur. Meetings, tantrums, dinner, bath time. But Emma hugged me before bed and whispered 'best day ever' and I realized she doesn't need me to be perfect. She just needs me.",
    mood: 4,
    tags: ["parenting", "gratitude"],
    isFavorite: false,
    wordCount: 42,
    createdAt: "2026-04-08T20:30:00Z",
    updatedAt: "2026-04-08T20:30:00Z",
  },
  {
    id: "je7",
    date: "2026-04-05T13:00:00Z",
    title: "Stress patterns",
    content: "Noticing that when I'm stressed, I get short with everyone. I snap at the kids, I'm impatient with my partner, and I beat myself up about it afterward. The pattern is clear: I don't ask for help until I'm drowning. I need to get better at recognizing the early signs and actually saying 'I need support' before I hit the breaking point. This is hard but necessary work.",
    mood: 2,
    tags: ["reflection", "stress", "growth", "self-awareness"],
    isFavorite: false,
    wordCount: 88,
    createdAt: "2026-04-05T13:00:00Z",
    updatedAt: "2026-04-05T13:00:00Z",
  },
  {
    id: "je8",
    date: "2026-03-28T18:45:00Z",
    title: "Gratitude for support",
    content: "My partner took over bedtime without me asking tonight. I didn't realize how much I needed that hour of silence until I had it. Sometimes support looks like someone just knowing what you need before you have to say it. Grateful.",
    mood: 5,
    tags: ["gratitude", "support", "partnership"],
    prompt: "Write about someone who made your life easier this week. How did they help?",
    isFavorite: false,
    wordCount: 55,
    createdAt: "2026-03-28T18:45:00Z",
    updatedAt: "2026-03-28T18:45:00Z",
  },
];

// ── Service Functions ──────────────────────────────────────────

/**
 * Get a random journal prompt
 * @param category Optional category to filter by
 */
export function getRandomPrompt(category?: JournalPrompt['category']): JournalPrompt {
  const filtered = category
    ? journalPrompts.filter(p => p.category === category)
    : journalPrompts;

  return filtered[Math.floor(Math.random() * filtered.length)];
}

/**
 * Save journal entry to AsyncStorage
 */
export async function saveJournalEntry(entry: JournalEntry): Promise<void> {
  try {
    const existing = await loadJournalEntries();
    const updated = [entry, ...existing.filter(e => e.id !== entry.id)];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Failed to save journal entry:", error);
    throw error;
  }
}

/**
 * Load journal entries from AsyncStorage
 * Falls back to mock data if storage is empty
 */
export async function loadJournalEntries(): Promise<JournalEntry[]> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const entries = JSON.parse(stored) as JournalEntry[];
      // Sort by date descending
      return entries.sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    }
    // No entries yet — start empty (no demo seeding).
    return [];
  } catch (error) {
    console.error("Failed to load journal entries:", error);
    return [];
  }
}

/**
 * Delete a journal entry from AsyncStorage
 */
export async function deleteJournalEntry(id: string): Promise<void> {
  try {
    const existing = await loadJournalEntries();
    const updated = existing.filter(e => e.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Failed to delete journal entry:", error);
    throw error;
  }
}

/**
 * Calculate journal statistics
 */
export function getJournalStats(entries: JournalEntry[]): JournalStats {
  const totalEntries = entries.length;
  const totalWords = entries.reduce((sum, e) => sum + e.wordCount, 0);
  const favoriteCount = entries.filter(e => e.isFavorite).length;

  // Calculate streak (consecutive days with entries)
  const sortedDates = entries
    .map(e => new Date(e.date).toISOString().split('T')[0])
    .filter((date, index, arr) => arr.indexOf(date) === index) // unique dates
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  let streakDays = 0;
  const today = new Date().toISOString().split('T')[0];

  if (sortedDates.length > 0) {
    // Check if there's an entry today or yesterday to start streak
    const latestDate = sortedDates[0];
    const daysDiff = Math.floor(
      (new Date(today).getTime() - new Date(latestDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff <= 1) {
      streakDays = 1;
      for (let i = 1; i < sortedDates.length; i++) {
        const prevDate = new Date(sortedDates[i - 1]);
        const currDate = new Date(sortedDates[i]);
        const diff = Math.floor((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diff === 1) {
          streakDays++;
        } else {
          break;
        }
      }
    }
  }

  // Calculate top tags
  const tagCounts: Record<string, number> = {};
  entries.forEach(entry => {
    entry.tags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag);

  return {
    totalEntries,
    totalWords,
    streakDays,
    favoriteCount,
    topTags,
  };
}
