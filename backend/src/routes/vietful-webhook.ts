import { Hono } from 'hono';
import { Env } from '../types/env';
import { successResponse, errorResponse } from '../utils/response';
import { determineOrderWarning, formatProductSummary, VietfulOrderItemRaw } from '../services/vietful-client';

export const vietfulWebhookRouter = new Hono<{ Bindings: Env }>();

export interface VietfulWebhookPayload {
  id?: string;
  event?: string;
  orId?: number;
  orCode?: string;
  partnerORCode?: string;
  trackingCode?: string;
  irId?: number;
  irCode?: string;
  partnerIRCode?: string;
  warehouseCode?: string;
  changedReason?: string;
  note?: string;
  reason?: string;
  timestamp?: number;
  items?: VietfulOrderItemRaw[];
  [key: string]: unknown;
}

/**
 * Xử lý sự kiện Webhook từ VietFul và lưu vào order_tracking
 * Tham chiếu: docs/16-tich-hop-dong-bo-don-hang-vietful.md mục 3A.1 & 3A.2
 */
async function processWebhookPayload(
  db: D1Database,
  payload: VietfulWebhookPayload,
  merchantId?: string
) {
  const event = payload.event || '';
  const orId = payload.orId || null;
  const orCode = payload.orCode || '';
  const partnerORCode = payload.partnerORCode || orCode;
  const trackingCode = payload.trackingCode || '';
  const note = payload.note || payload.reason || '';

  // 1. Tìm thông tin merchant nếu có merchantId
  let merchantName = 'VietFul';
  if (merchantId) {
    const merchant = await db
      .prepare('SELECT name FROM vietful_merchants WHERE id = ? OR code = ? LIMIT 1')
      .bind(merchantId, merchantId)
      .first<{ name: string }>();
    if (merchant) {
      merchantName = merchant.name;
    }
  }

  // 2. Xác định cảnh báo nghiệp vụ
  const warning = determineOrderWarning(undefined, event);
  const isCancelled = warning === 'DON_HUY';

  // 3. Xử lý theo mã vận đơn hoặc mã đơn hàng
  const targetTrackingCode = trackingCode || partnerORCode || orCode;
  if (!targetTrackingCode) {
    return { skipped: true, reason: 'Payload không có mã vận đơn hoặc mã đơn hàng' };
  }

  // Kiểm tra xem đã có bản ghi order_tracking cho mã này chưa
  const existingOrder = await db
    .prepare(
      'SELECT id, ma_van_don, bien_ban_id FROM order_tracking WHERE ma_van_don = ? OR ma_don_hang = ? OR (or_id IS NOT NULL AND or_id = ?) LIMIT 1'
    )
    .bind(targetTrackingCode, partnerORCode, orId || -1)
    .first<{ id: string; ma_van_don: string; bien_ban_id: string | null }>();

  // Kiểm tra liên kết với bien_ban quay video nếu có
  let linkedBienBanId = existingOrder?.bien_ban_id || null;
  if (!linkedBienBanId) {
    const foundBb = await db
      .prepare('SELECT id FROM bien_ban WHERE ma_van_don = ? LIMIT 1')
      .bind(trackingCode || targetTrackingCode)
      .first<{ id: string }>();
    if (foundBb) {
      linkedBienBanId = foundBb.id;
    }
  }

  const recordId = existingOrder?.id || crypto.randomUUID();
  const summary = payload.items ? formatProductSummary(payload.items) : null;
  const status = isCancelled ? 'DA_HUY' : event || 'CHO_DONG_GOI';
  const rawJson = JSON.stringify(payload);

  if (existingOrder) {
    // Cập nhật bản ghi hiện có
    await db
      .prepare(
        `
      UPDATE order_tracking
      SET 
        ma_van_don = CASE WHEN ? != '' THEN ? ELSE ma_van_don END,
        ma_don_hang = COALESCE(?, ma_don_hang),
        or_id = COALESCE(?, or_id),
        trang_thai_don = ?,
        canh_bao = CASE WHEN ? != 'NONE' THEN ? ELSE canh_bao END,
        ghi_chu_don = CASE WHEN ? != '' THEN ? ELSE ghi_chu_don END,
        san_pham_summary = COALESCE(?, san_pham_summary),
        du_lieu_raw_json = ?,
        bien_ban_id = COALESCE(?, bien_ban_id),
        ngay_cap_nhat = datetime('now')
      WHERE id = ?
    `
      )
      .bind(
        trackingCode,
        trackingCode,
        partnerORCode || null,
        orId,
        status,
        warning,
        warning,
        note,
        note,
        summary,
        rawJson,
        linkedBienBanId,
        recordId
      )
      .run();
  } else {
    // Tạo bản ghi mới
    await db
      .prepare(
        `
      INSERT INTO order_tracking (
        id, bien_ban_id, merchant_id, ma_van_don, ma_don_hang, or_id,
        trang_thai_don, trang_thai_dong_hang, trang_thai_kiem_hoan,
        canh_bao, nha_ban, ghi_chu_don, san_pham_summary, du_lieu_raw_json,
        ngay_cap_nhat
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `
      )
      .bind(
        recordId,
        linkedBienBanId,
        merchantId || null,
        targetTrackingCode,
        partnerORCode || orCode || targetTrackingCode,
        orId,
        status,
        linkedBienBanId ? 'da_dong' : 'cho_dong',
        warning === 'DANG_HOAN' ? 'chua_kiem' : 'khong_ap_dung',
        warning,
        merchantName,
        note,
        summary || 'Chưa có thông tin SKU',
        rawJson
      )
      .run();
  }

  return { updated: true, record_id: recordId, tracking_code: targetTrackingCode, event };
}

