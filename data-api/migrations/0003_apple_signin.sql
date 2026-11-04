-- Sign in with Apple: Apple's stable per-app user id ("sub") for linking, like google_sub.
-- SQLite cannot add a UNIQUE column with ALTER TABLE, so the uniqueness is a partial unique index.
ALTER TABLE users ADD COLUMN apple_sub TEXT;
CREATE UNIQUE INDEX users_apple_sub_idx ON users(apple_sub) WHERE apple_sub IS NOT NULL;
