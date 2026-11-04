-- Apple requires an app to revoke a person's Sign in with Apple token when they delete their account.
-- Revoking needs the refresh token Apple hands back when the sign-in's authorization code is exchanged.
ALTER TABLE users ADD COLUMN apple_refresh_token TEXT;
