import { describe, it, expect } from "vitest";

import {
  dayKey,
  moodTrend,
  triggerFrequency,
  themeFrequency,
  moodTagFrequency,
  checkInStreak,
  average
} from "@/lib/wellness/insights";
import type { JournalEntry, MoodLog, Scale } from "@/lib/wellness/types";

const DAY_MS = 864e5;

/** ISO timestamp for `n` whole days before now (noon-anchored to dodge DST edges). */
function daysAgoIso(n: number): string {
  const d = new Date(Date.now() - n * DAY_MS);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

/** Local YYYY-MM-DD for `n` days before now, matching the module's own dayKey. */
function localKeyDaysAgo(n: number): string {
  return dayKey(daysAgoIso(n));
}

function makeMood(overrides: Partial<MoodLog> = {}): MoodLog {
  return {
    id: "m1",
    user_id: "u1",
    mood: 3,
    energy: 3,
    stress: 3,
    tags: [],
    note: null,
    created_at: daysAgoIso(0),
    ...overrides
  };
}

function makeJournal(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: "j1",
    user_id: "u1",
    content: "entry",
    analysis: null,
    created_at: daysAgoIso(0),
    updated_at: daysAgoIso(0),
    ...overrides
  };
}

describe("dayKey", () => {
  it("formats an ISO timestamp to local YYYY-MM-DD", () => {
    const d = new Date(2026, 2, 5, 9, 30, 0); // local 2026-03-05 09:30
    expect(dayKey(d.toISOString())).toBe("2026-03-05");
  });

  it("zero-pads single-digit months and days", () => {
    const d = new Date(2026, 0, 3, 0, 1, 0); // local 2026-01-03
    expect(dayKey(d.toISOString())).toBe("2026-01-03");
  });

  it("is consistent for two timestamps on the same local day", () => {
    const morning = new Date(2026, 5, 20, 1, 0, 0).toISOString();
    const evening = new Date(2026, 5, 20, 23, 0, 0).toISOString();
    expect(dayKey(morning)).toBe(dayKey(evening));
  });

  it("zero-pads a December date to two-digit month", () => {
    const d = new Date(2026, 11, 9, 8, 0, 0); // local 2026-12-09
    expect(dayKey(d.toISOString())).toBe("2026-12-09");
  });

  it("rolls into the next local day for a late-night local time", () => {
    // 2026-03-31 23:30 local is still the 31st locally regardless of the UTC offset.
    const d = new Date(2026, 2, 31, 23, 30, 0);
    expect(dayKey(d.toISOString())).toBe("2026-03-31");
  });

  it("formats a four-digit year exactly (no truncation)", () => {
    const d = new Date(2030, 8, 1, 12, 0, 0); // local 2030-09-01
    expect(dayKey(d.toISOString())).toBe("2030-09-01");
  });
});

