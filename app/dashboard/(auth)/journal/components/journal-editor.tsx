"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { JournalAnalysis, JournalEntry } from "@/lib/wellness/types";

const MAX_LENGTH = 8000;

const sentimentVariant: Record<
  JournalAnalysis["sentiment"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  positive: "default",
  neutral: "secondary",
  mixed: "outline",
  negative: "destructive",
};

export function JournalEditor() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savedEntry, setSavedEntry] = useState<JournalEntry | null>(null);

  const trimmed = content.trim();
  const disabled = submitting || trimmed.length === 0;

  async function handleSubmit() {
    if (disabled) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });

      if (!res.ok) {
        const data: { error?: string } = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Could not save your entry. Please try again.");
        return;
      }

      const { entry } = (await res.json()) as { entry: JournalEntry };
      setSavedEntry(entry);
      setContent("");
      toast.success("Entry saved. Saathi is reflecting on it.");
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>How are you feeling today?</CardTitle>
          <CardDescription>
            There&apos;s no right way to write this. Just let it out.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="journal-content" className="sr-only">
            Journal entry
          </Label>
          <Textarea
            id="journal-content"
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, MAX_LENGTH))}
            placeholder="What's on your mind? Write about your study, sleep, worries, small wins, anything."
            maxLength={MAX_LENGTH}
            disabled={submitting}
            className="min-h-[160px] resize-y"
          />
        </CardContent>
        <CardFooter className="justify-between">
          <span
            className="text-muted-foreground text-xs tabular-nums"
            aria-live="polite"
          >
            {content.length} / {MAX_LENGTH}
          </span>
          <Button onClick={handleSubmit} disabled={disabled}>
            {submitting ? (
              <Loader2Icon className="animate-spin" aria-hidden="true" />
            ) : (
              <SparklesIcon aria-hidden="true" />
            )}
            Save &amp; analyze
          </Button>
        </CardFooter>
      </Card>

      {savedEntry ? <AiReflection entry={savedEntry} /> : null}
    </div>
  );
}

function AiReflection({ entry }: { entry: JournalEntry }) {
  const analysis = entry.analysis;

  return (
    <Card aria-live="polite">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <SparklesIcon className="size-4 text-primary" aria-hidden="true" />
          AI reflection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {analysis ? (
          <>
            <p className="text-sm">{analysis.summary}</p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={sentimentVariant[analysis.sentiment]} className="capitalize">
                {analysis.sentiment}
              </Badge>
              <span className="text-muted-foreground text-xs">
                Mood {analysis.mood_score}/5 · Stress {analysis.stress_level}/5
              </span>
            </div>
            {analysis.triggers.length > 0 || analysis.themes.length > 0 ? (
              <>
                <Separator />
                <AnalysisChips
                  label="Triggers"
                  items={analysis.triggers}
                  variant="destructive"
                />
                <AnalysisChips label="Themes" items={analysis.themes} variant="secondary" />
              </>
            ) : null}
          </>
        ) : (
          <p className="text-muted-foreground text-sm">
            Your entry is saved. Saathi&apos;s insight will appear here shortly.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function AnalysisChips({
  label,
  items,
  variant,
}: {
  label: string;
  items: string[];
  variant: "secondary" | "destructive";
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <Badge key={item} variant={variant}>
            {item}
          </Badge>
        ))}
      </div>
    </div>
  );
}
