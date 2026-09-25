import { Env } from '../types/env';
import { DriveService } from './drive-service';
import { SheetService, SheetRetentionUpdate } from './sheet-service';

export interface RetentionConfig {
  archiveDays: number;
  deleteDays: number;
}

export interface RetentionStatus {
  retention_archive_days: number;
  retention_delete_days: number;
  retention_thang_deprecated?: number;
  pending_archive_count: number;
  pending_delete_count: number;
  total_archived: number;
  total_deleted: number;
  last_run: string | null;
}

export interface RetentionRunResult {
  archived_count: number;
  deleted_count: number;
  sheet_updated_count: number;
  errors: string[];
  execution_time_ms: number;
}

/**
 * Đọc cấu hình lưu trữ từ bảng cau_hinh.
 * Mặc định: Archive = 30 ngày, Delete = 60 ngày.
 * Hỗ trợ fallback từ khóa cũ 'retention_thang' nếu chưa cấu hình key mới.
 */
export async function getRetentionConfig(db: D1Database): Promise<RetentionConfig> {
  const rows = await db
    .prepare("SELECT khoa, gia_tri FROM cau_hinh WHERE khoa IN ('retention_archive_days', 'retention_delete_days', 'retention_thang')")
    .all<{ khoa: string; gia_tri: string }>();

  const configMap = new Map((rows.results || []).map(r => [r.khoa, r.gia_tri]));

  const rawArchive = configMap.get('retention_archive_days');
  const rawDelete = configMap.get('retention_delete_days');
  const rawThang = configMap.get('retention_thang');

  let archiveDays = 30;
  let deleteDays = 60;

  if (rawArchive) {
    const parsed = parseInt(rawArchive, 10);
    if (!isNaN(parsed) && parsed > 0) archiveDays = parsed;
  } else if (rawThang) {
    // Fallback từ retention_thang cũ (1 tháng ~ 30 ngày)
    const parsedThang = parseInt(rawThang, 10);
    if (!isNaN(parsedThang) && parsedThang > 0) {
      archiveDays = parsedThang * 30;
      deleteDays = parsedThang * 30 + 30;
    }
  }

  if (rawDelete) {
    const parsed = parseInt(rawDelete, 10);
    if (!isNaN(parsed) && parsed > 0) deleteDays = parsed;
  }

  return { archiveDays, deleteDays };
}

/**
 * Lấy trạng thái tổng quan về video chờ dọn dẹp và lịch sử dọn dẹp
 */
export async function getRetentionStatus(env: Env): Promise<RetentionStatus> {
  const config = await getRetentionConfig(env.DB);

  // 1. Số video chờ Archive: đã upload và quá archiveDays
  const pendingArchiveRow = await env.DB
    .prepare(
      `SELECT COUNT(*) as cnt FROM bien_ban
       WHERE trang_thai = 'da_upload'
         AND datetime(thoi_gian_tao) <= datetime('now', '-' || ? || ' days')`
    )
    .bind(config.archiveDays)
    .first<{ cnt: number }>();

  // 2. Số video chờ Delete: đã upload hoặc đã archive, và quá deleteDays
  const pendingDeleteRow = await env.DB
    .prepare(
      `SELECT COUNT(*) as cnt FROM bien_ban
       WHERE trang_thai IN ('da_upload', 'da_luu_tru')
         AND datetime(thoi_gian_tao) <= datetime('now', '-' || ? || ' days')`
    )
    .bind(config.deleteDays)
    .first<{ cnt: number }>();

  // 3. Tổng số video hiện đang ở trạng thái da_luu_tru
  const totalArchivedRow = await env.DB
    .prepare("SELECT COUNT(*) as cnt FROM bien_ban WHERE trang_thai = 'da_luu_tru'")
    .first<{ cnt: number }>();

  // 4. Tổng số video đã xoá
  const totalDeletedRow = await env.DB
    .prepare("SELECT COUNT(*) as cnt FROM bien_ban WHERE trang_thai = 'da_xoa'")
    .first<{ cnt: number }>();

  // 5. Thời điểm chạy gần nhất
  const lastRunRow = await env.DB
    .prepare("SELECT gia_tri FROM cau_hinh WHERE khoa = 'retention_last_run'")
    .first<{ gia_tri: string }>();

  // 6. Đọc key cũ retention_thang nếu có
  const oldThangRow = await env.DB
    .prepare("SELECT gia_tri FROM cau_hinh WHERE khoa = 'retention_thang'")
    .first<{ gia_tri: string }>();

  return {
    retention_archive_days: config.archiveDays,
    retention_delete_days: config.deleteDays,
    retention_thang_deprecated: oldThangRow ? parseInt(oldThangRow.gia_tri, 10) : undefined,
    pending_archive_count: pendingArchiveRow?.cnt || 0,
    pending_delete_count: pendingDeleteRow?.cnt || 0,
    total_archived: totalArchivedRow?.cnt || 0,
    total_deleted: totalDeletedRow?.cnt || 0,
    last_run: lastRunRow?.gia_tri || null
  };
}

