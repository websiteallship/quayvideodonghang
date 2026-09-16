import { describe, it, expect } from 'vitest';

const BASE = 'http://localhost:8787';

// Helpers
async function post(url: string, body: unknown, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${url}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  return { status: res.status, data: await res.json() as Record<string, unknown> };
}

async function get(url: string, token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${url}`, { headers });
  return { status: res.status, data: await res.json() as Record<string, unknown> };
}

describe('Sprint 0 — Backend Integration Tests', () => {
  let nvToken = '';
  let adminToken = '';

  // === Step 0.2: Health Check ===
  describe('Step 0.2 — Health & CORS', () => {
    it('GET / should return ok status', async () => {
      const { status, data } = await get('/');
      expect(status).toBe(200);
      expect(data.success).toBe(true);
      const inner = data.data as Record<string, unknown>;
      expect(inner.status).toBe('ok');
      expect(inner.service).toContain('Quay Video');
    });

    it('GET /health should return plain OK', async () => {
      const res = await fetch(`${BASE}/health`);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toBe('OK');
    });

    it('CORS preflight should respond 204', async () => {
      const res = await fetch(`${BASE}/api/auth/login`, {
        method: 'OPTIONS',
        headers: { Origin: 'http://localhost:5173' }
      });
      expect(res.status).toBe(204);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
    });

    it('CORS preflight from unauthorized origin should reject with 403', async () => {
      const res = await fetch(`${BASE}/api/auth/login`, {
        method: 'OPTIONS',
        headers: { Origin: 'https://evil-hacker.com' }
      });
      expect(res.status).toBe(403);
    });

    it('404 should return JSON envelope', async () => {
      const { status, data } = await get('/api/nonexistent');
      expect(status).toBe(404);
      expect(data.success).toBe(false);
      expect((data.error as Record<string, unknown>).code).toBe('NOT_FOUND');
    });
  });

  // === Step 0.3 Part: Auth Endpoints ===
  describe('Step 0.3 — Auth Endpoints', () => {
    it('POST /api/auth/login with valid NV001 PIN should return JWT', async () => {
      const { status, data } = await post('/api/auth/login', {
        ma_nhan_vien: 'NV001',
        pin: '1234'
      });
      expect(status).toBe(200);
      expect(data.success).toBe(true);
      const inner = data.data as Record<string, unknown>;
      expect(inner.token).toBeTruthy();
      expect(typeof inner.token).toBe('string');
      nvToken = inner.token as string;

      const nv = inner.nhan_vien as Record<string, unknown>;
      expect(nv.ma_nhan_vien).toBe('NV001');
      expect(nv.vai_tro).toBe('nhan_vien');
    });

    it('POST /api/auth/login with ADMIN should return admin JWT', async () => {
      const { status, data } = await post('/api/auth/login', {
        ma_nhan_vien: 'ADMIN',
        pin: '0000'
      });
      expect(status).toBe(200);
      expect(data.success).toBe(true);
      adminToken = (data.data as Record<string, unknown>).token as string;
      const nv = (data.data as Record<string, unknown>).nhan_vien as Record<string, unknown>;
      expect(nv.vai_tro).toBe('admin');
    });

    it('POST /api/auth/login with wrong PIN should 401', async () => {
      const { status, data } = await post('/api/auth/login', {
        ma_nhan_vien: 'NV001',
        pin: '9999'
      });
      expect(status).toBe(401);
      expect(data.success).toBe(false);
      expect((data.error as Record<string, unknown>).code).toBe('INVALID_PIN');
    });

    it('POST /api/auth/login with non-existent user should 401', async () => {
      const { status, data } = await post('/api/auth/login', {
        ma_nhan_vien: 'NV999',
        pin: '1234'
      });
      expect(status).toBe(401);
      expect((data.error as Record<string, unknown>).code).toBe('USER_NOT_FOUND');
    });

    it('POST /api/auth/login with invalid body should 400', async () => {
      const { status, data } = await post('/api/auth/login', {
        ma_nhan_vien: '',
        pin: '12'
      });
      expect(status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('GET /api/auth/verify with valid token should return user', async () => {
      const { status, data } = await get('/api/auth/verify', nvToken);
      expect(status).toBe(200);
      expect(data.success).toBe(true);
      const nv = (data.data as Record<string, unknown>).nhan_vien as Record<string, unknown>;
      expect(nv.ma_nhan_vien).toBe('NV001');
    });

    it('GET /api/auth/verify without token should 401', async () => {
      const { status, data } = await get('/api/auth/verify');
      expect(status).toBe(401);
      expect((data.error as Record<string, unknown>).code).toBe('UNAUTHORIZED');
    });

    it('GET /api/auth/verify with invalid token should 401', async () => {
      const { status, data } = await get('/api/auth/verify', 'fake.jwt.token');
      expect(status).toBe(401);
      expect((data.error as Record<string, unknown>).code).toBe('TOKEN_INVALID');
    });
  });

  // === Upload Init / Complete / Error Lifecycle ===
  describe('Step 0.3 & Step 1.3 — Upload Lifecycle & Duplicate Check', () => {
    const testId = crypto.randomUUID();
    const testCode = `GHN${Date.now()}`;

    it('GET /api/bien-ban/check/:ma_van_don should return da_co_video: false for new code', async () => {
      const { status, data } = await get(`/api/bien-ban/check/${testCode}`, nvToken);
      expect(status).toBe(200);
      expect(data.success).toBe(true);
      const inner = data.data as Record<string, unknown>;
      expect(inner.da_co_video).toBe(false);
      expect(inner.so_luong_video).toBe(0);
      expect(inner.video_gan_nhat).toBeNull();
      expect(inner.exists).toBe(false);
    });

    it('GET /api/bien-ban/check/:ma_van_don should reject invalid code format with 400', async () => {
      const { status, data } = await get('/api/bien-ban/check/bad<script>', nvToken);
      expect(status).toBe(400);
      expect(data.success).toBe(false);
      const error = data.error as Record<string, unknown>;
      expect(error.code).toBe('INVALID_MA_VAN_DON');
    });

    it('POST /api/upload/init should create bien_ban record', async () => {
      const { status, data } = await post('/api/upload/init', {
        id: testId,
        ma_van_don: testCode,
        don_vi_vc: 'GHN',
        loai_bien_ban: 'dong_goi',
        thoi_luong_video: 30,
        kich_thuoc_bytes: 5242880,
        mime_type: 'video/webm'
      }, nvToken);
      expect(status).toBe(201);
      expect(data.success).toBe(true);
      const inner = data.data as Record<string, unknown>;
      expect(inner.bien_ban_id).toBe(testId);
      expect(inner.resumable_upload_url).toBeTruthy();
      expect(inner.chunk_size).toBe(5242880);
    });

    it('GET /api/bien-ban/check/:ma_van_don should detect existing video (Step 1.3)', async () => {
      const { status, data } = await get(`/api/bien-ban/check/${testCode}`, nvToken);
      expect(status).toBe(200);
      const inner = data.data as Record<string, unknown>;
      expect(inner.da_co_video).toBe(true);
      expect(inner.so_luong_video).toBe(1);
      expect(inner.video_gan_nhat).toBeTruthy();
      const videoGanNhat = inner.video_gan_nhat as Record<string, unknown>;
      expect(videoGanNhat.id).toBe(testId);
      expect(videoGanNhat.loai_bien_ban).toBe('dong_goi');
      expect(videoGanNhat.ma_nhan_vien).toBe('NV001');
      // Backward compatibility
      expect(inner.exists).toBe(true);
      const record = inner.record as Record<string, unknown>;
      expect(record.ma_van_don).toBe(testCode);
      expect(record.trang_thai).toBe('cho_upload');
    });

    it('POST /api/upload/complete should update status to da_upload', async () => {
      const { status, data } = await post('/api/upload/complete', {
        id: testId,
        drive_file_id: 'drive_file_abc123',
        drive_file_name: `${testCode}_1234567890.webm`
      }, nvToken);
      expect(status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('GET /api/bien-ban/:id after complete should show da_upload', async () => {
      const { status, data } = await get(`/api/bien-ban/${testId}`, nvToken);
      expect(status).toBe(200);
      const record = data.data as Record<string, unknown>;
      expect(record.trang_thai).toBe('da_upload');
      expect(record.drive_file_id).toBe('drive_file_abc123');
    });
  });

  // === Dashboard Stats ===
  describe('Step 0.3 — Dashboard', () => {
    it('GET /api/dashboard/stats should return counts', async () => {
      const { status, data } = await get('/api/dashboard/stats', nvToken);
      expect(status).toBe(200);
      expect(data.success).toBe(true);
      const inner = data.data as Record<string, unknown>;
      expect(typeof inner.tong_hom_nay).toBe('number');
      expect(typeof inner.da_luu).toBe('number');
      expect(typeof inner.cho_tai).toBe('number');
      expect(typeof inner.loi).toBe('number');
    });
  });

  // === Config Public ===
  describe('Step 0.3 — Public Config', () => {
    it('GET /api/config/public should return app metadata', async () => {
      const { status, data } = await get('/api/config/public');
      expect(status).toBe(200);
      const inner = data.data as Record<string, unknown>;
      expect(inner.app_name).toBeTruthy();
      expect(inner.version).toBe('1.0.0');
      expect(Array.isArray(inner.don_vi_vc)).toBe(true);
      expect(inner.max_duration_seconds).toBe(600);
      expect(inner.chunk_size).toBe(5242880);
    });
  });

  // === RBAC: Admin vs NhanVien ===
  describe('Step 0.3 — RBAC Protection', () => {
    it('NV001 should be FORBIDDEN from admin routes', async () => {
      const { status, data } = await get('/api/admin/nhan-vien', nvToken);
      expect(status).toBe(403);
      expect((data.error as Record<string, unknown>).code).toBe('FORBIDDEN');
    });

    it('ADMIN should access admin routes', async () => {
      const { status, data } = await get('/api/admin/nhan-vien', adminToken);
      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('ADMIN can create new employee', async () => {
      const { status, data } = await post('/api/admin/nhan-vien', {
        ma: 'NVTEST',
        ten: 'Test Employee',
        pin: '0000'
      }, adminToken);
      // Might be 201 (created) or 409 (already exists from previous run)
      expect([201, 409]).toContain(status);
    });

    it('ADMIN can read config', async () => {
      const { status, data } = await get('/api/admin/cau-hinh', adminToken);
      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });
  });

  // === BienBan Listing ===
  describe('Step 0.3 — BienBan Pagination', () => {
    it('GET /api/bien-ban should return paginated list', async () => {
      const { status, data } = await get('/api/bien-ban?page=1&limit=10', nvToken);
      expect(status).toBe(200);
      const inner = data.data as Record<string, unknown>;
      expect(inner.page).toBe(1);
      expect(inner.limit).toBe(10);
      expect(typeof inner.total).toBe('number');
      expect(typeof inner.total_pages).toBe('number');
      expect(Array.isArray(inner.items)).toBe(true);
    });

    it('GET /api/bien-ban with status filter', async () => {
      const { status, data } = await get('/api/bien-ban?status=da_upload', nvToken);
      expect(status).toBe(200);
      const inner = data.data as Record<string, unknown>;
      const items = inner.items as Array<Record<string, unknown>>;
      for (const item of items) {
        expect(item.trang_thai).toBe('da_upload');
      }
    });

    it('GET /api/bien-ban should reject invalid query with 400', async () => {
      const { status, data } = await get('/api/bien-ban?limit=999', nvToken);
      expect(status).toBe(400);
      expect((data.error as Record<string, unknown>).code).toBe('INVALID_QUERY');
    });

    it('GET /api/bien-ban/:id should return 400 for invalid UUID format', async () => {
      const { status, data } = await get('/api/bien-ban/nonexistent-uuid', nvToken);
      expect(status).toBe(400);
      expect((data.error as Record<string, unknown>).code).toBe('INVALID_ID');
    });

    it('GET /api/bien-ban/:id should return 404 for non-existent UUID', async () => {
      const { status, data } = await get('/api/bien-ban/00000000-0000-0000-0000-000000000000', nvToken);
      expect(status).toBe(404);
      expect((data.error as Record<string, unknown>).code).toBe('NOT_FOUND');
    });
  });
});
