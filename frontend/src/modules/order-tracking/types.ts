export type CanhBaoType = 'NONE' | 'DON_HUY' | 'HOLD_DON' | 'QUET_TRUNG' | 'DANG_HOAN';

export type TrangThaiDongHang = 'cho_dong' | 'da_dong';

export type TrangThaiKiemHoan = 'chua_kiem' | 'da_kiem_tot' | 'da_kiem_hong' | 'khong_ap_dung';

export interface OrderTrackingInfo {
  id: string;
  ma_van_don?: string | null;
  ma_don_hang?: string | null;
  or_id?: number | null;
  trang_thai_don: string;
  trang_thai_dong_hang: TrangThaiDongHang;
  trang_thai_kiem_hoan: TrangThaiKiemHoan;
  canh_bao: CanhBaoType;
  nha_ban?: string | null;
  merchant_id?: string | null;
  merchant_code?: string | null;
  ghi_chu_don?: string | null;
  san_pham_summary?: string | null;
}

export interface VietfulMerchant {
  id: string;
  code: string;
  name: string;
  realm: string;
  auth_url?: string;
  api_url?: string;
  client_id?: string;
  client_secret_masked?: string;
  warehouse_codes?: string;
  is_active: number;
}
