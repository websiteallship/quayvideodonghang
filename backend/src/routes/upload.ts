import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { Env, JwtPayload } from '../types/env';
import { successResponse, errorResponse } from '../utils/response';
import { authMiddleware } from '../middleware/auth';
import { UploadInitSchema, UploadCompleteSchema, UploadErrorSchema, UploadCancelSchema } from '../types/schemas';
import { DriveService } from '../services/drive-service';
import { SheetService } from '../services/sheet-service';

export const uploadRouter = new Hono<{
  Bindings: Env;
  Variables: {
    user: JwtPayload;
  };
}>();

uploadRouter.post('/init', authMiddleware, zValidator('json', UploadInitSchema), async (c) => {
  const data = c.req.valid('json');
  const user = c.get('user');
  const userAgent = c.req.header('User-Agent') || '';
  const tacGia = data.ma_nhan_vien?.trim() || user.sub;

  try {
    // --- Dedup guard: chống tạo bản ghi trùng cùng mã đơn trong window 2 phút ---
    const DEDUP_WINDOW_MINUTES = 2;
    const existingDup = await c.env.DB.prepare(
      `SELECT id, trang_thai FROM bien_ban
       WHERE ma_van_don = ? AND loai_bien_ban = ? AND ma_nhan_vien = ?
         AND kich_thuoc_bytes = ?
         AND datetime(thoi_gian_tao) >= datetime('now', '-${DEDUP_WINDOW_MINUTES} minutes')
         AND trang_thai IN ('cho_upload', 'dang_upload', 'da_upload')
       ORDER BY thoi_gian_tao DESC
       LIMIT 1`
    )
      .bind(data.ma_van_don, data.loai_bien_ban, tacGia, data.kich_thuoc_bytes)
      .first<{ id: string; trang_thai: string }>();

    // Nếu đã có bản ghi trùng → dùng lại id cũ, không INSERT mới
    const bienBanId = existingDup ? existingDup.id : data.id;
    const isReused = !!existingDup;

    if (!isReused) {
      // Resolve kho_hang_id: client gửi lên hoặc fallback kho mặc định
      let khoHangId = data.kho_hang_id || null;
      if (!khoHangId) {
        const defaultKho = await c.env.DB.prepare(
          "SELECT id FROM kho_hang WHERE la_mac_dinh = 1 AND trang_thai = 'hoat_dong' LIMIT 1"
        ).first<{ id: string }>();
        khoHangId = defaultKho?.id || null;
      }

      // Batch: INSERT bien_ban + upload_log in single D1 roundtrip (perf optimization)
      await c.env.DB.batch([
        c.env.DB.prepare(
          `INSERT OR IGNORE INTO bien_ban (
            id, ma_van_don, don_vi_vc, loai_bien_ban, ma_nhan_vien,
            thiet_bi, user_agent, thoi_luong_video, kich_thuoc_bytes,
            mime_type, trang_thai, kho_hang_id, thoi_gian_tao
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'cho_upload', ?, datetime('now'))`
        ).bind(
          data.id,
          data.ma_van_don,
          data.don_vi_vc,
          data.loai_bien_ban,
          tacGia,
          data.thiet_bi,
          userAgent,
          data.thoi_luong_video,
          data.kich_thuoc_bytes,
          data.mime_type,
          khoHangId
        ),
        c.env.DB.prepare(
          'INSERT INTO upload_log (bien_ban_id, hanh_dong, chi_tiet) VALUES (?, ?, ?)'
        ).bind(data.id, 'init', `Size: ${data.kich_thuoc_bytes} bytes (Tac gia: ${tacGia}, Nguoi tai: ${user.sub}, Kho: ${khoHangId || 'N/A'})`)
      ]);
    } else {
      // Ghi log dedup để debug
      await c.env.DB.prepare(
        'INSERT INTO upload_log (bien_ban_id, hanh_dong, chi_tiet) VALUES (?, ?, ?)'
      ).bind(
        bienBanId,
        'init',
        `DEDUP: Reused existing id=${bienBanId} (new_id=${data.id}, status=${existingDup.trang_thai}). Tac gia: ${tacGia}`
      ).run();
    }

    const loaiPrefix = data.loai_bien_ban === 'dong_goi' ? 'DongGoi' : 'KhuiHang';
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15);
    const fileName = `${loaiPrefix}_${data.ma_van_don}_${data.don_vi_vc}_${tacGia}_${timestamp}.webm`;

    let uploadUrl: string;
    
    let oauth2Creds;
    if (c.env.GOOGLE_CLIENT_ID && c.env.GOOGLE_CLIENT_SECRET && c.env.GOOGLE_REFRESH_TOKEN) {
      oauth2Creds = {
        client_id: c.env.GOOGLE_CLIENT_ID,
        client_secret: c.env.GOOGLE_CLIENT_SECRET,
        refresh_token: c.env.GOOGLE_REFRESH_TOKEN
      };
    }
    
    const driveService = new DriveService(c.env.GOOGLE_SERVICE_ACCOUNT_JSON, oauth2Creds);

    if (driveService.isConfigured() && c.env.DRIVE_FOLDER_ID) {
      // Production: real Google Drive resumable upload
      const folderId = await driveService.findOrCreateDateFolder(c.env.DRIVE_FOLDER_ID);
      const originHeader = c.req.header('Origin');
      const refererHeader = c.req.header('Referer');
      let clientOrigin = originHeader || '';
      if (!clientOrigin && refererHeader) {
        try {
          clientOrigin = new URL(refererHeader).origin;
        } catch {}
      }
      if (!clientOrigin && c.env.ALLOWED_ORIGINS) {
        clientOrigin = c.env.ALLOWED_ORIGINS.split(',')[0].trim();
      }

      const session = await driveService.initResumableUpload(
        fileName,
        data.mime_type,
        folderId,
        data.kich_thuoc_bytes,
        clientOrigin
      );
      uploadUrl = session.uploadUrl;

      await c.env.DB.prepare(
        'INSERT INTO upload_log (bien_ban_id, hanh_dong, chi_tiet) VALUES (?, ?, ?)'
      )
        .bind(bienBanId, 'init', `Drive session: Folder ${folderId}, File ${fileName}${isReused ? ' (DEDUP reused)' : ''}`)
        .run();
    } else {
      // Dev fallback: mock URL
      uploadUrl = `https://mock-drive-upload.googleapis.com/upload/${bienBanId}`;
    }

    return successResponse(c, {
      bien_ban_id: bienBanId,
      resumable_upload_url: uploadUrl,
      target_file_name: fileName,
      chunk_size: parseInt(c.env.UPLOAD_CHUNK_SIZE || '5242880', 10)
    }, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return errorResponse(c, 'DATABASE_ERROR', message, 500);
  }
});

