-- ============================================================================
-- Mental Wellness Tracker — Supabase schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE / idempotent policies.
-- ============================================================================

-- Extensions ----------------------------------------------------------------
create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- ----------------------------------------------------------------------------
-- updated_at helper
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- profiles  (1 row per auth user)
-- ============================================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  exam_target text,                 -- e.g. 'JEE', 'NEET', 'UPSC'
  exam_date   date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================================
-- journal_entries  (open-ended daily journaling + cached Gemini analysis)
-- ============================================================================
create table if not exists public.journal_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  content     text not null,
  -- Gemini analysis cached as JSON so we never re-bill for the same entry:
  -- { sentiment, mood_score, stress_level, triggers[], themes[], summary }
  analysis    jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists journal_entries_user_created_idx
  on public.journal_entries (user_id, created_at desc);

-- ============================================================================
-- mood_logs  (lightweight, fast check-ins; multiple per day allowed)
-- ============================================================================
create table if not exists public.mood_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  mood        smallint not null check (mood between 1 and 5),
  energy      smallint check (energy between 1 and 5),
  stress      smallint check (stress between 1 and 5),
  tags        text[] not null default '{}',     -- e.g. {exam-pressure, sleep, family}
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists mood_logs_user_created_idx
  on public.mood_logs (user_id, created_at desc);

-- ============================================================================
-- chat_sessions + chat_messages  (AI Companion conversations)
-- ============================================================================
create table if not exists public.chat_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null default 'New conversation',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists chat_sessions_user_updated_idx
  on public.chat_sessions (user_id, updated_at desc);

create table if not exists public.chat_messages (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.chat_sessions (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        text not null check (role in ('user', 'assistant')),
  content     text not null,
  created_at  timestamptz not null default now()
);
create index if not exists chat_messages_session_created_idx
  on public.chat_messages (session_id, created_at asc);

-- ----------------------------------------------------------------------------
-- updated_at triggers
-- ----------------------------------------------------------------------------
drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_journal_updated on public.journal_entries;
create trigger trg_journal_updated before update on public.journal_entries
  for each row execute function public.set_updated_at();

drop trigger if exists trg_chat_sessions_updated on public.chat_sessions;
create trigger trg_chat_sessions_updated before update on public.chat_sessions
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Auto-create a profile row when a new auth user signs up
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Row Level Security — users may only touch their OWN rows
-- ============================================================================
alter table public.profiles        enable row level security;
alter table public.journal_entries enable row level security;
alter table public.mood_logs       enable row level security;
alter table public.chat_sessions   enable row level security;
alter table public.chat_messages   enable row level security;

-- profiles: row is keyed by the user id itself
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- Helper macro pattern repeated per user-owned table: full CRUD scoped to owner.
drop policy if exists "journal_all_own" on public.journal_entries;
create policy "journal_all_own" on public.journal_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "mood_all_own" on public.mood_logs;
create policy "mood_all_own" on public.mood_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "chat_sessions_all_own" on public.chat_sessions;
create policy "chat_sessions_all_own" on public.chat_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "chat_messages_all_own" on public.chat_messages;
create policy "chat_messages_all_own" on public.chat_messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
