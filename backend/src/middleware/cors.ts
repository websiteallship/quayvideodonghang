import { createMiddleware } from 'hono/factory';
import { Env } from '../types/env';

export const corsMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const origin = c.req.header('Origin') || '';
  const allowed = (c.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  // 02-security.md §4: Không dùng wildcard cho endpoint nhạy cảm.
  // Chỉ cho phép explicit domains đã khai báo trong ALLOWED_ORIGINS.
  const isAllowed = allowed.includes(origin) || !origin;

  if (origin && !isAllowed) {
    return new Response(null, { status: 403 });
  }

  if (c.req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin || allowed[0] || '',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  await next();

  if (isAllowed && origin) {
    c.res.headers.set('Access-Control-Allow-Origin', origin);
    c.res.headers.set('Access-Control-Allow-Credentials', 'true');
  }
});
