"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type State =
  | { status: "loading" }
  | { status: "ready"; summary: string | null };

const PROMPT =
  "Keep logging your moods and journaling. Once there's enough to go on, Saathi will spell out the patterns here.";

export function PatternSummary() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await fetch("/api/insights/summary");
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const data = (await res.json()) as { summary: string | null };
        if (active) setState({ status: "ready", summary: data.summary });
      } catch {
        // Fail quietly — fall back to the gentle prompt.
        if (active) setState({ status: "ready", summary: null });
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-5 text-[var(--chart-1)]" aria-hidden="true" />
          What your data says
        </CardTitle>
      </CardHeader>
      <CardContent>
        {state.status === "loading" ? (
          <div className="space-y-2" aria-busy="true" aria-label="Loading your summary">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : (
          <p className="text-muted-foreground text-sm leading-relaxed">
            {state.summary ?? PROMPT}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
