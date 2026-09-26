-- MAMSS PREP v62 "The Open Book" — class progress reports (Supabase, same
-- project as the slip ledger, Live CBT and Cloud Sync).
-- Run once in: Supabase dashboard → SQL editor → New query → paste → Run.
--
-- What this gives you: one row per ACTIVATED device carrying a small progress
-- REPORT — totals, per-subject accuracy, streaks, the last 15 sessions — so
-- the teacher dashboard ("School portal → Live CBT → teacher console →
-- School dashboard") can show every student's practice progress online.
--
-- What this table deliberately does NOT hold: individual questions, chosen
-- options, or the private Cloud Sync blob. Answer-level detail stays on the
-- student's device; the report is a summary a teacher would write in a
-- register anyway.
--
-- Trust model (same honest posture as the Live CBT tables, and a deliberate
-- school decision in v62: progress is school-visible):
--   * writes carry an unguessable owner token = SHA-256(salt + slip hash +
--     device id). Nobody can overwrite another student's row without holding
--     that student's activated device.
--   * reads are school-wide BY DESIGN — this is a single-school app and the
--     dashboard is gated client-side to TEACHER slips. The public key alone
--     still cannot reach Cloud Sync blobs or the slip plaintext.
--   * there is NO delete policy: reports are append-only history; a replaced
--     phone simply upserts a fresh row under its own token.
--   * the activation gate is untouched: without a valid slip the site never
--     unlocks, so nothing is ever reported.

-- ------------------------------------------------------------------- table
create table if not exists public.class_progress (
  owner      text primary key,               -- unguessable write token
  student    text not null default '',       -- name typed at activation
  cls        text not null default '',       -- SS1 | SS2 | SS3
  slip       text not null default '',       -- slip serial as masked on device
  role       text not null default 'student',-- student | teacher
  blob       jsonb not null default '{}'::jsonb,  -- the progress report
  updated_at timestamptz not null default now(),
  constraint class_progress_blob_size check (octet_length(blob::text) <= 200000)
);

-- ------------------------------------------------------- server-side stamp
create or replace function public.class_progress_touch() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end $$ language plpgsql;

drop trigger if exists class_progress_touch on public.class_progress;
create trigger class_progress_touch
  before update on public.class_progress
  for each row execute function public.class_progress_touch();

-- --------------------------------------------------------------------- RLS
alter table public.class_progress enable row level security;

drop policy if exists class_progress_read on public.class_progress;
create policy class_progress_read on public.class_progress
  for select to anon, authenticated using (true);

drop policy if exists class_progress_write on public.class_progress;
create policy class_progress_write on public.class_progress
  for insert to anon, authenticated with check (true);

drop policy if exists class_progress_upd on public.class_progress;
create policy class_progress_upd on public.class_progress
  for update to anon, authenticated using (true) with check (true);

-- NOTE: no delete policy on purpose — history survives. A student's
-- "remove my report" request is handled by the school in the Supabase
-- dashboard (owner token known from the row), not from the site.

create index if not exists class_progress_updated_idx
  on public.class_progress (updated_at desc);
