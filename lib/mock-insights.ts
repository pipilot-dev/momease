import { MoodEntry } from './mock-mood';

export interface WeeklySummary {
  period: string;
  avgMood: number;
  avgEnergy: number;
  avgSleep: number;
  avgWater: number;
  exerciseDays: number;
  totalEntries: number;
  moodTrend: 'up' | 'down' | 'stable';
  sleepTrend: 'up' | 'down' | 'stable';
  topTags: { tag: string; count: number }[];
  insights: string[];
}

export interface MonthlySummary {
  period: string;
  avgMood: number;
  avgEnergy: number;
  avgSleep: number;
  avgWater: number;
  exerciseDays: number;
  totalEntries: number;
  bestDay: { day: string; mood: number };
  challengingDay: { day: string; mood: number };
  topTags: { tag: string; count: number }[];
  insights: string[];
}

export interface InsightPattern {
  type: 'positive' | 'caution' | 'actionable';
  title: string;
  description: string;
  icon: string;
}

export const getWeeklySummary = (entries: MoodEntry[]): WeeklySummary => {
  if (entries.length === 0) {
    return {
      period: 'This Week',
      avgMood: 0,
      avgEnergy: 0,
      avgSleep: 0,
      avgWater: 0,
      exerciseDays: 0,
      totalEntries: 0,
      moodTrend: 'stable',
      sleepTrend: 'stable',
      topTags: [],
      insights: [],
    };
  }

  const last7 = entries.slice(0, 7).reverse();
  const prev7 = entries.slice(7, 14).reverse();

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

  const last7Mood = last7.map(e => e.mood);
  const prev7Mood = prev7.map(e => e.mood);
  const last7Sleep = last7.map(e => e.sleepHours);
  const prev7Sleep = prev7.map(e => e.sleepHours);

  const currentAvgMood = avg(last7Mood);
  const prevAvgMood = prev7Mood.length > 0 ? avg(prev7Mood) : currentAvgMood;
  const moodTrend = currentAvgMood > prevAvgMood + 0.3 ? 'up' : currentAvgMood < prevAvgMood - 0.3 ? 'down' : 'stable';

  const currentAvgSleep = avg(last7Sleep);
  const prevAvgSleep = prev7Sleep.length > 0 ? avg(prev7Sleep) : currentAvgSleep;
  const sleepTrend = currentAvgSleep > prevAvgSleep + 0.5 ? 'up' : currentAvgSleep < prevAvgSleep - 0.5 ? 'down' : 'stable';

  const topTags: { tag: string; count: number }[] = [];
  const tagCounts: Record<string, number> = {};
  last7.forEach(e => e.tags.forEach(tag => { tagCounts[tag] = (tagCounts[tag] || 0) + 1; }));
  Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .forEach(([tag, count]) => topTags.push({ tag, count }));

  const insights: string[] = [];
  const avgSleepVal = currentAvgSleep;
  if (avgSleepVal >= 7) {
    insights.push('You\'re getting quality rest this week — keep it up!');
  } else if (avgSleepVal >= 5) {
    insights.push('Sleep is a bit light this week. Try an earlier bedtime routine.');
  } else {
    insights.push('Sleep has been challenging. Consider a wind-down ritual tonight.');
  }

  const exerciseRate = last7.filter(e => e.exercised).length / Math.max(last7.length, 1);
  if (exerciseRate >= 0.6) {
    insights.push('Great consistency with movement! Your energy shows it.');
  } else if (exerciseRate >= 0.3) {
    insights.push('Some movement this week — even small walks help.');
  } else {
    insights.push('Gentle reminder: even 5 minutes of stretching can help reset your day.');
  }

  const avgWater = last7.map(e => e.waterGlasses).reduce((a, b) => a + b, 0) / Math.max(last7.length, 1);
  if (avgWater >= 6) {
    insights.push('Staying hydrated — your body thanks you!');
  } else {
    insights.push('Hydration check: try adding one extra glass today.');
  }

  if (moodTrend === 'up') {
    insights.push('Your mood is trending upward — whatever you\'re doing is working.');
  } else if (moodTrend === 'down') {
    insights.push('This week has been heavy. Be gentle with yourself.');
  }

  return {
    period: 'This Week',
    avgMood: Math.round(currentAvgMood * 10) / 10,
    avgEnergy: Math.round(avg(last7.map(e => e.energy)) * 10) / 10,
    avgSleep: Math.round(avgSleepVal * 10) / 10,
    avgWater: Math.round(avgWater * 10) / 10,
    exerciseDays: last7.filter(e => e.exercised).length,
    totalEntries: last7.length,
    moodTrend,
    sleepTrend,
    topTags,
    insights: insights.slice(0, 4),
  };
};

