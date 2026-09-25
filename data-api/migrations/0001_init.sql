-- MomEase D1 schema. Ports supabase/migrations/{0001_user_state, 0002_social,
-- 0003_social_safety}.sql onto SQLite. Postgres-specific bits dropped:
--   * RLS policies — ownership enforced by the Worker: it filters by user_id
--     from the verified JWT on every read/write.
--   * uuid types → TEXT (SQLite has no native uuid).
--   * jsonb → TEXT (JSON serialized on write, parsed on read).
--   * timestamptz → TEXT (ISO 8601).
--   * update trigger for updated_at → the Worker sets it explicitly.

-- 1) USERS (Supabase auth.users replacement)
CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE,
  password_hash TEXT,                  -- null for OAuth-only users
  google_sub    TEXT UNIQUE,           -- null for password-only users
  -- User metadata that used to live on auth.users.user_metadata:
  meta          TEXT NOT NULL DEFAULT '{}',  -- JSON blob: {name, avatarUrl, role, childrenAges, workSchedule, interests, onboardingCompleted, ...}
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX users_email_idx ON users(email);

-- 2) SESSIONS_AUTH — one row per issued JWT for revocation
CREATE TABLE sessions_auth (
  jti         TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at  TEXT NOT NULL,
  revoked_at  TEXT
);
CREATE INDEX sessions_auth_user_idx ON sessions_auth(user_id);

-- 3) PASSWORD RESET TOKENS — short-lived one-shot tokens emailed to the user
CREATE TABLE password_resets (
  token       TEXT PRIMARY KEY,        -- URL-safe random
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at  TEXT NOT NULL,
  used_at     TEXT
);

-- 4) USER_STATE — per-user KV JSON store (mirrors AsyncStorage keys)
CREATE TABLE user_state (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key        TEXT NOT NULL,
  data       TEXT NOT NULL DEFAULT '{}',  -- JSON
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, key)
);

-- 5) PROFILES — public-searchable identity per user
CREATE TABLE profiles (
  id            TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  username      TEXT UNIQUE NOT NULL,
  display_name  TEXT NOT NULL DEFAULT '',
  avatar_url    TEXT,
  last_seen     TEXT NOT NULL DEFAULT (datetime('now')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX profiles_username_lower_idx ON profiles(lower(username));

-- 6) FOLLOWS
CREATE TABLE follows (
  follower_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);
CREATE INDEX follows_following_idx ON follows(following_id);

-- 7) MESSAGES — 1:1 DMs with share-by-reference
CREATE TABLE messages (
  id            TEXT PRIMARY KEY,
  sender_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body          TEXT NOT NULL DEFAULT '',
  share_type    TEXT,           -- 'mantra' | 'sound' | 'meditation' | null
  share_ref     TEXT,
  share_title   TEXT,
  read_at       TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX messages_pair_idx ON messages(sender_id, recipient_id, created_at);
CREATE INDEX messages_recipient_idx ON messages(recipient_id, created_at);

-- 8) BLOCKS
CREATE TABLE blocks (
  blocker_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

-- 9) REPORTS
CREATE TABLE reports (
  id                TEXT PRIMARY KEY,
  reporter_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id  TEXT REFERENCES users(id) ON DELETE SET NULL,
  content_type      TEXT NOT NULL,   -- 'user' | 'message' | 'post' | 'comment'
  content_ref       TEXT,
  reason            TEXT NOT NULL,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX reports_reporter_idx ON reports(reporter_id, created_at DESC);
