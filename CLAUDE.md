# Mental Wellness Tracker — Project Guide

PromptWars hackathon build. A GenAI companion that helps students monitor and
improve mental well-being during high-stakes exams (NEET/JEE/CAT/GATE/UPSC).

> **Before doing any work, invoke the `mental-wellness-tracker` skill.** It holds the
> full problem statement, the 6-parameter scoring rubric we're judged on, the feature
> tree, and the safety rules. Every change must target points on that rubric.

## Stack
- Next.js (App Router, TS, RSC) on the shadcn-ui-kit-dashboard base
- shadcn/ui (new-york, lucide) — reuse `@/components/ui/*`, don't hand-roll
- Gemini `@google/genai`, model `gemini-2.5-flash` — wrapped in `lib/gemini/`
- Supabase (`@supabase/supabase-js` + `@supabase/ssr`) — RLS on every table
- recharts · react-hook-form · zod (already deps)

## Layout map (so you reuse, not rebuild)
- `app/dashboard/(auth)/` — authed routes get the sidebar shell (`layout.tsx`)
- `components/layout/sidebar/nav-main.tsx` — sidebar menu (`navItems` array)
- `components/ui/*` — 61 shadcn primitives
- `lib/` — shared logic (put business logic here, keep components thin)
- `app/dashboard/(auth)/apps/ai-chat-v2/` — chat UI we adapt for the AI Companion

## Our code lives in
- `lib/supabase/` — client/server/admin Supabase clients
- `lib/gemini/` — Gemini client + `prompts.ts`
- `lib/wellness/` — typed domain logic + queries (testable, pure where possible)
- `supabase/schema.sql` + `supabase/SETUP.md` — DB schema, RLS, setup steps
- `app/dashboard/(auth)/{insights,journal,mood,companion}/` — our feature routes
- `app/api/` — route handlers (all AI/secret access happens here, server-side)

## Hard rules (rubric-driven)
1. Secrets (`GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) NEVER in `"use client"` files.
2. Every Supabase table has Row Level Security scoping rows to `auth.uid()`.
3. Validate all external input with zod at the API boundary.
4. All AI output passes the safety layer (crisis detection + companion-not-therapist framing).
5. Stream chat; paginate history. Keep components small and single-purpose.

## Status / pruning
The repo is a full dashboard kit. Unused demo pages/components are pruned **last**
(see the prune step) so we don't accidentally delete a component we reuse.
