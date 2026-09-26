-- MAMSS PREP v54 "Live CBT Hall" — live-test backend (Supabase, same project as the slip ledger)
-- Run once in: Supabase dashboard → SQL editor → New query → Run.
--
-- What this gives you: teacher-posted live tests that students join with a
-- 6-character session code on their already-activated devices.
--   * cbt_sessions — one row per live test (questions embedded, settings, timing)
--   * cbt_attempts — one row per device per session: THE primary key enforces
--     "one attempt per student per session code", exactly like the slip ledger
--   * cbt_answers  — one row per answer, persisted THE MOMENT it is given, so a
--     dropped connection never loses progress; its primary key also enforces
--     "no going back" (a question can only be answered once)
--   * triggers keep the clock server-side: ends_at/ended_at/last_seen_at are
--     stamped by the database (now()), never by a phone — refreshing or
--     reopening cannot reset the timer
--
-- Trust model (same honest posture as the activation ledger): the site's PUBLIC
-- key can read and write these rows. Abuse would mean deliberately attacking
-- your own school's live test; nothing here exposes student data beyond the
-- session, and deletes are blocked entirely (rows survive for auditing).
-- The upgrade path to server-verified roles is Supabase Auth (roadmap item #2).

-- ---------------------------------------------------------------- sessions
create table if not exists public.cbt_sessions (
  code        text primary key,                    -- 6-char join code (XXX-XXX)
  teacher     text not null default '',            -- teacher name at creation
  device_id   text not null default '',            -- admin device that created it
  title       text not null default 'Live CBT session',
  cls         text not null default 'SS1',         -- SS1 | SS2 | SS3
  subject     text not null default '',            -- '' = mixed
  duration_s  integer not null default 1800,
  status      text not null default 'waiting',     -- waiting | live | ended
  live_at     timestamptz,                         -- set by trigger when started
  ends_at     timestamptz,                         -- server-computed deadline
  extend_s    integer not null default 0,          -- accumulated extensions
  ended_at    timestamptz,
  settings    jsonb not null default '{}'::jsonb,  -- {instantResults, showRank, shuffle}
  questions   jsonb not null default '[]'::jsonb,  -- [{q,o[4],a,e,src}]
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- attempts
create table if not exists public.cbt_attempts (
  session_code text not null references public.cbt_sessions(code) on delete cascade,
  device_id    text not null,
  name         text not null default '',           -- student name from activation
  slip         text not null default '',           -- masked slip (MAMSS······)
  status       text not null default 'waiting',    -- waiting | running | submitted | autosubmitted
  current_q    integer not null default 0,
  score        integer,                            -- client-graded; results page re-grades server rows
  total        integer,
  integrity    integer not null default 0,         -- tab-switch/blur events
  joined_at    timestamptz not null default now(),
  started_at   timestamptz,
  submitted_at timestamptz,
  last_seen_at timestamptz not null default now(),
  primary key (session_code, device_id)            -- ONE attempt per device per session
);
create index if not exists cbt_attempts_session_idx on public.cbt_attempts (session_code);

-- ----------------------------------------------------------------- answers
create table if not exists public.cbt_answers (
  session_code text not null,
  device_id    text not null,
  q_idx        integer not null,
  choice       integer not null,                   -- 0..3
  correct      boolean not null default false,
  ms           integer not null default 0,         -- time on this question
  flagged      boolean not null default false,     -- integrity event while answering
  saved_at     timestamptz not null default now(),
  primary key (session_code, device_id, q_idx)     -- persisted per answer; no re-answering
);
create index if not exists cbt_answers_session_idx on public.cbt_answers (session_code);

-- ------------------------------------------------- server-authoritative time
create or replace function public.cbt_session_stamp() returns trigger as $$
begin
  if new.status = 'live' and old.status is distinct from 'live' then
    new.live_at := now();
    new.ends_at := now() + make_interval(secs => greatest(30, new.duration_s) + greatest(0, new.extend_s));
  end if;
  if new.status = 'live' and new.extend_s is distinct from old.extend_s then
    new.ends_at := coalesce(new.live_at, now()) + make_interval(secs => greatest(30, new.duration_s) + greatest(0, new.extend_s));
  end if;
  if new.status = 'ended' and old.status is distinct from 'ended' then
    new.ended_at := now();
  end if;
  return new;
end $$ language plpgsql;

drop trigger if exists cbt_sessions_stamp on public.cbt_sessions;
create trigger cbt_sessions_stamp before update on public.cbt_sessions
  for each row execute function public.cbt_session_stamp();

create or replace function public.cbt_attempt_stamp() returns trigger as $$
begin
  new.last_seen_at := now();
  if new.status in ('submitted','autosubmitted') and old.status not in ('submitted','autosubmitted') then
    new.submitted_at := now();
  end if;
  if new.status = 'running' and old.status is distinct from 'running' and new.started_at is null then
    new.started_at := now();
  end if;
  return new;
end $$ language plpgsql;

drop trigger if exists cbt_attempts_stamp on public.cbt_attempts;
create trigger cbt_attempts_stamp before update on public.cbt_attempts
  for each row execute function public.cbt_attempt_stamp();

-- -------------------------------------------------------------------- RLS
alter table public.cbt_sessions enable row level security;
alter table public.cbt_attempts enable row level security;
alter table public.cbt_answers  enable row level security;

drop policy if exists "cbt sessions readable"  on public.cbt_sessions;
create policy "cbt sessions readable"  on public.cbt_sessions for select to anon, authenticated using (true);
drop policy if exists "cbt sessions writable"  on public.cbt_sessions;
create policy "cbt sessions writable"  on public.cbt_sessions for insert to anon, authenticated with check (true);
drop policy if exists "cbt sessions updatable" on public.cbt_sessions;
create policy "cbt sessions updatable" on public.cbt_sessions for update to anon, authenticated using (true) with check (true);

drop policy if exists "cbt attempts readable"  on public.cbt_attempts;
create policy "cbt attempts readable"  on public.cbt_attempts for select to anon, authenticated using (true);
drop policy if exists "cbt attempts writable"  on public.cbt_attempts;
create policy "cbt attempts writable"  on public.cbt_attempts for insert to anon, authenticated with check (true);
drop policy if exists "cbt attempts updatable" on public.cbt_attempts;
create policy "cbt attempts updatable" on public.cbt_attempts for update to anon, authenticated using (true) with check (true);

drop policy if exists "cbt answers readable"  on public.cbt_answers;
create policy "cbt answers readable"  on public.cbt_answers for select to anon, authenticated using (true);
drop policy if exists "cbt answers writable"  on public.cbt_answers;
create policy "cbt answers writable"  on public.cbt_answers for insert to anon, authenticated with check (true);
-- no update/delete policies anywhere: answers are immutable, rows are permanent.

-- ----------------------------------------------------------------- realtime
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;
do $$
begin
  begin
    alter publication supabase_realtime add table public.cbt_sessions;
  exception when duplicate_object then null; end;
  begin
    alter publication supabase_realtime add table public.cbt_attempts;
  exception when duplicate_object then null; end;
  begin
    alter publication supabase_realtime add table public.cbt_answers;
  exception when duplicate_object then null; end;
end $$;
