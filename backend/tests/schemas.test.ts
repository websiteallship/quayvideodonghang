import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  LoginRequestSchema,
  UploadInitSchema,
  UploadCompleteSchema,
  UploadErrorSchema,
  UploadCancelSchema,
  BienBanQuerySchema,
  NhanVienCreateSchema,
  NhanVienUpdateSchema,
  ResetPinSchema,
  NhanVienQuerySchema,
  CauHinhUpdateSchema,
  CheckMaVanDonParamSchema,
  BienBanIdParamSchema
} from '../src/types/schemas';

describe('LoginRequestSchema', () => {
  it('should accept valid login data', () => {
    const result = LoginRequestSchema.safeParse({
      ma_nhan_vien: 'NV001',
      pin: '1234'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.thiet_bi).toBe('mobile'); // default
    }
  });

  it('should accept valid login with thiet_bi', () => {
    const result = LoginRequestSchema.safeParse({
      ma_nhan_vien: 'NV001',
      pin: '1234',
      thiet_bi: 'pc_webcam'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.thiet_bi).toBe('pc_webcam');
    }
  });

  it('should reject empty ma_nhan_vien', () => {
    const result = LoginRequestSchema.safeParse({
      ma_nhan_vien: '',
      pin: '1234'
    });
    expect(result.success).toBe(false);
  });

  it('should reject PIN shorter than 4 chars', () => {
    const result = LoginRequestSchema.safeParse({
      ma_nhan_vien: 'NV001',
      pin: '12'
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid thiet_bi', () => {
    const result = LoginRequestSchema.safeParse({
      ma_nhan_vien: 'NV001',
      pin: '1234',
      thiet_bi: 'tablet'
    });
    expect(result.success).toBe(false);
  });
});

describe('UploadInitSchema', () => {
  const validPayload = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    ma_van_don: 'GHN123456789',
    don_vi_vc: 'GHN',
    loai_bien_ban: 'dong_goi' as const,
    thoi_luong_video: 45,
    kich_thuoc_bytes: 10485760,
    mime_type: 'video/webm'
  };

  it('should accept valid upload init data', () => {
    const result = UploadInitSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('should reject non-UUID id', () => {
    const result = UploadInitSchema.safeParse({ ...validPayload, id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('should reject empty ma_van_don', () => {
    const result = UploadInitSchema.safeParse({ ...validPayload, ma_van_don: '' });
    expect(result.success).toBe(false);
  });

  it('should reject invalid loai_bien_ban', () => {
    const result = UploadInitSchema.safeParse({ ...validPayload, loai_bien_ban: 'tra_hang' });
    expect(result.success).toBe(false);
  });

  it('should reject negative thoi_luong_video', () => {
    const result = UploadInitSchema.safeParse({ ...validPayload, thoi_luong_video: -10 });
    expect(result.success).toBe(false);
  });

  it('should reject zero kich_thuoc_bytes', () => {
    const result = UploadInitSchema.safeParse({ ...validPayload, kich_thuoc_bytes: 0 });
    expect(result.success).toBe(false);
  });

  it('should default thiet_bi to mobile', () => {
    const result = UploadInitSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.thiet_bi).toBe('mobile');
    }
  });
});

describe('UploadCompleteSchema', () => {
  it('should accept valid data', () => {
    const result = UploadCompleteSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      drive_file_id: '1abc123def',
      drive_file_name: 'DongGoi_GHN123_GHN_NV001.webm'
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty drive_file_id', () => {
    const result = UploadCompleteSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      drive_file_id: '',
      drive_file_name: 'test.webm'
    });
    expect(result.success).toBe(false);
  });
});

describe('UploadErrorSchema', () => {
  it('should accept valid error report', () => {
    const result = UploadErrorSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      loi_message: 'Network timeout'
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty loi_message', () => {
    const result = UploadErrorSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      loi_message: ''
    });
    expect(result.success).toBe(false);
  });
});

describe('UploadCancelSchema', () => {
  it('should accept valid cancel payload with UUID', () => {
    const result = UploadCancelSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000'
    });
    expect(result.success).toBe(true);
  });

  it('should reject non-UUID id', () => {
    const result = UploadCancelSchema.safeParse({
      id: 'not-a-valid-uuid'
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing id', () => {
    const result = UploadCancelSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('NhanVienCreateSchema', () => {
  it('should accept valid employee', () => {
    const result = NhanVienCreateSchema.safeParse({
      ma: 'NV003',
      ten: 'Tran Van Test',
      pin: '9876'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vai_tro).toBe('nhan_vien'); // default
    }
  });

  it('should reject non-numeric PIN', () => {
    const result = NhanVienCreateSchema.safeParse({
      ma: 'NV003',
      ten: 'Test',
      pin: 'abcd'
    });
    expect(result.success).toBe(false);
  });

  it('should reject PIN with wrong length', () => {
    const result = NhanVienCreateSchema.safeParse({
      ma: 'NV003',
      ten: 'Test',
      pin: '12345'
    });
    expect(result.success).toBe(false);
  });

  it('should accept admin role', () => {
    const result = NhanVienCreateSchema.safeParse({
      ma: 'ADM2',
      ten: 'Admin 2',
      pin: '0000',
      vai_tro: 'admin'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vai_tro).toBe('admin');
    }
  });
});

describe('CauHinhUpdateSchema', () => {
  it('should accept valid config update', () => {
    const result = CauHinhUpdateSchema.safeParse({
      khoa: 'drive_folder_id',
      gia_tri: 'abc123xyz'
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty khoa', () => {
    const result = CauHinhUpdateSchema.safeParse({
      khoa: '',
      gia_tri: 'value'
    });
    expect(result.success).toBe(false);
  });
});

describe('BienBanQuerySchema', () => {
  it('should provide defaults for empty query', () => {
    const result = BienBanQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it('should clamp limit to max 50', () => {
    const result = BienBanQuerySchema.safeParse({ limit: 100 });
    expect(result.success).toBe(false);
  });

  it('should accept valid status filter', () => {
    const result = BienBanQuerySchema.safeParse({ status: 'da_upload' });
    expect(result.success).toBe(true);
  });

  it('should reject invalid status', () => {
    const result = BienBanQuerySchema.safeParse({ status: 'xoa' });
    expect(result.success).toBe(false);
  });
});

describe('CheckMaVanDonParamSchema', () => {
  it('should accept valid standard tracking code', () => {
    const result = CheckMaVanDonParamSchema.safeParse({ ma_van_don: 'GHN0123456789' });
    expect(result.success).toBe(true);
  });

  it('should accept codes with hyphen and underscore', () => {
    const result = CheckMaVanDonParamSchema.safeParse({ ma_van_don: 'VTP-123_456-ABC' });
    expect(result.success).toBe(true);
  });

  it('should reject code shorter than 4 characters', () => {
    const result = CheckMaVanDonParamSchema.safeParse({ ma_van_don: 'ABC' });
    expect(result.success).toBe(false);
  });

  it('should reject code longer than 64 characters', () => {
    const result = CheckMaVanDonParamSchema.safeParse({ ma_van_don: 'A'.repeat(65) });
    expect(result.success).toBe(false);
  });

  it('should reject code containing special characters (XSS/SQLi attempt)', () => {
    const result = CheckMaVanDonParamSchema.safeParse({ ma_van_don: 'GHN<script>alert(1)</script>' });
    expect(result.success).toBe(false);
  });

  it('should reject code containing spaces', () => {
    const result = CheckMaVanDonParamSchema.safeParse({ ma_van_don: 'GHN 123 456' });
    expect(result.success).toBe(false);
  });
});

describe('BienBanIdParamSchema', () => {
  it('should accept valid UUID v4', () => {
    const result = BienBanIdParamSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000'
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid UUID string', () => {
    const result = BienBanIdParamSchema.safeParse({
      id: 'not-a-valid-uuid'
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty id', () => {
    const result = BienBanIdParamSchema.safeParse({
      id: ''
    });
    expect(result.success).toBe(false);
  });
});

describe('NhanVienCreateSchema', () => {
  it('should accept valid employee and uppercase ma', () => {
    const result = NhanVienCreateSchema.safeParse({
      ma: 'nv009',
      ten: 'Nguyen Van Test',
      pin: '1234'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ma).toBe('NV009');
      expect(result.data.vai_tro).toBe('nhan_vien'); // default
    }
  });

  it('should accept valid admin role', () => {
    const result = NhanVienCreateSchema.safeParse({
      ma: 'ADMIN02',
      ten: 'Admin User',
      pin: '9999',
      vai_tro: 'admin'
    });
    expect(result.success).toBe(true);
  });

  it('should reject non-4-digit PIN', () => {
    const result = NhanVienCreateSchema.safeParse({
      ma: 'NV01',
      ten: 'User',
      pin: '123'
    });
    expect(result.success).toBe(false);
  });

  it('should reject PIN with letters', () => {
    const result = NhanVienCreateSchema.safeParse({
      ma: 'NV01',
      ten: 'User',
      pin: '12ab'
    });
    expect(result.success).toBe(false);
  });

  it('should reject ma containing special characters', () => {
    const result = NhanVienCreateSchema.safeParse({
      ma: 'NV@01',
      ten: 'User',
      pin: '1234'
    });
    expect(result.success).toBe(false);
  });
});

describe('NhanVienUpdateSchema', () => {
  it('should accept partial update with only ten', () => {
    const result = NhanVienUpdateSchema.safeParse({
      ten: 'Ten Moi'
    });
    expect(result.success).toBe(true);
  });

  it('should accept partial update with vai_tro and trang_thai', () => {
    const result = NhanVienUpdateSchema.safeParse({
      vai_tro: 'admin',
      trang_thai: 'vo_hieu_hoa'
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty object without any fields', () => {
    const result = NhanVienUpdateSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject invalid trang_thai', () => {
    const result = NhanVienUpdateSchema.safeParse({
      trang_thai: 'da_xoa' // da_xoa only via DELETE endpoint
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid vai_tro', () => {
    const result = NhanVienUpdateSchema.safeParse({
      vai_tro: 'superadmin'
    });
    expect(result.success).toBe(false);
  });
});

describe('ResetPinSchema', () => {
  it('should accept valid 4-digit PIN', () => {
    const result = ResetPinSchema.safeParse({
      pin_moi: '8888'
    });
    expect(result.success).toBe(true);
  });

  it('should reject PIN with length not equal to 4', () => {
    const result = ResetPinSchema.safeParse({
      pin_moi: '12345'
    });
    expect(result.success).toBe(false);
  });

  it('should reject PIN with non-numeric characters', () => {
    const result = ResetPinSchema.safeParse({
      pin_moi: 'abcd'
    });
    expect(result.success).toBe(false);
  });
});

describe('NhanVienQuerySchema', () => {
  it('should accept empty query', () => {
    const result = NhanVienQuerySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should accept valid trang_thai and search query', () => {
    const result = NhanVienQuerySchema.safeParse({
      trang_thai: 'hoat_dong',
      search: 'NV00'
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid trang_thai', () => {
    const result = NhanVienQuerySchema.safeParse({
      trang_thai: 'inactive'
    });
    expect(result.success).toBe(false);
  });
});

