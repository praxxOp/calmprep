/**
 * Pure analytics helpers that turn raw mood/journal rows into chart-ready data.
 * No I/O, no framework — deterministic and unit-testable. Keep aggregation logic
 * here so components stay thin (Code Quality + Testing).
 */

import type { JournalEntry, MoodLog } from "@/lib/wellness/types";

/** YYYY-MM-DD in local time for a given ISO timestamp. */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export interface MoodTrendPoint {
  date: string; // YYYY-MM-DD
  mood: number | null;
  stress: number | null;
  energy: number | null;
  count: number;
}

/**
 * Average mood/stress/energy per day across the last `days` days, oldest → newest.
 * Days with no check-ins are included with null values so the chart shows gaps honestly.
 */
export function moodTrend(moods: MoodLog[], days = 14): MoodTrendPoint[] {
  const buckets = new Map<string, { mood: number[]; stress: number[]; energy: number[] }>();

  for (const m of moods) {
    const key = dayKey(m.created_at);
    const b = buckets.get(key) ?? { mood: [], stress: [], energy: [] };
    b.mood.push(m.mood);
    if (m.stress != null) b.stress.push(m.stress);
    if (m.energy != null) b.energy.push(m.energy);
    buckets.set(key, b);
  }

  const avg = (xs: number[]) =>
    xs.length ? Math.round((xs.reduce((a, c) => a + c, 0) / xs.length) * 10) / 10 : null;

  const out: MoodTrendPoint[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = dayKey(d.toISOString());
    const b = buckets.get(key);
    out.push({
      date: key,
      mood: b ? avg(b.mood) : null,
      stress: b ? avg(b.stress) : null,
      energy: b ? avg(b.energy) : null,
      count: b ? b.mood.length : 0
    });
  }
  return out;
}

export interface TagCount {
  tag: string;
  count: number;
}

/** Frequency of AI-surfaced stress triggers across journal entries, most common first. */
export function triggerFrequency(journals: JournalEntry[], limit = 8): TagCount[] {
  return tally(journals.flatMap((j) => j.analysis?.triggers ?? []), limit);
}

/** Frequency of recurring journal themes, most common first. */
export function themeFrequency(journals: JournalEntry[], limit = 8): TagCount[] {
  return tally(journals.flatMap((j) => j.analysis?.themes ?? []), limit);
}

/** Frequency of mood-log tags, most common first. */
export function moodTagFrequency(moods: MoodLog[], limit = 8): TagCount[] {
  return tally(moods.flatMap((m) => m.tags ?? []), limit);
}

function tally(tags: string[], limit: number): TagCount[] {
  const counts = new Map<string, number>();
  for (const raw of tags) {
    const tag = raw.trim().toLowerCase();
    if (!tag) continue;
    counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/**
 * Consecutive-day check-in streak ending today (or yesterday), counting any day
 * that has at least one mood log or journal entry.
 */
export function checkInStreak(activityDates: string[]): number {
  const days = new Set(activityDates.map(dayKey));
  let streak = 0;
  const cursor = new Date();

  // Allow the streak to "start" today or yesterday so a not-yet-checked-in today
  // doesn't reset a real streak.
  if (!days.has(dayKey(cursor.toISOString()))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(dayKey(cursor.toISOString()))) return 0;
  }

  while (days.has(dayKey(cursor.toISOString()))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Average of a numeric field, rounded to 1 dp, or null if empty. */
export function average(values: number[]): number | null {
  if (!values.length) return null;
  return Math.round((values.reduce((a, c) => a + c, 0) / values.length) * 10) / 10;
}
