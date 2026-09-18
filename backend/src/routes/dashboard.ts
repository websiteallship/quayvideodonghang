import { Hono } from 'hono';
import { Env, JwtPayload } from '../types/env';
import { successResponse, errorResponse } from '../utils/response';
import { authMiddleware } from '../middleware/auth';

interface NhanVienHoatDong {
  ma: string;
  ten: string;
  don: number;
  mb: number;
  last_active: string;
}

interface DashboardStatsRow {
  tong_don: number;
  da_upload: number;
  dang_cho: number;
  loi: number;
  tong_dung_luong_mb: number;
}

export const dashboardRouter = new Hono<{
  Bindings: Env;
  Variables: {
    user: JwtPayload;
  };
}>();

dashboardRouter.get('/stats', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const isAdmin = user.vai_tro === 'admin';

    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');

    let dateFilter = '';
    const statsParams: any[] = [];
    const nvParams: any[] = [];

    if (startDate && endDate) {
      dateFilter = "date(thoi_gian_tao, '+7 hours') >= date(?) AND date(thoi_gian_tao, '+7 hours') <= date(?)";
      statsParams.push(startDate, endDate);
      nvParams.push(startDate, endDate);
    } else {
      // Thống kê trong ngày hôm nay (theo múi giờ Hồ Chí Minh +7)
      dateFilter = "date(thoi_gian_tao, '+7 hours') = date('now', '+7 hours')";
    }

    const nvFilter = isAdmin ? '' : ' AND ma_nhan_vien = ?';
    if (!isAdmin) {
      statsParams.push(user.sub);
    }

    const statsQuery = `
      SELECT
        COUNT(*) as tong_don,
        SUM(CASE WHEN trang_thai = 'da_upload' THEN 1 ELSE 0 END) as da_upload,
        SUM(CASE WHEN trang_thai IN ('cho_upload', 'dang_upload') THEN 1 ELSE 0 END) as dang_cho,
        SUM(CASE WHEN trang_thai = 'loi' THEN 1 ELSE 0 END) as loi,
        ROUND(SUM(COALESCE(kich_thuoc_bytes, 0)) / 1048576.0, 1) as tong_dung_luong_mb
      FROM bien_ban
      WHERE ${dateFilter}${nvFilter}
    `;

    const statsStmt = c.env.DB.prepare(statsQuery);
    const stats = statsParams.length > 0
      ? await statsStmt.bind(...statsParams).first<DashboardStatsRow>()
      : await statsStmt.first<DashboardStatsRow>();

    // Admin-only: danh sách nhân viên hoạt động hôm nay
    let nhan_vien_hom_nay: NhanVienHoatDong[] = [];

    if (isAdmin) {
      const nvQuery = `
        SELECT
          bb.ma_nhan_vien as ma,
          nv.ten,
          COUNT(*) as don,
          ROUND(SUM(COALESCE(bb.kich_thuoc_bytes, 0)) / 1048576.0, 1) as mb,
          MAX(bb.thoi_gian_tao) as last_active
        FROM bien_ban bb
        JOIN nhan_vien nv ON bb.ma_nhan_vien = nv.ma
        WHERE ${dateFilter}
        GROUP BY bb.ma_nhan_vien
        ORDER BY don DESC
      `;

      const nvStmt = c.env.DB.prepare(nvQuery);
      const nvResult = nvParams.length > 0
        ? await nvStmt.bind(...nvParams).all<NhanVienHoatDong>()
        : await nvStmt.all<NhanVienHoatDong>();

      nhan_vien_hom_nay = nvResult.results || [];
    }

    return successResponse(c, {
      tong_don: stats?.tong_don || 0,
      da_upload: stats?.da_upload || 0,
      dang_cho: stats?.dang_cho || 0,
      loi: stats?.loi || 0,
      tong_dung_luong_mb: stats?.tong_dung_luong_mb || 0,
      nhan_vien_hom_nay
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return errorResponse(c, 'DATABASE_ERROR', message, 500);
  }
});
