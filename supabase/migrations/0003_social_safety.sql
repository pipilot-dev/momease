-- MomEase social-safety layer: user blocking, content reporting, and the
-- delete policies needed for full account/data deletion. Run in Supabase:
-- SQL Editor -> New query -> paste -> Run. (Requires 0002_social.sql first.)

-- 1) BLOCKS -------------------------------------------------------------------
create table if not exists public.blocks (
  blocker_id uuid        not null references auth.users (id) on delete cascade,
  blocked_id uuid        not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.blocks enable row level security;

drop policy if exists "blocks_select_own" on public.blocks;
create policy "blocks_select_own" on public.blocks for select
  using (auth.uid() = blocker_id);

drop policy if exists "blocks_insert_own" on public.blocks;
create policy "blocks_insert_own" on public.blocks for insert
  with check (auth.uid() = blocker_id);

drop policy if exists "blocks_delete_own" on public.blocks;
create policy "blocks_delete_own" on public.blocks for delete
  using (auth.uid() = blocker_id);

-- 2) REPORTS ------------------------------------------------------------------
create table if not exists public.reports (
  id               uuid        primary key default gen_random_uuid(),
  reporter_id      uuid        not null references auth.users (id) on delete cascade,
  reported_user_id uuid        references auth.users (id) on delete set null,
  content_type     text        not null,   -- 'user' | 'message' | 'post' | 'comment'
  content_ref      text,                    -- id of the reported item, if any
  reason           text        not null,
  created_at       timestamptz not null default now()
);

alter table public.reports enable row level security;

drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own" on public.reports for insert
  with check (auth.uid() = reporter_id);

drop policy if exists "reports_select_own" on public.reports;
create policy "reports_select_own" on public.reports for select
  using (auth.uid() = reporter_id);

-- 3) BLOCK-AWARE MESSAGING ----------------------------------------------------
-- A message can't be sent if either party has blocked the other.
drop policy if exists "messages_insert_own" on public.messages;
create policy "messages_insert_own" on public.messages for insert
  with check (
    auth.uid() = sender_id
    and not exists (
      select 1 from public.blocks
      where (blocker_id = recipient_id and blocked_id = sender_id)
         or (blocker_id = sender_id and blocked_id = recipient_id)
    )
  );

-- 4) DELETE POLICIES for account/data deletion --------------------------------
-- Let users remove their own rows. (Deleting the auth user also cascades all of
-- these automatically; these policies enable the in-app client-side cleanup.)
drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles for delete
  using (auth.uid() = id);

drop policy if exists "messages_delete_own" on public.messages;
create policy "messages_delete_own" on public.messages for delete
  using (auth.uid() = sender_id);