uploadRouter.post('/complete', authMiddleware, zValidator('json', UploadCompleteSchema), async (c) => {
  const { id, drive_file_id, drive_file_name } = c.req.valid('json');
  const user = c.get('user');

  try {
    // Authenticated worker completing upload session for the record
    const result = await c.env.DB.prepare(
      `UPDATE bien_ban
       SET trang_thai = 'da_upload',
           drive_file_id = ?,
           drive_file_name = ?,
           thoi_gian_upload = datetime('now'),
           ngay_cap_nhat = datetime('now')
       WHERE id = ?`
    )
      .bind(drive_file_id, drive_file_name, id)
      .run();

    if (!result.meta.changes) {
      return errorResponse(c, 'NOT_FOUND', 'Biên bản không tồn tại', 404);
    }

    await c.env.DB.prepare(
      'INSERT INTO upload_log (bien_ban_id, hanh_dong, chi_tiet) VALUES (?, ?, ?)'
    )
      .bind(id, 'complete', `Drive File ID: ${drive_file_id} (Uploaded by: ${user.sub})`)
      .run();

    // Append row to Google Sheet (non-blocking — failure doesn't fail the request)
    if ((c.env.GOOGLE_SERVICE_ACCOUNT_JSON || c.env.GOOGLE_REFRESH_TOKEN) && c.env.GOOGLE_SHEET_ID) {
      try {
        const bienBan = await c.env.DB.prepare(
          `SELECT b.*, datetime(b.thoi_gian_tao, '+7 hours') as thoi_gian_tao_vn, n.ten as ten_nhan_vien
           FROM bien_ban b
           LEFT JOIN nhan_vien n ON b.ma_nhan_vien = n.ma
           WHERE b.id = ?`
        ).bind(id).first() as Record<string, unknown> | null;

        if (bienBan) {
          let oauth2Creds;
          if (c.env.GOOGLE_CLIENT_ID && c.env.GOOGLE_CLIENT_SECRET && c.env.GOOGLE_REFRESH_TOKEN) {
            oauth2Creds = {
              client_id: c.env.GOOGLE_CLIENT_ID,
              client_secret: c.env.GOOGLE_CLIENT_SECRET,
              refresh_token: c.env.GOOGLE_REFRESH_TOKEN
            };
          }
          const driveService = new DriveService(c.env.GOOGLE_SERVICE_ACCOUNT_JSON, oauth2Creds);
          const sheetService = new SheetService(driveService, c.env.GOOGLE_SHEET_ID);

          // Ngăn chặn ghi dữ liệu rác từ quá trình chạy integration test lên Google Sheet thật
          if (drive_file_id !== 'drive_file_abc123') {
            const tenNV = String(bienBan.ten_nhan_vien || bienBan.ma_nhan_vien || '');
            await sheetService.appendRow({
              id,
              ma_van_don: String(bienBan.ma_van_don || ''),
              don_vi_vc: String(bienBan.don_vi_vc || ''),
              loai_bien_ban: String(bienBan.loai_bien_ban || ''),
              ma_nhan_vien: tenNV,
              thoi_gian_tao: String(bienBan.thoi_gian_tao_vn || ''),
              thoi_luong_video: Number(bienBan.thoi_luong_video || 0),
              kich_thuoc_bytes: Number(bienBan.kich_thuoc_bytes || 0),
              drive_file_id,
              drive_file_name: drive_file_name || ''
            });

            await c.env.DB.prepare(
              'INSERT INTO upload_log (bien_ban_id, hanh_dong, chi_tiet) VALUES (?, ?, ?)'
            )
              .bind(id, 'complete', `Sheet appended: ${c.env.GOOGLE_SHEET_ID}`)
              .run();
          }
        }
      } catch (sheetErr) {
        console.error('[SHEET_APPEND_ERROR]', sheetErr);
        await c.env.DB.prepare(
          'INSERT INTO upload_log (bien_ban_id, hanh_dong, chi_tiet) VALUES (?, ?, ?)'
        )
          .bind(id, 'error', sheetErr instanceof Error ? `Sheet error: ${sheetErr.message}` : 'Unknown sheet error')
          .run();
      }
    }

    return successResponse(c, {
      bien_ban_id: id,
      trang_thai: 'da_upload'
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return errorResponse(c, 'DATABASE_ERROR', message, 500);
  }
});

uploadRouter.post('/error', authMiddleware, zValidator('json', UploadErrorSchema), async (c) => {
  const { id, loi_message } = c.req.valid('json');
  const user = c.get('user');

  try {
    await c.env.DB.prepare(
      `UPDATE bien_ban
       SET trang_thai = 'loi',
           loi_message = ?,
           ngay_cap_nhat = datetime('now')
       WHERE id = ?`
    )
      .bind(loi_message, id)
      .run();

    await c.env.DB.prepare(
      'INSERT INTO upload_log (bien_ban_id, hanh_dong, chi_tiet) VALUES (?, ?, ?)'
    )
      .bind(id, 'error', `${loi_message} (Reported by: ${user.sub})`)
      .run();

    return successResponse(c, { message: 'Đã ghi nhận lỗi upload' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return errorResponse(c, 'DATABASE_ERROR', message, 500);
  }
});

uploadRouter.post('/cancel', authMiddleware, zValidator('json', UploadCancelSchema), async (c) => {
  const { id } = c.req.valid('json');
  const user = c.get('user');

  try {
    const result = await c.env.DB.prepare(
      `UPDATE bien_ban
       SET trang_thai = 'loi',
           loi_message = 'USER_CANCELLED',
           ngay_cap_nhat = datetime('now')
       WHERE id = ?`
    )
      .bind(id)
      .run();

    if (!result.meta.changes) {
      return errorResponse(c, 'NOT_FOUND', 'Biên bản không tồn tại', 404);
    }

    await c.env.DB.prepare(
      'INSERT INTO upload_log (bien_ban_id, hanh_dong, chi_tiet) VALUES (?, ?, ?)'
    )
      .bind(id, 'error', `USER_CANCELLED (By: ${user.sub})`)
      .run();

    return successResponse(c, {
      bien_ban_id: id,
      trang_thai: 'loi',
      message: 'Đã hủy tải lên thành công'
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return errorResponse(c, 'DATABASE_ERROR', message, 500);
  }
});
