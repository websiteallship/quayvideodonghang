import type { VaiTro, TrangThaiNhanVien } from './nhan-vien';

export interface NhanVienAdmin {
  ma: string;
  ten: string;
  vai_tro: VaiTro;
  trang_thai: TrangThaiNhanVien;
  ngay_tao?: string;
  ngay_cap_nhat?: string;
  so_video_hom_nay?: number;
  dang_nhap_cuoi?: string | null;
}

export interface NhanVienCreateDTO {
  ma: string;
  ten: string;
  pin: string;
  vai_tro: VaiTro;
}

export interface NhanVienUpdateDTO {
  ten?: string;
  vai_tro?: VaiTro;
  trang_thai?: 'hoat_dong' | 'vo_hieu_hoa';
}

export interface ResetPinDTO {
  pin_moi: string;
}

export type CauHinhKey =
  | 'drive_folder_id'
  | 'sheet_id'
  | 'do_phan_giai'
  | 'bitrate_mbps'
  | 'auto_scan'
  | 'quay_lien_tuc'
  | 'watermark'
  | 'don_vi_vc_danh_sach'
  | 'retention_thang';

export type CauHinhData = Partial<Record<CauHinhKey, string>>;

export interface DriveTestResult {
  ket_noi_ok: boolean;
  service_account_email: string;
  dung_luong_da_dung_gb: number;
  dung_luong_tong_gb: number;
  dung_luong_con_lai_gb: number;
  file_test_ok: boolean;
}
