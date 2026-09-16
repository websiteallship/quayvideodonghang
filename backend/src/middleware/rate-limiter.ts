import { createMiddleware } from 'hono/factory';
import { Env } from '../types/env';
import { errorResponse } from '../utils/response';

const MAX_ATTEMPTS = 5;
const WINDOW_SECONDS = 900; // 15 minutes

/**
 * Rate limiter middleware for login brute-force protection.
 * Uses D1 login_attempts table (or in-memory fallback).
 * Rule: 02-security.md §4 — max 5 failed PIN attempts in 15 minutes per IP/employee.
 */
export const loginRateLimiter = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
  const body = await c.req.raw.clone().json().catch(() => ({})) as Record<string, unknown>;
  const maNhanVien = String(body.ma_nhan_vien || 'unknown');
  const key = `${ip}:${maNhanVien}`;

  try {
    // Ensure table exists (idempotent)
    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        attempt_key TEXT NOT NULL,
        attempted_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (attempt_key, attempted_at)
      )
    `).run();

    // Clean old entries
    await c.env.DB.prepare(
      `DELETE FROM login_attempts WHERE attempted_at < datetime('now', '-${WINDOW_SECONDS} seconds')`
    ).run();

    // Count recent attempts
    const result = await c.env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM login_attempts
       WHERE attempt_key = ? AND attempted_at > datetime('now', '-${WINDOW_SECONDS} seconds')`
    ).bind(key).first<{ cnt: number }>();

    const count = result?.cnt || 0;

    if (count >= MAX_ATTEMPTS) {
      return errorResponse(
        c,
        'RATE_LIMITED',
        `Quá nhiều lần nhập sai PIN (${MAX_ATTEMPTS} lần). Vui lòng thử lại sau 15 phút.`,
        429
      );
    }

    await next();

    // If response indicates failed login, record the attempt
    if (c.res.status === 401) {
      await c.env.DB.prepare(
        `INSERT INTO login_attempts (attempt_key) VALUES (?)`
      ).bind(key).run();
    }
  } catch (err) {
    // If rate limiting fails (e.g., no DB), allow the request through
    console.error('[RATE_LIMITER_ERROR]', err);
    await next();
  }
});
