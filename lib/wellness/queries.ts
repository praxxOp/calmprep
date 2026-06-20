import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ChatMessage,
  ChatSession,
  JournalAnalysis,
  JournalEntry,
  MoodLog,
  Profile,
  Scale
} from "@/lib/wellness/types";

/**
 * Typed data-access helpers. Each takes a Supabase client so they work with the
 * server client (RLS-scoped) and are easy to test/mocked. RLS guarantees a user
 * only ever sees their own rows; we still pass `userId` for inserts (NOT NULL columns).
 */

function unwrap<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return (res.data ?? ([] as unknown)) as T;
}

// ── Profile ────────────────────────────────────────────────────────────────
export async function getProfile(sb: SupabaseClient, userId: string): Promise<Profile | null> {
  const res = await sb.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (res.error) throw new Error(`getProfile: ${res.error.message}`);
  return res.data as Profile | null;
}

// ── Mood logs ────────────────────────────────────────────────────────────────
export async function getRecentMoods(sb: SupabaseClient, limit = 60): Promise<MoodLog[]> {
  const res = await sb
    .from("mood_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return unwrap<MoodLog[]>(res, "getRecentMoods");
}

export async function insertMood(
  sb: SupabaseClient,
  userId: string,
  data: { mood: Scale; energy?: Scale | null; stress?: Scale | null; tags?: string[]; note?: string | null }
): Promise<MoodLog> {
  const res = await sb
    .from("mood_logs")
    .insert({
      user_id: userId,
      mood: data.mood,
      energy: data.energy ?? null,
      stress: data.stress ?? null,
      tags: data.tags ?? [],
      note: data.note ?? null
    })
    .select("*")
    .single();
  return unwrap<MoodLog>(res, "insertMood");
}

// ── Journal entries ──────────────────────────────────────────────────────────
export async function getJournalEntries(
  sb: SupabaseClient,
  { limit = 20, offset = 0 } = {}
): Promise<JournalEntry[]> {
  const res = await sb
    .from("journal_entries")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  return unwrap<JournalEntry[]>(res, "getJournalEntries");
}

export async function insertJournal(
  sb: SupabaseClient,
  userId: string,
  content: string,
  analysis: JournalAnalysis | null
): Promise<JournalEntry> {
  const res = await sb
    .from("journal_entries")
    .insert({ user_id: userId, content, analysis })
    .select("*")
    .single();
  return unwrap<JournalEntry>(res, "insertJournal");
}

/** Recent journals with analysis only — lightweight payload for context/insights. */
export async function getRecentJournals(sb: SupabaseClient, limit = 20): Promise<JournalEntry[]> {
  const res = await sb
    .from("journal_entries")
    .select("id, user_id, content, analysis, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return unwrap<JournalEntry[]>(res, "getRecentJournals");
}

/** All check-in dates (mood + journal) for streak calculation. */
export async function getActivityDates(sb: SupabaseClient, sinceDays = 60): Promise<string[]> {
  const since = new Date();
  since.setDate(since.getDate() - sinceDays);
  const iso = since.toISOString();

  const [moods, journals] = await Promise.all([
    sb.from("mood_logs").select("created_at").gte("created_at", iso),
    sb.from("journal_entries").select("created_at").gte("created_at", iso)
  ]);
  if (moods.error) throw new Error(`getActivityDates(mood): ${moods.error.message}`);
  if (journals.error) throw new Error(`getActivityDates(journal): ${journals.error.message}`);

  return [...(moods.data ?? []), ...(journals.data ?? [])].map(
    (r) => (r as { created_at: string }).created_at
  );
}

// ── Chat ────────────────────────────────────────────────────────────────────
export async function listSessions(sb: SupabaseClient, limit = 30): Promise<ChatSession[]> {
  const res = await sb
    .from("chat_sessions")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(limit);
  return unwrap<ChatSession[]>(res, "listSessions");
}

export async function createSession(
  sb: SupabaseClient,
  userId: string,
  title = "New conversation"
): Promise<ChatSession> {
  const res = await sb
    .from("chat_sessions")
    .insert({ user_id: userId, title })
    .select("*")
    .single();
  return unwrap<ChatSession>(res, "createSession");
}

export async function getMessages(sb: SupabaseClient, sessionId: string): Promise<ChatMessage[]> {
  const res = await sb
    .from("chat_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  return unwrap<ChatMessage[]>(res, "getMessages");
}

export async function insertMessage(
  sb: SupabaseClient,
  data: { sessionId: string; userId: string; role: "user" | "assistant"; content: string }
): Promise<ChatMessage> {
  const res = await sb
    .from("chat_messages")
    .insert({
      session_id: data.sessionId,
      user_id: data.userId,
      role: data.role,
      content: data.content
    })
    .select("*")
    .single();
  return unwrap<ChatMessage>(res, "insertMessage");
}

/** Touch a session's updated_at so it bubbles to the top of the list. */
export async function touchSession(sb: SupabaseClient, sessionId: string): Promise<void> {
  const res = await sb
    .from("chat_sessions")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (res.error) throw new Error(`touchSession: ${res.error.message}`);
}
