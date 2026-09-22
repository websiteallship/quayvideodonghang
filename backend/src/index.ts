import { Hono } from 'hono';
import { Env } from './types/env';
import { corsMiddleware } from './middleware/cors';
import { securityHeaders } from './middleware/security-headers';
import { bodyLimit } from 'hono/body-limit';
import { authRouter } from './routes/auth';
import { bienBanRouter } from './routes/bien-ban';
import { uploadRouter } from './routes/upload';
import { dashboardRouter } from './routes/dashboard';
import { configRouter } from './routes/config';
import { adminRouter } from './routes/admin';
import { vietfulMerchantRouter } from './routes/vietful-merchant';
import { errorResponse, successResponse } from './utils/response';
import { runRetentionCleanup } from './services/retention-service';

const app = new Hono<{ Bindings: Env }>();

// Global Middleware: CORS → Security Headers → Body Size Limit
app.use('*', corsMiddleware);
app.use('*', securityHeaders);
// 02-security.md §3: Max 1MB JSON payload. Video upload uses chunked stream endpoint.
app.use('/api/*', bodyLimit({ maxSize: 1024 * 1024 }));

// Health Check
app.get('/', (c) => {
  return successResponse(c, {
    status: 'ok',
    service: 'Quay Video Kho Van API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (c) => {
  return c.text('OK');
});

// Route Groups
app.route('/api/auth', authRouter);
app.route('/api/bien-ban', bienBanRouter);
app.route('/api/upload', uploadRouter);
app.route('/api/dashboard', dashboardRouter);
app.route('/api/config', configRouter);
app.route('/api/admin', adminRouter);
app.route('/api/admin/vietful-merchants', vietfulMerchantRouter);

// 404 Not Found Handler
app.notFound((c) => {
  return errorResponse(c, 'NOT_FOUND', `Endpoint ${c.req.path} không tồn tại`, 404);
});

// Global Error Handler — never leak internal error details to client (OWASP A09)
app.onError((err, c) => {
  console.error('[UNHANDLED_ERROR]', err);
  return errorResponse(c, 'INTERNAL_SERVER_ERROR', 'Lỗi xử lý máy chủ nội bộ', 500);
});

// Cron Trigger Handler (Dọn dẹp vòng đời video theo cron định kỳ)
export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(
      (async () => {
        const timeStr = new Date(event.scheduledTime).toISOString();
        console.log(`[CRON_TRIGGER] Bắt đầu retention cleanup lúc ${timeStr}`);
        try {
          const result = await runRetentionCleanup(env);
          console.log('[CRON_TRIGGER] Hoàn thành retention cleanup:', JSON.stringify(result));
        } catch (err) {
          console.error('[CRON_TRIGGER] Lỗi retention cleanup:', err);
        }
      })()
    );
  }
};
