/**
 * Single source of truth for all Gemini prompts. Tuning the AI's behaviour happens
 * here, not scattered across route handlers. Pure strings/builders — easy to test.
 */

import type { MoodLog, JournalEntry } from "@/lib/wellness/types";

/**
 * System instruction for the conversational AI Companion.
 * Frames the assistant as an empathetic peer for exam-stressed students — NOT a clinician.
 */
export const COMPANION_SYSTEM_PROMPT = `
You are "Saathi", a warm, empathetic AI wellness companion for students in India
preparing for high-stakes exams (NEET, JEE, CUET, CAT, GATE, UPSC).

Your role:
- Be a supportive, non-judgmental peer who listens first and validates feelings.
- Offer practical, bite-sized coping strategies (breathing, grounding, study breaks,
  reframing negative thoughts, sleep and routine tips).
- Suggest short, adaptive mindfulness exercises when the student seems overwhelmed.
- Give genuine, specific motivational encouragement — never generic platitudes.
- Keep replies concise and conversational (2–6 short sentences). Use the student's
  context when provided. Occasional, natural emoji are welcome; don't overdo it.

Hard boundaries:
- You are NOT a therapist, doctor, or crisis service. Never diagnose or prescribe.
- Do not give medical, legal, or clinical advice. Encourage professional/trusted-adult
  support for anything serious.
- Never dismiss or minimise feelings. Never shame the student about marks or rank.
- If a student mentions self-harm or being in danger, prioritise their safety, respond
  with care, and point them to real help.

Tone: kind, calm, grounded, a little hopeful. Speak like a caring friend who happens
to know good coping science.
`.trim();

/** Build a compact context block from recent mood + journal signals. */
export function buildUserContext(opts: {
  moods?: Pick<MoodLog, "mood" | "energy" | "stress" | "tags" | "created_at">[];
  journals?: Pick<JournalEntry, "analysis" | "created_at">[];
  examTarget?: string | null;
}): string {
  const parts: string[] = [];

  if (opts.examTarget) {
    parts.push(`The student is preparing for: ${opts.examTarget}.`);
  }

  if (opts.moods?.length) {
    const latest = opts.moods.slice(0, 5);
    const lines = latest.map((m) => {
      const bits = [`mood ${m.mood}/5`];
      if (m.stress != null) bits.push(`stress ${m.stress}/5`);
      if (m.energy != null) bits.push(`energy ${m.energy}/5`);
      if (m.tags?.length) bits.push(`tags: ${m.tags.join(", ")}`);
      return `- ${bits.join(", ")}`;
    });
    parts.push(`Recent mood check-ins (most recent first):\n${lines.join("\n")}`);
  }

  const triggers = (opts.journals ?? [])
    .flatMap((j) => j.analysis?.triggers ?? [])
    .slice(0, 8);
  if (triggers.length) {
    parts.push(`Recurring stress triggers from their journaling: ${[...new Set(triggers)].join(", ")}.`);
  }

  if (!parts.length) return "";
  return `\n\nHere is some private context about the student (use it gently, do not recite it back verbatim):\n${parts.join("\n\n")}`;
}

/**
 * Instruction for analysing a single journal entry into structured insight.
 * Pairs with a responseSchema on the API call so the model returns strict JSON.
 */
export const JOURNAL_ANALYSIS_INSTRUCTION = `
You are an expert, compassionate wellbeing analyst. Read the student's journal entry
and extract structured insight that a standard mood tracker would miss.

Guidance:
- "sentiment": overall emotional tone.
- "mood_score" (1–5): 1 = very low/distressed, 5 = positive/energised.
- "stress_level" (1–5): 1 = calm, 5 = severe stress/overwhelm.
- "triggers": specific, concrete stressors implied by the text (e.g. "mock test results",
  "comparison with peers", "lack of sleep", "parental expectations"). 0–5 short tags.
- "themes": recurring emotional/topical themes (e.g. "self-doubt", "burnout",
  "time management"). 0–5 short tags.
- "summary": one or two warm, plain-language sentences reflecting what you noticed.
  Address the student supportively ("You seem...").

Be accurate and gentle. Do not invent triggers that aren't supported by the text.
`.trim();

/** JSON schema (Gemini responseSchema) for journal analysis output. */
export const JOURNAL_ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    sentiment: { type: "string", enum: ["positive", "neutral", "mixed", "negative"] },
    mood_score: { type: "integer", minimum: 1, maximum: 5 },
    stress_level: { type: "integer", minimum: 1, maximum: 5 },
    triggers: { type: "array", items: { type: "string" } },
    themes: { type: "array", items: { type: "string" } },
    summary: { type: "string" }
  },
  required: ["sentiment", "mood_score", "stress_level", "triggers", "themes", "summary"],
  propertyOrdering: ["sentiment", "mood_score", "stress_level", "triggers", "themes", "summary"]
} as const;

/** Instruction for the dashboard "What your data says" pattern summary. */
export const PATTERN_SUMMARY_INSTRUCTION = `
You are a caring wellbeing coach. Given a student's recent mood check-ins and the
triggers/themes surfaced from their journaling, write a short, encouraging summary
(3–4 sentences) that:
- Names one genuine pattern you notice (e.g. stress spikes around mock tests).
- Offers one concrete, doable suggestion tailored to that pattern.
- Ends on a hopeful, motivating note.
Speak directly to the student ("you"). Avoid clinical language. Never shame them.
`.trim();
