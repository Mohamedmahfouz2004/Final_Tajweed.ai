-- ============================================================================
-- Tajweed.AI — World-class progress system
-- Run this ONCE in the Supabase SQL editor (or via the CLI).
--
-- It is idempotent: safe to re-run. It does four things:
--   1. Adds streak / XP / level columns to `profiles`.
--   2. Creates `user_rule_mastery` (rolling per-rule mastery, EWMA).
--   3. Adds the unique index the lesson-progress upsert needs + perf indexes.
--   4. Enables Row Level Security with owner-only policies on every user table
--      (REQUIRED — the frontend talks to Supabase with the anon key from the
--      browser, so without RLS the data is world-readable).
--
-- It also installs two SQL functions the client calls at session end so streak,
-- XP and mastery are updated atomically (no read-modify-write races):
--   • apply_session_result(score, duration_seconds, xp_gain)
--   • bump_rule_mastery(rule_id, attempts, errors)
-- ============================================================================

begin;

-- ── 1. profiles: gamification columns ──────────────────────────────────────
alter table public.profiles
  add column if not exists xp                      integer     not null default 0,
  add column if not exists level                   integer     not null default 1,
  add column if not exists current_streak          integer     not null default 0,
  add column if not exists longest_streak          integer     not null default 0,
  add column if not exists last_active_date        date,
  add column if not exists total_recitation_seconds integer    not null default 0;

-- daily_goal: ensure a sane default (verses/day) for the daily-goal ring
update public.profiles set daily_goal = 5 where daily_goal is null;

-- ── 2. user_rule_mastery: rolling per-rule mastery ─────────────────────────
create table if not exists public.user_rule_mastery (
  user_id        uuid        not null references public.profiles(id) on delete cascade,
  rule_id        text        not null,                 -- canonical rule id (madd, ghunna, …)
  attempts       integer     not null default 0,       -- total rule occurrences seen
  errors         integer     not null default 0,       -- total errors on this rule
  mastery        numeric(5,2) not null default 0,       -- 0..100, EWMA of clean-recitation rate
  last_practiced timestamptz not null default now(),
  primary key (user_id, rule_id)
);

-- ── 3. mistakes: column defaults the smart flow relies on ──────────────────
alter table public.mistakes
  alter column occurrence_count set default 1,
  alter column is_corrected     set default false;
update public.mistakes set occurrence_count = 1 where occurrence_count is null;
update public.mistakes set is_corrected = false where is_corrected is null;

-- ── 4. progress: de-dup then add the unique key the upsert needs ───────────
-- Collapse any accidental duplicate (user_id, lesson_id) rows, keeping the newest.
delete from public.progress p
using public.progress d
where p.user_id = d.user_id
  and p.lesson_id = d.lesson_id
  and p.lesson_id is not null
  and coalesce(p.last_accessed, p.created_at) < coalesce(d.last_accessed, d.created_at);

create unique index if not exists progress_user_lesson_uniq
  on public.progress (user_id, lesson_id);

-- ── 5. performance indexes ─────────────────────────────────────────────────
create index if not exists mistakes_user_corrected_idx on public.mistakes (user_id, is_corrected);
create index if not exists mistakes_user_rule_idx      on public.mistakes (user_id, rule_category);
create index if not exists sessions_user_created_idx   on public.sessions (user_id, created_at desc);

-- ── 6. Row Level Security ──────────────────────────────────────────────────
-- User-owned tables: a user may only see/touch their own rows.
alter table public.profiles          enable row level security;
alter table public.progress          enable row level security;
alter table public.mistakes          enable row level security;
alter table public.sessions          enable row level security;
alter table public.user_rule_mastery enable row level security;

