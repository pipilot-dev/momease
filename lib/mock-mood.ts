import AsyncStorage from '@react-native-async-storage/async-storage';

export type MoodLevel = 1 | 2 | 3 | 4 | 5;
export type EnergyLevel = 1 | 2 | 3 | 4 | 5;

export interface MoodEntry {
  id: string;
  date: string; // ISO string
  mood: MoodLevel;
  energy: EnergyLevel;
  sleepHours: number; // 0-12
  note?: string;
  tags: string[]; // e.g. 'anxious', 'grateful', 'overwhelmed', 'happy', 'tired', 'proud'
  waterGlasses: number; // 0-8
  exercised: boolean;
}

export interface WellnessStreak {
  currentStreak: number;
  longestStreak: number;
  lastCheckinDate: string;
}

export interface MoodStats {
  avgMood: number;
  avgEnergy: number;
  avgSleep: number;
  avgWater: number;
  exerciseDays: number;
  totalEntries: number;
}

export interface WeeklyMoodData {
  day: string;
  mood: number | null;
}

export const moodLabels: Record<
  MoodLevel,
  { emoji: string; label: string; color: string }
> = {
  1: { emoji: '😢', label: 'Rough', color: '#EF4444' },
  2: { emoji: '😕', label: 'Meh', color: '#F59E0B' },
  3: { emoji: '😐', label: 'Okay', color: '#6B7280' },
  4: { emoji: '🙂', label: 'Good', color: '#10B981' },
  5: { emoji: '🤩', label: 'Amazing', color: '#8B5CF6' },
};

export const energyLabels: Record<EnergyLevel, { label: string; color: string }> = {
  1: { label: 'Drained', color: '#EF4444' },
  2: { label: 'Low', color: '#F59E0B' },
  3: { label: 'Moderate', color: '#6B7280' },
  4: { label: 'Energized', color: '#10B981' },
  5: { label: 'Vibrant', color: '#8B5CF6' },
};

export const moodTags: string[] = [
  'grateful',
  'anxious',
  'overwhelmed',
  'happy',
  'tired',
  'proud',
  'stressed',
  'calm',
  'motivated',
  'lonely',
  'content',
  'excited',
];

export const wellnessPrompts: string[] = [
  "What's one thing you're grateful for today?",
  'How are you feeling in your body right now?',
  'What would help you feel more energized?',
  'What small win can you celebrate today?',
  'What do you need to let go of today?',
  'How can you show yourself kindness right now?',
  'What brought you joy today, even if just for a moment?',
  'What would make tomorrow easier for you?',
];

// Generate mock data for the past 14 days
const generateMockMoodHistory = (): MoodEntry[] => {
  const entries: MoodEntry[] = [];
  const today = new Date();

  const moodPatterns: Array<{
    mood: MoodLevel;
    energy: EnergyLevel;
    sleep: number;
    water: number;
    exercised: boolean;
    tags: string[];
    note?: string;
  }> = [
    { mood: 4, energy: 4, sleep: 7, water: 6, exercised: true, tags: ['grateful', 'energized'], note: 'Had a great morning walk!' },
    { mood: 3, energy: 3, sleep: 5, water: 4, exercised: false, tags: ['tired', 'okay'] },
    { mood: 5, energy: 5, sleep: 8, water: 7, exercised: true, tags: ['happy', 'proud', 'motivated'], note: 'Baby slept through the night!' },
    { mood: 2, energy: 2, sleep: 4, water: 3, exercised: false, tags: ['exhausted', 'overwhelmed'], note: 'Rough night with the baby' },
    { mood: 3, energy: 3, sleep: 6, water: 5, exercised: false, tags: ['calm', 'content'] },
    { mood: 4, energy: 4, sleep: 7, water: 6, exercised: true, tags: ['grateful', 'happy'] },
    { mood: 4, energy: 3, sleep: 6, water: 5, exercised: false, tags: ['content', 'calm'], note: 'Nice quiet day at home' },
    { mood: 3, energy: 2, sleep: 5, water: 4, exercised: false, tags: ['tired', 'stressed'] },
    { mood: 5, energy: 4, sleep: 7, water: 7, exercised: true, tags: ['excited', 'proud'], note: 'Managed to do yoga during nap time' },
    { mood: 2, energy: 2, sleep: 4, water: 3, exercised: false, tags: ['anxious', 'overwhelmed', 'lonely'] },
    { mood: 4, energy: 4, sleep: 7, water: 6, exercised: true, tags: ['grateful', 'motivated'] },
    { mood: 3, energy: 3, sleep: 6, water: 5, exercised: false, tags: ['okay', 'tired'] },
    { mood: 4, energy: 4, sleep: 7, water: 6, exercised: true, tags: ['happy', 'content'], note: 'Coffee date with a friend helped so much' },
    { mood: 5, energy: 5, sleep: 8, water: 8, exercised: true, tags: ['amazing', 'grateful', 'proud'], note: 'Feeling really good today!' },
  ];

  for (let i = 13; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(14, 0, 0, 0); // Set to 2 PM for consistency

    const pattern = moodPatterns[i % moodPatterns.length];

    entries.push({
      id: `mood-${date.getTime()}-${Math.random().toString(36).substr(2, 9)}`,
      date: date.toISOString(),
      mood: pattern.mood,
      energy: pattern.energy,
      sleepHours: pattern.sleep,
      waterGlasses: pattern.water,
      exercised: pattern.exercised,
      tags: pattern.tags,
      note: pattern.note,
    });
  }

  return entries;
};

