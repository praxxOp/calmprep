import { CalendarClock, Flame, HeartPulse, ListChecks, Activity } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface StatCardsProps {
  streak: number;
  avgMood: number | null;
  avgStress: number | null;
  checkIns: number;
  daysToExam: number | null;
  examTarget: string | null;
}

interface Stat {
  icon: React.ReactNode;
  label: string;
  value: string;
}

const fmt = (n: number | null): string => (n == null ? "—" : String(n));

export function StatCards({
  streak,
  avgMood,
  avgStress,
  checkIns,
  daysToExam,
  examTarget
}: StatCardsProps) {
  const last: Stat =
    daysToExam != null && examTarget
      ? {
          icon: <CalendarClock className="size-5 text-[var(--chart-4)]" aria-hidden="true" />,
          label: `Days to ${examTarget}`,
          value: `${daysToExam} days`
        }
      : {
          icon: <ListChecks className="size-5 text-[var(--chart-4)]" aria-hidden="true" />,
          label: "Check-ins",
          value: `${checkIns}`
        };

  const stats: Stat[] = [
    {
      icon: <Flame className="size-5 text-[var(--chart-1)]" aria-hidden="true" />,
      label: "Current streak",
      value: `🔥 ${streak}-day streak`
    },
    {
      icon: <HeartPulse className="size-5 text-[var(--chart-2)]" aria-hidden="true" />,
      label: "Average mood",
      value: `${fmt(avgMood)}/5`
    },
    {
      icon: <Activity className="size-5 text-[var(--chart-3)]" aria-hidden="true" />,
      label: "Average stress",
      value: `${fmt(avgStress)}/5`
    },
    last
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardContent className="flex flex-col gap-2">
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              {s.icon}
              <span>{s.label}</span>
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