// 1. Endpoint webhook có merchantId
vietfulWebhookRouter.post('/:merchantId', async (c) => {
  const merchantId = c.req.param('merchantId');
  let payload: VietfulWebhookPayload;

  try {
    payload = await c.req.json<VietfulWebhookPayload>();
  } catch {
    return errorResponse(c, 'INVALID_JSON', 'Payload webhook không phải JSON hợp lệ', 400);
  }

  // Tùy chọn: kiểm tra secret nếu merchant có cấu hình webhook_secret
  const merchant = await c.env.DB.prepare(
    'SELECT webhook_secret FROM vietful_merchants WHERE id = ? OR code = ? LIMIT 1'
  )
    .bind(merchantId, merchantId)
    .first<{ webhook_secret: string | null }>();

  if (merchant?.webhook_secret) {
    const providedSecret =
      c.req.header('X-Webhook-Secret') ||
      c.req.query('secret') ||
      c.req.header('Authorization')?.replace('Bearer ', '');

    if (providedSecret !== merchant.webhook_secret) {
      return errorResponse(c, 'UNAUTHORIZED_WEBHOOK', 'Khóa bí mật Webhook không khớp', 401);
    }
  }

  try {
    const result = await processWebhookPayload(c.env.DB, payload, merchantId);
    return successResponse(c, {
      received: true,
      event: payload.event,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Lỗi xử lý webhook';
    return errorResponse(c, 'WEBHOOK_PROCESSING_FAILED', msg, 500);
  }
});

// 2. Endpoint webhook chung
vietfulWebhookRouter.post('/', async (c) => {
  let payload: VietfulWebhookPayload;
  try {
    payload = await c.req.json<VietfulWebhookPayload>();
  } catch {
    return errorResponse(c, 'INVALID_JSON', 'Payload webhook không phải JSON hợp lệ', 400);
  }

  try {
    const result = await processWebhookPayload(c.env.DB, payload);
    return successResponse(c, {
      received: true,
      event: payload.event,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Lỗi xử lý webhook';
    return errorResponse(c, 'WEBHOOK_PROCESSING_FAILED', msg, 500);
  }
});
