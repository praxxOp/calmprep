"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { EXAMS } from "@/lib/wellness/exams";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [exam, setExam] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    // Stash exam target in user metadata so it survives even without a session.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name, exam_target: exam || null } }
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // With email confirmation OFF, signUp returns a session. Persist the exam target,
    // then sign out so the user lands on a clean sign-in screen.
    if (data.session) {
      if (exam) {
        await supabase.from("profiles").update({ exam_target: exam }).eq("id", data.user!.id);
      }
      await supabase.auth.signOut();
    }

    router.replace(`/dashboard/login?registered=1&email=${encodeURIComponent(email)}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 6 characters"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="exam">Which exam are you preparing for?</Label>
        <Select value={exam} onValueChange={setExam}>
          <SelectTrigger id="exam" className="w-full">
            <SelectValue placeholder="Select your exam (optional)" />
          </SelectTrigger>
          <SelectContent>
            {EXAMS.map((x) => (
              <SelectItem key={x} value={x}>
                {x}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2Icon className="size-4 animate-spin" />}
        Create account
      </Button>
    </form>
  );
}
