# Saathi

A GenAI wellness companion that helps students monitor and improve their mental
well-being during high-stakes exams (NEET / JEE / CAT / GATE / UPSC). Built for
the PromptWars hackathon.

> **Quick demo:** sign in with `demo@saathi.app` / `Saathi@1234` to explore Saathi
> pre-loaded with sample data.

## About

Saathi ("companion" in Hindi) pairs daily journaling and quick mood check-ins with
an empathetic AI companion that analyses open-ended entries to surface **hidden stress triggers and
emotional patterns**, visualises mood/stress trends over time, and offers grounded,
safe, supportive guidance in real time. Built on the **Next.js App Router**, styled
with **Tailwind CSS v4** and **shadcn/ui** (New York), written entirely in **TypeScript**.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 + React 19 |
| Styling | Tailwind CSS v4, shadcn/ui (New York) |
| Language | TypeScript |
| AI | Google Gemini (`@google/genai`, `gemini-2.5-flash`) |
| Data / Auth | Supabase (`@supabase/supabase-js` + `@supabase/ssr`, Row Level Security) |
| Charts | Recharts |
| Forms / Validation | React Hook Form + Zod |
| Notifications | Sonner |
| Theme | next-themes (dark mode) |

## Accounts

There are two ways to get in:

- **Use the demo account (already loaded with data).** Sign in with the demo
  credentials above. It comes pre-filled with sample mood check-ins and analysed journal
  entries, so every module looks alive the moment you sign in. Best if you just want to
  explore.

- **Create a new account.** Register at `/dashboard/register`, pick the exam you're
  preparing for, and start from a clean slate. Everything you log (journal, moods, chats)
  stays private to you, enforced by row-level security.

## Modules

- **Daily Journal** (`/dashboard/journal`)
  An open-ended writing space. When you save an entry, Gemini reads it and pulls out the
  sentiment, the concrete stress triggers, and recurring themes, the signals a plain mood
  slider would miss. Each analysis is cached so the same entry is never re-billed.

- **Mood Check-in** (`/dashboard/mood`)
  A 10-second check-in for mood, energy, and stress (1-5) plus quick tags like
  "exam-pressure" or "sleep". Log it as often as you like; it feeds both the trends and
  the companion's context.

- **Insights** (`/dashboard/insights`)
  Your personal dashboard: a 14-day mood-and-stress trend chart, your top stress
  triggers, streaks and stat cards, and an AI "what your data says" summary that names
  one real pattern and one doable suggestion.

- **AI Companion** (`/dashboard/companion`)
  A streaming, empathetic chat ("Saathi") that already knows your recent moods, triggers,
  and exam target, so its support is personal rather than generic. Crisis signals are
  caught before any model call and answered with calm, non-clinical help (see Safety).

- **Exam switcher** (top bar)
  Set or change the exam you're preparing for at any time. It tailors the companion's
  tone and the insights summary to that exam's specific pressures.

## Testing

The business logic is written as pure, typed functions so it's unit-testable in
isolation. Run the suite with [Vitest](https://vitest.dev):

```sh
npm test            # run all unit tests
npm run test:watch  # watch mode
npm run test:coverage
```

**267 tests** cover the core logic:

| Module | What's tested |
|---|---|
| `lib/wellness/insights` | mood-trend aggregation/averaging/gaps, tag frequency, check-in streaks, averages |
| `lib/gemini/safety` | crisis detection across every phrasing + false-positive avoidance, helpline content |
| `lib/wellness/validation` | all three zod schemas — coercion, bounds, enums, uuid |
| `lib/gemini/prompts` | context builder, trigger dedupe, prompt constants, JSON schema shape |
| `lib/gemini/analysis` | Gemini output normalization (clamping, sentiment fallback, tag sanitizing) with the AI client mocked |
| `lib/utils`, `lib/wellness/exams` | class merging, exam list integrity |

Framework glue (Supabase clients, Next.js middleware, the Gemini SDK singleton) is
integration-level and excluded from unit coverage by design.

## Project structure

```
app/
  api/                         # route handlers — all AI + secrets live here (server-only)
    chat/                      #   streaming companion (with crisis safety gate)
    journal/                   #   journal analysis + save
    insights/summary/          #   "what your data says" summary
  dashboard/(auth)/            # authed app (sidebar shell)
    insights · journal · mood · companion
  dashboard/(guest)/           # login · register
lib/
  supabase/                    # browser / server clients + auth + session proxy
  gemini/                      # client, prompts, safety (crisis detection), analysis, companion
  wellness/                    # types, typed queries, pure insights aggregation, zod validation
  *.test.ts                    # Vitest unit tests, co-located with the logic
supabase/
  schema.sql                   # database schema + RLS
scripts/seed.mjs               # demo user + sample data
vitest.config.ts               # test config (path aliases, server-only stub, coverage)
.claude/skills/                # build skill: challenge brief + scoring rubric as engineering rules
```

## Safety

Saathi talks to stressed students, so safety is a feature, not a disclaimer.
Self-harm / crisis signals are caught deterministically **before** any model call and
answered with calm, non-clinical support plus India helplines (Tele-MANAS 14416,
KIRAN 1800-599-0019). The companion is framed as a supportive peer — never a therapist.
