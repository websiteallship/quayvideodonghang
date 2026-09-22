import { Hono } from 'hono';
import { Env, JwtPayload } from '../types/env';
import { successResponse, errorResponse } from '../utils/response';
import { authMiddleware } from '../middleware/auth';
import {
  fetchOrderByCode,
  upsertOrderTracking,
  VietfulMerchantRecord,
  NormalizedVietfulOrder
} from '../services/vietful-client';

export const orderSyncRouter = new Hono<{
  Bindings: Env;
  Variables: {
    user: JwtPayload;
  };
}>();

// Bảo vệ router bằng authMiddleware (nhân viên hoặc admin đều có quyền gọi)
orderSyncRouter.use('*', authMiddleware);

/**
 * 1. POST /api/orders/sync-by-code
 * Kích hoạt đồng bộ trực tiếp đơn hàng từ VietFul bằng mã vận đơn hoặc mã đơn hàng
 */
orderSyncRouter.post('/sync-by-code', async (c) => {
  let body: { code?: string; merchant_id?: string };
  try {
    body = await c.req.json<{ code?: string; merchant_id?: string }>();
  } catch {
    return errorResponse(c, 'INVALID_BODY', 'Body JSON không hợp lệ', 400);
  }

  const code = body.code?.trim();
  if (!code) {
    return errorResponse(c, 'CODE_REQUIRED', 'Mã đơn hàng hoặc mã vận đơn là bắt buộc', 400);
  }

  try {
    // 1. Lấy danh sách merchant đang hoạt động
    let query = 'SELECT * FROM vietful_merchants WHERE is_active = 1';
    const params: string[] = [];

    if (body.merchant_id) {
      query += ' AND id = ?';
      params.push(body.merchant_id);
    }

    const merchantsResult = await c.env.DB.prepare(query)
      .bind(...params)
      .all<VietfulMerchantRecord>();

    const merchants = merchantsResult.results || [];
    if (merchants.length === 0) {
      return errorResponse(
        c,
        'NO_ACTIVE_MERCHANT',
        'Chưa có cấu hình nhà bán (Merchant) nào hoạt động trên hệ thống',
        400
      );
    }

    // 2. Thử tìm kiếm đơn hàng trên từng merchant
    let foundOrder: NormalizedVietfulOrder | null = null;
    let lastError: string | null = null;

    for (const merchant of merchants) {
      try {
        const order = await fetchOrderByCode(merchant, code);
        if (order) {
          foundOrder = order;
          break;
        }
      } catch (err) {
        lastError = err instanceof Error ? err.message : 'Lỗi gọi API VietFul';
      }
    }

    if (!foundOrder) {
      return errorResponse(
        c,
        'ORDER_NOT_FOUND',
        `Không tìm thấy đơn hàng "${code}" trên hệ thống VietFul.${lastError ? ` Chi tiết: ${lastError}` : ''}`,
        404
      );
    }

    // 3. Lưu dữ liệu thật vào bảng order_tracking
    await upsertOrderTracking(c.env.DB, foundOrder);

    return successResponse(c, {
      synced: true,
      order: foundOrder,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Lỗi đồng bộ từ VietFul';
    return errorResponse(c, 'SYNC_FAILED', msg, 500);
  }
});

/**
 * 2. GET /api/orders/lookup/:code
 * Tra cứu thông tin đơn hàng từ DB trước, nếu chưa có hoặc có param live=true thì gọi trực tiếp VietFul
 */
orderSyncRouter.get('/lookup/:code', async (c) => {
  const code = c.req.param('code').trim();
  const live = c.req.query('live') === 'true';

  try {
    // 1. Kiểm tra cache trong D1 trước (trừ khi yêu cầu live=true)
    if (!live) {
      const existing = await c.env.DB.prepare(`
        SELECT 
          ot.*,
          COALESCE(ot.nha_ban, vm.name) as nha_ban,
          vm.code as merchant_code
        FROM order_tracking ot
        LEFT JOIN vietful_merchants vm ON ot.merchant_id = vm.id
        WHERE ot.ma_van_don = ? OR ot.ma_don_hang = ?
        LIMIT 1
      `)
        .bind(code, code)
        .first();

      if (existing) {
        return successResponse(c, {
          source: 'cache',
          order: existing,
        });
      }
    }

    // 2. Gọi live API VietFul nếu chưa có hoặc yêu cầu làm mới
    const merchants = (
      await c.env.DB.prepare('SELECT * FROM vietful_merchants WHERE is_active = 1').all<VietfulMerchantRecord>()
    ).results || [];

    for (const merchant of merchants) {
      try {
        const order = await fetchOrderByCode(merchant, code);
        if (order) {
          await upsertOrderTracking(c.env.DB, order);
          return successResponse(c, {
            source: 'vietful_live',
            order,
          });
        }
      } catch {
        // Tiếp tục thử merchant khác
      }
    }

    return errorResponse(c, 'ORDER_NOT_FOUND', `Không tìm thấy đơn hàng "${code}"`, 404);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Lỗi tra cứu đơn hàng';
    return errorResponse(c, 'LOOKUP_FAILED', msg, 500);
  }
});
