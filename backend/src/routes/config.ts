import { Hono, Context } from 'hono';
import { Env } from '../types/env';
import { successResponse } from '../utils/response';

export const configRouter = new Hono<{
  Bindings: Env;
}>();

const handleGetPublicConfig = async (c: Context<{ Bindings: Env }>) => {
  let configs: Record<string, string> = {};
  try {
    const rows = await c.env.DB.prepare('SELECT khoa, gia_tri FROM cau_hinh').all<{ khoa: string; gia_tri: string }>();
    configs = Object.fromEntries((rows.results || []).map((r) => [r.khoa, r.gia_tri]));
  } catch {
    // Fallback if cau_hinh table not yet initialized or query fails
  }

  // Built-in carrier IDs — luôn có trong response, không bao giờ mất
  const BUILT_IN_IDS = ['GHN', 'ViettelPost', 'BestExpress', 'NhatTin', 'LazadaExpress', 'ShopeeXpress', 'J&T', 'VNPost', 'GHTK', 'Khac'];

  // Danh sách từ DB (có thể chứa cả built-in IDs lẫn admin-added entries dạng "id:label")
  const dbList = configs.don_vi_vc_danh_sach
    ? configs.don_vi_vc_danh_sach.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  // Merge: built-in IDs + admin-added entries (dedup)
  const seenIds = new Set<string>();
  const donViVcList: string[] = [];

  // 1. Built-in IDs trước
  for (const id of BUILT_IN_IDS) {
    donViVcList.push(id);
    seenIds.add(id);
  }

  // 2. Admin-added entries (skip nếu id trùng built-in)
  for (const entry of dbList) {
    const colonIdx = entry.indexOf(':');
    const entryId = colonIdx > 0 ? entry.slice(0, colonIdx).trim() : entry;
    if (!seenIds.has(entryId)) {
      donViVcList.push(entry); // Giữ nguyên format "id:label"
      seenIds.add(entryId);
    }
  }

  return successResponse(c, {
    app_name: 'Quay Video Kho Vận',
    version: '1.0.0',
    do_phan_giai: configs.do_phan_giai || '1280x720',
    bitrate_mbps: parseFloat(configs.bitrate_mbps || '2.5'),
    watermark: configs.watermark !== 'false',
    auto_scan: configs.auto_scan === 'true',
    retention_archive_days: parseInt(configs.retention_archive_days || (configs.retention_thang ? String(parseInt(configs.retention_thang, 10) * 30) : '30'), 10),
    retention_delete_days: parseInt(configs.retention_delete_days || '60', 10),
    retention_thang: parseInt(configs.retention_thang || '6', 10),
    don_vi_vc: donViVcList,
    max_duration_seconds: 600,
    chunk_size: parseInt(c.env.UPLOAD_CHUNK_SIZE || '5242880', 10)
  });
};

configRouter.get('/', handleGetPublicConfig);
configRouter.get('/public', handleGetPublicConfig);

configRouter.get('/kho-hang', async (c) => {
  try {
    const result = await c.env.DB.prepare(
      "SELECT id, ten, dia_chi, la_mac_dinh, trang_thai FROM kho_hang WHERE trang_thai = 'hoat_dong' ORDER BY la_mac_dinh DESC, ten ASC"
    ).all();

    const items = (result.results || []).map((row: Record<string, unknown>) => ({
      ...row,
      la_mac_dinh: Boolean(row.la_mac_dinh)
    }));

    return successResponse(c, { items });
  } catch (err: unknown) {
    // Trường hợp bảng kho_hang chưa khởi tạo hoặc lỗi truy vấn
    return successResponse(c, { items: [] });
  }
});
