import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/index';
import { JwtService } from '../src/services/jwt-service';
import { hashPin } from '../src/utils/hash';
import { Env } from '../src/types/env';

interface MockNhanVien {
  ma: string;
  ten: string;
  pin_hash: string;
  vai_tro: 'admin' | 'nhan_vien';
  trang_thai: 'hoat_dong' | 'vo_hieu_hoa' | 'da_xoa';
  ngay_tao: string;
  ngay_cap_nhat: string;
}

interface MockBienBan {
  ma_nhan_vien: string;
  thoi_gian_tao: string;
}

interface MockPhienDangNhap {
  id: string;
  ma_nhan_vien: string;
  con_hieu_luc: number;
  thoi_gian_dang_nhap: string;
}

function createMockEnv() {
  const nhanVienList: MockNhanVien[] = [];
  const bienBanList: MockBienBan[] = [];
  const phienList: MockPhienDangNhap[] = [];

  const mockDb = {
    prepare(sql: string) {
      const normalizedSql = sql.trim().replace(/\s+/g, ' ');

      return {
        bind(...params: (string | number)[]) {
          return {
            async first<T = unknown>(): Promise<T | null> {
              if (normalizedSql.includes('SELECT ma FROM nhan_vien WHERE ma = ?') && !normalizedSql.includes('da_xoa')) {
                const ma = String(params[0]).toUpperCase();
                const found = nhanVienList.find(nv => nv.ma === ma);
                return (found ? { ma: found.ma } : null) as T;
              }

              if (normalizedSql.includes('WHERE ma = ? AND trang_thai != \'da_xoa\'')) {
                const ma = String(params[0]).toUpperCase();
                const found = nhanVienList.find(nv => nv.ma === ma && nv.trang_thai !== 'da_xoa');
                return (found ? { ...found } : null) as T;
              }

              if (normalizedSql.includes('SELECT ma, ten, pin_hash, vai_tro, trang_thai FROM nhan_vien WHERE ma = ?')) {
                const ma = String(params[0]).toUpperCase();
                const found = nhanVienList.find(nv => nv.ma === ma);
                return (found ? { ...found } : null) as T;
              }

              if (normalizedSql.includes('SELECT ma, ten, vai_tro, trang_thai, ngay_tao, ngay_cap_nhat FROM nhan_vien WHERE ma = ?')) {
                const ma = String(params[0]).toUpperCase();
                const found = nhanVienList.find(nv => nv.ma === ma);
                return (found ? { ...found } : null) as T;
              }

              if (normalizedSql.includes('COUNT(*) as count FROM nhan_vien WHERE vai_tro = \'admin\' AND trang_thai = \'hoat_dong\'')) {
                const count = nhanVienList.filter(nv => nv.vai_tro === 'admin' && nv.trang_thai === 'hoat_dong').length;
                return { count } as T;
              }

              return null;
            },

            async all<T = unknown>(): Promise<{ results: T[] }> {
              // GET /nhan-vien query
              if (normalizedSql.includes('FROM nhan_vien nv')) {
                let filtered = [...nhanVienList];

                if (normalizedSql.includes('nv.trang_thai = ?')) {
                  const targetStatus = params[0] as string;
                  filtered = filtered.filter(nv => nv.trang_thai === targetStatus);
                } else if (normalizedSql.includes("nv.trang_thai IN ('hoat_dong', 'vo_hieu_hoa')")) {
                  filtered = filtered.filter(nv => nv.trang_thai === 'hoat_dong' || nv.trang_thai === 'vo_hieu_hoa');
                }

                if (normalizedSql.includes('LOWER(nv.ma) LIKE ?')) {
                  // search pattern e.g. %nv00%
                  const pattern = String(params[params.length - 1]).replace(/%/g, '').toLowerCase();
                  filtered = filtered.filter(nv =>
                    nv.ma.toLowerCase().includes(pattern) || nv.ten.toLowerCase().includes(pattern)
                  );
                }

                const results = filtered.map(nv => {
                  const today = new Date().toISOString().slice(0, 10);
                  const so_video = bienBanList.filter(b => b.ma_nhan_vien === nv.ma && b.thoi_gian_tao.startsWith(today)).length;
                  const phiens = phienList.filter(p => p.ma_nhan_vien === nv.ma).sort((a, b) => b.thoi_gian_dang_nhap.localeCompare(a.thoi_gian_dang_nhap));
                  return {
                    ma: nv.ma,
                    ten: nv.ten,
                    vai_tro: nv.vai_tro,
                    trang_thai: nv.trang_thai,
                    ngay_tao: nv.ngay_tao,
                    ngay_cap_nhat: nv.ngay_cap_nhat,
                    so_video_hom_nay: so_video,
                    dang_nhap_cuoi: phiens.length > 0 ? phiens[0].thoi_gian_dang_nhap : null
                  };
                });

                return { results: results as T[] };
              }

              return { results: [] };
            },

            async run(): Promise<{ success: boolean }> {
              if (normalizedSql.startsWith('INSERT INTO nhan_vien')) {
                const [ma, ten, pinHash, vaiTro, trangThai] = params;
                nhanVienList.push({
                  ma: String(ma).toUpperCase(),
                  ten: String(ten),
                  pin_hash: String(pinHash),
                  vai_tro: vaiTro as 'admin' | 'nhan_vien',
                  trang_thai: trangThai as 'hoat_dong',
                  ngay_tao: new Date().toISOString(),
                  ngay_cap_nhat: new Date().toISOString()
                });
                return { success: true };
              }

              if (normalizedSql.startsWith('UPDATE nhan_vien SET')) {
                const targetMa = String(params[params.length - 1]).toUpperCase();
                const found = nhanVienList.find(nv => nv.ma === targetMa);
                if (found) {
                  let paramIdx = 0;
                  if (normalizedSql.includes('ten = ?')) {
                    found.ten = String(params[paramIdx++]);
                  }
                  if (normalizedSql.includes('vai_tro = ?')) {
                    found.vai_tro = params[paramIdx++] as 'admin' | 'nhan_vien';
                  }
                  if (normalizedSql.includes('trang_thai = ?')) {
                    found.trang_thai = params[paramIdx++] as 'hoat_dong' | 'vo_hieu_hoa' | 'da_xoa';
                  }
                  if (normalizedSql.includes('pin_hash = ?')) {
                    found.pin_hash = String(params[paramIdx++]);
                  }
                  if (normalizedSql.includes("trang_thai = 'da_xoa'")) {
                    found.trang_thai = 'da_xoa';
                  }
                  found.ngay_cap_nhat = new Date().toISOString();
                }
                return { success: true };
              }

              if (normalizedSql.startsWith('UPDATE phien_dang_nhap SET con_hieu_luc = 0')) {
                const targetMa = String(params[0]).toUpperCase();
                phienList.forEach(p => {
                  if (p.ma_nhan_vien === targetMa) p.con_hieu_luc = 0;
                });
                return { success: true };
              }

              if (normalizedSql.startsWith('INSERT INTO phien_dang_nhap')) {
                const [id, ma] = params;
                phienList.push({
                  id: String(id),
                  ma_nhan_vien: String(ma),
                  con_hieu_luc: 1,
                  thoi_gian_dang_nhap: new Date().toISOString()
                });
                return { success: true };
              }

              return { success: true };
            }
          };
        },

        async all<T = unknown>(): Promise<{ results: T[] }> {
          if (normalizedSql.includes('FROM nhan_vien nv')) {
            const filtered = nhanVienList.filter(nv => nv.trang_thai === 'hoat_dong' || nv.trang_thai === 'vo_hieu_hoa');
            const results = filtered.map(nv => ({
              ma: nv.ma,
              ten: nv.ten,
              vai_tro: nv.vai_tro,
              trang_thai: nv.trang_thai,
              ngay_tao: nv.ngay_tao,
              ngay_cap_nhat: nv.ngay_cap_nhat,
              so_video_hom_nay: 0,
              dang_nhap_cuoi: null
            }));
            return { results: results as T[] };
          }
          return { results: [] };
        },

        async first<T = unknown>(): Promise<T | null> {
          if (normalizedSql.includes('COUNT(*) as count FROM nhan_vien WHERE vai_tro = \'admin\' AND trang_thai = \'hoat_dong\'')) {
            const count = nhanVienList.filter(nv => nv.vai_tro === 'admin' && nv.trang_thai === 'hoat_dong').length;
            return { count } as T;
          }
          return null;
        },

        async run(): Promise<{ success: boolean }> {
          return { success: true };
        }
      };
    }
  };

  const env: Env = {
    DB: mockDb as unknown as D1Database,
    ALLOWED_ORIGINS: 'http://localhost:5173',
    JWT_SECRET: 'test-jwt-secret-key-32-chars-long!!',
    JWT_EXPIRES_IN: '3600',
    DRIVE_FOLDER_ID: 'test-folder',
    GOOGLE_SHEET_ID: 'test-sheet',
    UPLOAD_CHUNK_SIZE: '5242880',
    GOOGLE_SERVICE_ACCOUNT_JSON: '{}'
  };

  return { env, nhanVienList, bienBanList, phienList };
}

