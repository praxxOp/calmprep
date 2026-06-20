import Link from "next/link";
import { NotebookPen, SmilePlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuth } from "@/lib/supabase/auth";
import {
  average,
  checkInStreak,
  moodTrend,
  themeFrequency,
  triggerFrequency
} from "@/lib/wellness/insights";
import {
  getActivityDates,
  getProfile,
  getRecentJournals,
  getRecentMoods
} from "@/lib/wellness/queries";

import { MoodTrendChart } from "./components/mood-trend-chart";
import { PatternSummary } from "./components/pattern-summary";
import { StatCards } from "./components/stat-cards";
import { TriggerBreakdown } from "./components/trigger-breakdown";

export const metadata = { title: "Insights · Saathi" };

/** Whole days from today until an ISO exam date, or null if missing/past. */
function daysUntil(examDate: string | null): number | null {
  if (!examDate) return null;
  const target = new Date(examDate);
  if (Number.isNaN(target.getTime())) return null;
  const ms = target.getTime() - Date.now();
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  return days >= 0 ? days : null;
}

export default async function InsightsPage() {
  const { user, sb } = (await getAuth())!;

  const [profile, moods, journals, activityDates] = await Promise.all([
    getProfile(sb, user.id),
    getRecentMoods(sb, 60),
    getRecentJournals(sb, 20),
    getActivityDates(sb, 60)
  ]);

  const trend = moodTrend(moods, 14);
  const triggers = triggerFrequency(journals, 8);
  // themes are computed for parity with the spec; surfaced via triggers UI today.
  void themeFrequency(journals, 6);
  const streak = checkInStreak(activityDates);
  const avgMood = average(moods.map((m) => m.mood));
  const avgStress = average(moods.filter((m) => m.stress != null).map((m) => m.stress!));
  const daysToExam = daysUntil(profile?.exam_date ?? null);

  const hasData = moods.length > 0 || journals.length > 0;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Your Insights</h1>
        <p className="text-muted-foreground">
          What your check-ins and journaling reveal: the patterns a simple tracker would miss.
        </p>
      </header>

      {hasData ? (
        <div className="space-y-6">
          <StatCards
            streak={streak}
            avgMood={avgMood}
            avgStress={avgStress}
            checkIns={activityDates.length}
            daysToExam={daysToExam}
            examTarget={profile?.exam_target ?? null}
          />

          <div className="grid gap-6 lg:grid-cols-3">
            <MoodTrendChart data={trend} className="lg:col-span-2" />
            <TriggerBreakdown triggers={triggers} />
          </div>

          <PatternSummary />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No insights yet</CardTitle>
            <CardDescription>
              Insights appear once you start checking in. Log how you feel or write a journal entry,
              and Saathi will start surfacing your patterns.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/dashboard/mood">
                <SmilePlus className="size-4" aria-hidden="true" />
                Log a mood
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/journal">
                <NotebookPen className="size-4" aria-hidden="true" />
                Write a journal entry
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
