export type VaiTro = 'admin' | 'nhan_vien';
export type TrangThaiNhanVien = 'hoat_dong' | 'vo_hieu_hoa' | 'da_xoa';

export interface NhanVien {
  ma: string;
  ten: string;
  vai_tro: VaiTro;
  trang_thai: TrangThaiNhanVien;
  ngay_tao?: string;
  ngay_cap_nhat?: string;
}

export interface AuthUser {
  ma_nhan_vien: string;
  ten: string;
  vai_tro: VaiTro;
}

export interface LoginResponse {
  token: string;
  nhan_vien: AuthUser;
}
