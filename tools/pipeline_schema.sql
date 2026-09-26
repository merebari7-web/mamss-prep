-- MAMSS PREP v58 "Question Pipeline" — one-time school setup.
-- Run once in the school's Supabase dashboard (SQL editor). Safe to re-run.
-- Creates the shared question queue: teachers submit CSV/JSON rows, review
-- each other's questions, and approved rows feed the live-exam paper builder.
-- The national question bank (bank.js) is NOT touched by this — it stays
-- hash-locked and offline-built.

create table if not exists public.question_queue (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  status      text not null default 'pending'
              check (status in ('pending','approved','rejected')),
  subject     text not null check (char_length(subject) between 1 and 80),
  cls         text not null check (cls in ('SS1','SS2','SS3')),
  topic       text not null default '' check (char_length(topic) <= 80),
  q           text not null check (char_length(q) between 10 and 1000),
  o           jsonb not null check (jsonb_typeof(o) = 'array' and jsonb_array_length(o) = 4),
  a           int not null check (a between 0 and 3),
  e           text not null default '' check (char_length(e) <= 600),
  source      text not null default 'csv' check (source in ('csv','json','form')),
  submitter   text not null default '' check (char_length(submitter) <= 120),
  review_note text check (review_note is null or char_length(review_note) <= 300),
  reviewed_at timestamptz,
  reviewed_by text check (reviewed_by is null or char_length(reviewed_by) <= 120)
);

-- School-open posture, identical to the CBT tables: any device holding a
-- valid activation slip can reach the console UI, and the queue carries no
-- student data — only questions teachers wrote for the whole school.
alter table public.question_queue enable row level security;

drop policy if exists "question_queue_read"   on public.question_queue;
drop policy if exists "question_queue_insert" on public.question_queue;
drop policy if exists "question_queue_update" on public.question_queue;
create policy "question_queue_read"   on public.question_queue for select using (true);
create policy "question_queue_insert" on public.question_queue for insert with check (true);
create policy "question_queue_update" on public.question_queue for update using (true) with check (true);
-- no delete policy: rejected rows stay visible as an audit trail.

create index if not exists question_queue_status_idx
  on public.question_queue (status, created_at desc);

grant select, insert, update on public.question_queue to anon, authenticated;