export const mockMoodHistory: MoodEntry[] = generateMockMoodHistory();

export const getMoodStats = (entries: MoodEntry[]): MoodStats => {
  if (entries.length === 0) {
    return {
      avgMood: 0,
      avgEnergy: 0,
      avgSleep: 0,
      avgWater: 0,
      exerciseDays: 0,
      totalEntries: 0,
    };
  }

  const totalMood = entries.reduce((sum, entry) => sum + entry.mood, 0);
  const totalEnergy = entries.reduce((sum, entry) => sum + entry.energy, 0);
  const totalSleep = entries.reduce((sum, entry) => sum + entry.sleepHours, 0);
  const totalWater = entries.reduce((sum, entry) => sum + entry.waterGlasses, 0);
  const exerciseDays = entries.filter((entry) => entry.exercised).length;

  return {
    avgMood: Math.round((totalMood / entries.length) * 10) / 10,
    avgEnergy: Math.round((totalEnergy / entries.length) * 10) / 10,
    avgSleep: Math.round((totalSleep / entries.length) * 10) / 10,
    avgWater: Math.round((totalWater / entries.length) * 10) / 10,
    exerciseDays,
    totalEntries: entries.length,
  };
};

export const getWeeklyMoodData = (entries: MoodEntry[]): WeeklyMoodData[] => {
  const today = new Date();
  const weekData: WeeklyMoodData[] = [];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const dayName = dayNames[date.getDay()];

    // Find entry for this day
    const entry = entries.find((e) => {
      const entryDate = new Date(e.date);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate.getTime() === date.getTime();
    });

    weekData.push({
      day: dayName,
      mood: entry ? entry.mood : null,
    });
  }

  return weekData;
};

const MOOD_STORAGE_KEY = 'momease_mood_entries';

export const saveMoodEntry = async (entry: MoodEntry): Promise<void> => {
  try {
    const existingData = await AsyncStorage.getItem(MOOD_STORAGE_KEY);
    const entries: MoodEntry[] = existingData ? JSON.parse(existingData) : [];

    // Check if entry for this date already exists
    const entryDate = new Date(entry.date);
    entryDate.setHours(0, 0, 0, 0);

    const existingIndex = entries.findIndex((e) => {
      const eDate = new Date(e.date);
      eDate.setHours(0, 0, 0, 0);
      return eDate.getTime() === entryDate.getTime();
    });

    if (existingIndex >= 0) {
      // Update existing entry
      entries[existingIndex] = entry;
    } else {
      // Add new entry
      entries.push(entry);
    }

    // Sort by date (newest first)
    entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    await AsyncStorage.setItem(MOOD_STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    console.error('Error saving mood entry:', error);
    throw error;
  }
};

export const loadMoodEntries = async (): Promise<MoodEntry[]> => {
  try {
    const data = await AsyncStorage.getItem(MOOD_STORAGE_KEY);
    if (data) {
      const entries: MoodEntry[] = JSON.parse(data);
      // Sort by date (newest first)
      return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    // No data yet — start empty (no demo seeding).
    return [];
  } catch (error) {
    console.error('Error loading mood entries:', error);
    return [];
  }
};

export const getWellnessStreak = (entries: MoodEntry[]): WellnessStreak => {
  if (entries.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastCheckinDate: '',
    };
  }

  // Sort entries by date (oldest first for streak calculation)
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 1;

  const lastEntry = sortedEntries[sortedEntries.length - 1];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastEntryDate = new Date(lastEntry.date);
  lastEntryDate.setHours(0, 0, 0, 0);

  // Calculate longest streak
  for (let i = 1; i < sortedEntries.length; i++) {
    const prevDate = new Date(sortedEntries[i - 1].date);
    prevDate.setHours(0, 0, 0, 0);

    const currDate = new Date(sortedEntries[i].date);
    currDate.setHours(0, 0, 0, 0);

    const dayDiff = Math.floor(
      (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (dayDiff === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  // Calculate current streak (must be active - today or yesterday)
  const daysSinceLastEntry = Math.floor(
    (today.getTime() - lastEntryDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceLastEntry <= 1) {
    // Streak is active
    currentStreak = 1;

    // Count backwards from the last entry
    for (let i = sortedEntries.length - 1; i > 0; i--) {
      const currDate = new Date(sortedEntries[i].date);
      currDate.setHours(0, 0, 0, 0);

      const prevDate = new Date(sortedEntries[i - 1].date);
      prevDate.setHours(0, 0, 0, 0);

      const dayDiff = Math.floor(
        (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (dayDiff === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  return {
    currentStreak,
    longestStreak,
    lastCheckinDate: lastEntry.date,
  };
};
