/**
 * Domain types for the Mental Wellness Tracker. Mirrors the Supabase schema
 * (supabase/schema.sql). Kept framework-free so it can be unit-tested and reused
 * on both client and server.
 */

/** 1 (lowest) – 5 (highest) on mood / energy / stress scales. */
export type Scale = 1 | 2 | 3 | 4 | 5;

export interface Profile {
  id: string;
  full_name: string | null;
  exam_target: string | null;
  exam_date: string | null; // ISO date
  created_at: string;
  updated_at: string;
}

/** Structured result of Gemini analysing a journal entry. */
export interface JournalAnalysis {
  /** Overall emotional tone. */
  sentiment: "positive" | "neutral" | "mixed" | "negative";
  /** Derived 1–5 mood score for trend charts. */
  mood_score: Scale;
  /** Derived 1–5 stress level. */
  stress_level: Scale;
  /** Hidden stress triggers the entry reveals (short tags). */
  triggers: string[];
  /** Recurring emotional/topical themes (short tags). */
  themes: string[];
  /** One or two sentences of empathetic, plain-language insight. */
  summary: string;
}

export interface JournalEntry {
  id: string;
  user_id: string;
  content: string;
  analysis: JournalAnalysis | null;
  created_at: string;
  updated_at: string;
}

export interface MoodLog {
  id: string;
  user_id: string;
  mood: Scale;
  energy: Scale | null;
  stress: Scale | null;
  tags: string[];
  note: string | null;
  created_at: string;
}

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  session_id: string;
  user_id: string;
  role: ChatRole;
  content: string;
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

/** A single message in the format the chat API accepts. */
export interface ChatTurn {
  role: ChatRole;
  content: string;
}
