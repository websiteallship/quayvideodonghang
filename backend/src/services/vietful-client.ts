import { getVietfulAccessToken, invalidateVietfulToken } from './vietful-auth';

export interface VietfulMerchantRecord {
  id: string;
  code: string;
  name: string;
  realm: string;
  auth_url: string;
  api_url: string;
  client_id: string;
  client_secret: string;
  warehouse_codes: string;
  webhook_secret?: string | null;
  is_active: number;
}

export interface VietfulOrderItemRaw {
  sku?: string;
  partnerSKU?: string;
  productName?: string;
  quantity?: number;
  qty?: number;
  unitCode?: string;
  conditionTypeCode?: string;
}

export interface VietfulOrderRawResponse {
  orId?: number;
  orCode?: string;
  partnerORCode?: string;
  trackingCode?: string;
  status?: string;
  orStatus?: string;
  packingNote?: string;
  note?: string;
  warehouseCode?: string;
  items?: VietfulOrderItemRaw[];
  [key: string]: unknown;
}

export interface NormalizedVietfulOrder {
  ma_van_don: string;
  ma_don_hang: string;
  or_id: number | null;
  trang_thai_don: string;
  trang_thai_dong_hang: 'cho_dong' | 'da_dong';
  trang_thai_kiem_hoan: 'chua_kiem' | 'da_kiem_tot' | 'da_kiem_hong' | 'khong_ap_dung';
  canh_bao: 'NONE' | 'DON_HUY' | 'HOLD_DON' | 'QUET_TRUNG' | 'DANG_HOAN';
  nha_ban: string;
  merchant_id: string;
  ghi_chu_don: string;
  san_pham_summary: string;
  du_lieu_raw_json: string;
}

/**
 * Chuẩn hóa tóm tắt sản phẩm: SKU (xSL)
 */
export function formatProductSummary(items?: VietfulOrderItemRaw[]): string {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return 'Chưa có thông tin SKU';
  }

  return items
    .map((item) => {
      const code = item.sku || item.partnerSKU || 'SKU';
      const qty = item.quantity ?? item.qty ?? 1;
      return `${code} (x${qty})`;
    })
    .join(', ');
}

/**
 * Chuẩn hóa trạng thái cảnh báo nghiệp vụ từ trạng thái đơn VietFul
 */
export function determineOrderWarning(
  status?: string,
  event?: string
): 'NONE' | 'DON_HUY' | 'HOLD_DON' | 'QUET_TRUNG' | 'DANG_HOAN' {
  const s = (status || event || '').toUpperCase();
  if (s.includes('CANCEL') || s === 'OR_CANCELLED') {
    return 'DON_HUY';
  }
  if (s.includes('DELAY') || s === 'OR_DELAY' || s.includes('HOLD')) {
    return 'HOLD_DON';
  }
  if (s.includes('RETURN') || s === 'OR_RETURNED' || s === 'OR_PARTIALRETURNED') {
    return 'DANG_HOAN';
  }
  return 'NONE';
}

/**
 * Gọi External API VietFul lấy thông tin chi tiết đơn hàng
 * Tham chiếu: docs/16-tich-hop-dong-bo-don-hang-vietful.md mục 2.3 & 3.2
 */
export async function fetchOrderByCode(
  merchant: VietfulMerchantRecord,
  code: string,
  retryCount = 0
): Promise<NormalizedVietfulOrder | null> {
  const token = await getVietfulAccessToken(merchant);
  const apiBaseUrl = (merchant.api_url || 'https://ext-api.vnfai.com').replace(/\/+$/, '');
  const url = `${apiBaseUrl}/api/v1/ors/get-by-code/${encodeURIComponent(code)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  // Tự động làm mới token nếu 401 Unauthorized
  if (response.status === 401 && retryCount === 0) {
    invalidateVietfulToken(merchant.id);
    return fetchOrderByCode(merchant, code, 1);
  }

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`VietFul API Error [HTTP ${response.status}]: ${errText || response.statusText}`);
  }

  const raw = (await response.json()) as VietfulOrderRawResponse;
  const trackingCode = raw.trackingCode || code;
  const orderCode = raw.partnerORCode || raw.orCode || code;
  const status = raw.status || raw.orStatus || 'CHO_DONG_GOI';
  const warning = determineOrderWarning(status);

  return {
    ma_van_don: trackingCode,
    ma_don_hang: orderCode,
    or_id: raw.orId ?? null,
    trang_thai_don: status,
    trang_thai_dong_hang: 'da_dong',
    trang_thai_kiem_hoan: warning === 'DANG_HOAN' ? 'chua_kiem' : 'khong_ap_dung',
    canh_bao: warning,
    nha_ban: merchant.name,
    merchant_id: merchant.id,
    ghi_chu_don: raw.packingNote || raw.note || '',
    san_pham_summary: formatProductSummary(raw.items),
    du_lieu_raw_json: JSON.stringify(raw),
  };
}

/**
 * Lưu hoặc cập nhật bản ghi vào bảng order_tracking tại D1
 * Tự động liên kết bien_ban_id nếu mã vận đơn đã có video
 */
export async function upsertOrderTracking(
  db: D1Database,
  order: NormalizedVietfulOrder
): Promise<void> {
  const existingBienBan = await db
    .prepare('SELECT id FROM bien_ban WHERE ma_van_don = ? LIMIT 1')
    .bind(order.ma_van_don)
    .first<{ id: string }>();

  const bienBanId = existingBienBan?.id || null;
  const id = crypto.randomUUID();

  await db
    .prepare(
      `
    INSERT INTO order_tracking (
      id, bien_ban_id, merchant_id, ma_van_don, ma_don_hang, or_id,
      trang_thai_don, trang_thai_dong_hang, trang_thai_kiem_hoan,
      canh_bao, nha_ban, ghi_chu_don, san_pham_summary, du_lieu_raw_json,
      ngay_cap_nhat
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(ma_van_don) DO UPDATE SET
      bien_ban_id = COALESCE(excluded.bien_ban_id, order_tracking.bien_ban_id),
      merchant_id = COALESCE(excluded.merchant_id, order_tracking.merchant_id),
      ma_don_hang = COALESCE(excluded.ma_don_hang, order_tracking.ma_don_hang),
      or_id = COALESCE(excluded.or_id, order_tracking.or_id),
      trang_thai_don = excluded.trang_thai_don,
      canh_bao = CASE 
        WHEN excluded.canh_bao != 'NONE' THEN excluded.canh_bao 
        ELSE order_tracking.canh_bao 
      END,
      nha_ban = COALESCE(excluded.nha_ban, order_tracking.nha_ban),
      ghi_chu_don = CASE 
        WHEN excluded.ghi_chu_don != '' THEN excluded.ghi_chu_don 
        ELSE order_tracking.ghi_chu_don 
      END,
      san_pham_summary = CASE 
        WHEN excluded.san_pham_summary != 'Chưa có thông tin SKU' THEN excluded.san_pham_summary 
        ELSE order_tracking.san_pham_summary 
      END,
      du_lieu_raw_json = excluded.du_lieu_raw_json,
      ngay_cap_nhat = datetime('now')
  `
    )
    .bind(
      id,
      bienBanId,
      order.merchant_id,
      order.ma_van_don,
      order.ma_don_hang,
      order.or_id,
      order.trang_thai_don,
      order.trang_thai_dong_hang,
      order.trang_thai_kiem_hoan,
      order.canh_bao,
      order.nha_ban,
      order.ghi_chu_don,
      order.san_pham_summary,
      order.du_lieu_raw_json
    )
    .run();
}