describe("moodTrend", () => {
  it("returns exactly `days` points by default (14)", () => {
    const points = moodTrend([]);
    expect(points).toHaveLength(14);
  });

  it("honors a custom days argument", () => {
    expect(moodTrend([], 7)).toHaveLength(7);
    expect(moodTrend([], 1)).toHaveLength(1);
  });

  it("orders points oldest -> newest with the last point being today", () => {
    const points = moodTrend([], 5);
    expect(points[0].date).toBe(localKeyDaysAgo(4));
    expect(points[4].date).toBe(localKeyDaysAgo(0));
    for (let i = 1; i < points.length; i++) {
      expect(points[i].date > points[i - 1].date).toBe(true);
    }
  });

  it("uses null values and count 0 for days with no logs", () => {
    const points = moodTrend([], 3);
    for (const p of points) {
      expect(p).toEqual({
        date: p.date,
        mood: null,
        stress: null,
        energy: null,
        count: 0
      });
    }
  });

  it("averages multiple logs on the same day and rounds to 1 decimal", () => {
    const moods = [
      makeMood({ id: "a", mood: 2, stress: 1, energy: 5, created_at: daysAgoIso(0) }),
      makeMood({ id: "b", mood: 3, stress: 2, energy: 4, created_at: daysAgoIso(0) }),
      makeMood({ id: "c", mood: 5, stress: 5, energy: 5, created_at: daysAgoIso(0) })
    ];
    const today = moodTrend(moods, 3).at(-1);
    expect(today).toBeDefined();
    // mood (2+3+5)/3 = 3.333 -> 3.3 ; stress (1+2+5)/3 = 2.666 -> 2.7 ; energy (5+4+5)/3 = 4.666 -> 4.7
    expect(today?.mood).toBe(3.3);
    expect(today?.stress).toBe(2.7);
    expect(today?.energy).toBe(4.7);
    expect(today?.count).toBe(3);
  });

  it("excludes null stress/energy from their averages but counts the log", () => {
    const moods = [
      makeMood({ id: "a", mood: 4, stress: 2, energy: null, created_at: daysAgoIso(1) }),
      makeMood({ id: "b", mood: 2, stress: null, energy: 4, created_at: daysAgoIso(1) })
    ];
    const point = moodTrend(moods, 3).find((p) => p.date === localKeyDaysAgo(1));
    expect(point).toBeDefined();
    expect(point?.mood).toBe(3); // (4+2)/2
    expect(point?.stress).toBe(2); // only the non-null 2
    expect(point?.energy).toBe(4); // only the non-null 4
    expect(point?.count).toBe(2); // count is number of mood logs, not non-null fields
  });

  it("yields all-null values when every stress/energy on a day is null", () => {
    const moods = [
      makeMood({ id: "a", mood: 5, stress: null, energy: null, created_at: daysAgoIso(2) })
    ];
    const point = moodTrend(moods, 5).find((p) => p.date === localKeyDaysAgo(2));
    expect(point).toBeDefined();
    expect(point?.mood).toBe(5);
    expect(point?.stress).toBeNull();
    expect(point?.energy).toBeNull();
    expect(point?.count).toBe(1);
  });

  it("buckets logs into the correct distinct days", () => {
    const moods = [
      makeMood({ id: "a", mood: 1, created_at: daysAgoIso(0) }),
      makeMood({ id: "b", mood: 5, created_at: daysAgoIso(2) })
    ];
    const points = moodTrend(moods, 5);
    const todayPoint = points.find((p) => p.date === localKeyDaysAgo(0));
    const twoAgoPoint = points.find((p) => p.date === localKeyDaysAgo(2));
    const oneAgoPoint = points.find((p) => p.date === localKeyDaysAgo(1));
    expect(todayPoint?.mood).toBe(1);
    expect(todayPoint?.count).toBe(1);
    expect(twoAgoPoint?.mood).toBe(5);
    expect(twoAgoPoint?.count).toBe(1);
    expect(oneAgoPoint?.mood).toBeNull();
    expect(oneAgoPoint?.count).toBe(0);
  });

  it("returns an empty array when days is 0", () => {
    expect(moodTrend([makeMood()], 0)).toEqual([]);
  });

  it("excludes logs that fall outside the requested window", () => {
    // Window of 3 days = today, day-1, day-2. A log from day-5 must not appear.
    const moods = [
      makeMood({ id: "a", mood: 4, created_at: daysAgoIso(0) }),
      makeMood({ id: "old", mood: 1, created_at: daysAgoIso(5) })
    ];
    const points = moodTrend(moods, 3);
    expect(points).toHaveLength(3);
    expect(points.some((p) => p.date === localKeyDaysAgo(5))).toBe(false);
    // Only today carries data; the out-of-window log contributes nothing.
    const totalCount = points.reduce((sum, p) => sum + p.count, 0);
    expect(totalCount).toBe(1);
    expect(points.at(-1)?.mood).toBe(4);
  });

  it("includes a log on the oldest day of the window (inclusive boundary)", () => {
    // days=3 -> oldest point is day-2; a log there must be counted.
    const moods = [makeMood({ id: "edge", mood: 2, created_at: daysAgoIso(2) })];
    const points = moodTrend(moods, 3);
    expect(points[0].date).toBe(localKeyDaysAgo(2));
    expect(points[0].mood).toBe(2);
    expect(points[0].count).toBe(1);
  });

  it("rounds a .x5 average half upward (toward +Infinity)", () => {
    // (1+1+1+2)/4 = 1.25 -> Math.round(12.5)=13 -> 1.3
    const moods = [
      makeMood({ id: "a", mood: 1, stress: 1, energy: 1, created_at: daysAgoIso(0) }),
      makeMood({ id: "b", mood: 1, stress: 1, energy: 1, created_at: daysAgoIso(0) }),
      makeMood({ id: "c", mood: 1, stress: 1, energy: 1, created_at: daysAgoIso(0) }),
      makeMood({ id: "d", mood: 2, stress: 2, energy: 2, created_at: daysAgoIso(0) })
    ];
    const today = moodTrend(moods, 1).at(-1);
    expect(today?.mood).toBe(1.3);
    expect(today?.stress).toBe(1.3);
    expect(today?.energy).toBe(1.3);
    expect(today?.count).toBe(4);
  });

  it("keeps count equal to the number of mood logs even when some fields are null", () => {
    const moods = [
      makeMood({ id: "a", mood: 3, stress: null, energy: 2, created_at: daysAgoIso(1) }),
      makeMood({ id: "b", mood: 5, stress: 4, energy: null, created_at: daysAgoIso(1) }),
      makeMood({ id: "c", mood: 1, stress: null, energy: null, created_at: daysAgoIso(1) })
    ];
    const point = moodTrend(moods, 3).find((p) => p.date === localKeyDaysAgo(1));
    expect(point?.count).toBe(3);
    expect(point?.mood).toBe(3); // (3+5+1)/3 = 3
    expect(point?.stress).toBe(4); // only the single non-null 4
    expect(point?.energy).toBe(2); // only the single non-null 2
  });

  it("produces an integer-valued average without a trailing decimal", () => {
    const moods = [
      makeMood({ id: "a", mood: 4, stress: 4, energy: 4, created_at: daysAgoIso(0) }),
      makeMood({ id: "b", mood: 4, stress: 4, energy: 4, created_at: daysAgoIso(0) })
    ];
    const today = moodTrend(moods, 1).at(-1);
    expect(today?.mood).toBe(4);
    expect(today?.stress).toBe(4);
    expect(today?.energy).toBe(4);
  });
});

