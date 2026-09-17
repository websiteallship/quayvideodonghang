import { Hono } from 'hono';
import { Env } from '../types/env';
import { successResponse } from '../utils/response';

export const configRouter = new Hono<{
  Bindings: Env;
}>();

configRouter.get('/public', async (c) => {
  return successResponse(c, {
    app_name: 'Quay Video Kho Vận',
    version: '1.0.0',
    don_vi_vc: ['GHN', 'ViettelPost', 'BestExpress', 'NhatTin', 'LazadaExpress', 'ShopeeXpress', 'J&T', 'VNPost', 'GHTK', 'Khac'],
    max_duration_seconds: 600,
    chunk_size: parseInt(c.env.UPLOAD_CHUNK_SIZE || '5242880', 10)
  });
});

configRouter.get('/kho-hang', async (c) => {
  try {
    const result = await c.env.DB.prepare(
      "SELECT id, ten, dia_chi, la_mac_dinh, trang_thai FROM kho_hang WHERE trang_thai = 'hoat_dong' ORDER BY la_mac_dinh DESC, ten ASC"
    ).all();

    const items = (result.results || []).map((row: any) => ({
      ...row,
      la_mac_dinh: Boolean(row.la_mac_dinh)
    }));

    return successResponse(c, { items });
  } catch (err: unknown) {
    // Trường hợp bảng kho_hang chưa khởi tạo hoặc lỗi truy vấn
    return successResponse(c, { items: [] });
  }
});
