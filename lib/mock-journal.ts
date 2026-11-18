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