describe("triggerFrequency", () => {
  it("returns [] for empty input", () => {
    expect(triggerFrequency([])).toEqual([]);
  });

  it("counts triggers case-insensitively after trim+lowercase", () => {
    const journals = [
      makeJournal({
        id: "1",
        analysis: {
          sentiment: "negative",
          mood_score: 2,
          stress_level: 4,
          triggers: ["Exam", " exam ", "EXAM", "Sleep"],
          themes: [],
          summary: ""
        }
      })
    ];
    expect(triggerFrequency(journals)).toEqual([
      { tag: "exam", count: 3 },
      { tag: "sleep", count: 1 }
    ]);
  });

  it("aggregates across multiple journals and sorts by count desc", () => {
    const journals = [
      makeJournal({
        id: "1",
        analysis: {
          sentiment: "negative",
          mood_score: 2,
          stress_level: 4,
          triggers: ["money", "exam"],
          themes: [],
          summary: ""
        }
      }),
      makeJournal({
        id: "2",
        analysis: {
          sentiment: "negative",
          mood_score: 2,
          stress_level: 4,
          triggers: ["exam", "exam", "family"],
          themes: [],
          summary: ""
        }
      })
    ];
    expect(triggerFrequency(journals)).toEqual([
      { tag: "exam", count: 3 },
      { tag: "money", count: 1 },
      { tag: "family", count: 1 }
    ]);
  });

  it("skips entries with null analysis and ignores empty/whitespace tags", () => {
    const journals = [
      makeJournal({ id: "1", analysis: null }),
      makeJournal({
        id: "2",
        analysis: {
          sentiment: "neutral",
          mood_score: 3,
          stress_level: 3,
          triggers: ["focus", "   ", ""],
          themes: [],
          summary: ""
        }
      })
    ];
    expect(triggerFrequency(journals)).toEqual([{ tag: "focus", count: 1 }]);
  });

  it("respects the default limit of 8 and a custom limit", () => {
    const triggers = Array.from({ length: 12 }, (_, i) => `t${i}`);
    const journals = [
      makeJournal({
        id: "1",
        analysis: {
          sentiment: "neutral",
          mood_score: 3,
          stress_level: 3,
          triggers,
          themes: [],
          summary: ""
        }
      })
    ];
    expect(triggerFrequency(journals)).toHaveLength(8);
    expect(triggerFrequency(journals, 3)).toHaveLength(3);
  });

  it("returns [] when the limit is 0", () => {
    const journals = [
      makeJournal({
        id: "1",
        analysis: {
          sentiment: "neutral",
          mood_score: 3,
          stress_level: 3,
          triggers: ["a", "b"],
          themes: [],
          summary: ""
        }
      })
    ];
    expect(triggerFrequency(journals, 0)).toEqual([]);
  });

  it("keeps first-seen order for tags tied on count", () => {
    // money/exam/family each appear once; tie order follows first-insertion order.
    const journals = [
      makeJournal({
        id: "1",
        analysis: {
          sentiment: "neutral",
          mood_score: 3,
          stress_level: 3,
          triggers: ["money", "exam", "family"],
          themes: [],
          summary: ""
        }
      })
    ];
    expect(triggerFrequency(journals)).toEqual([
      { tag: "money", count: 1 },
      { tag: "exam", count: 1 },
      { tag: "family", count: 1 }
    ]);
  });

  it("returns [] when journals exist but none have triggers", () => {
    const journals = [
      makeJournal({ id: "1", analysis: null }),
      makeJournal({
        id: "2",
        analysis: {
          sentiment: "positive",
          mood_score: 4,
          stress_level: 2,
          triggers: [],
          themes: ["growth"],
          summary: ""
        }
      })
    ];
    expect(triggerFrequency(journals)).toEqual([]);
  });
});

