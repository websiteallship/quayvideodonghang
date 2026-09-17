import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { Env, JwtPayload } from '../types/env';
import { successResponse, errorResponse } from '../utils/response';
import { authMiddleware, requireAdminMiddleware } from '../middleware/auth';
import { DriveService } from '../services/drive-service';
import {
  NhanVienCreateSchema,
  NhanVienUpdateSchema,
  ResetPinSchema,
  NhanVienQuerySchema,
  CauHinhUpdateSchema
} from '../types/schemas';
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

// ---------------------------------------------------------------------------
// 2.1 Danh sách nhân viên (kèm thống kê video hôm nay & đăng nhập cuối)
// ---------------------------------------------------------------------------
adminRouter.get('/nhan-vien', zValidator('query', NhanVienQuerySchema), async (c) => {
  const { trang_thai, search } = c.req.valid('query');

  try {
    let sql = `
      SELECT
        nv.ma, nv.ten, nv.vai_tro, nv.trang_thai,
        nv.ngay_tao, nv.ngay_cap_nhat,
        (SELECT COUNT(*) FROM bien_ban bb
         WHERE bb.ma_nhan_vien = nv.ma
           AND DATE(bb.thoi_gian_tao) = DATE('now')
        ) AS so_video_hom_nay,
        (SELECT MAX(pd.thoi_gian_dang_nhap) FROM phien_dang_nhap pd
         WHERE pd.ma_nhan_vien = nv.ma
        ) AS dang_nhap_cuoi
      FROM nhan_vien nv
    `;

    const conditions: string[] = [];
    const params: string[] = [];

    // Mặc định ẩn da_xoa, chỉ hiện khi được chỉ định cụ thể
    if (trang_thai) {
      conditions.push('nv.trang_thai = ?');
      params.push(trang_thai);
    } else {
      conditions.push("nv.trang_thai IN ('hoat_dong', 'vo_hieu_hoa')");
    }

    if (search && search.trim()) {
      conditions.push('(LOWER(nv.ma) LIKE ? OR LOWER(nv.ten) LIKE ?)');
      const pattern = `%${search.trim().toLowerCase()}%`;
      params.push(pattern, pattern);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY nv.ngay_tao DESC';

    const stmt = c.env.DB.prepare(sql);
    const result = params.length > 0
      ? await stmt.bind(...params).all()
      : await stmt.all();

    const items = result.results || [];
    return successResponse(c, {
      items,
      total: items.length
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return errorResponse(c, 'DATABASE_ERROR', message, 500);
  }
});

// ---------------------------------------------------------------------------
// 2.2 Thêm nhân viên mới
// ---------------------------------------------------------------------------
adminRouter.post('/nhan-vien', zValidator('json', NhanVienCreateSchema), async (c) => {
  const { ma, ten, pin, vai_tro } = c.req.valid('json');
  const upperMa = ma.toUpperCase();

  try {
    const existing = await c.env.DB.prepare('SELECT ma FROM nhan_vien WHERE ma = ?')
      .bind(upperMa)
      .first();

    if (existing) {
      return errorResponse(c, 'USER_EXISTS', `Mã nhân viên ${upperMa} đã tồn tại`, 409);
    }

    const pinHash = await hashPin(pin);

    await c.env.DB.prepare(
      'INSERT INTO nhan_vien (ma, ten, pin_hash, vai_tro, trang_thai) VALUES (?, ?, ?, ?, ?)'
    )
      .bind(upperMa, ten, pinHash, vai_tro, 'hoat_dong')
      .run();

    return successResponse(c, {
      ma: upperMa,
      ten,
      vai_tro,
      trang_thai: 'hoat_dong',
      message: 'Tạo nhân viên thành công'
    }, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return errorResponse(c, 'DATABASE_ERROR', message, 500);
  }
});

// ---------------------------------------------------------------------------
// 2.3 Cập nhật nhân viên (Partial Update)
// ---------------------------------------------------------------------------
adminRouter.put('/nhan-vien/:ma', zValidator('json', NhanVienUpdateSchema), async (c) => {
  const targetMa = c.req.param('ma').toUpperCase();
  const { ten, vai_tro, trang_thai } = c.req.valid('json');

  try {
    const existing = await c.env.DB.prepare(
      "SELECT ma, ten, vai_tro, trang_thai FROM nhan_vien WHERE ma = ? AND trang_thai != 'da_xoa'"
    )
      .bind(targetMa)
      .first<{ ma: string; ten: string; vai_tro: string; trang_thai: string }>();

    if (!existing) {
      return errorResponse(c, 'USER_NOT_FOUND', 'Nhân viên không tồn tại', 404);
    }

    // Chặn vô hiệu hóa hoặc hạ quyền admin cuối cùng trong hệ thống
    if (
      existing.vai_tro === 'admin' &&
      ((vai_tro && vai_tro !== 'admin') || (trang_thai && trang_thai !== 'hoat_dong'))
    ) {
      const adminCountRow = await c.env.DB.prepare(
        "SELECT COUNT(*) as count FROM nhan_vien WHERE vai_tro = 'admin' AND trang_thai = 'hoat_dong'"
      ).first<{ count: number }>();

      if ((adminCountRow?.count ?? 0) <= 1) {
        return errorResponse(
          c,
          'LAST_ADMIN',
          'Không thể vô hiệu hóa hoặc hạ quyền admin cuối cùng trong hệ thống',
          400
        );
      }
    }

    const setClauses: string[] = [];
    const params: (string | number)[] = [];

    if (ten !== undefined) {
      setClauses.push('ten = ?');
      params.push(ten);
    }
    if (vai_tro !== undefined) {
      setClauses.push('vai_tro = ?');
      params.push(vai_tro);
    }
    if (trang_thai !== undefined) {
      setClauses.push('trang_thai = ?');
      params.push(trang_thai);
    }

    setClauses.push("ngay_cap_nhat = datetime('now')");
    params.push(targetMa);

    await c.env.DB.prepare(
      `UPDATE nhan_vien SET ${setClauses.join(', ')} WHERE ma = ?`
    )
      .bind(...params)
      .run();

    // Nếu vô hiệu hóa -> hủy tất cả phiên đăng nhập
    if (trang_thai === 'vo_hieu_hoa') {
      try {
        await c.env.DB.prepare(
          'UPDATE phien_dang_nhap SET con_hieu_luc = 0 WHERE ma_nhan_vien = ?'
        )
          .bind(targetMa)
          .run();
      } catch {
        // Non-critical
      }
    }

    const updated = await c.env.DB.prepare(
      'SELECT ma, ten, vai_tro, trang_thai, ngay_tao, ngay_cap_nhat FROM nhan_vien WHERE ma = ?'
    )
      .bind(targetMa)
      .first();

    return successResponse(c, updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return errorResponse(c, 'DATABASE_ERROR', message, 500);
  }
});

// ---------------------------------------------------------------------------
// 2.4 Soft-Delete nhân viên
// ---------------------------------------------------------------------------
adminRouter.delete('/nhan-vien/:ma', async (c) => {
  const targetMa = c.req.param('ma').toUpperCase();

  try {
    const existing = await c.env.DB.prepare(
      "SELECT ma, vai_tro, trang_thai FROM nhan_vien WHERE ma = ? AND trang_thai != 'da_xoa'"
    )
      .bind(targetMa)
      .first<{ ma: string; vai_tro: string; trang_thai: string }>();

    if (!existing) {
      return errorResponse(c, 'USER_NOT_FOUND', 'Nhân viên không tồn tại', 404);
    }

    // Chặn xóa admin cuối cùng trong hệ thống
    if (existing.vai_tro === 'admin') {
      const adminCountRow = await c.env.DB.prepare(
        "SELECT COUNT(*) as count FROM nhan_vien WHERE vai_tro = 'admin' AND trang_thai = 'hoat_dong'"
      ).first<{ count: number }>();

      if ((adminCountRow?.count ?? 0) <= 1) {
        return errorResponse(
          c,
          'LAST_ADMIN',
          'Không thể xóa admin cuối cùng trong hệ thống',
          400
        );
      }
    }

    // Soft-delete
    await c.env.DB.prepare(
      "UPDATE nhan_vien SET trang_thai = 'da_xoa', ngay_cap_nhat = datetime('now') WHERE ma = ?"
    )
      .bind(targetMa)
      .run();

    // Hủy tất cả phiên đăng nhập
    try {
      await c.env.DB.prepare(
        'UPDATE phien_dang_nhap SET con_hieu_luc = 0 WHERE ma_nhan_vien = ?'
      )
        .bind(targetMa)
        .run();
    } catch {
      // Non-critical
    }

    return successResponse(c, {
      ma: targetMa,
      trang_thai: 'da_xoa',
      message: 'Đã xóa nhân viên thành công'
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return errorResponse(c, 'DATABASE_ERROR', message, 500);
  }
});

// ---------------------------------------------------------------------------
// 2.5 Đặt lại mã PIN nhân viên
// ---------------------------------------------------------------------------
adminRouter.put('/nhan-vien/:ma/reset-pin', zValidator('json', ResetPinSchema), async (c) => {
  const targetMa = c.req.param('ma').toUpperCase();
  const { pin_moi } = c.req.valid('json');

  try {
    const existing = await c.env.DB.prepare(
      "SELECT ma, trang_thai FROM nhan_vien WHERE ma = ? AND trang_thai != 'da_xoa'"
    )
      .bind(targetMa)
      .first<{ ma: string; trang_thai: string }>();

    if (!existing) {
      return errorResponse(c, 'USER_NOT_FOUND', 'Nhân viên không tồn tại', 404);
    }

    if (existing.trang_thai === 'vo_hieu_hoa') {
      return errorResponse(
        c,
        'ACCOUNT_DISABLED',
        'Tài khoản đang bị vô hiệu hóa, không thể đổi PIN',
        400
      );
    }

    const pinHash = await hashPin(pin_moi);

    await c.env.DB.prepare(
      "UPDATE nhan_vien SET pin_hash = ?, ngay_cap_nhat = datetime('now') WHERE ma = ?"
    )
      .bind(pinHash, targetMa)
      .run();

    // Buộc đăng nhập lại: hủy tất cả phiên đăng nhập
    try {
      await c.env.DB.prepare(
        'UPDATE phien_dang_nhap SET con_hieu_luc = 0 WHERE ma_nhan_vien = ?'
      )
        .bind(targetMa)
        .run();
    } catch {
      // Non-critical
    }

    return successResponse(c, {
      ma: targetMa,
      message: 'Đặt lại mã PIN thành công'
    });
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
