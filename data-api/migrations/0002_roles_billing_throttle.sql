-- Server-owned role + Stripe subscription state live in real columns, not in
-- the user-editable `meta` JSON, so a client can never grant itself premium.
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'free';
ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE users ADD COLUMN sub_status TEXT NOT NULL DEFAULT 'none';
ALTER TABLE users ADD COLUMN sub_current_period_end INTEGER;
ALTER TABLE users ADD COLUMN sub_cancel_at_period_end INTEGER NOT NULL DEFAULT 0;
CREATE INDEX users_stripe_customer_idx ON users(stripe_customer_id);

-- Webhook idempotency: Stripe retries; each event id is processed once.
CREATE TABLE stripe_events (
  id          TEXT PRIMARY KEY,
  type        TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Brute-force throttle: failed attempts per bucket (email or ip) in a window.
CREATE TABLE auth_attempts (
  bucket TEXT NOT NULL,
  ts     INTEGER NOT NULL
);
CREATE INDEX auth_attempts_bucket_idx ON auth_attempts(bucket, ts);

-- Reset tokens are stored hashed (SHA-256 hex); the raw token only ever
-- travels in the emailed link.
DROP TABLE password_resets;
CREATE TABLE password_resets (
  token_hash  TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at  TEXT NOT NULL,
  used_at     TEXT
);

-- Carry over any role previously stored in meta by the old code path.
UPDATE users SET role = 'premium' WHERE json_extract(meta, '$.role') = 'premium';
