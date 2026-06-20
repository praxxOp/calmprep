import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { MoodLog, Scale } from "@/lib/wellness/types"

const MOOD_META: Record<Scale, { emoji: string; word: string }> = {
  1: { emoji: "😟", word: "Struggling" },
  2: { emoji: "🙁", word: "Low" },
  3: { emoji: "😐", word: "Okay" },
  4: { emoji: "🙂", word: "Good" },
  5: { emoji: "😄", word: "Great" }
}

function moodMeta(value: Scale) {
  return MOOD_META[value] ?? MOOD_META[3]
}

export function RecentMoods({ moods }: { moods: MoodLog[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent check-ins</CardTitle>
      </CardHeader>
      <CardContent>
        {moods.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No check-ins yet. Your first one is the hardest 💙
          </p>
        ) : (
          <ul className="space-y-3">
            {moods.map((mood, index) => {
              const meta = moodMeta(mood.mood)
              return (
                <li key={mood.id}>
                  {index > 0 && <Separator className="mb-3" />}
                  <div className="flex items-start gap-3">
                    <span className="text-2xl leading-none" aria-hidden="true">
                      {meta.emoji}
                    </span>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <span className="text-sm font-medium">{meta.word}</span>
                        <time
                          className="text-muted-foreground text-xs"
                          dateTime={mood.created_at}
                        >
                          {new Date(mood.created_at).toLocaleString()}
                        </time>
                      </div>
                      <div className="text-muted-foreground flex flex-wrap gap-x-3 text-xs">
                        {mood.energy != null && <span>Energy {mood.energy}/5</span>}
                        {mood.stress != null && <span>Stress {mood.stress}/5</span>}
                      </div>
                      {mood.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {mood.tags.map((tag) => (
                            <Badge key={tag} variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {mood.note && (
                        <p className="text-muted-foreground text-sm">{mood.note}</p>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
