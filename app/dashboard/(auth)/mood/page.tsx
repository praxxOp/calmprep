import { getAuth } from "@/lib/supabase/auth"
import { getRecentMoods } from "@/lib/wellness/queries"

import { MoodCheckInForm } from "./components/mood-check-in-form"
import { RecentMoods } from "./components/recent-moods"

export const metadata = { title: "Mood Check-in · Saathi" }

export default async function Page() {
  const { sb } = (await getAuth())!
  const moods = await getRecentMoods(sb, 30)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mood Check-in</h1>
        <p className="text-muted-foreground">
          A 10-second check-in. Log it as often as you like. Patterns emerge over time.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <MoodCheckInForm />
        <RecentMoods moods={moods} />
      </div>
    </div>
  )
}
