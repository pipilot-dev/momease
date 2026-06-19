-- MomEase social layer: usernames, follows, and 1:1 direct messages with
-- share-by-reference payloads. Run in Supabase: SQL Editor -> New query -> Run.
--
-- Privacy model: profiles are discoverable by any signed-in user (needed for
-- username search), but only the owner can edit their own. Follows and messages
-- are scoped by row-level security to the people involved.

-- 1) PROFILES -----------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid        primary key references auth.users (id) on delete cascade,
  username     text        unique not null,
  display_name text        not null default '',
  avatar_url   text,
  last_seen    timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

-- case-insensitive username search + uniqueness
create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all"
  on public.profiles for select
  using (auth.role() = 'authenticated');

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 2) FOLLOWS ------------------------------------------------------------------
create table if not exists public.follows (
  follower_id  uuid        not null references auth.users (id) on delete cascade,
  following_id uuid        not null references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index if not exists follows_following_idx on public.follows (following_id);

alter table public.follows enable row level security;

drop policy if exists "follows_select_involved" on public.follows;
create policy "follows_select_involved"
  on public.follows for select
  using (auth.uid() = follower_id or auth.uid() = following_id);

drop policy if exists "follows_insert_own" on public.follows;
create policy "follows_insert_own"
  on public.follows for insert
  with check (auth.uid() = follower_id);

drop policy if exists "follows_delete_own" on public.follows;
create policy "follows_delete_own"
  on public.follows for delete
  using (auth.uid() = follower_id);

-- 3) MESSAGES (1:1 DMs) -------------------------------------------------------
create table if not exists public.messages (
  id           uuid        primary key default gen_random_uuid(),
  sender_id    uuid        not null references auth.users (id) on delete cascade,
  recipient_id uuid        not null references auth.users (id) on delete cascade,
  body         text        not null default '',
  -- share-by-reference: points at an in-app item instead of copying content
  share_type   text,       -- 'mantra' | 'sound' | 'meditation' | null
  share_ref    text,       -- the referenced item's id (e.g. 's1', 'm4', 'med1')
  share_title  text,       -- denormalized title for display
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists messages_pair_idx
  on public.messages (sender_id, recipient_id, created_at);
create index if not exists messages_recipient_idx
  on public.messages (recipient_id, created_at);

alter table public.messages enable row level security;

drop policy if exists "messages_select_involved" on public.messages;
create policy "messages_select_involved"
  on public.messages for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

drop policy if exists "messages_insert_own" on public.messages;
create policy "messages_insert_own"
  on public.messages for insert
  with check (auth.uid() = sender_id);

-- recipients may update read_at (mark as read)
drop policy if exists "messages_update_recipient" on public.messages;
create policy "messages_update_recipient"
  on public.messages for update
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);
