import { Hono } from 'hono';
import { Env, JwtPayload } from '../types/env';
import { successResponse, errorResponse } from '../utils/response';
import { authMiddleware } from '../middleware/auth';

export const dashboardRouter = new Hono<{
  Bindings: Env;
  Variables: {
    user: JwtPayload;
  };
}>();

dashboardRouter.get('/stats', authMiddleware, async (c) => {
  try {
    // Thống kê trong ngày hôm nay (theo múi giờ Hồ Chí Minh +7)
    const stats = await c.env.DB.prepare(
      `SELECT
        COUNT(*) as tong_hom_nay,
        SUM(CASE WHEN trang_thai = 'da_upload' THEN 1 ELSE 0 END) as da_luu,
        SUM(CASE WHEN trang_thai IN ('cho_upload', 'dang_upload') THEN 1 ELSE 0 END) as cho_tai,
        SUM(CASE WHEN trang_thai = 'loi' THEN 1 ELSE 0 END) as loi
       FROM bien_ban
       WHERE date(thoi_gian_tao, '+7 hours') = date('now', '+7 hours')`
    ).first<{
      tong_hom_nay: number;
      da_luu: number;
      cho_tai: number;
      loi: number;
    }>();

    return successResponse(c, {
      tong_hom_nay: stats?.tong_hom_nay || 0,
      da_luu: stats?.da_luu || 0,
      cho_tai: stats?.cho_tai || 0,
      loi: stats?.loi || 0
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return errorResponse(c, 'DATABASE_ERROR', message, 500);
  }
});