describe("themeFrequency", () => {
  it("returns [] for empty input", () => {
    expect(themeFrequency([])).toEqual([]);
  });

  it("counts themes case-insensitively, sorted desc, respecting limit", () => {
    const journals = [
      makeJournal({
        id: "1",
        analysis: {
          sentiment: "mixed",
          mood_score: 3,
          stress_level: 3,
          triggers: [],
          themes: ["Growth", "growth", "FEAR"],
          summary: ""
        }
      })
    ];
    expect(themeFrequency(journals)).toEqual([
      { tag: "growth", count: 2 },
      { tag: "fear", count: 1 }
    ]);
    expect(themeFrequency(journals, 1)).toEqual([{ tag: "growth", count: 2 }]);
  });

  it("reads themes (not triggers) from analysis", () => {
    const journals = [
      makeJournal({
        id: "1",
        analysis: {
          sentiment: "neutral",
          mood_score: 3,
          stress_level: 3,
          triggers: ["should-be-ignored"],
          themes: ["resilience"],
          summary: ""
        }
      })
    ];
    expect(themeFrequency(journals)).toEqual([{ tag: "resilience", count: 1 }]);
  });

  it("caps results at the default limit of 8", () => {
    const themes = Array.from({ length: 11 }, (_, i) => `th${i}`);
    const journals = [
      makeJournal({
        id: "1",
        analysis: {
          sentiment: "neutral",
          mood_score: 3,
          stress_level: 3,
          triggers: [],
          themes,
          summary: ""
        }
      })
    ];
    expect(themeFrequency(journals)).toHaveLength(8);
  });

  it("aggregates themes across journals, skipping null analysis", () => {
    const journals = [
      makeJournal({ id: "1", analysis: null }),
      makeJournal({
        id: "2",
        analysis: {
          sentiment: "mixed",
          mood_score: 3,
          stress_level: 3,
          triggers: [],
          themes: ["Focus", "calm"],
          summary: ""
        }
      }),
      makeJournal({
        id: "3",
        analysis: {
          sentiment: "mixed",
          mood_score: 3,
          stress_level: 3,
          triggers: [],
          themes: ["focus"],
          summary: ""
        }
      })
    ];
    expect(themeFrequency(journals)).toEqual([
      { tag: "focus", count: 2 },
      { tag: "calm", count: 1 }
    ]);
  });
});

describe("moodTagFrequency", () => {
  it("returns [] for empty input", () => {
    expect(moodTagFrequency([])).toEqual([]);
  });

  it("counts mood .tags case-insensitively, sorted desc", () => {
    const moods = [
      makeMood({ id: "a", tags: ["Tired", "tired", "Calm"] }),
      makeMood({ id: "b", tags: [" CALM "] })
    ];
    expect(moodTagFrequency(moods)).toEqual([
      { tag: "tired", count: 2 },
      { tag: "calm", count: 2 }
    ]);
  });

  it("handles moods with empty tag arrays and respects limit", () => {
    const moods = [
      makeMood({ id: "a", tags: [] }),
      makeMood({ id: "b", tags: ["x", "y", "z"] })
    ];
    expect(moodTagFrequency(moods, 2)).toHaveLength(2);
  });

  it("caps results at the default limit of 8", () => {
    const tags = Array.from({ length: 10 }, (_, i) => `tag${i}`);
    expect(moodTagFrequency([makeMood({ id: "a", tags })])).toHaveLength(8);
  });

  it("ignores whitespace-only and empty mood tags", () => {
    const moods = [makeMood({ id: "a", tags: ["happy", "  ", "", "happy"] })];
    expect(moodTagFrequency(moods)).toEqual([{ tag: "happy", count: 2 }]);
  });

  it("returns [] when limit is 0 even with tags present", () => {
    expect(moodTagFrequency([makeMood({ id: "a", tags: ["x"] })], 0)).toEqual([]);
  });
});