describe('Step 3.4B — Backend CRUD Nhân viên (Admin Only)', () => {
  let env: Env;
  let nhanVienList: MockNhanVien[];
  let jwtService: JwtService;
  let adminToken: string;
  let employeeToken: string;

  beforeEach(async () => {
    const mock = createMockEnv();
    env = mock.env;
    nhanVienList = mock.nhanVienList;
    jwtService = new JwtService(env.JWT_SECRET);

    // Seed 1 Admin and 2 Employees
    const adminPinHash = await hashPin('0000');
    const nv1PinHash = await hashPin('1234');
    const nv2PinHash = await hashPin('5678');

    nhanVienList.push(
      {
        ma: 'ADMIN',
        ten: 'Quản Trị Viên',
        pin_hash: adminPinHash,
        vai_tro: 'admin',
        trang_thai: 'hoat_dong',
        ngay_tao: '2026-09-01T00:00:00Z',
        ngay_cap_nhat: '2026-09-01T00:00:00Z'
      },
      {
        ma: 'NV001',
        ten: 'Nguyễn Văn A',
        pin_hash: nv1PinHash,
        vai_tro: 'nhan_vien',
        trang_thai: 'hoat_dong',
        ngay_tao: '2026-09-02T00:00:00Z',
        ngay_cap_nhat: '2026-09-02T00:00:00Z'
      },
      {
        ma: 'NV002',
        ten: 'Trần Thị B',
        pin_hash: nv2PinHash,
        vai_tro: 'nhan_vien',
        trang_thai: 'hoat_dong',
        ngay_tao: '2026-09-03T00:00:00Z',
        ngay_cap_nhat: '2026-09-03T00:00:00Z'
      }
    );

    adminToken = await jwtService.sign({ sub: 'ADMIN', ten: 'Quản Trị Viên', vai_tro: 'admin' });
    employeeToken = await jwtService.sign({ sub: 'NV001', ten: 'Nguyễn Văn A', vai_tro: 'nhan_vien' });
  });

  // -------------------------------------------------------------------------
  // 1. RBAC Guard: Non-admin -> 403, No token -> 401
  // -------------------------------------------------------------------------
  describe('RBAC Guards on /api/admin/*', () => {
    it('should return 401 when no token is provided', async () => {
      const res = await app.fetch(new Request('http://localhost/api/admin/nhan-vien'), env);
      expect(res.status).toBe(401);
      const data = await res.json() as { success: boolean; error: { code: string } };
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 403 when non-admin accesses GET /api/admin/nhan-vien', async () => {
      const res = await app.fetch(
        new Request('http://localhost/api/admin/nhan-vien', {
          headers: { Authorization: `Bearer ${employeeToken}` }
        }),
        env
      );
      expect(res.status).toBe(403);
      const data = await res.json() as { success: boolean; error: { code: string } };
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
    });

    it('should return 403 when non-admin accesses PUT /api/admin/nhan-vien/:ma', async () => {
      const res = await app.fetch(
        new Request('http://localhost/api/admin/nhan-vien/NV001', {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${employeeToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ten: 'Hack Name' })
        }),
        env
      );
      expect(res.status).toBe(403);
    });

    it('should return 403 when non-admin accesses DELETE /api/admin/nhan-vien/:ma', async () => {
      const res = await app.fetch(
        new Request('http://localhost/api/admin/nhan-vien/NV001', {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${employeeToken}` }
        }),
        env
      );
      expect(res.status).toBe(403);
    });
  });

  // -------------------------------------------------------------------------
  // 2. GET /api/admin/nhan-vien
  // -------------------------------------------------------------------------
  describe('GET /api/admin/nhan-vien', () => {
    it('should return list with items and total, hiding da_xoa by default', async () => {
      // Add a deleted employee
      nhanVienList.push({
        ma: 'NV_DELETED',
        ten: 'Người Đã Xóa',
        pin_hash: 'hash',
        vai_tro: 'nhan_vien',
        trang_thai: 'da_xoa',
        ngay_tao: '2026-09-01T00:00:00Z',
        ngay_cap_nhat: '2026-09-01T00:00:00Z'
      });

      const res = await app.fetch(
        new Request('http://localhost/api/admin/nhan-vien', {
          headers: { Authorization: `Bearer ${adminToken}` }
        }),
        env
      );
      expect(res.status).toBe(200);
      const data = await res.json() as { success: boolean; data: { items: MockNhanVien[]; total: number } };
      expect(data.success).toBe(true);
      expect(data.data.items).toHaveLength(3);
      expect(data.data.total).toBe(3);
      expect(data.data.items.some(i => i.ma === 'NV_DELETED')).toBe(false);
    });

    it('should filter by search query matching ma or ten', async () => {
      const res = await app.fetch(
        new Request('http://localhost/api/admin/nhan-vien?search=NV001', {
          headers: { Authorization: `Bearer ${adminToken}` }
        }),
        env
      );
      expect(res.status).toBe(200);
      const data = await res.json() as { success: boolean; data: { items: MockNhanVien[]; total: number } };
      expect(data.data.items).toHaveLength(1);
      expect(data.data.items[0].ma).toBe('NV001');
    });

    it('should show da_xoa only when ?trang_thai=da_xoa', async () => {
      nhanVienList.push({
        ma: 'NV_DELETED',
        ten: 'Người Đã Xóa',
        pin_hash: 'hash',
        vai_tro: 'nhan_vien',
        trang_thai: 'da_xoa',
        ngay_tao: '2026-09-01T00:00:00Z',
        ngay_cap_nhat: '2026-09-01T00:00:00Z'
      });

      const res = await app.fetch(
        new Request('http://localhost/api/admin/nhan-vien?trang_thai=da_xoa', {
          headers: { Authorization: `Bearer ${adminToken}` }
        }),
        env
      );
      expect(res.status).toBe(200);
      const data = await res.json() as { success: boolean; data: { items: MockNhanVien[]; total: number } };
      expect(data.data.items).toHaveLength(1);
      expect(data.data.items[0].ma).toBe('NV_DELETED');
    });
  });

  // -------------------------------------------------------------------------
  // 3. POST /api/admin/nhan-vien
  // -------------------------------------------------------------------------
  describe('POST /api/admin/nhan-vien', () => {
    it('should create employee successfully with uppercase ma and default role', async () => {
      const res = await app.fetch(
        new Request('http://localhost/api/admin/nhan-vien', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ma: 'nv003',
            ten: 'Lê Văn C',
            pin: '9999'
          })
        }),
        env
      );
      expect(res.status).toBe(201);
      const data = await res.json() as { success: boolean; data: { ma: string; vai_tro: string; trang_thai: string } };
      expect(data.success).toBe(true);
      expect(data.data.ma).toBe('NV003');
      expect(data.data.vai_tro).toBe('nhan_vien');
      expect(data.data.trang_thai).toBe('hoat_dong');

      // Verify in list
      const created = nhanVienList.find(nv => nv.ma === 'NV003');
      expect(created).toBeDefined();
      expect(created?.ten).toBe('Lê Văn C');
    });

    it('should reject duplicate employee code with 409 USER_EXISTS', async () => {
      const res = await app.fetch(
        new Request('http://localhost/api/admin/nhan-vien', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ma: 'NV001',
            ten: 'Trùng Mã',
            pin: '0000'
          })
        }),
        env
      );
      expect(res.status).toBe(409);
      const data = await res.json() as { success: boolean; error: { code: string } };
      expect(data.error.code).toBe('USER_EXISTS');
    });

    it('should reject invalid PIN (not 4 digits) with 400', async () => {
      const res = await app.fetch(
        new Request('http://localhost/api/admin/nhan-vien', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ma: 'NV999',
            ten: 'Invalid PIN',
            pin: '123' // only 3 digits
          })
        }),
        env
      );
      expect(res.status).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // 4. PUT /api/admin/nhan-vien/:ma
  // -------------------------------------------------------------------------
  describe('PUT /api/admin/nhan-vien/:ma', () => {
    it('should partially update employee name', async () => {
      const res = await app.fetch(
        new Request('http://localhost/api/admin/nhan-vien/NV001', {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ten: 'Nguyễn Văn A (Đã Cập Nhật)'
          })
        }),
        env
      );
      expect(res.status).toBe(200);
      const data = await res.json() as { success: boolean; data: { ma: string; ten: string } };
      expect(data.success).toBe(true);
      expect(data.data.ten).toBe('Nguyễn Văn A (Đã Cập Nhật)');

      const updated = nhanVienList.find(nv => nv.ma === 'NV001');
      expect(updated?.ten).toBe('Nguyễn Văn A (Đã Cập Nhật)');
    });

    it('should disable employee (vo_hieu_hoa) and invalidate login', async () => {
      const res = await app.fetch(
        new Request('http://localhost/api/admin/nhan-vien/NV001', {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            trang_thai: 'vo_hieu_hoa'
          })
        }),
        env
      );
      expect(res.status).toBe(200);
      expect(nhanVienList.find(nv => nv.ma === 'NV001')?.trang_thai).toBe('vo_hieu_hoa');

      // Attempt login with disabled employee
      const loginRes = await app.fetch(
        new Request('http://localhost/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ma_nhan_vien: 'NV001',
            pin: '1234'
          })
        }),
        env
      );
      expect(loginRes.status).toBe(401);
      const loginData = await loginRes.json() as { success: boolean; error: { code: string } };
      expect(loginData.error.code).toBe('ACCOUNT_DISABLED');
    });

    it('should prevent disabling the last active admin with 400 LAST_ADMIN', async () => {
      const res = await app.fetch(
        new Request('http://localhost/api/admin/nhan-vien/ADMIN', {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            trang_thai: 'vo_hieu_hoa'
          })
        }),
        env
      );
      expect(res.status).toBe(400);
      const data = await res.json() as { success: boolean; error: { code: string } };
      expect(data.error.code).toBe('LAST_ADMIN');
    });

    it('should prevent demoting the last active admin with 400 LAST_ADMIN', async () => {
      const res = await app.fetch(
        new Request('http://localhost/api/admin/nhan-vien/ADMIN', {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            vai_tro: 'nhan_vien'
          })
        }),
        env
      );
      expect(res.status).toBe(400);
      const data = await res.json() as { success: boolean; error: { code: string } };
      expect(data.error.code).toBe('LAST_ADMIN');
    });

    it('should reject empty update body with 400', async () => {
      const res = await app.fetch(
        new Request('http://localhost/api/admin/nhan-vien/NV001', {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({})
        }),
        env
      );
      expect(res.status).toBe(400);
    });

    it('should return 404 when updating non-existent employee', async () => {
      const res = await app.fetch(
        new Request('http://localhost/api/admin/nhan-vien/NV_UNKNOWN', {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ten: 'Ghost' })
        }),
        env
      );
      expect(res.status).toBe(404);
      const data = await res.json() as { success: boolean; error: { code: string } };
      expect(data.error.code).toBe('USER_NOT_FOUND');
    });
  });

  // -------------------------------------------------------------------------
  // 5. DELETE /api/admin/nhan-vien/:ma
  // -------------------------------------------------------------------------
  describe('DELETE /api/admin/nhan-vien/:ma', () => {
    it('should soft-delete employee and prevent login with 401 USER_NOT_FOUND', async () => {
      const res = await app.fetch(
        new Request('http://localhost/api/admin/nhan-vien/NV002', {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${adminToken}` }
        }),
        env
      );
      expect(res.status).toBe(200);
      const data = await res.json() as { success: boolean; data: { ma: string; trang_thai: string } };
      expect(data.success).toBe(true);
      expect(data.data.trang_thai).toBe('da_xoa');

      const deleted = nhanVienList.find(nv => nv.ma === 'NV002');
      expect(deleted?.trang_thai).toBe('da_xoa');

      // Attempt login with soft-deleted employee
      const loginRes = await app.fetch(
        new Request('http://localhost/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ma_nhan_vien: 'NV002',
            pin: '5678'
          })
        }),
        env
      );
      expect(loginRes.status).toBe(401);
      const loginData = await loginRes.json() as { success: boolean; error: { code: string } };
      expect(loginData.error.code).toBe('USER_NOT_FOUND');
    });

    it('should block deleting the last admin with 400 LAST_ADMIN', async () => {
      const res = await app.fetch(
        new Request('http://localhost/api/admin/nhan-vien/ADMIN', {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${adminToken}` }
        }),
        env
      );
      expect(res.status).toBe(400);
      const data = await res.json() as { success: boolean; error: { code: string } };
      expect(data.error.code).toBe('LAST_ADMIN');
    });

    it('should return 404 when deleting an already soft-deleted employee', async () => {
      // First delete NV002
      await app.fetch(
        new Request('http://localhost/api/admin/nhan-vien/NV002', {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${adminToken}` }
        }),
        env
      );

      // Attempt deleting again
      const res = await app.fetch(
        new Request('http://localhost/api/admin/nhan-vien/NV002', {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${adminToken}` }
        }),
        env
      );
      expect(res.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // 6. PUT /api/admin/nhan-vien/:ma/reset-pin
  // -------------------------------------------------------------------------
  describe('PUT /api/admin/nhan-vien/:ma/reset-pin', () => {
    it('should reset PIN and require employee to login with new PIN', async () => {
      const res = await app.fetch(
        new Request('http://localhost/api/admin/nhan-vien/NV001/reset-pin', {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ pin_moi: '8888' })
        }),
        env
      );
      expect(res.status).toBe(200);
      const data = await res.json() as { success: boolean; data: { ma: string; message: string } };
      expect(data.success).toBe(true);

      // Old PIN '1234' should now fail
      const oldPinLogin = await app.fetch(
        new Request('http://localhost/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ma_nhan_vien: 'NV001', pin: '1234' })
        }),
        env
      );
      expect(oldPinLogin.status).toBe(401);
      const oldPinData = await oldPinLogin.json() as { success: boolean; error: { code: string } };
      expect(oldPinData.error.code).toBe('INVALID_PIN');

      // New PIN '8888' should succeed
      const newPinLogin = await app.fetch(
        new Request('http://localhost/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ma_nhan_vien: 'NV001', pin: '8888' })
        }),
        env
      );
      expect(newPinLogin.status).toBe(200);
      const newPinData = await newPinLogin.json() as { success: boolean; data: { token: string } };
      expect(newPinData.data.token).toBeDefined();
    });

    it('should reject non-4-digit PIN with 400', async () => {
      const res = await app.fetch(
        new Request('http://localhost/api/admin/nhan-vien/NV001/reset-pin', {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ pin_moi: 'abcd' })
        }),
        env
      );
      expect(res.status).toBe(400);
    });

    it('should return 400 ACCOUNT_DISABLED when resetting PIN on disabled account', async () => {
      nhanVienList.find(nv => nv.ma === 'NV001')!.trang_thai = 'vo_hieu_hoa';

      const res = await app.fetch(
        new Request('http://localhost/api/admin/nhan-vien/NV001/reset-pin', {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ pin_moi: '5555' })
        }),
        env
      );
      expect(res.status).toBe(400);
      const data = await res.json() as { success: boolean; error: { code: string } };
      expect(data.error.code).toBe('ACCOUNT_DISABLED');
    });

    it('should return 404 when resetting PIN on non-existent account', async () => {
      const res = await app.fetch(
        new Request('http://localhost/api/admin/nhan-vien/NON_EXISTENT/reset-pin', {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ pin_moi: '5555' })
        }),
        env
      );
      expect(res.status).toBe(404);
      const data = await res.json() as { success: boolean; error: { code: string } };
      expect(data.error.code).toBe('USER_NOT_FOUND');
    });
  });
});
