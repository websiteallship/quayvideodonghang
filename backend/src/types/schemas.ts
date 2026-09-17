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
  ma: z.string()
    .min(1, 'Mã nhân viên bắt buộc')
    .max(20, 'Mã tối đa 20 ký tự')
    .regex(/^[A-Za-z0-9_]+$/, 'Chỉ chữ cái, số và gạch dưới')
    .transform(v => v.toUpperCase()),
  ten: z.string().min(1, 'Tên bắt buộc').max(100),
  pin: z.string()
    .length(4, 'PIN phải có đúng 4 chữ số')
    .regex(/^\d+$/, 'PIN chỉ chứa chữ số'),
  vai_tro: z.enum(['admin', 'nhan_vien']).default('nhan_vien')
});

export const NhanVienUpdateSchema = z.object({
  ten: z.string().min(1, 'Tên bắt buộc').max(100, 'Tên tối đa 100 ký tự').optional(),
  vai_tro: z.enum(['admin', 'nhan_vien']).optional(),
  trang_thai: z.enum(['hoat_dong', 'vo_hieu_hoa']).optional()
}).refine(
  data => Object.keys(data).length > 0,
  'Phải cập nhật ít nhất 1 trường'
);

export const ResetPinSchema = z.object({
  pin_moi: z.string()
    .length(4, 'PIN phải có đúng 4 chữ số')
    .regex(/^\d+$/, 'PIN chỉ chứa chữ số')
});

export const NhanVienQuerySchema = z.object({
  trang_thai: z.enum(['hoat_dong', 'vo_hieu_hoa', 'da_xoa']).optional(),
  search: z.string().optional()
});

export const CauHinhUpdateSchema = z.object({
  khoa: z.enum([
    'drive_folder_id', 'sheet_id', 'do_phan_giai', 'bitrate_mbps',
    'auto_scan', 'quay_lien_tuc', 'watermark', 'don_vi_vc_danh_sach', 'retention_thang'
  ]),
  gia_tri: z.string().min(0)
});

export const CauHinhBatchUpdateSchema = z.object({
  configs: z.record(
    z.enum([
      'drive_folder_id', 'sheet_id', 'do_phan_giai', 'bitrate_mbps',
      'auto_scan', 'quay_lien_tuc', 'watermark', 'don_vi_vc_danh_sach', 'retention_thang'
    ]),
    z.string()
  )
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

export const CheckMaVanDonQuerySchema = z.object({
  loai_bien_ban: z.enum(['dong_goi', 'khui_hang']).optional()
});

export const KhoHangCreateSchema = z.object({
  ten: z.string().trim().min(2, 'Tên kho tối thiểu 2 ký tự').max(100, 'Tên kho tối đa 100 ký tự'),
  dia_chi: z.string().trim().max(255, 'Địa chỉ tối đa 255 ký tự').optional().default(''),
  la_mac_dinh: z.boolean().optional().default(false),
});

export const KhoHangUpdateSchema = z.object({
  ten: z.string().trim().min(2, 'Tên kho tối thiểu 2 ký tự').max(100, 'Tên kho tối đa 100 ký tự').optional(),
  dia_chi: z.string().trim().max(255, 'Địa chỉ tối đa 255 ký tự').optional(),
  la_mac_dinh: z.boolean().optional(),
  trang_thai: z.enum(['hoat_dong', 'ngung_hoat_dong', 'da_xoa']).optional(),
}).refine(
  data => Object.keys(data).length > 0,
  'Phải cập nhật ít nhất 1 trường'
);

export type LoginRequestDTO = z.infer<typeof LoginRequestSchema>;
export type UploadInitDTO = z.infer<typeof UploadInitSchema>;
export type UploadCompleteDTO = z.infer<typeof UploadCompleteSchema>;
export type UploadErrorDTO = z.infer<typeof UploadErrorSchema>;
export type UploadCancelDTO = z.infer<typeof UploadCancelSchema>;
export type BienBanQueryDTO = z.infer<typeof BienBanQuerySchema>;
export type BienBanIdParamDTO = z.infer<typeof BienBanIdParamSchema>;
export type NhanVienCreateDTO = z.infer<typeof NhanVienCreateSchema>;
export type NhanVienUpdateDTO = z.infer<typeof NhanVienUpdateSchema>;
export type ResetPinDTO = z.infer<typeof ResetPinSchema>;
export type NhanVienQueryDTO = z.infer<typeof NhanVienQuerySchema>;
export type CauHinhUpdateDTO = z.infer<typeof CauHinhUpdateSchema>;
export type CheckMaVanDonParamDTO = z.infer<typeof CheckMaVanDonParamSchema>;
export type KhoHangCreateDTO = z.infer<typeof KhoHangCreateSchema>;
export type KhoHangUpdateDTO = z.infer<typeof KhoHangUpdateSchema>;
