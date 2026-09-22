import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/index';
import { JwtService } from '../src/services/jwt-service';
import { Env } from '../src/types/env';

interface MockMerchant {
  id: string;
  code: string;
  name: string;
  realm: string;
  auth_url: string;
  api_url: string;
  client_id: string;
  client_secret: string;
  warehouse_codes: string;
  webhook_secret: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

function createMockEnv() {
  const merchants: MockMerchant[] = [
    {
      id: 'mc-01',
      code: 'ZPTDN',
      name: 'Shop Giày ZAPATO',
      realm: 'asp',
      auth_url: 'https://auth.vnfai.com',
      api_url: 'https://ext-api.vnfai.com',
      client_id: 'client-zapato-id',
      client_secret: 'super-secret-key-1234',
      warehouse_codes: '["ZPTDN"]',
      webhook_secret: 'wh-secret-01',
      is_active: 1,
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z'
    }
  ];

  const mockDb = {
    prepare(sql: string) {
      const normalizedSql = sql.trim().replace(/\s+/g, ' ');

      const executeMethods = (params: (string | number | null)[] = []) => ({
        async first<T = unknown>(): Promise<T | null> {
          if (normalizedSql.includes('FROM vietful_merchants WHERE code = ?')) {
            const code = String(params[0]);
            const found = merchants.find(m => m.code === code);
            return (found ? { ...found } : null) as T;
          }

          if (normalizedSql.includes('FROM vietful_merchants WHERE id = ?')) {
            const id = String(params[0]);
            const found = merchants.find(m => m.id === id);
            if (found) {
              return {
                ...found,
                client_secret_masked: '****' + found.client_secret.slice(-4)
              } as T;
            }
            return null;
          }

          return null;
        },

        async all<T = unknown>(): Promise<{ results: T[] }> {
          if (normalizedSql.includes('FROM vietful_merchants')) {
            const results = merchants.map(m => {
              const { client_secret, ...rest } = m;
              return {
                ...rest,
                client_secret_masked: '****' + client_secret.slice(-4)
              };
            });
            return { results: results as T[] };
          }
          return { results: [] };
        },

        async run() {
          if (normalizedSql.includes('INSERT INTO vietful_merchants')) {
            const [
              id, code, name, realm, auth_url, api_url,
              client_id, client_secret, warehouse_codes,
              webhook_secret, is_active
            ] = params;

            merchants.push({
              id: String(id),
              code: String(code),
              name: String(name),
              realm: String(realm),
              auth_url: String(auth_url),
              api_url: String(api_url),
              client_id: String(client_id),
              client_secret: String(client_secret),
              warehouse_codes: String(warehouse_codes),
              webhook_secret: webhook_secret ? String(webhook_secret) : null,
              is_active: Number(is_active),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

            return { success: true, meta: { changes: 1 } };
          }

          if (normalizedSql.includes('UPDATE vietful_merchants')) {
            const id = String(params[params.length - 1]);
            const index = merchants.findIndex(m => m.id === id);
            if (index !== -1) {
              return { success: true, meta: { changes: 1 } };
            }
            return { success: false, meta: { changes: 0 } };
          }

          if (normalizedSql.includes('DELETE FROM vietful_merchants WHERE id = ?')) {
            const id = String(params[0]);
            const index = merchants.findIndex(m => m.id === id);
            if (index !== -1) {
              merchants.splice(index, 1);
              return { success: true, meta: { changes: 1 } };
            }
            return { success: false, meta: { changes: 0 } };
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

  const env: Env = {
    DB: mockDb as unknown as D1Database,
    ALLOWED_ORIGINS: 'http://localhost:5173',
    JWT_SECRET: 'test-jwt-secret-key-at-least-32-chars-long',
    JWT_EXPIRES_IN: '86400',
    DRIVE_FOLDER_ID: 'test-folder-id',
    GOOGLE_SHEET_ID: 'test-sheet-id',
    UPLOAD_CHUNK_SIZE: '5242880'
  };

  return { env, merchants };
}

describe('VietFul Merchant API (/api/admin/vietful-merchants)', () => {
  let adminToken: string;
  let userToken: string;
  let env: Env;

  beforeEach(async () => {
    const mock = createMockEnv();
    env = mock.env;

    const jwtService = new JwtService(env.JWT_SECRET);
    adminToken = await jwtService.sign({
      sub: 'ADMIN01',
      ten: 'Admin Kho',
      vai_tro: 'admin'
    });

    userToken = await jwtService.sign({
      sub: 'NV01',
      ten: 'Nhân viên A',
      vai_tro: 'nhan_vien'
    });
  });

  it('chặn truy cập không xác thực với 401', async () => {
    const res = await app.fetch(new Request('http://localhost/api/admin/vietful-merchants'), env);
    expect(res.status).toBe(401);
  });

  it('chặn nhân viên thường (không phải admin) với 403', async () => {
    const res = await app.fetch(
      new Request('http://localhost/api/admin/vietful-merchants', {
        headers: { Authorization: `Bearer ${userToken}` }
      }),
      env
    );
    expect(res.status).toBe(403);
  });

  it('lấy danh sách merchant và ẩn client_secret (masked)', async () => {
    const res = await app.fetch(
      new Request('http://localhost/api/admin/vietful-merchants', {
        headers: { Authorization: `Bearer ${adminToken}` }
      }),
      env
    );

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: any[] };
    expect(body.success).toBe(true);
    expect(body.data.length).toBe(1);
    expect(body.data[0].code).toBe('ZPTDN');
    expect(body.data[0].client_secret_masked).toBe('****1234');
    expect(body.data[0].client_secret).toBeUndefined();
  });

  it('thêm mới merchant thành công với code uppercase', async () => {
    const newMerchant = {
      code: 'polo',
      name: 'Shop Áo Polo',
      realm: 'asp',
      auth_url: 'https://auth.vnfai.com',
      api_url: 'https://ext-api.vnfai.com',
      client_id: 'client-polo-123',
      client_secret: 'polo-secret-key-9999'
    };

    const res = await app.fetch(
      new Request('http://localhost/api/admin/vietful-merchants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify(newMerchant)
      }),
      env
    );

    expect(res.status).toBe(201);
    const body = await res.json() as { success: boolean; data: any };
    expect(body.success).toBe(true);
    expect(body.data.code).toBe('POLO');
    expect(body.data.name).toBe('Shop Áo Polo');
  });

  it('từ chối thêm merchant trùng mã với 409', async () => {
    const duplicateMerchant = {
      code: 'ZPTDN',
      name: 'Trùng ZAPATO',
      realm: 'asp',
      auth_url: 'https://auth.vnfai.com',
      api_url: 'https://ext-api.vnfai.com',
      client_id: 'client-dup',
      client_secret: 'secret-dup'
    };

    const res = await app.fetch(
      new Request('http://localhost/api/admin/vietful-merchants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify(duplicateMerchant)
      }),
      env
    );

    expect(res.status).toBe(409);
    const body = await res.json() as { success: boolean; error: { code: string } };
    expect(body.error.code).toBe('CODE_EXISTS');
  });

  it('xóa merchant thành công', async () => {
    const res = await app.fetch(
      new Request('http://localhost/api/admin/vietful-merchants/mc-01', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      }),
      env
    );

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; data: { deleted: boolean } };
    expect(body.data.deleted).toBe(true);
  });
});
