"use client";

import { Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";
import type { MoodTrendPoint } from "@/lib/wellness/insights";

interface MoodTrendChartProps {
  data: MoodTrendPoint[];
  className?: string;
}

// Semantic colours: mood reads "good" (green), stress reads "alert" (red).
const MOOD_COLOR = "#10b981";
const STRESS_COLOR = "#f43f5e";

const chartConfig = {
  mood: { label: "Mood", color: MOOD_COLOR },
  stress: { label: "Stress", color: STRESS_COLOR }
} satisfies ChartConfig;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Turn "2026-06-12" into "Jun 12" for a compact label. */
function shortDate(iso: string | undefined): string {
  if (!iso) return "";
  const [, m, d] = iso.split("-");
  const month = MONTHS[Number(m) - 1];
  if (!month || Number.isNaN(Number(d))) return "";
  return `${month} ${Number(d)}`;
}

/** Drop empty days at the start/end so the line spans the full width (keeps inner gaps). */
function trimEmptyEnds(points: MoodTrendPoint[]): MoodTrendPoint[] {
  const isEmpty = (p: MoodTrendPoint) => p.mood == null && p.stress == null;
  let start = 0;
  let end = points.length - 1;
  while (start <= end && isEmpty(points[start])) start++;
  while (end >= start && isEmpty(points[end])) end--;
  return points.slice(start, end + 1);
}

export function MoodTrendChart({ data, className }: MoodTrendChartProps) {
  const series = trimEmptyEnds(data);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Mood &amp; stress over the last 14 days</CardTitle>
        <CardDescription>Daily averages on a 1-5 scale. Gaps mean no check-in.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          className="h-[300px] w-full"
          config={chartConfig}
          role="img"
          aria-label="Line chart of average daily mood and stress over the last 14 days, each scored 1 to 5">
          <LineChart accessibilityLayer data={series} margin={{ top: 16, right: 16, left: 16, bottom: 0 }}>
            {/* Padded domain (0.5–5.5) keeps the 1–5 scale honest while giving the peak
                and trough dots headroom so they aren't clipped at the edges. */}
            <YAxis domain={[0.5, 5.5]} hide />
            {/* `height` reserves room for the labels + gap so they can't be clipped;
                `tickMargin` sets the gap between the line and the dates. */}
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              tickLine={false}
              axisLine={false}
              tickMargin={20}
              height={48}
              minTickGap={28}
              interval="preserveStartEnd"
              className="text-xs"
            />
            <Tooltip
              cursor={{ stroke: "var(--border)", strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0]?.payload as MoodTrendPoint;
                return (
                  <div className="bg-background rounded-lg border p-2.5 shadow-xs">
                    <div className="mb-1 text-xs font-medium">{shortDate(point?.date)}</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-[0.7rem] uppercase">Mood</span>
                        <span className="font-bold" style={{ color: MOOD_COLOR }}>
                          {point.mood ?? "—"}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-[0.7rem] uppercase">Stress</span>
                        <span className="font-bold" style={{ color: STRESS_COLOR }}>
                          {point.stress ?? "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="mood"
              strokeWidth={2}
              stroke={MOOD_COLOR}
              dot={{ r: 4, fill: "var(--background)", stroke: MOOD_COLOR, strokeWidth: 2 }}
              activeDot={{ r: 6, fill: MOOD_COLOR }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="stress"
              strokeWidth={2}
              stroke={STRESS_COLOR}
              dot={{ r: 4, fill: "var(--background)", stroke: STRESS_COLOR, strokeWidth: 2 }}
              activeDot={{ r: 6, fill: STRESS_COLOR }}
              connectNulls
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
