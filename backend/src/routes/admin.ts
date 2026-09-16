import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { Env, JwtPayload } from '../types/env';
import { successResponse, errorResponse } from '../utils/response';
import { authMiddleware, requireAdminMiddleware } from '../middleware/auth';
import { DriveService } from '../services/drive-service';
import { NhanVienCreateSchema, CauHinhUpdateSchema } from '../types/schemas';
import { hashPin } from '../utils/hash';

export const adminRouter = new Hono<{
  Bindings: Env;
  Variables: {
    user: JwtPayload;
  };
}>();

// Bảo vệ toàn bộ router admin bằng authMiddleware + requireAdminMiddleware
adminRouter.use('*', authMiddleware, requireAdminMiddleware);

// Test kết nối Google Drive
adminRouter.post('/cau-hinh/test-drive', async (c) => {
  try {
    const driveService = new DriveService(c.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const result = await driveService.testConnection();

    return successResponse(c, {
      ket_noi_ok: true,
      service_account_email: result.email,
      message: 'Kết nối Google Drive thành công'
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Google Drive test error';
    return errorResponse(c, 'DRIVE_CONNECTION_FAILED', message, 500);
  }
});

// Danh sách nhân viên
adminRouter.get('/nhan-vien', async (c) => {
  try {
    const result = await c.env.DB.prepare(
      'SELECT ma, ten, vai_tro, trang_thai, ngay_tao, ngay_cap_nhat FROM nhan_vien ORDER BY ngay_tao DESC'
    ).all();

    return successResponse(c, result.results);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return errorResponse(c, 'DATABASE_ERROR', message, 500);
  }
});

// Thêm nhân viên mới
adminRouter.post('/nhan-vien', zValidator('json', NhanVienCreateSchema), async (c) => {
  const { ma, ten, pin, vai_tro } = c.req.valid('json');

  try {
    const existing = await c.env.DB.prepare('SELECT ma FROM nhan_vien WHERE ma = ?')
      .bind(ma.toUpperCase())
      .first();

    if (existing) {
      return errorResponse(c, 'USER_EXISTS', `Mã nhân viên ${ma} đã tồn tại`, 409);
    }

    const pinHash = await hashPin(pin);

    await c.env.DB.prepare(
      'INSERT INTO nhan_vien (ma, ten, pin_hash, vai_tro, trang_thai) VALUES (?, ?, ?, ?, ?)'
    )
      .bind(ma.toUpperCase(), ten, pinHash, vai_tro, 'hoat_dong')
      .run();

    return successResponse(c, {
      ma: ma.toUpperCase(),
      ten,
      vai_tro,
      message: 'Tạo nhân viên thành công'
    }, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return errorResponse(c, 'DATABASE_ERROR', message, 500);
  }
});

// Lấy cấu hình hệ thống
adminRouter.get('/cau-hinh', async (c) => {
  try {
    const configs = await c.env.DB.prepare('SELECT khoa, gia_tri, ngay_cap_nhat FROM cau_hinh').all();
    return successResponse(c, configs.results);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return errorResponse(c, 'DATABASE_ERROR', message, 500);
  }
});

// Cập nhật cấu hình hệ thống
adminRouter.put('/cau-hinh', zValidator('json', CauHinhUpdateSchema), async (c) => {
  const { khoa, gia_tri } = c.req.valid('json');

  try {
    await c.env.DB.prepare(
      `INSERT INTO cau_hinh (khoa, gia_tri, ngay_cap_nhat)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(khoa) DO UPDATE SET gia_tri = excluded.gia_tri, ngay_cap_nhat = datetime('now')`
    )
      .bind(khoa, gia_tri)
      .run();

    return successResponse(c, { message: `Cập nhật cấu hình [${khoa}] thành công` });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return errorResponse(c, 'DATABASE_ERROR', message, 500);
  }
});
