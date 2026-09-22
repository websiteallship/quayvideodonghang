import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/index';
import { Env } from '../src/types/env';
import { JwtService } from '../src/services/jwt-service';

describe('Tích Hợp Truy Vấn Biên Bản Với Order Tracking (/api/bien-ban)', () => {
  let adminToken: string;
  let env: Env;

  const mockBienBan = {
    id: 'c0000000-0000-4000-8000-000000000001',
    ma_van_don: 'SPXVN067031770179',
    don_vi_vc: 'ShopeeXpress',
    loai_bien_ban: 'dong_goi',
    ma_nhan_vien: 'ADMIN01',
    thiet_bi: 'mobile',
    user_agent: 'Chrome',
    thoi_luong_video: 45,
    kich_thuoc_bytes: 12000000,
    mime_type: 'video/webm',
    trang_thai: 'da_upload',
    drive_file_id: 'drive-file-123',
    drive_file_name: 'SPXVN067031770179_20260922.webm',
    loi_message: null,
    thoi_gian_tao: '2026-09-22T10:00:00Z',
    thoi_gian_upload: '2026-09-22T10:01:00Z',
    ngay_cap_nhat: '2026-09-22T10:01:00Z'
  };

  const mockOrderTracking = {
    id: 'ot-001',
    bien_ban_id: 'bb-001',
    merchant_id: 'mc-01',
    ma_van_don: 'SPXVN067031770179',
    ma_don_hang: 'ORZPTKV7ME6Y667',
    or_id: 59879052,
    trang_thai_don: 'OR_PACKED',
    trang_thai_dong_hang: 'da_dong',
    trang_thai_kiem_hoan: 'khong_ap_dung',
    canh_bao: 'NONE',
    nha_ban: 'Shop Giày ZAPATO',
    ghi_chu_don: 'Giao hỏa tốc',
    san_pham_summary: 'D005BK42 (x1)'
  };

  beforeEach(async () => {
    const mockDb = {
      prepare(sql: string) {
        const normalizedSql = sql.trim().replace(/\s+/g, ' ');

        const executeMethods = (params: (string | number | null)[] = []) => ({
          async first<T = unknown>(): Promise<T | null> {
            if (normalizedSql.includes('FROM bien_ban b LEFT JOIN nhan_vien n')) {
              // GET /api/bien-ban/:id
              return {
                ...mockBienBan,
                ten_nhan_vien: 'Admin Kho',
                ot_id: mockOrderTracking.id,
                ot_ma_don_hang: mockOrderTracking.ma_don_hang,
                ot_or_id: mockOrderTracking.or_id,
                ot_trang_thai_don: mockOrderTracking.trang_thai_don,
                ot_trang_thai_dong_hang: mockOrderTracking.trang_thai_dong_hang,
                ot_trang_thai_kiem_hoan: mockOrderTracking.trang_thai_kiem_hoan,
                ot_canh_bao: mockOrderTracking.canh_bao,
                ot_ghi_chu_don: mockOrderTracking.ghi_chu_don,
                ot_san_pham_summary: mockOrderTracking.san_pham_summary,
                ot_nha_ban: mockOrderTracking.nha_ban,
                ot_merchant_code: 'ZPTDN',
                ot_merchant_id: 'mc-01'
              } as T;
            }

            if (normalizedSql.includes('SELECT COUNT(*) as total FROM bien_ban')) {
              return { total: 1 } as T;
            }

            if (normalizedSql.includes('FROM order_tracking ot LEFT JOIN vietful_merchants vm')) {
              // check/:ma_van_don
              return {
                ...mockOrderTracking,
                merchant_code: 'ZPTDN'
              } as T;
            }

            if (normalizedSql.includes('SELECT COUNT(*) as total FROM bien_ban WHERE ma_van_don = ?')) {
              return { total: 1 } as T;
            }

            if (normalizedSql.includes('SELECT id, ma_van_don, don_vi_vc')) {
              return mockBienBan as T;
            }

            return null;
          },

          async all<T = unknown>(): Promise<{ results: T[] }> {
            if (normalizedSql.includes('FROM bien_ban b')) {
              return {
                results: [
                  {
                    ...mockBienBan,
                    ten_nhan_vien: 'Admin Kho',
                    ot_id: mockOrderTracking.id,
                    ot_ma_don_hang: mockOrderTracking.ma_don_hang,
                    ot_or_id: mockOrderTracking.or_id,
                    ot_trang_thai_don: mockOrderTracking.trang_thai_don,
                    ot_trang_thai_dong_hang: mockOrderTracking.trang_thai_dong_hang,
                    ot_trang_thai_kiem_hoan: mockOrderTracking.trang_thai_kiem_hoan,
                    ot_canh_bao: mockOrderTracking.canh_bao,
                    ot_ghi_chu_don: mockOrderTracking.ghi_chu_don,
                    ot_san_pham_summary: mockOrderTracking.san_pham_summary,
                    ot_nha_ban: mockOrderTracking.nha_ban,
                    ot_merchant_code: 'ZPTDN',
                    ot_merchant_id: 'mc-01'
                  } as T
                ]
              };
            }
            return { results: [] };
          }
        });

        return {
          ...executeMethods(),
          bind(...params: (string | number | null)[]) {
            return executeMethods(params);
          }
        };
      }
    };

    env = {
      DB: mockDb as unknown as D1Database,
      ALLOWED_ORIGINS: 'http://localhost:5173',
      JWT_SECRET: 'test-jwt-secret-key-at-least-32-chars-long',
      JWT_EXPIRES_IN: '86400',
      DRIVE_FOLDER_ID: 'test-folder-id',
      GOOGLE_SHEET_ID: 'test-sheet-id',
      UPLOAD_CHUNK_SIZE: '5242880'
    };

    const jwt = new JwtService(env.JWT_SECRET);
    adminToken = await jwt.sign({
      sub: 'ADMIN01',
      ten: 'Admin Kho',
      vai_tro: 'admin'
    });
  });

  it('GET /api/bien-ban trả về danh sách có lồng thông tin order', async () => {
    const res = await app.fetch(
      new Request('http://localhost/api/bien-ban', {
        headers: { Authorization: `Bearer ${adminToken}` }
      }),
      env
    );

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { items: any[] } };
    expect(body.success).toBe(true);
    expect(body.data.items.length).toBe(1);

    const item = body.data.items[0];
    expect(item.id).toBe('c0000000-0000-4000-8000-000000000001');
    expect(item.order).toBeDefined();
    expect(item.order.ma_don_hang).toBe('ORZPTKV7ME6Y667');
    expect(item.order.nha_ban).toBe('Shop Giày ZAPATO');
    expect(item.order.san_pham_summary).toBe('D005BK42 (x1)');
    // Đảm bảo các cột ot_* đã được làm sạch khỏi root object
    expect(item.ot_id).toBeUndefined();
  });

  it('GET /api/bien-ban/:id trả về chi tiết biên bản có lồng thông tin order', async () => {
    const res = await app.fetch(
      new Request('http://localhost/api/bien-ban/c0000000-0000-4000-8000-000000000001', {
        headers: { Authorization: `Bearer ${adminToken}` }
      }),
      env
    );

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: any };
    expect(body.success).toBe(true);
    expect(body.data.id).toBe('c0000000-0000-4000-8000-000000000001');
    expect(body.data.order).toBeDefined();
    expect(body.data.order.ma_don_hang).toBe('ORZPTKV7ME6Y667');
    expect(body.data.order.trang_thai_don).toBe('OR_PACKED');
  });

  it('GET /api/bien-ban/check/:ma_van_don trả về thông tin order', async () => {
    const res = await app.fetch(
      new Request('http://localhost/api/bien-ban/check/SPXVN067031770179', {
        headers: { Authorization: `Bearer ${adminToken}` }
      }),
      env
    );

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: any };
    expect(body.success).toBe(true);
    expect(body.data.da_co_video).toBe(true);
    expect(body.data.order).toBeDefined();
    expect(body.data.order.ma_don_hang).toBe('ORZPTKV7ME6Y667');
  });
});