/**
 * Khởi tạo Google Drive và Sheet Services dựa vào env và cau_hinh
 */
export async function getDriveAndSheetServices(env: Env): Promise<{
  driveService: DriveService | null;
  sheetService: SheetService | null;
}> {
  let oauth2Creds;
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REFRESH_TOKEN) {
    oauth2Creds = {
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: env.GOOGLE_REFRESH_TOKEN
    };
  }

  const hasCreds = Boolean(env.GOOGLE_SERVICE_ACCOUNT_JSON || oauth2Creds);
  if (!hasCreds) {
    return { driveService: null, sheetService: null };
  }

  const driveService = new DriveService(env.GOOGLE_SERVICE_ACCOUNT_JSON, oauth2Creds);

  // Lấy sheet_id từ env hoặc bảng cau_hinh
  let targetSheetId: string | undefined = env.GOOGLE_SHEET_ID;
  if (!targetSheetId) {
    const sheetConfig = await env.DB
      .prepare("SELECT gia_tri FROM cau_hinh WHERE khoa = 'sheet_id'")
      .first<{ gia_tri: string }>();
    targetSheetId = sheetConfig?.gia_tri;
  }

  const sheetService = targetSheetId ? new SheetService(driveService, targetSheetId) : null;
  return { driveService, sheetService };
}

/**
 * Thực thi quy trình dọn dẹp & lưu trữ video:
 * 1. Xoá (Delete): Tìm video quá deleteDays -> Xoá file trên Google Drive, cập nhật trạng thái 'da_xoa', xoá link Sheet.
 * 2. Lưu trữ (Archive): Tìm video quá archiveDays (chưa đến deleteDays) -> Giữ nguyên file trên Drive, đổi trạng thái 'da_luu_tru', cập nhật Sheet.
 * 3. Đồng bộ Google Sheet theo lô (BatchUpdate).
 * 4. Cập nhật retention_last_run.
 */
