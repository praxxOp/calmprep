/**
 * Seed a demo user + sample wellness data so the dashboard looks alive.
 *
 * Prereq: you've already run supabase/schema.sql in your Supabase project.
 * Run with Node 22+ (loads .env.local for you):
 *
 *   node --env-file=.env.local scripts/seed.mjs
 *
 * Demo credentials (also in README.md):
 *   email:    demo@saathi.app
 *   password: Saathi@1234
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const EMAIL = "demo@saathi.app";
const PASSWORD = "Saathi@1234";

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();

async function getOrCreateUser() {
  const { data, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: "Demo Student" }
  });

  if (!error) return data.user;

  // Already exists → find them.
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = list?.users.find((u) => u.email === EMAIL);
  if (!existing) throw error;
  return existing;
}

async function main() {
  const user = await getOrCreateUser();
  console.log(`✓ demo user ready: ${user.email} (${user.id})`);

  // Profile (the signup trigger creates the row; we set exam details).
  await admin.from("profiles").upsert({
    id: user.id,
    full_name: "Demo Student",
    exam_target: "JEE",
    exam_date: daysAgo(-45).slice(0, 10) // ~45 days from now
  });

  // Fresh start for repeatable seeding.
  await admin.from("mood_logs").delete().eq("user_id", user.id);
  await admin.from("journal_entries").delete().eq("user_id", user.id);

  // ── Mood logs across the last ~12 days ───────────────────────────────────
  const moods = [
    { mood: 3, energy: 3, stress: 4, tags: ["exam-pressure", "sleep"], day: 11 },
    { mood: 2, energy: 2, stress: 5, tags: ["self-doubt", "mock-test"], day: 10 },
    { mood: 4, energy: 4, stress: 2, tags: ["focus"], day: 9 },
    { mood: 3, energy: 3, stress: 3, tags: ["time-management"], day: 8 },
    { mood: 2, energy: 2, stress: 5, tags: ["exam-pressure", "self-doubt"], day: 7 },
    { mood: 3, energy: 3, stress: 4, tags: ["family"], day: 6 },
    { mood: 4, energy: 4, stress: 2, tags: ["focus", "sleep"], day: 5 },
    { mood: 5, energy: 4, stress: 1, tags: ["focus"], day: 4 },
    { mood: 3, energy: 3, stress: 4, tags: ["mock-test", "exam-pressure"], day: 3 },
    { mood: 4, energy: 3, stress: 3, tags: ["time-management"], day: 2 },
    { mood: 3, energy: 4, stress: 3, tags: ["sleep"], day: 1 },
    { mood: 4, energy: 4, stress: 2, tags: ["focus"], day: 0 }
  ].map((m) => ({
    user_id: user.id,
    mood: m.mood,
    energy: m.energy,
    stress: m.stress,
    tags: m.tags,
    created_at: daysAgo(m.day)
  }));

  const { error: moodErr } = await admin.from("mood_logs").insert(moods);
  if (moodErr) throw moodErr;
  console.log(`✓ inserted ${moods.length} mood logs`);

  // ── Journal entries with pre-baked analysis ──────────────────────────────
  const journals = [
    {
      day: 10,
      content:
        "Got my mock test results back and I did worse than last time. I keep thinking everyone else is ahead of me. Couldn't sleep, kept replaying my mistakes.",
      analysis: {
        sentiment: "negative",
        mood_score: 2,
        stress_level: 5,
        triggers: ["mock test results", "comparison with peers", "lack of sleep"],
        themes: ["self-doubt", "burnout"],
        summary:
          "You seem really hard on yourself after that mock — one result doesn't define your prep, and your effort is real."
      }
    },
    {
      day: 6,
      content:
        "Family keeps asking about my rank at dinner. I know they mean well but it adds so much pressure. Tried a short walk after and felt a bit lighter.",
      analysis: {
        sentiment: "mixed",
        mood_score: 3,
        stress_level: 4,
        triggers: ["parental expectations", "rank pressure"],
        themes: ["family pressure", "coping"],
        summary:
          "You're carrying others' expectations on top of your own — noticing that the walk helped is a great coping signal."
      }
    },
    {
      day: 4,
      content:
        "Good study day! Finished two chapters of physics and actually understood rotational motion. Slept well last night and it made a huge difference.",
      analysis: {
        sentiment: "positive",
        mood_score: 5,
        stress_level: 1,
        triggers: [],
        themes: ["progress", "good sleep"],
        summary:
          "You had a strong, focused day — and you connected it to better sleep. That's a pattern worth protecting."
      }
    },
    {
      day: 1,
      content:
        "Feeling the time crunch with the exam getting closer. Made a rough revision plan which helped me feel less scattered, though I'm still a bit anxious.",
      analysis: {
        sentiment: "mixed",
        mood_score: 3,
        stress_level: 3,
        triggers: ["time pressure", "exam approaching"],
        themes: ["time management", "anxiety"],
        summary:
          "You turned anxiety into a plan — that's exactly the right move. A little nervousness near exams is normal."
      }
    }
  ].map((j) => ({
    user_id: user.id,
    content: j.content,
    analysis: j.analysis,
    created_at: daysAgo(j.day)
  }));

  const { error: journalErr } = await admin.from("journal_entries").insert(journals);
  if (journalErr) throw journalErr;
  console.log(`✓ inserted ${journals.length} journal entries`);

  console.log("\nDone. Sign in with:");
  console.log(`  email:    ${EMAIL}`);
  console.log(`  password: ${PASSWORD}`);
}

main().catch((e) => {
  console.error("Seed failed:", e.message ?? e);
  process.exit(1);
});
