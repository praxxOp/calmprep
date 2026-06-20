# Saathi

A GenAI wellness companion that helps students monitor and improve their mental
well-being during high-stakes exams (NEET / JEE / CAT / GATE / UPSC). Built for
the PromptWars hackathon.

## About

Saathi ("companion" in Hindi) pairs daily journaling and quick mood check-ins with
an empathetic AI companion that analyses open-ended entries to surface **hidden stress triggers and
emotional patterns**, visualises mood/stress trends over time, and offers grounded,
safe, supportive guidance in real time. Built on the **Next.js App Router**, styled
with **Tailwind CSS v4** and **shadcn/ui** (New York), written entirely in **TypeScript**.

### Features
- **Daily Journal** — open-ended writing; Gemini extracts sentiment, triggers, themes (`/dashboard/journal`)
- **Mood Check-in** — 10-second mood/energy/stress + tags, logged as often as you like (`/dashboard/mood`)
- **Insights** — mood-trend chart, top stress triggers, streaks, and an AI "what your data says" summary (`/dashboard/insights`)
- **AI Companion** — streaming, context-aware, **crisis-safe** empathetic chat (`/dashboard/companion`)

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

## Requirements

- Node.js **v20+** (v22 recommended — the seed script uses `--env-file`)

## Setup

**1. Clone & install**

```sh
git clone https://github.com/praxxOp/calmprep.git
cd calmprep
npm install
```

**2. Configure environment variables**

Copy `.env.example` → `.env.local` and fill in:

| Variable | Where to get it |
|---|---|
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey |
| `GEMINI_MODEL` | leave as `gemini-2.5-flash` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → **Project URL** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API → **anon / public** key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API → **service_role** key (server-only) |

> Never commit `.env.local` (it's gitignored). Keep `.env.example` placeholder-only.

**3. Create the database**

Open Supabase → **SQL Editor** → paste the contents of [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
This creates the tables, indexes, the auto-profile trigger, and Row Level Security.

**4. (Optional) Seed a demo user + sample data**

```sh
node --env-file=.env.local scripts/seed.mjs
```

This creates a confirmed demo account and populates ~12 mood logs and 4 analysed
journal entries so the dashboard looks alive.

**Demo credentials**

```
email:    demo@saathi.app
password: Saathi@1234
```

> Or just register a new account at `/dashboard/register`. (For instant local login,
> turn OFF "Confirm email" in Supabase → Authentication → Providers → Email.)

**5. Run**

```sh
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

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
  supabase/                    # browser / server / admin clients + auth + session proxy
  gemini/                      # client, prompts, safety (crisis detection), analysis, companion
  wellness/                    # types, typed queries, pure insights aggregation, zod validation
supabase/
  schema.sql                   # database schema + RLS
scripts/seed.mjs               # demo user + sample data
.claude/skills/                # build skill: challenge brief + scoring rubric as engineering rules
```

## Safety

Saathi talks to stressed students, so safety is a feature, not a disclaimer.
Self-harm / crisis signals are caught deterministically **before** any model call and
answered with calm, non-clinical support plus India helplines (Tele-MANAS 14416,
KIRAN 1800-599-0019). The companion is framed as a supportive peer — never a therapist.
