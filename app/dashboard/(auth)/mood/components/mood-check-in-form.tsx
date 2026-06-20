"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2Icon } from "lucide-react"
import { z } from "zod"
import { toast } from "sonner"

import { createClient } from "@/lib/supabase/client"
import { moodLogSchema } from "@/lib/wellness/validation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"

type Scale = 1 | 2 | 3 | 4 | 5

const MOOD_META: Record<Scale, { emoji: string; word: string }> = {
  1: { emoji: "😟", word: "Struggling" },
  2: { emoji: "🙁", word: "Low" },
  3: { emoji: "😐", word: "Okay" },
  4: { emoji: "🙂", word: "Good" },
  5: { emoji: "😄", word: "Great" }
}

const PRESET_TAGS = [
  "exam-pressure",
  "sleep",
  "self-doubt",
  "time-management",
  "family",
  "focus",
  "health",
  "social"
] as const

const NOTE_MAX = 500

function asScale(value: number): Scale {
  return Math.min(5, Math.max(1, Math.round(value))) as Scale
}

export function MoodCheckInForm() {
  const router = useRouter()
  const [mood, setMood] = React.useState<Scale>(3)
  const [energy, setEnergy] = React.useState<Scale>(3)
  const [stress, setStress] = React.useState<Scale>(3)
  const [tags, setTags] = React.useState<string[]>([])
  const [note, setNote] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  const moodMeta = MOOD_META[mood]

  function toggleTag(tag: string) {
    const value = tag.toLowerCase()
    setTags((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]
    )
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      const payload = moodLogSchema.parse({
        mood,
        energy,
        stress,
        tags,
        note: note.trim() ? note.trim() : undefined
      })

      const sb = createClient()
      const {
        data: { user }
      } = await sb.auth.getUser()
      if (!user) {
        toast.error("You need to be signed in to log a check-in.")
        return
      }

      const { error } = await sb
        .from("mood_logs")
        .insert({ user_id: user.id, ...payload })
      if (error) {
        toast.error(error.message)
        return
      }

      toast.success("Check-in logged 💙")
      setMood(3)
      setEnergy(3)
      setStress(3)
      setTags([])
      setNote("")
      router.refresh()
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.issues[0]?.message ?? "Please check your input.")
      } else {
        toast.error("Something went wrong. Please try again.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>How are you right now?</CardTitle>
        <CardDescription>Slide to set each scale from 1 to 5.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="mood-slider">Mood</Label>
              <span className="text-sm font-medium" aria-live="polite">
                <span aria-hidden="true">{moodMeta.emoji}</span> {moodMeta.word}
              </span>
            </div>
            <Slider
              id="mood-slider"
              min={1}
              max={5}
              step={1}
              value={[mood]}
              onValueChange={(value) => setMood(asScale(value[0]))}
              aria-label="Mood"
              aria-valuetext={`${mood} of 5, ${moodMeta.word}`}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="energy-slider">Energy</Label>
              <span className="text-muted-foreground text-sm">{energy}/5</span>
            </div>
            <Slider
              id="energy-slider"
              min={1}
              max={5}
              step={1}
              value={[energy]}
              onValueChange={(value) => setEnergy(asScale(value[0]))}
              aria-label="Energy"
              aria-valuetext={`${energy} of 5`}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="stress-slider">Stress</Label>
              <span className="text-muted-foreground text-sm">{stress}/5</span>
            </div>
            <Slider
              id="stress-slider"
              min={1}
              max={5}
              step={1}
              value={[stress]}
              onValueChange={(value) => setStress(asScale(value[0]))}
              aria-label="Stress"
              aria-valuetext={`${stress} of 5`}
            />
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm leading-none font-medium">
              Tags <span className="text-muted-foreground font-normal">(optional)</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {PRESET_TAGS.map((tag) => {
                const selected = tags.includes(tag)
                return (
                  <Button
                    key={tag}
                    type="button"
                    size="sm"
                    variant={selected ? "default" : "outline"}
                    aria-pressed={selected}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Button>
                )
              })}
            </div>
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="mood-note">
              Note <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="mood-note"
              value={note}
              maxLength={NOTE_MAX}
              placeholder="What's on your mind?"
              onChange={(event) => setNote(event.target.value)}
            />
            <p className="text-muted-foreground text-right text-xs">
              {note.length}/{NOTE_MAX}
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting && <Loader2Icon className="animate-spin" />}
            Log check-in
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