describe("checkInStreak", () => {
  it("returns 0 for empty input", () => {
    expect(checkInStreak([])).toBe(0);
  });

  it("returns 0 when the latest activity is older than yesterday", () => {
    expect(checkInStreak([daysAgoIso(3), daysAgoIso(4)])).toBe(0);
  });

  it("counts a single check-in today as a streak of 1", () => {
    expect(checkInStreak([daysAgoIso(0)])).toBe(1);
  });

  it("counts a streak that starts yesterday when today has no activity", () => {
    expect(checkInStreak([daysAgoIso(1), daysAgoIso(2)])).toBe(2);
  });

  it("counts consecutive days ending today", () => {
    expect(checkInStreak([daysAgoIso(0), daysAgoIso(1), daysAgoIso(2)])).toBe(3);
  });

  it("stops counting at the first gap", () => {
    // today, yesterday present; day-2 missing; day-3 present (should not count)
    expect(checkInStreak([daysAgoIso(0), daysAgoIso(1), daysAgoIso(3)])).toBe(2);
  });

  it("counts multiple entries on the same day only once", () => {
    const today = daysAgoIso(0);
    expect(checkInStreak([today, today, daysAgoIso(1)])).toBe(2);
  });

  it("is order-independent", () => {
    expect(checkInStreak([daysAgoIso(2), daysAgoIso(0), daysAgoIso(1)])).toBe(3);
  });

  it("returns 0 when today and yesterday are both missing even if day-2 is present", () => {
    expect(checkInStreak([daysAgoIso(2), daysAgoIso(3)])).toBe(0);
  });

  it("does not count days after a gap when the streak starts yesterday", () => {
    // yesterday present, day-2 missing, day-3 present -> streak of 1 (yesterday only).
    expect(checkInStreak([daysAgoIso(1), daysAgoIso(3)])).toBe(1);
  });

  it("counts a long unbroken streak ending today", () => {
    const dates = Array.from({ length: 10 }, (_, i) => daysAgoIso(i));
    expect(checkInStreak(dates)).toBe(10);
  });

  it("ignores activity older than the current streak window", () => {
    // today + yesterday form the streak; a lone log 8 days ago is irrelevant.
    expect(checkInStreak([daysAgoIso(0), daysAgoIso(1), daysAgoIso(8)])).toBe(2);
  });

  it("collapses many duplicate timestamps within the same days to single days", () => {
    const dates = [
      daysAgoIso(0),
      daysAgoIso(0),
      daysAgoIso(1),
      daysAgoIso(1),
      daysAgoIso(1),
      daysAgoIso(2)
    ];
    expect(checkInStreak(dates)).toBe(3);
  });
});

describe("average", () => {
  it("returns null for an empty array", () => {
    expect(average([])).toBeNull();
  });

  it("returns the single value for a one-element array", () => {
    expect(average([4])).toBe(4);
  });

  it("computes the mean rounded to 1 decimal place", () => {
    expect(average([1, 2])).toBe(1.5);
    expect(average([1, 2, 2])).toBe(1.7); // 1.666... -> 1.7
    expect(average([2, 3, 5])).toBe(3.3); // 3.333... -> 3.3
  });

  it("handles negative numbers", () => {
    expect(average([-2, -4])).toBe(-3);
  });

  it("works with Scale-typed values", () => {
    const scales: Scale[] = [5, 4, 3];
    expect(average(scales)).toBe(4);
  });

  it("rounds a positive .x5 boundary half upward", () => {
    // 2.25 -> Math.round(22.5) = 23 -> 2.3
    expect(average([2.1, 2.4])).toBe(2.3);
    // 1.25 -> Math.round(12.5) = 13 -> 1.3
    expect(average([1, 1, 1, 2])).toBe(1.3);
  });

  it("rounds a negative .x5 boundary toward +Infinity, not away from zero", () => {
    // -2.25 -> Math.round(-22.5) = -22 -> -2.2 (NOT -2.3)
    expect(average([-2, -2.5])).toBe(-2.2);
  });

  it("returns 0 for an all-zero array", () => {
    expect(average([0, 0, 0])).toBe(0);
  });

  it("returns a single zero unchanged", () => {
    expect(average([0])).toBe(0);
  });

  it("averages a mix of positive and negative values", () => {
    expect(average([-3, 3])).toBe(0);
    expect(average([-1, 4])).toBe(1.5);
  });

  it("drops a trailing .0 for whole-number means", () => {
    const result = average([2, 4, 6]);
    expect(result).toBe(4);
    expect(Object.is(result, 4)).toBe(true);
  });
});
