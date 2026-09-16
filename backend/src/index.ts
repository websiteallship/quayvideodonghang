import { Hono } from 'hono';
import { Env } from './types/env';
import { corsMiddleware } from './middleware/cors';
import { authRouter } from './routes/auth';
import { bienBanRouter } from './routes/bien-ban';
import { uploadRouter } from './routes/upload';
import { dashboardRouter } from './routes/dashboard';
import { configRouter } from './routes/config';
import { adminRouter } from './routes/admin';
import { errorResponse, successResponse } from './utils/response';

const app = new Hono<{ Bindings: Env }>();

// Global CORS Middleware
app.use('*', corsMiddleware);

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

// 404 Not Found Handler
app.notFound((c) => {
  return errorResponse(c, 'NOT_FOUND', `Endpoint ${c.req.path} không tồn tại`, 404);
});

// Global Error Handler
app.onError((err, c) => {
  console.error('[UNHANDLED_ERROR]', err);
  return errorResponse(c, 'INTERNAL_SERVER_ERROR', err.message || 'Lỗi xử lý máy chủ nội bộ', 500);
});

// Cron Trigger Handler (Dọn dẹp log hoặc video tạm theo cron)
export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(
      (async () => {
        console.log(`[CRON_TRIGGER] Chạy lúc ${new Date(event.scheduledTime).toISOString()}`);
      })()
    );
  }
};