export async function runRetentionCleanup(
  env: Env,
  batchLimit: number = 50
): Promise<RetentionRunResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let archivedCount = 0;
  let deletedCount = 0;
  const sheetUpdates: SheetRetentionUpdate[] = [];

  const config = await getRetentionConfig(env.DB);
  const { driveService, sheetService } = await getDriveAndSheetServices(env);

  // -------------------------------------------------------------------------
  // Giai đoạn 1: Xoá vĩnh viễn (Delete) các video quá deleteDays
  // -------------------------------------------------------------------------
  if (config.deleteDays > 0) {
    try {
      const deleteCandidates = await env.DB
        .prepare(
          `SELECT id, ma_van_don, drive_file_id, thoi_gian_tao
           FROM bien_ban
           WHERE trang_thai IN ('da_upload', 'da_luu_tru')
             AND datetime(thoi_gian_tao) <= datetime('now', '-' || ? || ' days')
           ORDER BY thoi_gian_tao ASC
           LIMIT ?`
        )
        .bind(config.deleteDays, batchLimit)
        .all<{ id: string; ma_van_don: string; drive_file_id: string | null; thoi_gian_tao: string }>();

      const itemsToDelete = deleteCandidates.results || [];

      for (const item of itemsToDelete) {
        let driveDeletedOk = true;

        // Xoá file trên Google Drive nếu có ID và có driveService
        if (item.drive_file_id && driveService) {
          try {
            await driveService.deleteFile(item.drive_file_id);
          } catch (err) {
            driveDeletedOk = false;
            const msg = err instanceof Error ? err.message : String(err);
            errors.push(`Lỗi xoá Drive [${item.ma_van_don} / ${item.drive_file_id}]: ${msg}`);
          }
        }

        // Nếu Drive xoá thành công (hoặc không có driveService / fileId rỗng)
        if (driveDeletedOk) {
          try {
            await env.DB
              .prepare(
                `UPDATE bien_ban
                 SET trang_thai = 'da_xoa',
                     drive_file_id = NULL,
                     ngay_cap_nhat = datetime('now')
                 WHERE id = ?`
              )
              .bind(item.id)
              .run();

            await env.DB
              .prepare(
                'INSERT INTO upload_log (bien_ban_id, hanh_dong, chi_tiet) VALUES (?, ?, ?)'
              )
              .bind(item.id, 'complete', 'Retention: Video deleted from Drive and status updated to da_xoa')
              .run();

            sheetUpdates.push({ bienBanId: item.id, action: 'delete' });
            deletedCount++;
          } catch (dbErr) {
            const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
            errors.push(`Lỗi cập nhật DB xóa [${item.id}]: ${msg}`);
          }
        }
      }
    } catch (phase1Err) {
      const msg = phase1Err instanceof Error ? phase1Err.message : String(phase1Err);
      errors.push(`Lỗi truy vấn xóa vòng đời: ${msg}`);
    }
  }

  // -------------------------------------------------------------------------
  // Giai đoạn 2: Lưu trữ (Archive) các video quá archiveDays (nhưng chưa bị xoá)
  // -------------------------------------------------------------------------
  if (config.archiveDays > 0) {
    try {
      const remainingLimit = Math.max(0, batchLimit - deletedCount);
      if (remainingLimit > 0) {
        const archiveCandidates = await env.DB
          .prepare(
            `SELECT id, ma_van_don, thoi_gian_tao
             FROM bien_ban
             WHERE trang_thai = 'da_upload'
               AND datetime(thoi_gian_tao) <= datetime('now', '-' || ? || ' days')
             ORDER BY thoi_gian_tao ASC
             LIMIT ?`
          )
          .bind(config.archiveDays, remainingLimit)
          .all<{ id: string; ma_van_don: string; thoi_gian_tao: string }>();

        const itemsToArchive = archiveCandidates.results || [];

        for (const item of itemsToArchive) {
          try {
            // File trên Google Drive được giữ nguyên vẹn
            await env.DB
              .prepare(
                `UPDATE bien_ban
                 SET trang_thai = 'da_luu_tru',
                     ngay_cap_nhat = datetime('now')
                 WHERE id = ?`
              )
              .bind(item.id)
              .run();

            await env.DB
              .prepare(
                'INSERT INTO upload_log (bien_ban_id, hanh_dong, chi_tiet) VALUES (?, ?, ?)'
              )
              .bind(item.id, 'complete', 'Retention: Status updated to da_luu_tru (Drive file retained)')
              .run();

            sheetUpdates.push({ bienBanId: item.id, action: 'archive' });
            archivedCount++;
          } catch (dbErr) {
            const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
            errors.push(`Lỗi cập nhật DB lưu trữ [${item.id}]: ${msg}`);
          }
        }
      }
    } catch (phase2Err) {
      const msg = phase2Err instanceof Error ? phase2Err.message : String(phase2Err);
      errors.push(`Lỗi truy vấn lưu trữ vòng đời: ${msg}`);
    }
  }

  // -------------------------------------------------------------------------
  // Giai đoạn 3: Cập nhật Google Sheet theo danh sách đã xử lý
  // -------------------------------------------------------------------------
  let sheetUpdatedCount = 0;
  if (sheetUpdates.length > 0 && sheetService) {
    try {
      const sheetResult = await sheetService.updateRetentionStatuses(sheetUpdates);
      sheetUpdatedCount = sheetResult.updatedCount;
      if (sheetResult.errors.length > 0) {
        errors.push(...sheetResult.errors);
      }
    } catch (sheetErr) {
      const msg = sheetErr instanceof Error ? sheetErr.message : String(sheetErr);
      errors.push(`Lỗi đồng bộ Google Sheet: ${msg}`);
    }
  }

  // -------------------------------------------------------------------------
  // Giai đoạn 4: Cập nhật retention_last_run vào cau_hinh
  // -------------------------------------------------------------------------
  try {
    await env.DB
      .prepare(
        `INSERT INTO cau_hinh (khoa, gia_tri, ngay_cap_nhat)
         VALUES ('retention_last_run', datetime('now'), datetime('now'))
         ON CONFLICT(khoa) DO UPDATE SET gia_tri = excluded.gia_tri, ngay_cap_nhat = datetime('now')`
      )
      .run();
  } catch (lastRunErr) {
    console.warn('[RETENTION] Không thể cập nhật retention_last_run:', lastRunErr);
  }

  return {
    archived_count: archivedCount,
    deleted_count: deletedCount,
    sheet_updated_count: sheetUpdatedCount,
    errors,
    execution_time_ms: Date.now() - startTime
  };
}
