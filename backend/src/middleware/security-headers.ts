import { createMiddleware } from 'hono/factory';
import { Env } from '../types/env';

/**
 * Security headers middleware.
 * Rule: 02-security.md §4 — CSP, HSTS, X-Frame-Options, etc.
 * OWASP: A05 Security Misconfiguration
 */
export const securityHeaders = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  await next();

  // Prevent MIME type sniffing
  c.res.headers.set('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  c.res.headers.set('X-Frame-Options', 'DENY');

  // Disable deprecated XSS auditor (modern browsers use CSP instead)
  c.res.headers.set('X-XSS-Protection', '0');

  // Control Referer header leakage
  c.res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Enforce HTTPS for 1 year
  c.res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // Content Security Policy per 02-security.md §4
  c.res.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://*.cloudflare.com https://www.googleapis.com https://storage.googleapis.com",
      "media-src 'self' blob:",
      "img-src 'self' blob: data:",
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
    ].join('; ')
  );

  // Restrict powerful features to self only
  c.res.headers.set(
    'Permissions-Policy',
    'camera=(self), microphone=(self), geolocation=(self), fullscreen=(self)'
  );
});
