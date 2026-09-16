import { z } from 'zod';

export const LoginRequestSchema = z.object({
  ma_nhan_vien: z.string().min(1, 'Mã nhân viên không được rỗng'),
  pin: z.string().min(4, 'PIN tối thiểu 4 số'),
  thiet_bi: z.enum(['mobile', 'pc_webcam', 'laptop']).optional().default('mobile')
});

export const UploadInitSchema = z.object({
  id: z.string().uuid('ID biên bản phải là UUID v4'),
  ma_van_don: z.string()
    .min(4, 'Mã vận đơn tối thiểu 4 ký tự')
    .max(64, 'Mã vận đơn tối đa 64 ký tự')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Mã vận đơn chỉ được chứa chữ cái, chữ số, gạch nối hoặc gạch dưới'),
  don_vi_vc: z.string().min(1, 'Đơn vị vận chuyển không được rỗng'),
  loai_bien_ban: z.enum(['dong_goi', 'khui_hang']),
  thiet_bi: z.enum(['mobile', 'pc_webcam', 'laptop']).default('mobile'),
  thoi_luong_video: z.number().int().nonnegative('Thời lượng video không được âm'),
  kich_thuoc_bytes: z.number().int().positive('Kích thước bytes phải lớn hơn 0'),
  mime_type: z.string().default('video/webm')
});

export const UploadCompleteSchema = z.object({
  id: z.string().uuid(),
  drive_file_id: z.string().min(1, 'drive_file_id không được rỗng'),
  drive_file_name: z.string().min(1, 'drive_file_name không được rỗng')
});

export const UploadErrorSchema = z.object({
  id: z.string().uuid(),
  loi_message: z.string().min(1, 'Lý do lỗi không được rỗng')
});

export const UploadCancelSchema = z.object({
  id: z.string().uuid('ID biên bản phải là UUID v4')
});

export const BienBanQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: z.enum(['cho_upload', 'dang_upload', 'da_upload', 'loi']).optional(),
  trang_thai: z.enum(['cho_upload', 'dang_upload', 'da_upload', 'loi']).optional(),
  search: z.string().optional(),
  ma_van_don: z.string().optional(),
  ngay_tu: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày YYYY-MM-DD').optional(),
  ngay_den: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày YYYY-MM-DD').optional(),
  don_vi_vc: z.string().optional(),
  loai_bien_ban: z.enum(['dong_goi', 'khui_hang']).optional(),
  ma_nhan_vien: z.string().optional()
});

export const NhanVienCreateSchema = z.object({
  ma: z.string().min(1).max(20),
  ten: z.string().min(1).max(100),
  pin: z.string().length(4, 'PIN phải có đúng 4 chữ số').regex(/^\d+$/, 'PIN chỉ chứa chữ số'),
  vai_tro: z.enum(['admin', 'nhan_vien']).default('nhan_vien')
});

export const CauHinhUpdateSchema = z.object({
  khoa: z.string().min(1),
  gia_tri: z.string()
});

export const BienBanIdParamSchema = z.object({
  id: z.string().uuid('ID biên bản phải là UUID v4')
});

export const CheckMaVanDonParamSchema = z.object({
  ma_van_don: z
    .string({ required_error: 'Mã vận đơn không được để trống' })
    .min(4, 'Mã vận đơn tối thiểu 4 ký tự')
    .max(64, 'Mã vận đơn tối đa 64 ký tự')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Mã vận đơn chỉ được chứa chữ cái, chữ số, gạch nối hoặc gạch dưới')
});

export type LoginRequestDTO = z.infer<typeof LoginRequestSchema>;
export type UploadInitDTO = z.infer<typeof UploadInitSchema>;
export type UploadCompleteDTO = z.infer<typeof UploadCompleteSchema>;
export type UploadErrorDTO = z.infer<typeof UploadErrorSchema>;
export type UploadCancelDTO = z.infer<typeof UploadCancelSchema>;
export type BienBanQueryDTO = z.infer<typeof BienBanQuerySchema>;
export type BienBanIdParamDTO = z.infer<typeof BienBanIdParamSchema>;
export type NhanVienCreateDTO = z.infer<typeof NhanVienCreateSchema>;
export type CauHinhUpdateDTO = z.infer<typeof CauHinhUpdateSchema>;
export type CheckMaVanDonParamDTO = z.infer<typeof CheckMaVanDonParamSchema>;
