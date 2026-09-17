import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/index';
import { JwtService } from '../src/services/jwt-service';
import { Env } from '../src/types/env';

interface MockKhoHang {
  id: string;
  ten: string;
  dia_chi: string;
  la_mac_dinh: number;
  trang_thai: 'hoat_dong' | 'ngung_hoat_dong' | 'da_xoa';
  ngay_tao: string;
  ngay_cap_nhat: string;
}

function createMockEnv() {
  const khoList: MockKhoHang[] = [
    {
      id: 'kho-1',
      ten: 'Kho Quận 7 - HCM',
      dia_chi: '105 Nguyễn Thị Thập, Quận 7',
      la_mac_dinh: 1,
      trang_thai: 'hoat_dong',
      ngay_tao: '2026-09-01T00:00:00Z',
      ngay_cap_nhat: '2026-09-01T00:00:00Z'
    },
    {
      id: 'kho-2',
      ten: 'Kho Tân Bình',
      dia_chi: '45 Hoàng Hoa Thám, Tân Bình',
      la_mac_dinh: 0,
      trang_thai: 'hoat_dong',
      ngay_tao: '2026-09-02T00:00:00Z',
      ngay_cap_nhat: '2026-09-02T00:00:00Z'
    }
  ];

  const mockDb = {
    prepare(sql: string) {
      const normalizedSql = sql.trim().replace(/\s+/g, ' ');

      return {
        bind(...params: (string | number)[]) {
          return {
            async first<T = unknown>(): Promise<T | null> {
              if (normalizedSql.includes('FROM kho_hang WHERE id = ? AND trang_thai != \'da_xoa\'')) {
                const id = String(params[0]);
                const found = khoList.find(k => k.id === id && k.trang_thai !== 'da_xoa');
                return (found ? { ...found } : null) as T;
              }

              if (normalizedSql.includes('FROM kho_hang WHERE id = ?')) {
                const id = String(params[0]);
                const found = khoList.find(k => k.id === id);
                return (found ? { ...found } : null) as T;
              }

              return null;
            },

            async all<T = unknown>(): Promise<{ results: T[] }> {
              if (normalizedSql.includes("WHERE trang_thai = 'hoat_dong'")) {
                const active = khoList
                  .filter(k => k.trang_thai === 'hoat_dong')
                  .sort((a, b) => b.la_mac_dinh - a.la_mac_dinh || a.ten.localeCompare(b.ten));
                return { results: active as T[] };
              }

              if (normalizedSql.includes("WHERE trang_thai != 'da_xoa'")) {
                const nonDeleted = khoList
                  .filter(k => k.trang_thai !== 'da_xoa')
                  .sort((a, b) => b.la_mac_dinh - a.la_mac_dinh);
                return { results: nonDeleted as T[] };
              }

              return { results: [] };
            },

            async run(): Promise<{ success: boolean }> {
              if (normalizedSql.includes('UPDATE kho_hang SET la_mac_dinh = 0 WHERE id !=')) {
                const keepId = String(params[0]);
                khoList.forEach(k => {
                  if (k.id !== keepId) k.la_mac_dinh = 0;
                });
                return { success: true };
              }

              if (normalizedSql.includes('UPDATE kho_hang SET la_mac_dinh = 0 WHERE la_mac_dinh = 1')) {
                khoList.forEach(k => {
                  k.la_mac_dinh = 0;
                });
                return { success: true };
              }

              if (normalizedSql.includes('INSERT INTO kho_hang')) {
                const [id, ten, dia_chi, isDefault] = params as [string, string, string, number];
                khoList.push({
                  id,
                  ten,
                  dia_chi,
                  la_mac_dinh: isDefault,
                  trang_thai: 'hoat_dong',
                  ngay_tao: new Date().toISOString(),
                  ngay_cap_nhat: new Date().toISOString()
                });
                return { success: true };
              }

              if (normalizedSql.includes('UPDATE kho_hang SET') && normalizedSql.includes('WHERE id = ?')) {
                const id = String(params[params.length - 1]);
                const item = khoList.find(k => k.id === id);
                if (item) {
                  if (normalizedSql.includes("trang_thai = 'da_xoa'")) {
                    item.trang_thai = 'da_xoa';
                    item.la_mac_dinh = 0;
                  } else {
                    if (normalizedSql.includes('la_mac_dinh = 1')) {
                      item.la_mac_dinh = 1;
                    }
                    // parse params dynamically if needed
                    let idx = 0;
                    if (normalizedSql.includes('ten = ?')) {
                      item.ten = String(params[idx++]);
                    }
                    if (normalizedSql.includes('dia_chi = ?')) {
                      item.dia_chi = String(params[idx++]);
                    }
                    if (normalizedSql.includes('la_mac_dinh = ?')) {
                      item.la_mac_dinh = Number(params[idx++]);
                    }
                    if (normalizedSql.includes('trang_thai = ?')) {
                      item.trang_thai = String(params[idx++]) as any;
                    }
                  }
                  item.ngay_cap_nhat = new Date().toISOString();
                }
                return { success: true };
              }

              return { success: true };
            }
          };
        },

        async all<T = unknown>(): Promise<{ results: T[] }> {
          if (normalizedSql.includes("WHERE trang_thai = 'hoat_dong'")) {
            const active = khoList
              .filter(k => k.trang_thai === 'hoat_dong')
              .sort((a, b) => b.la_mac_dinh - a.la_mac_dinh || a.ten.localeCompare(b.ten));
            return { results: active as T[] };
          }

          if (normalizedSql.includes("WHERE trang_thai != 'da_xoa'")) {
            const nonDeleted = khoList
              .filter(k => k.trang_thai !== 'da_xoa')
              .sort((a, b) => b.la_mac_dinh - a.la_mac_dinh);
            return { results: nonDeleted as T[] };
          }

          return { results: [] };
        },

        async run(): Promise<{ success: boolean }> {
          if (normalizedSql.includes('UPDATE kho_hang SET la_mac_dinh = 0 WHERE la_mac_dinh = 1')) {
            khoList.forEach(k => {
              k.la_mac_dinh = 0;
            });
            return { success: true };
          }
          return { success: true };
        }
      };
    }
  };

  const env: Env = {
    DB: mockDb as any,
    JWT_SECRET: 'test-jwt-secret-key-at-least-32-chars-long!',
    UPLOAD_CHUNK_SIZE: '5242880',
    MAX_VIDEO_DURATION_SECONDS: '600',
    GOOGLE_SERVICE_ACCOUNT_JSON: '{}',
    ENVIRONMENT: 'development'
  };

  return { env, khoList };
}

