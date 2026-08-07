-- Migration 0014: Add password reset token fields to users table
-- Allows sending welcome emails with password set links

ALTER TABLE users ADD COLUMN password_reset_token TEXT;
ALTER TABLE users ADD COLUMN password_reset_expiry INTEGER;
ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS users_reset_token_idx ON users(password_reset_token);
