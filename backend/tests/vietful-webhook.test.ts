import { describe, it, expect, beforeEach, vi } from 'vitest';
import app from '../src/index';
import { Env } from '../src/types/env';
import { JwtService } from '../src/services/jwt-service';
import { determineOrderWarning, formatProductSummary } from '../src/services/vietful-client';

describe('VietFul Client Helpers', () => {
  it('xác định đúng cảnh báo CANCEL -> DON_HUY', () => {
    expect(determineOrderWarning('OR_CANCELLED')).toBe('DON_HUY');
    expect(determineOrderWarning('CANCELLED')).toBe('DON_HUY');
  });

  it('xác định đúng cảnh báo DELAY -> HOLD_DON', () => {
    expect(determineOrderWarning('OR_DELAY')).toBe('HOLD_DON');
  });

  it('xác định đúng cảnh báo RETURN -> DANG_HOAN', () => {
    expect(determineOrderWarning('OR_RETURNED')).toBe('DANG_HOAN');
  });

  it('chuẩn hóa danh sách sản phẩm SKU (xQty)', () => {
    const items = [
      { sku: 'D005BK42', quantity: 1 },
      { partnerSKU: 'A001WH39', qty: 2 }
    ];
    expect(formatProductSummary(items)).toBe('D005BK42 (x1), A001WH39 (x2)');
  });
});

describe('VietFul Webhook Receiver (/api/webhooks/vietful)', () => {
  const storedOrders: any[] = [];
  let env: Env;

  beforeEach(() => {
    storedOrders.length = 0;

    const mockDb = {
      prepare(sql: string) {
        const normalizedSql = sql.trim().replace(/\s+/g, ' ');

        const executeMethods = (params: (string | number | null)[] = []) => ({
          async first<T = unknown>(): Promise<T | null> {
            if (normalizedSql.includes('FROM vietful_merchants WHERE id = ? OR code = ?')) {
              return { name: 'Shop Giày ZAPATO', webhook_secret: null } as T;
            }

            if (normalizedSql.includes('FROM order_tracking WHERE ma_van_don = ? OR ma_don_hang = ?')) {
              const code1 = String(params[0]);
              const code2 = String(params[1]);
              const found = storedOrders.find(
                (o) => o.ma_van_don === code1 || o.ma_don_hang === code2
              );
              return (found ? { ...found } : null) as T;
            }

            if (normalizedSql.includes('FROM bien_ban WHERE ma_van_don = ?')) {
              return null;
            }

            return null;
          },

          async run() {
            if (normalizedSql.includes('INSERT INTO order_tracking')) {
              const [
                id, bien_ban_id, merchant_id, ma_van_don, ma_don_hang, or_id,
                trang_thai_don, trang_thai_dong_hang, trang_thai_kiem_hoan,
                canh_bao, nha_ban, ghi_chu_don, san_pham_summary, du_lieu_raw_json
              ] = params;

              storedOrders.push({
                id: String(id),
                bien_ban_id,
                merchant_id,
                ma_van_don: String(ma_van_don),
                ma_don_hang: String(ma_don_hang),
                or_id,
                trang_thai_don,
                trang_thai_dong_hang,
                trang_thai_kiem_hoan,
                canh_bao,
                nha_ban,
                ghi_chu_don,
                san_pham_summary,
                du_lieu_raw_json
              });

              return { success: true, meta: { changes: 1 } };
            }

            if (normalizedSql.includes('UPDATE order_tracking')) {
              const id = String(params[params.length - 1]);
              const existing = storedOrders.find((o) => o.id === id);
              if (existing) {
                existing.trang_thai_don = params[4];
                if (params[5] !== 'NONE') existing.canh_bao = params[5];
                if (params[7]) existing.ghi_chu_don = params[7];
                return { success: true, meta: { changes: 1 } };
              }
            }

            return { success: true, meta: { changes: 0 } };
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
  });

  it('nhận và xử lý sự kiện OR_PACKED có mã vận đơn', async () => {
    const payload = {
      orId: 59879052,
      orCode: 'ORZPTKV7ME6Y667',
      partnerORCode: '586181172918912155',
      trackingCode: 'SPXVN067031770179',
      event: 'OR_PACKED',
      id: '01a0c85e-9769-7c8c-aebf-0568fca8c769',
      timestamp: 1790068032
    };

    const res = await app.fetch(
      new Request('http://localhost/api/webhooks/vietful/ZPTDN', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }),
      env
    );

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: any };
    expect(body.success).toBe(true);
    expect(body.data.event).toBe('OR_PACKED');
    expect(storedOrders.length).toBe(1);
    expect(storedOrders[0].ma_van_don).toBe('SPXVN067031770179');
    expect(storedOrders[0].ma_don_hang).toBe('586181172918912155');
  });

  it('nhận sự kiện OR_CANCELLED và kích hoạt cảnh báo đỏ DON_HUY', async () => {
    const payload = {
      orId: 59879950,
      orCode: 'ORZPTAO8EMLD853',
      partnerORCode: 'ORZPTAO8EMLD853',
      note: 'Khách yêu cầu đổi địa chỉ',
      event: 'OR_CANCELLED',
      id: '01a0c86b-dadb-7c3c-a293-4f64aad16e7d',
      timestamp: 1790068906
    };

    const res = await app.fetch(
      new Request('http://localhost/api/webhooks/vietful/ZPTDN', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }),
      env
    );

    expect(res.status).toBe(200);
    expect(storedOrders.length).toBe(1);
    expect(storedOrders[0].trang_thai_don).toBe('DA_HUY');
    expect(storedOrders[0].canh_bao).toBe('DON_HUY');
    expect(storedOrders[0].ghi_chu_don).toBe('Khách yêu cầu đổi địa chỉ');
  });
});