describe('Warehouse Management API (Kho Hàng)', () => {
  let mockEnv: ReturnType<typeof createMockEnv>;
  let adminToken: string;
  let staffToken: string;

  beforeEach(async () => {
    mockEnv = createMockEnv();
    const jwt = new JwtService(mockEnv.env.JWT_SECRET);
    adminToken = await jwt.sign({
      sub: 'ADMIN',
      ten: 'Quản trị viên',
      vai_tro: 'admin'
    });
    staffToken = await jwt.sign({
      sub: 'NV001',
      ten: 'Nhân viên kho',
      vai_tro: 'nhan_vien'
    });
  });

  describe('GET /api/config/kho-hang (Public/Worker Station)', () => {
    it('should return list of active warehouses for workstation config', async () => {
      const res = await app.fetch(
        new Request('http://localhost/api/config/kho-hang', {
          method: 'GET'
        }),
        mockEnv.env
      );

      expect(res.status).toBe(200);
      const json = await res.json() as any;
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data.items)).toBe(true);
      expect(json.data.items.length).toBe(2);
      expect(json.data.items[0].la_mac_dinh).toBe(true);
    });
  });

  describe('Admin CRUD /api/admin/kho-hang', () => {
    it('should block non-admin users with 403 Forbidden', async () => {
      const res = await app.fetch(
        new Request('http://localhost/api/admin/kho-hang', {
          method: 'GET',
          headers: { Authorization: `Bearer ${staffToken}` }
        }),
        mockEnv.env
      );

      expect(res.status).toBe(403);
    });

    it('should allow admin to list all warehouses', async () => {
      const res = await app.fetch(
        new Request('http://localhost/api/admin/kho-hang', {
          method: 'GET',
          headers: { Authorization: `Bearer ${adminToken}` }
        }),
        mockEnv.env
      );

      expect(res.status).toBe(200);
      const json = await res.json() as any;
      expect(json.success).toBe(true);
      expect(json.data.total).toBe(2);
    });

    it('should allow admin to create a new warehouse with default flag', async () => {
      const res = await app.fetch(
        new Request('http://localhost/api/admin/kho-hang', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ten: 'Kho Hà Nội - Cầu Giấy',
            dia_chi: '88 Duy Tân, Cầu Giấy, Hà Nội',
            la_mac_dinh: true
          })
        }),
        mockEnv.env
      );

      expect(res.status).toBe(201);
      const json = await res.json() as any;
      expect(json.success).toBe(true);
      expect(json.data.ten).toBe('Kho Hà Nội - Cầu Giấy');
      expect(json.data.la_mac_dinh).toBe(true);

      // Verify other warehouses had default reset to 0
      const oldDefault = mockEnv.khoList.find(k => k.id === 'kho-1');
      expect(oldDefault?.la_mac_dinh).toBe(0);
    });

    it('should allow admin to update warehouse information', async () => {
      const res = await app.fetch(
        new Request('http://localhost/api/admin/kho-hang/kho-2', {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ten: 'Kho Tân Bình Mở Rộng',
            dia_chi: '123 Trường Chinh, Tân Bình'
          })
        }),
        mockEnv.env
      );

      expect(res.status).toBe(200);
      const json = await res.json() as any;
      expect(json.success).toBe(true);
      expect(json.data.ten).toBe('Kho Tân Bình Mở Rộng');
    });

    it('should allow admin to set a warehouse as default', async () => {
      const res = await app.fetch(
        new Request('http://localhost/api/admin/kho-hang/kho-2/set-default', {
          method: 'PUT',
          headers: { Authorization: `Bearer ${adminToken}` }
        }),
        mockEnv.env
      );

      expect(res.status).toBe(200);
      const json = await res.json() as any;
      expect(json.success).toBe(true);

      const kho2 = mockEnv.khoList.find(k => k.id === 'kho-2');
      const kho1 = mockEnv.khoList.find(k => k.id === 'kho-1');
      expect(kho2?.la_mac_dinh).toBe(1);
      expect(kho1?.la_mac_dinh).toBe(0);
    });

    it('should allow admin to soft delete a warehouse', async () => {
      const res = await app.fetch(
        new Request('http://localhost/api/admin/kho-hang/kho-2', {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${adminToken}` }
        }),
        mockEnv.env
      );

      expect(res.status).toBe(200);
      const json = await res.json() as any;
      expect(json.success).toBe(true);

      const kho2 = mockEnv.khoList.find(k => k.id === 'kho-2');
      expect(kho2?.trang_thai).toBe('da_xoa');
    });
  });
});
