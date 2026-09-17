export interface KhoHang {
  id: string;
  ten: string;
  dia_chi?: string;
  la_mac_dinh: boolean;
  trang_thai: 'hoat_dong' | 'ngung_hoat_dong' | 'da_xoa';
  ngay_tao?: string;
  ngay_cap_nhat?: string;
}

export interface KhoHangFormData {
  ten: string;
  dia_chi?: string;
  la_mac_dinh?: boolean;
  trang_thai?: 'hoat_dong' | 'ngung_hoat_dong' | 'da_xoa';
}