export const getMonthlySummary = (entries: MoodEntry[]): MonthlySummary => {
  if (entries.length === 0) {
    return {
      period: 'This Month',
      avgMood: 0,
      avgEnergy: 0,
      avgSleep: 0,
      avgWater: 0,
      exerciseDays: 0,
      totalEntries: 0,
      bestDay: { day: '', mood: 0 },
      challengingDay: { day: '', mood: 0 },
      topTags: [],
      insights: [],
    };
  }

  const last30 = entries.slice(0, 30).reverse();
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

  const best = last30.reduce((best, e) => e.mood > best.mood ? e : best, last30[0]);
  const challenging = last30.reduce((worst, e) => e.mood < worst.mood ? e : worst, last30[0]);
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const tagCounts: Record<string, number> = {};
  last30.forEach(e => e.tags.forEach(tag => { tagCounts[tag] = (tagCounts[tag] || 0) + 1; }));
  const topTags = Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([tag, count]) => ({ tag, count }));

  const avgSleepVal = avg(last30.map(e => e.sleepHours));
  const avgWater = avg(last30.map(e => e.waterGlasses));
  const exerciseRate = last30.filter(e => e.exercised).length / Math.max(last30.length, 1);

  const insights: string[] = [];
  insights.push(`You've logged ${last30.length} check-ins this month.`);
  if (avgSleepVal >= 7) {
    insights.push('Sleep quality is strong this month.');
  } else {
    insights.push('Sleep has been inconsistent. Try tracking bedtime habits.');
  }
  if (exerciseRate >= 0.5) {
    insights.push('You moved more than half the days — impressive dedication.');
  }
  insights.push(topTags.length > 0 ? `"${topTags[0].tag}" was your most logged emotion.` : 'Keep checking in to discover patterns.');

  return {
    period: 'This Month',
    avgMood: Math.round(avg(last30.map(e => e.mood)) * 10) / 10,
    avgEnergy: Math.round(avg(last30.map(e => e.energy)) * 10) / 10,
    avgSleep: Math.round(avgSleepVal * 10) / 10,
    avgWater: Math.round(avgWater * 10) / 10,
    exerciseDays: last30.filter(e => e.exercised).length,
    totalEntries: last30.length,
    bestDay: { day: formatDate(best.date), mood: best.mood },
    challengingDay: { day: formatDate(challenging.date), mood: challenging.mood },
    topTags,
    insights: insights.slice(0, 3),
  };
};

export const getInsightPatterns = (entries: MoodEntry[]): InsightPattern[] => {
  if (entries.length < 3) return [];

  const patterns: InsightPattern[] = [];
  const last7 = entries.slice(0, 7);

  const avgSleep = last7.reduce((s, e) => s + e.sleepHours, 0) / last7.length;
  const avgMood = last7.reduce((s, e) => s + e.mood, 0) / last7.length;

  if (avgSleep >= 7 && avgMood >= 4) {
    patterns.push({
      type: 'positive',
      title: 'Sleep & Mood Sync',
      description: 'Your rest and mood are positively correlated. Protecting your sleep routine is working.',
      icon: 'sparkles',
    });
  }

  const exercisedMoods = last7.filter(e => e.exercised).map(e => e.mood);
  const restMoods = last7.filter(e => !e.exercised).map(e => e.mood);
  const exercisedAvg = exercisedMoods.length > 0 ? exercisedMoods.reduce((a, b) => a + b, 0) / exercisedMoods.length : 0;
  const restAvg = restMoods.length > 0 ? restMoods.reduce((a, b) => a + b, 0) / restMoods.length : 0;

  if (exercisedAvg > restAvg + 0.5) {
    patterns.push({
      type: 'positive',
      title: 'Movement Matters',
      description: `Days you exercise show higher mood (${exercisedAvg.toFixed(1)} vs ${restAvg.toFixed(1)}). Even 10 minutes makes a difference.`,
      icon: 'trending-up',
    });
  }

  const waterDrankDays = last7.filter(e => e.waterGlasses >= 6);
  if (waterDrankDays.length >= 4) {
    patterns.push({
      type: 'positive',
      title: 'Hydration Champion',
      description: `${waterDrankDays.length}/7 days hitting water goals. Hydration supports everything else.`,
      icon: 'droplets',
    });
  }

  const hasLowSleep = last7.some(e => e.sleepHours < 5);
  if (hasLowSleep) {
    patterns.push({
      type: 'caution',
      title: 'Sleep Fragility',
      description: 'Several low-sleep nights this week. Low sleep amplifies stress and emotional reactivity.',
      icon: 'alert-triangle',
    });
  }

  const lowEnergyDays = last7.filter(e => e.energy <= 2).length;
  if (lowEnergyDays >= 3) {
    patterns.push({
      type: 'actionable',
      title: 'Energy Check',
      description: `${lowEnergyDays} days of low energy. Consider: earlier bedtime, gentle movement, or asking for help.`,
      icon: 'zap',
    });
  }

  const gratitudeOrCalm = last7.filter(e => e.tags.some(t => t === 'grateful' || t === 'calm' || t === 'content'));
  if (gratitudeOrCalm.length >= 4) {
    patterns.push({
      type: 'positive',
      title: 'Emotional Resilience',
      description: 'You\'re logging positive emotions consistently. Resilience grows with each check-in.',
      icon: 'heart',
    });
  }

  return patterns;
};
