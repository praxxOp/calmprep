import "server-only";
import { getGemini, geminiModel } from "@/lib/gemini/client";
import {
  JOURNAL_ANALYSIS_INSTRUCTION,
  JOURNAL_ANALYSIS_SCHEMA,
  PATTERN_SUMMARY_INSTRUCTION,
  buildUserContext
} from "@/lib/gemini/prompts";
import type { JournalAnalysis, JournalEntry, MoodLog, Scale } from "@/lib/wellness/types";

function clampScale(n: unknown): Scale {
  const v = Math.round(Number(n));
  const clamped = Math.min(5, Math.max(1, Number.isFinite(v) ? v : 3));
  return clamped as Scale;
}

function asTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 5);
}

/**
 * Analyse a single journal entry into structured, validated insight.
 * Uses Gemini's JSON mode (responseSchema) and then defensively normalises the
 * result so a malformed model response can never corrupt our data.
 */
export async function analyzeJournal(content: string): Promise<JournalAnalysis> {
  const ai = getGemini();
  const response = await ai.models.generateContent({
    model: geminiModel(),
    contents: content,
    config: {
      systemInstruction: JOURNAL_ANALYSIS_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: JOURNAL_ANALYSIS_SCHEMA as object,
      temperature: 0.4
    }
  });

  const raw = JSON.parse(response.text ?? "{}") as Partial<JournalAnalysis>;

  const sentiment = (["positive", "neutral", "mixed", "negative"] as const).includes(
    raw.sentiment as JournalAnalysis["sentiment"]
  )
    ? (raw.sentiment as JournalAnalysis["sentiment"])
    : "neutral";

  return {
    sentiment,
    mood_score: clampScale(raw.mood_score),
    stress_level: clampScale(raw.stress_level),
    triggers: asTags(raw.triggers),
    themes: asTags(raw.themes),
    summary:
      typeof raw.summary === "string" && raw.summary.trim()
        ? raw.summary.trim()
        : "Thanks for sharing — keeping up the habit of journaling is a real strength."
  };
}

/**
 * Generate the dashboard's "What your data says" pattern summary from recent signals.
 * Returns null when there isn't enough data to say anything meaningful.
 */
export async function summarizePatterns(opts: {
  moods: MoodLog[];
  journals: Pick<JournalEntry, "analysis" | "created_at">[];
  examTarget?: string | null;
}): Promise<string | null> {
  if (opts.moods.length === 0 && opts.journals.length === 0) return null;

  const ai = getGemini();
  const context = buildUserContext({
    moods: opts.moods,
    journals: opts.journals,
    examTarget: opts.examTarget
  });

  const response = await ai.models.generateContent({
    model: geminiModel(),
    contents: `Here is the student's recent data:${context}\n\nWrite the summary now.`,
    config: { systemInstruction: PATTERN_SUMMARY_INSTRUCTION, temperature: 0.7 }
  });

  return response.text?.trim() || null;
}
