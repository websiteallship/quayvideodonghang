export type LoaiBienBan = 'dong_goi' | 'khui_hang';

export type DonViVanChuyen = 'GHN' | 'ViettelPost' | 'BestExpress' | 'NhatTin' | 'LazadaExpress' | 'ShopeeXpress' | 'J&T' | 'VNPost' | 'GHTK' | 'Khac';

export type UploadStatus = 'cho_upload' | 'dang_upload' | 'da_upload' | 'loi';

export type ThietBiType = 'mobile' | 'pc_webcam' | 'laptop';

export interface BienBan {
  id: string;
  ma_van_don: string;
  don_vi_vc: DonViVanChuyen;
  loai_bien_ban: LoaiBienBan;
  ma_nhan_vien: string;
  thiet_bi: ThietBiType;
  user_agent?: string;
  thoi_luong_video: number;
  kich_thuoc_bytes: number;
  mime_type: string;
  trang_thai: UploadStatus;
  drive_file_id?: string | null;
  drive_file_name?: string | null;
  loi_message?: string | null;
  thoi_gian_tao: string;
  thoi_gian_upload?: string | null;
  ngay_cap_nhat?: string;
}

export interface QueueItem {
  id: string;                      // UUID biên bản
  ma_van_don: string;
  don_vi_vc: DonViVanChuyen;
  loai_bien_ban: LoaiBienBan;
  ma_nhan_vien: string;
  thiet_bi: ThietBiType;
  thoi_luong_video: number;
  kich_thuoc_bytes: number;
  mime_type: string;
  blob: Blob;                      // Video blob lưu trong IndexedDB
  status: UploadStatus;
  retry_count: number;
  last_error?: string;
  created_at: number;              // Timestamp ms
  uploaded_bytes?: number;
  resumable_session_url?: string;
}

export interface BienBanMetadata {
  id?: string;
  ma_van_don: string;
  don_vi_vc: DonViVanChuyen;
  loai_bien_ban: LoaiBienBan;
  ma_nhan_vien: string;
  thiet_bi?: ThietBiType;
  thoi_luong_video: number;
  mime_type?: string;
}

