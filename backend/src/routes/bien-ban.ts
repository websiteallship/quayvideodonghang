import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { Env, JwtPayload } from '../types/env';
import { successResponse, errorResponse } from '../utils/response';
import { authMiddleware } from '../middleware/auth';
import { DriveService } from '../services/drive-service';
import {
  CheckMaVanDonParamSchema,
  CheckMaVanDonQuerySchema,
  BienBanQuerySchema,
  BienBanIdParamSchema
} from '../types/schemas';

export const bienBanRouter = new Hono<{
  Bindings: Env;
  Variables: {
    user: JwtPayload;
  };
}>();

// Kiểm tra mã vận đơn đã quét trước đó chưa (phát hiện quét trùng)
// Tham chiếu: docs/06-api-backend-specification.md mục 3.3, docs/roadmap.md Step 1.3
bienBanRouter.get(
  '/check/:ma_van_don',
  authMiddleware,
  zValidator('param', CheckMaVanDonParamSchema, (result, c) => {
    if (!result.success) {
      return errorResponse(
        c,
        'INVALID_MA_VAN_DON',
        result.error.errors[0]?.message || 'Mã vận đơn không hợp lệ',
        400
      );
    }
  }),
  zValidator('query', CheckMaVanDonQuerySchema, (result, c) => {
    if (!result.success) {
      return errorResponse(
        c,
        'INVALID_QUERY',
        result.error.errors[0]?.message || 'Tham số truy vấn không hợp lệ',
        400
      );
    }
  }),
  async (c) => {
    const ma_van_don = c.req.param('ma_van_don');
    const { loai_bien_ban } = c.req.valid('query');

    try {
      let so_luong_video = 0;
      let existing: any = null;

      if (loai_bien_ban) {
        // Đếm tổng số video đã quay cho mã này và loại biên bản này
        const countResult = await c.env.DB.prepare(
          'SELECT COUNT(*) as total FROM bien_ban WHERE ma_van_don = ? AND loai_bien_ban = ?'
        )
          .bind(ma_van_don, loai_bien_ban)
          .first<{ total: number }>();
        so_luong_video = countResult?.total || 0;

        // Lấy thông tin video gần nhất
        existing = await c.env.DB.prepare(
          'SELECT id, ma_van_don, don_vi_vc, loai_bien_ban, ma_nhan_vien, thoi_gian_tao, trang_thai FROM bien_ban WHERE ma_van_don = ? AND loai_bien_ban = ? ORDER BY thoi_gian_tao DESC LIMIT 1'
        )
          .bind(ma_van_don, loai_bien_ban)
          .first();
      } else {
        // Fallback for older clients that don't send loai_bien_ban
        const countResult = await c.env.DB.prepare(
          'SELECT COUNT(*) as total FROM bien_ban WHERE ma_van_don = ?'
        )
          .bind(ma_van_don)
          .first<{ total: number }>();
        so_luong_video = countResult?.total || 0;

        existing = await c.env.DB.prepare(
          'SELECT id, ma_van_don, don_vi_vc, loai_bien_ban, ma_nhan_vien, thoi_gian_tao, trang_thai FROM bien_ban WHERE ma_van_don = ? ORDER BY thoi_gian_tao DESC LIMIT 1'
        )
          .bind(ma_van_don)
          .first();
      }

      const da_co_video = so_luong_video > 0;

      return successResponse(c, {
        da_co_video,
        so_luong_video,
        video_gan_nhat: existing
          ? {
              id: existing.id,
              loai_bien_ban: existing.loai_bien_ban,
              thoi_gian_tao: existing.thoi_gian_tao,
              ma_nhan_vien: existing.ma_nhan_vien
            }
          : null,
        // Tương thích ngược
        exists: da_co_video,
        record: existing || null
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Database error';
      return errorResponse(c, 'DATABASE_ERROR', message, 500);
    }
  }
);

// Lấy danh sách biên bản có phân trang và bộ lọc đầy đủ
// Access control: nhan_vien chỉ xem của mình, admin xem tất cả hoặc lọc theo ma_nhan_vien
bienBanRouter.get(
  '/',
  authMiddleware,
  zValidator('query', BienBanQuerySchema, (result, c) => {
    if (!result.success) {
      return errorResponse(
        c,
        'INVALID_QUERY',
        result.error.errors[0]?.message || 'Tham số truy vấn không hợp lệ',
        400
      );
    }
  }),
  async (c) => {
    const {
      page,
      limit,
      status,
      trang_thai,
      search,
      ma_van_don,
      ngay_tu,
      ngay_den,
      don_vi_vc,
      loai_bien_ban,
      ma_nhan_vien
    } = c.req.valid('query');
    const offset = (page - 1) * limit;
    const user = c.get('user');
    const isAdmin = user?.vai_tro === 'admin';

    try {
      let whereClause = 'WHERE 1=1';
      const params: (string | number)[] = [];

      // 1. Phân quyền truy cập (Access Control)
      if (!isAdmin) {
        whereClause += ' AND b.ma_nhan_vien = ?';
        params.push(user.sub);
      } else if (ma_nhan_vien) {
        whereClause += ' AND b.ma_nhan_vien = ?';
        params.push(ma_nhan_vien.toUpperCase());
      }

      // 2. Lọc trạng thái (hỗ trợ cả status và trang_thai)
      const targetStatus = status || trang_thai;
      if (targetStatus) {
        whereClause += ' AND b.trang_thai = ?';
        params.push(targetStatus);
      }

      // 3. Tìm kiếm theo mã vận đơn (hỗ trợ search và ma_van_don)
      const searchCode = search || ma_van_don;
      if (searchCode) {
        const escapedSearch = searchCode.replace(/[%_\\]/g, '\\$&');
        whereClause += " AND b.ma_van_don LIKE ? ESCAPE '\\'";
        params.push(`%${escapedSearch}%`);
      }

      // 4. Lọc đơn vị vận chuyển
      if (don_vi_vc) {
        whereClause += ' AND b.don_vi_vc = ?';
        params.push(don_vi_vc);
      }

      // 5. Lọc loại biên bản (dong_goi / khui_hang)
      if (loai_bien_ban) {
        whereClause += ' AND b.loai_bien_ban = ?';
        params.push(loai_bien_ban);
      }

      // 6. Lọc khoảng ngày (theo chuẩn giờ Hồ Chí Minh UTC+7)
      if (ngay_tu) {
        whereClause += " AND DATE(b.thoi_gian_tao, '+7 hours') >= ?";
        params.push(ngay_tu);
      }
      if (ngay_den) {
        whereClause += " AND DATE(b.thoi_gian_tao, '+7 hours') <= ?";
        params.push(ngay_den);
      }

      const countResult = await c.env.DB.prepare(
        `SELECT COUNT(*) as total FROM bien_ban b ${whereClause}`
      )
        .bind(...params)
        .first<{ total: number }>();

      const total = countResult?.total || 0;

      const items = await c.env.DB.prepare(
        `SELECT b.*, n.ten as ten_nhan_vien
         FROM bien_ban b
         LEFT JOIN nhan_vien n ON b.ma_nhan_vien = n.ma
         ${whereClause}
         ORDER BY b.thoi_gian_tao DESC
         LIMIT ? OFFSET ?`
      )
        .bind(...params, limit, offset)
        .all();

      return successResponse(c, {
        items: items.results,
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit)
        },
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit)
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Database error';
      return errorResponse(c, 'DATABASE_ERROR', message, 500);
    }
  }
);

// Lấy chi tiết 1 biên bản
bienBanRouter.get(
  '/:id',
  authMiddleware,
  zValidator('param', BienBanIdParamSchema, (result, c) => {
    if (!result.success) {
      return errorResponse(
        c,
        'INVALID_ID',
        result.error.errors[0]?.message || 'ID biên bản không hợp lệ',
        400
      );
    }
  }),
  async (c) => {
    const { id } = c.req.valid('param');
    const user = c.get('user');

    try {
      const record = await c.env.DB.prepare(
        `SELECT b.*, n.ten as ten_nhan_vien
         FROM bien_ban b
         LEFT JOIN nhan_vien n ON b.ma_nhan_vien = n.ma
         WHERE b.id = ?`
      )
        .bind(id)
        .first<{
          id: string;
          ma_nhan_vien: string;
          [key: string]: unknown;
        }>();

      if (!record) {
        return errorResponse(c, 'NOT_FOUND', 'Không tìm thấy biên bản', 404);
      }

      // Access control: Nhân viên chỉ được xem chi tiết biên bản của chính mình
      if (user.vai_tro !== 'admin' && record.ma_nhan_vien !== user.sub) {
        return errorResponse(c, 'FORBIDDEN', 'Bạn không có quyền xem biên bản này', 403);
      }

      return successResponse(c, record);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Database error';
      return errorResponse(c, 'DATABASE_ERROR', message, 500);
    }
  }
);

// Lấy URL xem video tạm thời từ Google Drive
bienBanRouter.get(
  '/:id/view-url',
  authMiddleware,
  zValidator('param', BienBanIdParamSchema, (result, c) => {
    if (!result.success) {
      return errorResponse(
        c,
        'INVALID_ID',
        result.error.errors[0]?.message || 'ID biên bản không hợp lệ',
        400
      );
    }
  }),
  async (c) => {
    const { id } = c.req.valid('param');
    const user = c.get('user');

    try {
      const record = await c.env.DB.prepare(
        'SELECT id, ma_nhan_vien, drive_file_id, trang_thai FROM bien_ban WHERE id = ?'
      )
        .bind(id)
        .first<{
          id: string;
          ma_nhan_vien: string;
          drive_file_id: string | null;
          trang_thai: string;
        }>();

      if (!record) {
        return errorResponse(c, 'NOT_FOUND', 'Không tìm thấy biên bản', 404);
      }

      // Access control
      if (user.vai_tro !== 'admin' && record.ma_nhan_vien !== user.sub) {
        return errorResponse(c, 'FORBIDDEN', 'Bạn không có quyền xem video này', 403);
      }

      if (!record.drive_file_id) {
        return errorResponse(
          c,
          'NO_VIDEO_FILE',
          'Biên bản chưa có video trên Google Drive hoặc chưa tải lên hoàn tất',
          400
        );
      }

      const driveService = new DriveService(c.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      const viewUrl = await driveService.getFileViewUrl(record.drive_file_id);

      return successResponse(c, {
        view_url: viewUrl,
        stream_url: `/api/bien-ban/${id}/stream`,
        expires_in: 300,
        drive_file_id: record.drive_file_id
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Database error';
      return errorResponse(c, 'DATABASE_ERROR', message, 500);
    }
  }
);

// Stream video trực tiếp qua backend proxy (native <video> tag thay vì iframe)
// Hỗ trợ Range headers để <video> seek được
// Auth: Bearer header HOẶC ?token= query param (vì <video src> không gửi được header)
bienBanRouter.get(
  '/:id/stream',
  zValidator('param', BienBanIdParamSchema, (result, c) => {
    if (!result.success) {
      return errorResponse(
        c,
        'INVALID_ID',
        result.error.errors[0]?.message || 'ID biên bản không hợp lệ',
        400
      );
    }
  }),
  async (c) => {
    // Custom auth: header hoặc query param
    const authHeader = c.req.header('Authorization');
    const queryToken = c.req.query('token');
    let tokenStr = '';

    if (authHeader?.startsWith('Bearer ')) {
      tokenStr = authHeader.slice(7).trim();
    } else if (queryToken) {
      tokenStr = queryToken.trim();
    }

    if (!tokenStr) {
      return errorResponse(c, 'UNAUTHORIZED', 'Thiếu token xác thực', 401);
    }

    const jwtService = new (await import('../services/jwt-service')).JwtService(c.env.JWT_SECRET);
    const user = await jwtService.verify(tokenStr);
    if (!user) {
      return errorResponse(c, 'TOKEN_INVALID', 'Token không hợp lệ hoặc đã hết hạn', 401);
    }

    const { id } = c.req.valid('param');

    try {
      const record = await c.env.DB.prepare(
        'SELECT id, ma_nhan_vien, drive_file_id, trang_thai FROM bien_ban WHERE id = ?'
      )
        .bind(id)
        .first<{
          id: string;
          ma_nhan_vien: string;
          drive_file_id: string | null;
          trang_thai: string;
        }>();

      if (!record) {
        return errorResponse(c, 'NOT_FOUND', 'Không tìm thấy biên bản', 404);
      }

      if (user.vai_tro !== 'admin' && record.ma_nhan_vien !== user.sub) {
        return errorResponse(c, 'FORBIDDEN', 'Bạn không có quyền xem video này', 403);
      }

      if (!record.drive_file_id) {
        return errorResponse(c, 'NO_VIDEO_FILE', 'Biên bản chưa có video trên Google Drive', 400);
      }

      let oauth2Creds;
      if (c.env.GOOGLE_CLIENT_ID && c.env.GOOGLE_CLIENT_SECRET && c.env.GOOGLE_REFRESH_TOKEN) {
        oauth2Creds = {
          client_id: c.env.GOOGLE_CLIENT_ID,
          client_secret: c.env.GOOGLE_CLIENT_SECRET,
          refresh_token: c.env.GOOGLE_REFRESH_TOKEN
        };
      }

      const driveService = new DriveService(c.env.GOOGLE_SERVICE_ACCOUNT_JSON, oauth2Creds);
      const rangeHeader = c.req.header('Range') || null;

      return await driveService.streamFile(record.drive_file_id, rangeHeader);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Stream error';
      return errorResponse(c, 'STREAM_ERROR', message, 500);
    }
  }
);