-- profiles (keyed on id = the auth user id)
drop policy if exists profiles_owner_rw on public.profiles;
create policy profiles_owner_rw on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- helper macro pattern repeated per user_id table
drop policy if exists progress_owner_rw on public.progress;
create policy progress_owner_rw on public.progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists mistakes_owner_rw on public.mistakes;
create policy mistakes_owner_rw on public.mistakes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists sessions_owner_rw on public.sessions;
create policy sessions_owner_rw on public.sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists mastery_owner_rw on public.user_rule_mastery;
create policy mastery_owner_rw on public.user_rule_mastery
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Content tables: any signed-in user may read; writes stay with the service role.
alter table public.lessons         enable row level security;
alter table public.quizzes         enable row level security;
alter table public.practical_tests enable row level security;

drop policy if exists lessons_read on public.lessons;
create policy lessons_read on public.lessons for select using (true);

drop policy if exists quizzes_read on public.quizzes;
create policy quizzes_read on public.quizzes for select using (true);

drop policy if exists practical_tests_read on public.practical_tests;
create policy practical_tests_read on public.practical_tests for select using (true);

-- ── 7. apply_session_result: atomic streak + XP + level at session end ─────
create or replace function public.apply_session_result(
  p_score    integer,
  p_duration integer,
  p_xp_gain  integer
) returns public.profiles
language plpgsql
security invoker
as $$
declare
  uid   uuid := auth.uid();
  prof  public.profiles;
  today date := (now() at time zone 'utc')::date;
  new_streak integer;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select * into prof from public.profiles where id = uid;
  if not found then
    return null;
  end if;

  -- streak: same day = unchanged, yesterday = +1, gap = reset to 1
  if prof.last_active_date is null then
    new_streak := 1;
  elsif prof.last_active_date = today then
    new_streak := greatest(prof.current_streak, 1);
  elsif prof.last_active_date = today - 1 then
    new_streak := prof.current_streak + 1;
  else
    new_streak := 1;
  end if;

  update public.profiles set
    xp                       = xp + greatest(coalesce(p_xp_gain, 0), 0),
    current_streak           = new_streak,
    longest_streak           = greatest(longest_streak, new_streak),
    last_active_date         = today,
    total_recitation_seconds = total_recitation_seconds + greatest(coalesce(p_duration, 0), 0),
    level                    = 1 + floor((xp + greatest(coalesce(p_xp_gain, 0), 0)) / 500.0),
    updated_at               = now()
  where id = uid
  returning * into prof;

  return prof;
end;
$$;

-- ── 8. bump_rule_mastery: EWMA update of a single rule's mastery ───────────
create or replace function public.bump_rule_mastery(
  p_rule_id  text,
  p_attempts integer,
  p_errors   integer
) returns void
language plpgsql
security invoker
as $$
declare
  uid       uuid := auth.uid();
  alpha     numeric := 0.35;                              -- recency weight
  sess_acc  numeric;                                      -- this session's clean rate, 0..100
  existing  public.user_rule_mastery;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if coalesce(p_attempts, 0) <= 0 then
    return;                                               -- rule not exercised this session
  end if;

  sess_acc := (greatest(p_attempts - coalesce(p_errors, 0), 0)::numeric / p_attempts) * 100;

  select * into existing from public.user_rule_mastery where user_id = uid and rule_id = p_rule_id;

  if not found then
    insert into public.user_rule_mastery (user_id, rule_id, attempts, errors, mastery, last_practiced)
    values (uid, p_rule_id, p_attempts, coalesce(p_errors, 0), round(sess_acc, 2), now());
  else
    update public.user_rule_mastery set
      attempts       = attempts + p_attempts,
      errors         = errors + coalesce(p_errors, 0),
      mastery        = round(alpha * sess_acc + (1 - alpha) * existing.mastery, 2),
      last_practiced = now()
    where user_id = uid and rule_id = p_rule_id;
  end if;
end;
$$;

commit;

-- ============================================================================
-- NOTES
--  • Streak day boundaries use UTC. Add a `timezone` column to profiles later if
--    you want local-midnight rollovers.
--  • XP→level curve is level = 1 + floor(xp / 500). Tune the divisor to taste.
--  • If lessons/quizzes/practical_tests are seeded by an admin tool using the
--    anon key (not the service role), add an admin write policy or seed via the
--    service role / SQL editor instead.
-- ============================================================================
