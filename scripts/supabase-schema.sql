-- Typing Tutor — Supabase schema, RLS, and pg_cron aggregate job.
-- Paste the entire file into Supabase SQL Editor and click Run.
-- Safe to re-run; uses IF NOT EXISTS / CREATE OR REPLACE where possible.

-- =========================================================================
-- Extensions
-- =========================================================================
create extension if not exists pgcrypto;
create extension if not exists pg_cron;

-- =========================================================================
-- profiles
-- =========================================================================
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  username        text unique,
  current_level   int  not null default 1,
  total_xp        int  not null default 0,
  current_streak  int  not null default 0,
  longest_streak  int  not null default 0,
  last_active_date date,
  preferences     jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Auto-create a profile row on signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================================
-- lesson_sessions  (immutable log; the main write target)
-- =========================================================================
create table if not exists public.lesson_sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  lesson_id     text not null,
  wpm           numeric(6,2) not null,
  accuracy      numeric(5,2) not null,
  errors        int not null,
  duration_sec  numeric(8,2) not null,
  chars_typed   int not null,
  weak_keys     jsonb not null default '{}'::jsonb,
  passed        boolean not null,
  xp_earned     int not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists idx_sessions_user_lesson_created
  on public.lesson_sessions (user_id, lesson_id, created_at desc);

create index if not exists idx_sessions_lesson_passed
  on public.lesson_sessions (lesson_id, passed);

-- =========================================================================
-- lesson_progress  (denormalized best-per-lesson for unlock evaluation)
-- =========================================================================
create table if not exists public.lesson_progress (
  user_id       uuid not null references auth.users(id) on delete cascade,
  lesson_id     text not null,
  best_wpm      numeric(6,2) not null default 0,
  best_accuracy numeric(5,2) not null default 0,
  attempts      int not null default 0,
  passed        boolean not null default false,
  first_passed_at timestamptz,
  last_attempt_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

-- =========================================================================
-- user_badges
-- =========================================================================
create table if not exists public.user_badges (
  user_id    uuid not null references auth.users(id) on delete cascade,
  badge_id   text not null,
  earned_at  timestamptz not null default now(),
  primary key (user_id, badge_id)
);

-- =========================================================================
-- lesson_aggregates  (cron-refreshed; readable by all)
-- =========================================================================
create table if not exists public.lesson_aggregates (
  lesson_id     text primary key,
  avg_wpm       numeric(6,2) not null,
  avg_accuracy  numeric(5,2) not null,
  sample_size   int not null,
  updated_at    timestamptz not null default now()
);

-- =========================================================================
-- Row-Level Security
-- =========================================================================
alter table public.profiles          enable row level security;
alter table public.lesson_sessions   enable row level security;
alter table public.lesson_progress   enable row level security;
alter table public.user_badges       enable row level security;
alter table public.lesson_aggregates enable row level security;

-- profiles: any authed user can read; only self can write.
drop policy if exists "profiles select"  on public.profiles;
drop policy if exists "profiles insert"  on public.profiles;
drop policy if exists "profiles update"  on public.profiles;
create policy "profiles select" on public.profiles
  for select to authenticated using (true);
create policy "profiles insert" on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy "profiles update" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- lesson_sessions: only self.
drop policy if exists "sessions select" on public.lesson_sessions;
drop policy if exists "sessions insert" on public.lesson_sessions;
create policy "sessions select" on public.lesson_sessions
  for select to authenticated using (user_id = auth.uid());
create policy "sessions insert" on public.lesson_sessions
  for insert to authenticated with check (user_id = auth.uid());

-- lesson_progress: only self.
drop policy if exists "progress select" on public.lesson_progress;
drop policy if exists "progress insert" on public.lesson_progress;
drop policy if exists "progress update" on public.lesson_progress;
create policy "progress select" on public.lesson_progress
  for select to authenticated using (user_id = auth.uid());
create policy "progress insert" on public.lesson_progress
  for insert to authenticated with check (user_id = auth.uid());
create policy "progress update" on public.lesson_progress
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- user_badges: only self.
drop policy if exists "badges select" on public.user_badges;
drop policy if exists "badges insert" on public.user_badges;
create policy "badges select" on public.user_badges
  for select to authenticated using (user_id = auth.uid());
create policy "badges insert" on public.user_badges
  for insert to authenticated with check (user_id = auth.uid());

-- lesson_aggregates: read for all authed users; no client writes.
drop policy if exists "aggregates select" on public.lesson_aggregates;
create policy "aggregates select" on public.lesson_aggregates
  for select to authenticated using (true);

-- =========================================================================
-- Aggregate refresh function + daily pg_cron job
-- =========================================================================
create or replace function public.refresh_lesson_aggregates()
returns void
language sql
security definer set search_path = public
as $$
  insert into public.lesson_aggregates (lesson_id, avg_wpm, avg_accuracy, sample_size, updated_at)
  select
    lesson_id,
    round(avg(wpm)::numeric,      2) as avg_wpm,
    round(avg(accuracy)::numeric, 2) as avg_accuracy,
    count(*)                          as sample_size,
    now()                             as updated_at
  from public.lesson_sessions
  where passed = true
  group by lesson_id
  on conflict (lesson_id) do update set
    avg_wpm      = excluded.avg_wpm,
    avg_accuracy = excluded.avg_accuracy,
    sample_size  = excluded.sample_size,
    updated_at   = excluded.updated_at;
$$;

-- Schedule daily at 03:00 UTC. Safe to re-run: unschedule existing first.
do $$
declare
  jid bigint;
begin
  select jobid into jid from cron.job where jobname = 'refresh_lesson_aggregates_daily';
  if jid is not null then
    perform cron.unschedule(jid);
  end if;
  perform cron.schedule(
    'refresh_lesson_aggregates_daily',
    '0 3 * * *',
    $cron$ select public.refresh_lesson_aggregates(); $cron$
  );
end$$;

-- Run once now so the table is populated immediately.
select public.refresh_lesson_aggregates();
