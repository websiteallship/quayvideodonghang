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
  CauHinhUpdateSchema,
  CauHinhBatchUpdateSchema,
  KhoHangCreateSchema,
  KhoHangUpdateSchema
} from '../types/schemas';
import { hashPin } from '../utils/hash';
import { getRetentionStatus, runRetentionCleanup } from '../services/retention-service';

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
    // Dùng oauth2Creds nếu không có Service Account JSON (giống upload.ts)
    const oauth2Creds =
      c.env.GOOGLE_CLIENT_ID && c.env.GOOGLE_CLIENT_SECRET && c.env.GOOGLE_REFRESH_TOKEN
        ? {
            client_id: c.env.GOOGLE_CLIENT_ID,
            client_secret: c.env.GOOGLE_CLIENT_SECRET,
            refresh_token: c.env.GOOGLE_REFRESH_TOKEN,
          }
        : undefined;

    const driveService = new DriveService(c.env.GOOGLE_SERVICE_ACCOUNT_JSON, oauth2Creds);
    
    // ưu tiên folder_id từ body (form chưa lưu), fallback về DB
    let folderId: string | undefined;
    try {
      const body = await c.req.json<{ folder_id?: string }>();
      folderId = body?.folder_id?.trim() || undefined;
    } catch { /* body empty, ok */ }

    if (!folderId) {
      const configRow = await c.env.DB.prepare("SELECT gia_tri FROM cau_hinh WHERE khoa = 'drive_folder_id'").first<{ gia_tri: string }>();
      folderId = configRow?.gia_tri;
    }

    const result = await driveService.testConnectionDetailed(folderId);

    return successResponse(c, result);
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
           AND DATE(bb.thoi_gian_tao, '+7 hours') = DATE('now', '+7 hours')
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
  const caller = c.get('user');
  const callerMa = caller.sub.toUpperCase();
  const isSuperAdmin = callerMa === 'ADMIN';
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

    // === SUPER ADMIN PROTECTION ===
    // 1. Bảo vệ tuyệt đối ADMIN gốc: không ai được hạ quyền hoặc vô hiệu hóa
    if (targetMa === 'ADMIN') {
      if ((vai_tro && vai_tro !== 'admin') || (trang_thai && trang_thai !== 'hoat_dong')) {
        return errorResponse(
          c,
          'SUPER_ADMIN_PROTECTED',
          'Không thể thay đổi vai trò hoặc trạng thái của Admin gốc',
          403
        );
      }
      // Chỉ Super Admin mới được sửa chính mình (tên)
      if (!isSuperAdmin) {
        return errorResponse(c, 'FORBIDDEN', 'Bạn không có quyền chỉnh sửa Admin gốc', 403);
      }
    }

    // 2. Admin khác không được sửa admin khác (trừ Super Admin)
    if (
      existing.vai_tro === 'admin' &&
      targetMa !== callerMa &&
      !isSuperAdmin
    ) {
      return errorResponse(
        c,
        'FORBIDDEN',
        'Admin không có quyền chỉnh sửa admin khác. Chỉ Admin gốc mới được thực hiện.',
        403
      );
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
  const caller = c.get('user');
  const callerMa = caller.sub.toUpperCase();
  const isSuperAdmin = callerMa === 'ADMIN';

  try {
    // === SUPER ADMIN PROTECTION ===
    // 1. Chặn tuyệt đối xóa ADMIN gốc, kể cả bởi chính ADMIN
    if (targetMa === 'ADMIN') {
      return errorResponse(
        c,
        'SUPER_ADMIN_PROTECTED',
        'Admin gốc không thể bị xóa dưới mọi hình thức',
        403
      );
    }

    const existing = await c.env.DB.prepare(
      "SELECT ma, vai_tro, trang_thai FROM nhan_vien WHERE ma = ? AND trang_thai != 'da_xoa'"
    )
      .bind(targetMa)
      .first<{ ma: string; vai_tro: string; trang_thai: string }>();

    if (!existing) {
      return errorResponse(c, 'USER_NOT_FOUND', 'Nhân viên không tồn tại', 404);
    }

    // 2. Admin khác không được xóa admin (chỉ Super Admin mới được)
    if (existing.vai_tro === 'admin' && !isSuperAdmin) {
      return errorResponse(
        c,
        'FORBIDDEN',
        'Admin không có quyền xóa admin khác. Chỉ Admin gốc mới được thực hiện.',
        403
      );
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
  const caller = c.get('user');
  const callerMa = caller.sub.toUpperCase();
  const isSuperAdmin = callerMa === 'ADMIN';
  const { pin_moi } = c.req.valid('json');

  try {
    const existing = await c.env.DB.prepare(
      "SELECT ma, vai_tro, trang_thai FROM nhan_vien WHERE ma = ? AND trang_thai != 'da_xoa'"
    )
      .bind(targetMa)
      .first<{ ma: string; vai_tro: string; trang_thai: string }>();

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

    // === SUPER ADMIN PROTECTION ===
    // Admin khác không được reset PIN của admin khác (trừ Super Admin)
    if (
      existing.vai_tro === 'admin' &&
      targetMa !== callerMa &&
      !isSuperAdmin
    ) {
      return errorResponse(
        c,
        'FORBIDDEN',
        'Admin không có quyền đặt lại PIN của admin khác. Chỉ Admin gốc mới được thực hiện.',
        403
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
    const configs = await c.env.DB.prepare('SELECT khoa, gia_tri FROM cau_hinh').all<{khoa: string; gia_tri: string}>();
    const configObject = configs.results.reduce((acc, curr) => {
      acc[curr.khoa] = curr.gia_tri;
      return acc;
    }, {} as Record<string, string>);
    return successResponse(c, configObject);
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

// Cập nhật batch cấu hình hệ thống (hỗ trợ cả PATCH và PUT)
adminRouter.on(['PATCH', 'PUT'], '/cau-hinh/batch', zValidator('json', CauHinhBatchUpdateSchema), async (c) => {
  const { configs } = c.req.valid('json');

  try {
    const statements = Object.entries(configs).map(([khoa, gia_tri]) => {
      return c.env.DB.prepare(
        `INSERT INTO cau_hinh (khoa, gia_tri, ngay_cap_nhat)
         VALUES (?, ?, datetime('now'))
         ON CONFLICT(khoa) DO UPDATE SET gia_tri = excluded.gia_tri, ngay_cap_nhat = datetime('now')`
      ).bind(khoa, String(gia_tri));
    });

    if (statements.length > 0) {
      await c.env.DB.batch(statements);
    }

    return successResponse(c, { message: 'Cập nhật hàng loạt cấu hình thành công' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return errorResponse(c, 'DATABASE_ERROR', message, 500);
  }
});

// ---------------------------------------------------------------------------
// 2.6 Quản lý Vòng đời & Dọn dẹp Video (Data Retention)
// ---------------------------------------------------------------------------
adminRouter.get('/retention/status', async (c) => {
  try {
    const status = await getRetentionStatus(c.env);
    return successResponse(c, status);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi lấy trạng thái retention';
    return errorResponse(c, 'DATABASE_ERROR', message, 500);
  }
});

adminRouter.post('/retention/run', async (c) => {
  try {
    const result = await runRetentionCleanup(c.env);
    return successResponse(c, result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi thực thi retention cleanup';
    return errorResponse(c, 'INTERNAL_SERVER_ERROR', message, 500);
  }
});

// ---------------------------------------------------------------------------
// 3. Quản lý Danh mục Kho Hàng (CRUD)
// ---------------------------------------------------------------------------

// 3.1 Danh sách kho
adminRouter.get('/kho-hang', async (c) => {
  try {
    const result = await c.env.DB.prepare(
      "SELECT id, ten, dia_chi, la_mac_dinh, trang_thai, ngay_tao, ngay_cap_nhat FROM kho_hang WHERE trang_thai != 'da_xoa' ORDER BY la_mac_dinh DESC, ngay_tao DESC"
    ).all();

    const items = (result.results || []).map((row: Record<string, unknown>) => ({
      ...row,
      la_mac_dinh: Boolean(row.la_mac_dinh)
    }));

    return successResponse(c, { items, total: items.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return errorResponse(c, 'DATABASE_ERROR', message, 500);
  }
});

// 3.2 Thêm kho mới
adminRouter.post('/kho-hang', zValidator('json', KhoHangCreateSchema), async (c) => {
  const { ten, dia_chi, la_mac_dinh } = c.req.valid('json');

  try {
    const id = `kho-${crypto.randomUUID()}`;
    const isDefaultInt = la_mac_dinh ? 1 : 0;

    // Nếu chọn làm mặc định -> bỏ cờ mặc định của các kho khác
    if (isDefaultInt === 1) {
      await c.env.DB.prepare("UPDATE kho_hang SET la_mac_dinh = 0 WHERE la_mac_dinh = 1").run();
    }

    await c.env.DB.prepare(
      `INSERT INTO kho_hang (id, ten, dia_chi, la_mac_dinh, trang_thai, ngay_tao, ngay_cap_nhat)
       VALUES (?, ?, ?, ?, 'hoat_dong', datetime('now'), datetime('now'))`
    )
      .bind(id, ten, dia_chi || '', isDefaultInt)
      .run();

    return successResponse(c, {
      id,
      ten,
      dia_chi: dia_chi || '',
      la_mac_dinh: Boolean(isDefaultInt),
      trang_thai: 'hoat_dong',
      message: 'Tạo kho hàng thành công'
    }, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return errorResponse(c, 'DATABASE_ERROR', message, 500);
  }
});

// 3.3 Cập nhật kho
adminRouter.put('/kho-hang/:id', zValidator('json', KhoHangUpdateSchema), async (c) => {
  const id = c.req.param('id');
  const { ten, dia_chi, la_mac_dinh, trang_thai } = c.req.valid('json');

  try {
    const existing = await c.env.DB.prepare(
      "SELECT id, ten, dia_chi, la_mac_dinh, trang_thai FROM kho_hang WHERE id = ? AND trang_thai != 'da_xoa'"
    ).bind(id).first<any>();

    if (!existing) {
      return errorResponse(c, 'NOT_FOUND', 'Kho hàng không tồn tại', 404);
    }

    // Nếu chuyển thành mặc định -> reset các kho khác
    if (la_mac_dinh === true) {
      await c.env.DB.prepare("UPDATE kho_hang SET la_mac_dinh = 0 WHERE id != ?").bind(id).run();
    }

    const setClauses: string[] = [];
    const params: (string | number)[] = [];

    if (ten !== undefined) {
      setClauses.push('ten = ?');
      params.push(ten);
    }
    if (dia_chi !== undefined) {
      setClauses.push('dia_chi = ?');
      params.push(dia_chi);
    }
    if (la_mac_dinh !== undefined) {
      setClauses.push('la_mac_dinh = ?');
      params.push(la_mac_dinh ? 1 : 0);
    }
    if (trang_thai !== undefined) {
      setClauses.push('trang_thai = ?');
      params.push(trang_thai);
    }

    setClauses.push("ngay_cap_nhat = datetime('now')");
    params.push(id);

    await c.env.DB.prepare(
      `UPDATE kho_hang SET ${setClauses.join(', ')} WHERE id = ?`
    ).bind(...params).run();

    const updated = await c.env.DB.prepare(
      "SELECT id, ten, dia_chi, la_mac_dinh, trang_thai, ngay_tao, ngay_cap_nhat FROM kho_hang WHERE id = ?"
    ).bind(id).first<any>();

    return successResponse(c, {
      ...updated,
      la_mac_dinh: Boolean(updated?.la_mac_dinh)
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return errorResponse(c, 'DATABASE_ERROR', message, 500);
  }
});

// 3.4 Đặt kho làm mặc định
adminRouter.put('/kho-hang/:id/set-default', async (c) => {
  const id = c.req.param('id');

  try {
    const existing = await c.env.DB.prepare(
      "SELECT id FROM kho_hang WHERE id = ? AND trang_thai != 'da_xoa'"
    ).bind(id).first();

    if (!existing) {
      return errorResponse(c, 'NOT_FOUND', 'Kho hàng không tồn tại', 404);
    }

    // Reset tất cả các kho khác
    await c.env.DB.prepare("UPDATE kho_hang SET la_mac_dinh = 0 WHERE id != ?").bind(id).run();
    // Bật cờ cho kho được chọn
    await c.env.DB.prepare("UPDATE kho_hang SET la_mac_dinh = 1, ngay_cap_nhat = datetime('now') WHERE id = ?").bind(id).run();

    return successResponse(c, { message: 'Đã đặt làm kho mặc định' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return errorResponse(c, 'DATABASE_ERROR', message, 500);
  }
});

// 3.5 Xóa mềm kho
adminRouter.delete('/kho-hang/:id', async (c) => {
  const id = c.req.param('id');

  try {
    const existing = await c.env.DB.prepare(
      "SELECT id, la_mac_dinh FROM kho_hang WHERE id = ? AND trang_thai != 'da_xoa'"
    ).bind(id).first<any>();

    if (!existing) {
      return errorResponse(c, 'NOT_FOUND', 'Kho hàng không tồn tại', 404);
    }

    await c.env.DB.prepare(
      "UPDATE kho_hang SET trang_thai = 'da_xoa', la_mac_dinh = 0, ngay_cap_nhat = datetime('now') WHERE id = ?"
    ).bind(id).run();

    return successResponse(c, { id, message: 'Đã xóa kho hàng' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return errorResponse(c, 'DATABASE_ERROR', message, 500);
  }
});
