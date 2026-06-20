import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface TriggerBreakdownProps {
  triggers: { tag: string; count: number }[];
}

function capitalize(tag: string): string {
  return tag.charAt(0).toUpperCase() + tag.slice(1);
}

export function TriggerBreakdown({ triggers }: TriggerBreakdownProps) {
  const maxCount = triggers.reduce((max, t) => Math.max(max, t.count), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top stress triggers</CardTitle>
        <CardDescription>Surfaced from your journal entries.</CardDescription>
      </CardHeader>
      <CardContent>
        {triggers.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Write a few journal entries and your triggers will surface here.
          </p>
        ) : (
          <ul className="space-y-4">
            {triggers.map((t) => (
              <li key={t.tag} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{capitalize(t.tag)}</span>
                  <span className="text-muted-foreground tabular-nums">{t.count}</span>
                </div>
                <Progress
                  value={maxCount ? (t.count / maxCount) * 100 : 0}
                  aria-label={`${capitalize(t.tag)} mentioned ${t.count} times`}
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
