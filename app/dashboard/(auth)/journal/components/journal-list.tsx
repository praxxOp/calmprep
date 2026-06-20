import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { JournalAnalysis, JournalEntry } from "@/lib/wellness/types";

const sentimentVariant: Record<
  JournalAnalysis["sentiment"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  positive: "default",
  neutral: "secondary",
  mixed: "outline",
  negative: "destructive",
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function JournalList({ entries }: { entries: JournalEntry[] }) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Past entries</h2>
      {entries.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-10 text-center text-sm">
            No entries yet. Your first reflection will show up here.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <JournalListItem key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </section>
  );
}

function JournalListItem({ entry }: { entry: JournalEntry }) {
  const analysis = entry.analysis;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-sm font-medium">{formatDate(entry.created_at)}</CardTitle>
        {analysis ? (
          <Badge variant={sentimentVariant[analysis.sentiment]} className="capitalize">
            {analysis.sentiment}
          </Badge>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-muted-foreground line-clamp-3 text-sm whitespace-pre-wrap">
          {entry.content}
        </p>
        {analysis ? (
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs">
              Mood {analysis.mood_score}/5 · Stress {analysis.stress_level}/5
            </p>
            {analysis.triggers.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {analysis.triggers.map((trigger) => (
                  <Badge key={trigger} variant="destructive">
                    {trigger}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
