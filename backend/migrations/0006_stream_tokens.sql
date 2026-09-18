-- Migration: Create stream_tokens table for opaque video stream authentication
-- Replaces direct JWT token in URL query params (security risk: token in logs/history/Referer)
-- Tokens are short-lived (5 min), scoped to a single bien_ban_id

CREATE TABLE IF NOT EXISTS stream_tokens (
  token TEXT PRIMARY KEY,
  bien_ban_id TEXT NOT NULL,
  ma_nhan_vien TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for cleanup of expired tokens
CREATE INDEX IF NOT EXISTS idx_stream_tokens_expires ON stream_tokens (expires_at);

-- Cleanup trigger: delete expired tokens older than 1 hour
-- (can also be done via cron, but trigger ensures no unbounded growth)
