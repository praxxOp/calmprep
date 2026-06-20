"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GraduationCapIcon } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { EXAMS } from "@/lib/wellness/exams";

/**
 * Header dropdown to switch the student's exam target at any time. Writes straight
 * to their `profiles` row (RLS-scoped) and refreshes so the AI companion/insights
 * pick up the new context on the next request.
 */
export function ExamSwitcher({ examTarget }: { examTarget?: string | null }) {
  const router = useRouter();
  const [value, setValue] = useState(examTarget ?? "");
  const [pending, startTransition] = useTransition();

  async function handleChange(next: string) {
    if (next === value) return;
    const previous = value;
    setValue(next); // optimistic

    const supabase = createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      setValue(previous);
      toast.error("Please sign in again.");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ exam_target: next })
      .eq("id", user.id);

    if (error) {
      setValue(previous);
      toast.error("Couldn't update your exam. Try again.");
      return;
    }

    toast.success(`Exam set to ${next}`);
    startTransition(() => router.refresh());
  }

  return (
    <Select value={value} onValueChange={handleChange} disabled={pending}>
      <SelectTrigger size="sm" className="gap-1.5" aria-label="Switch exam target">
        <GraduationCapIcon className="size-3.5" />
        <SelectValue placeholder="Set exam" />
      </SelectTrigger>
      <SelectContent align="end">
        {EXAMS.map((exam) => (
          <SelectItem key={exam} value={exam}>
            {exam}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
