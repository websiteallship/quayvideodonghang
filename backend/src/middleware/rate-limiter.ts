import { createMiddleware } from 'hono/factory';
import { Env } from '../types/env';
import { errorResponse } from '../utils/response';

const MAX_ATTEMPTS = 5;
const WINDOW_SECONDS = 900; // 15 minutes
const WINDOW_MODIFIER = `-${WINDOW_SECONDS} seconds`; // Pre-computed for bind()

/**
 * Rate limiter middleware for login brute-force protection.
 * Uses D1 login_attempts table (created via migration, NOT runtime DDL).
 * Rule: 02-security.md §4 — max 5 failed PIN attempts in 15 minutes per IP/employee.
 * Security: Fail-closed (503) if DB unavailable — OWASP A10 Exceptional Conditions.
 */
export const loginRateLimiter = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
  const body = await c.req.raw.clone().json().catch(() => ({})) as Record<string, unknown>;
  const maNhanVien = String(body.ma_nhan_vien || 'unknown');
  const key = `${ip}:${maNhanVien}`;

  try {
    // Clean old entries — parameterized to prevent SQL injection
    await c.env.DB.prepare(
      `DELETE FROM login_attempts WHERE attempted_at < datetime('now', ?)`
    ).bind(WINDOW_MODIFIER).run();

    // Count recent attempts — parameterized to prevent SQL injection
    const result = await c.env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM login_attempts
       WHERE attempt_key = ? AND attempted_at > datetime('now', ?)`
    ).bind(key, WINDOW_MODIFIER).first<{ cnt: number }>();

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
    // Fail-closed: deny access when rate limiter DB is unavailable (OWASP A10)
    console.error('[RATE_LIMITER_ERROR]', err);
    return errorResponse(c, 'SERVICE_UNAVAILABLE', 'Hệ thống tạm thời không thể xác thực, vui lòng thử lại', 503);
  }
});
