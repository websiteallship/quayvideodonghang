-- Migration: Create login_attempts table for rate limiting
-- Previously created at runtime via CREATE TABLE IF NOT EXISTS (security anti-pattern).
-- Moved here per Step 1.7 of security audit.

CREATE TABLE IF NOT EXISTS login_attempts (
  attempt_key TEXT NOT NULL,
  attempted_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (attempt_key, attempted_at)
);

-- Index for fast cleanup of old entries
CREATE INDEX IF NOT EXISTS idx_login_attempts_at ON login_attempts (attempted_at);
