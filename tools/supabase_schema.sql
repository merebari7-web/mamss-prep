-- MAMSS PREP v45 "Roll Call" — school redemption ledger (Supabase, free tier)
-- Run once in: Supabase dashboard → SQL editor → New query → Run.
--
-- What this gives you: ONE SLIP = ONE DEVICE, enforced across phones.
--   * the primary key IS the enforcement: a second claim of the same code_hash
--     fails with a uniqueness violation, whoever tries it, from wherever.
--   * the anon key (embedded in the site) can ONLY insert new claims and read
--     hashes/dates. It cannot update, delete, or read anything else.
--   * keep the service_role key offline forever; it is NOT what the site uses.

create table if not exists public.code_redemptions (
  code_hash    text primary key,               -- sha256(salt|normalised code), hex
  device_id    text not null,                  -- random per-device id
  device_label text not null default '',       -- student name at redemption time
  batch        text not null default '',       -- e.g. SS1-3-main
  redeemed_at  timestamptz not null default now()
);

comment on table public.code_redemptions is
  'One row per redeemed school activation slip; primary key enforces single use across all devices.';

alter table public.code_redemptions enable row level security;

-- anyone (anon) may read which hashes are redeemed and when (public info: the
-- hash list already ships in docs/codes.js)
drop policy if exists "redemptions are readable" on public.code_redemptions;
create policy "redemptions are readable"
  on public.code_redemptions for select
  to anon, authenticated
  using (true);

-- anyone (anon) may INSERT, but only a hash that does not exist yet — the
-- primary key rejects duplicates with 23505, which the app reads as
-- "this slip belongs to another device"
drop policy if exists "claim a slip once" on public.code_redemptions;
create policy "claim a slip once"
  on public.code_redemptions for insert
  to anon, authenticated
  with check (true);

-- no update, no delete for anon/authenticated: a redeemed slip stays redeemed.
-- (If a teacher must revoke a slip, do it from the dashboard with your own
--  login, or: delete from public.code_redemptions where code_hash = '…';)

-- Teacher-facing log: open Supabase → Table editor → code_redemptions (rows are
-- newest-last). We deliberately do NOT create a SQL view here: views run as
-- their owner and would bypass the row-level policies above.
