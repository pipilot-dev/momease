-- MomEase cloud sync: a single per-user key/value store that mirrors the app's
-- local persistence (tasks, journal, mood, milestones, check-ins, settings...).
-- Each store persists a JSON blob under a stable key; we keep one row per
-- (user, key) so sync stays generic and adding a new store needs no migration.
--
-- Run this in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

create table if not exists public.user_state (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  key        text        not null,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- Row-level security: every user can only see and modify their own rows.
alter table public.user_state enable row level security;

drop policy if exists "user_state_select_own" on public.user_state;
create policy "user_state_select_own"
  on public.user_state for select
  using (auth.uid() = user_id);

drop policy if exists "user_state_insert_own" on public.user_state;
create policy "user_state_insert_own"
  on public.user_state for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_state_update_own" on public.user_state;
create policy "user_state_update_own"
  on public.user_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_state_delete_own" on public.user_state;
create policy "user_state_delete_own"
  on public.user_state for delete
  using (auth.uid() = user_id);

-- Keep updated_at fresh on every write so we can resolve last-writer-wins.
create or replace function public.touch_user_state_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_user_state on public.user_state;
create trigger trg_touch_user_state
  before update on public.user_state
  for each row execute function public.touch_user_state_updated_at();
