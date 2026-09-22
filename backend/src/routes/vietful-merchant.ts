import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { Env, JwtPayload } from '../types/env';
import { successResponse, errorResponse } from '../utils/response';
import { authMiddleware, requireAdminMiddleware } from '../middleware/auth';
import {
  VietfulMerchantCreateSchema,
  VietfulMerchantUpdateSchema
} from '../types/schemas';

export const vietfulMerchantRouter = new Hono<{
  Bindings: Env;
  Variables: {
    user: JwtPayload;
  };
}>();

// Chỉ admin mới có quyền quản lý cấu hình merchant VietFul
vietfulMerchantRouter.use('*', authMiddleware, requireAdminMiddleware);

// 1. Lấy danh sách tất cả các merchant
vietfulMerchantRouter.get('/', async (c) => {
  try {
    const merchants = await c.env.DB.prepare(`
      SELECT 
        id, code, name, realm, auth_url, api_url, client_id,
        warehouse_codes, is_active, created_at, updated_at,
        CASE 
          WHEN client_secret IS NOT NULL AND LENGTH(client_secret) > 4 
          THEN '****' || SUBSTR(client_secret, -4) 
          ELSE '****' 
        END as client_secret_masked
      FROM vietful_merchants
      ORDER BY created_at DESC
    `).all();

    return successResponse(c, merchants.results || []);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return errorResponse(c, 'DATABASE_ERROR', message, 500);
  }
});

// 2. Lấy chi tiết 1 merchant
vietfulMerchantRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const merchant = await c.env.DB.prepare(`
      SELECT 
        id, code, name, realm, auth_url, api_url, client_id,
        warehouse_codes, is_active, created_at, updated_at,
        CASE 
          WHEN client_secret IS NOT NULL AND LENGTH(client_secret) > 4 
          THEN '****' || SUBSTR(client_secret, -4) 
          ELSE '****' 
        END as client_secret_masked
      FROM vietful_merchants
      WHERE id = ?
    `)
      .bind(id)
      .first();

    if (!merchant) {
      return errorResponse(c, 'MERCHANT_NOT_FOUND', 'Không tìm thấy cấu hình nhà bán', 404);
    }

    return successResponse(c, merchant);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return errorResponse(c, 'DATABASE_ERROR', message, 500);
  }
});

// 3. Thêm mới cấu hình merchant
vietfulMerchantRouter.post(
  '/',
  zValidator('json', VietfulMerchantCreateSchema, (result, c) => {
    if (!result.success) {
      return errorResponse(
        c,
        'VALIDATION_ERROR',
        result.error.errors[0]?.message || 'Dữ liệu không hợp lệ',
        400
      );
    }
  }),
  async (c) => {
    const data = c.req.valid('json');
    const id = crypto.randomUUID();
    const warehouseCodes = Array.isArray(data.warehouse_codes)
      ? JSON.stringify(data.warehouse_codes)
      : typeof data.warehouse_codes === 'string'
      ? data.warehouse_codes
      : JSON.stringify(['ZPTDN']);

    try {
      // Kiểm tra trùng code
      const existing = await c.env.DB.prepare(
        'SELECT id FROM vietful_merchants WHERE code = ?'
      )
        .bind(data.code)
        .first();

      if (existing) {
        return errorResponse(c, 'CODE_EXISTS', `Mã nhà bán ${data.code} đã tồn tại`, 409);
      }

      await c.env.DB.prepare(`
        INSERT INTO vietful_merchants (
          id, code, name, realm, auth_url, api_url,
          client_id, client_secret, warehouse_codes,
          webhook_secret, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
        .bind(
          id,
          data.code,
          data.name,
          data.realm,
          data.auth_url,
          data.api_url,
          data.client_id,
          data.client_secret,
          warehouseCodes,
          data.webhook_secret || null,
          data.is_active ?? 1
        )
        .run();

      return successResponse(
        c,
        {
          id,
          code: data.code,
          name: data.name,
          realm: data.realm,
          client_id: data.client_id,
          is_active: data.is_active ?? 1
        },
        201
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Database error';
      return errorResponse(c, 'DATABASE_ERROR', message, 500);
    }
  }
);

// 4. Cập nhật cấu hình merchant
vietfulMerchantRouter.put(
  '/:id',
  zValidator('json', VietfulMerchantUpdateSchema, (result, c) => {
    if (!result.success) {
      return errorResponse(
        c,
        'VALIDATION_ERROR',
        result.error.errors[0]?.message || 'Dữ liệu không hợp lệ',
        400
      );
    }
  }),
  async (c) => {
    const id = c.req.param('id');
    const data = c.req.valid('json');

    try {
      const existing = await c.env.DB.prepare(
        'SELECT id FROM vietful_merchants WHERE id = ?'
      )
        .bind(id)
        .first();

      if (!existing) {
        return errorResponse(c, 'MERCHANT_NOT_FOUND', 'Không tìm thấy nhà bán cần sửa', 404);
      }

      const updates: string[] = ["updated_at = datetime('now')"];
      const params: (string | number | null)[] = [];

      if (data.name !== undefined) {
        updates.push('name = ?');
        params.push(data.name);
      }
      if (data.realm !== undefined) {
        updates.push('realm = ?');
        params.push(data.realm);
      }
      if (data.auth_url !== undefined) {
        updates.push('auth_url = ?');
        params.push(data.auth_url);
      }
      if (data.api_url !== undefined) {
        updates.push('api_url = ?');
        params.push(data.api_url);
      }
      if (data.client_id !== undefined) {
        updates.push('client_id = ?');
        params.push(data.client_id);
      }
      if (data.client_secret !== undefined) {
        updates.push('client_secret = ?');
        params.push(data.client_secret);
      }
      if (data.warehouse_codes !== undefined) {
        updates.push('warehouse_codes = ?');
        params.push(
          Array.isArray(data.warehouse_codes)
            ? JSON.stringify(data.warehouse_codes)
            : data.warehouse_codes
        );
      }
      if (data.webhook_secret !== undefined) {
        updates.push('webhook_secret = ?');
        params.push(data.webhook_secret || null);
      }
      if (data.is_active !== undefined) {
        updates.push('is_active = ?');
        params.push(data.is_active);
      }

      params.push(id);

      await c.env.DB.prepare(`
        UPDATE vietful_merchants
        SET ${updates.join(', ')}
        WHERE id = ?
      `)
        .bind(...params)
        .run();

      return successResponse(c, { id, updated: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Database error';
      return errorResponse(c, 'DATABASE_ERROR', message, 500);
    }
  }
);

// 5. Xóa cấu hình merchant
vietfulMerchantRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const result = await c.env.DB.prepare(
      'DELETE FROM vietful_merchants WHERE id = ?'
    )
      .bind(id)
      .run();

    if (result.meta?.changes === 0) {
      return errorResponse(c, 'MERCHANT_NOT_FOUND', 'Không tìm thấy nhà bán', 404);
    }

    return successResponse(c, { id, deleted: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return errorResponse(c, 'DATABASE_ERROR', message, 500);
  }
});
