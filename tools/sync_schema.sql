-- MAMSS PREP v56 "Cloud Sync" — progress sync backend (Supabase, same project as the slip ledger + Live CBT)
-- Run once in: Supabase dashboard → SQL editor → New query → paste → Run.
--
-- What this gives you: one private row per signed-in Google account holding a
-- merged snapshot of that student's progress (XP, coins, badges, attempts,
-- mistakes, bookmarks, journal, adaptive stats, goals, lab stats…). The site
-- merges client-side and pushes with optimistic locking (rev), so two phones
-- syncing at the same time lose nothing — the loser re-merges and retries.
--
-- Trust model — STRICTER than the CBT tables, because this data is personal:
--   * rows are readable/writable ONLY by the signed-in owner (auth.uid() = uid).
--     The public key alone sees nothing here; a Google sign-in token is required.
--   * there is NO delete policy: even a compromised session cannot erase
--     history. (The site's "Delete cloud copy" button pushes an EMPTY blob
--     instead — an update by the owner, not a row delete.)
--   * the activation system is untouched: nssc_act is never in the blob (the
--     site filters it out client-side) and this table grants no access to any
--     other table. Without an activation slip, nobody reaches the app to sync.
--
-- Companion dashboard step (once, ~1 minute, no secrets needed):
--   Authentication → Sign In / Providers → Google → Enable, then paste the
--   site's existing client ID into "Authorized Client IDs":
--   648029341991-3onmssrflm9jqvmjbjtsl1ebag4k9afi.apps.googleusercontent.com
--   Leave "Client ID (for OAuth)" and "Client Secret" BLANK — the site uses
--   Google's pre-built button (Sign in with ID token), which needs neither.

-- ------------------------------------------------------------------- table
create table if not exists public.user_sync (
  uid        uuid primary key references auth.users (id) on delete cascade,
  email      text not null default '',
  blob       jsonb not null default '{}'::jsonb,   -- {v:1, keys:{<storeKey>:{t,d}}}
  rev        bigint not null default 1,            -- optimistic lock; client sends rev+1 WHERE rev=<base>
  updated_at timestamptz not null default now(),
  -- hard ceiling so a runaway client cannot park a giant row: 3 MB of JSON text
  constraint user_sync_blob_size check (octet_length(blob::text) <= 3000000)
);

-- ------------------------------------------------------- server-side stamp
create or replace function public.user_sync_touch() returns trigger as $$
begin
  new.updated_at := now();
  -- never trust a client rev that goes backwards or sideways
  if new.rev is null or new.rev <= old.rev then
    new.rev := old.rev + 1;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists user_sync_touch on public.user_sync;
create trigger user_sync_touch before update on public.user_sync
  for each row execute function public.user_sync_touch();

-- --------------------------------------------------------------------- RLS
alter table public.user_sync enable row level security;

drop policy if exists "sync readable by owner"  on public.user_sync;
create policy "sync readable by owner"  on public.user_sync for select to authenticated using (uid = (select auth.uid()));
drop policy if exists "sync writable by owner"  on public.user_sync;
create policy "sync writable by owner"  on public.user_sync for insert to authenticated with check (uid = (select auth.uid()));
drop policy if exists "sync updatable by owner" on public.user_sync;
create policy "sync updatable by owner" on public.user_sync for update to authenticated using (uid = (select auth.uid())) with check (uid = (select auth.uid()));
-- deliberately NO delete policy: history cannot be erased through the API.

-- ---------------------------------------------------------------- realtime
-- (the site syncs on a timer/events, not via sockets; publication is added so
--  a future "sync now on remote change" enhancement needs no schema change)
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'user_sync'
  ) then
    alter publication supabase_realtime add table public.user_sync;
  end if;
exception when duplicate_object then null;
end $$;

-- Done. Verify with:  select count(*) from public.user_sync;   (expect 0)
