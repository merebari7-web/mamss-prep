-- =====================================================================
-- MAMSS PREP v67 "The Friday Waecathon" + live room audio
-- One-time setup — paste into Supabase → SQL Editor → Run.
--
-- Safe to run more than once: both statements are "if not exists".
-- Nothing here reads, moves or deletes existing data. Each adds one
-- nullable-with-default column to the live-exam attempt table, which is
-- the same table the camera system already writes its status word to.
--
--   cls    the house (SS1 / SS2 / SS3) a student sat from, so the
--          Waecathon house table can rank class against class. Written
--          when a student joins; older rows simply read as "—".
--   voice  the microphone status word for live room audio
--          (on / denied / unavailable / skipped). Audio itself is never
--          stored anywhere — only this one word, exactly like `webcam`.
--
-- Until this is run the app still works: it detects the missing columns
-- and quietly drops back to no house table and no voice status word.
-- =====================================================================

alter table public.cbt_attempts
  add column if not exists cls text not null default '';

alter table public.cbt_attempts
  add column if not exists voice text not null default '';

-- Optional: keep the house table cheap to read on big sittings.
create index if not exists cbt_attempts_session_cls_idx
  on public.cbt_attempts (session_code, cls);
