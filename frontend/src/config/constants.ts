

/** Cấu trúc 1 đơn vị vận chuyển trong danh sách */
export interface CarrierEntry {
  /** ID duy nhất, không chứa khoảng trắng (vd: 'GHN', 'AhaMove') */
  id: string;
  /** Tên hiển thị (vd: 'Giao Hàng Nhanh', 'Aha Move') */
  label: string;
  /** true = cố định trong codebase, không cho Admin sửa/xóa */
  isBuiltIn: boolean;
  /** Regex nhận diện tự động từ mã vận đơn (chỉ built-in mới có) */
  prefixPatterns?: RegExp[];
}

/** Danh sách ĐVVC cố định trong codebase — KHÔNG cho sửa/xóa */
export const BUILT_IN_CARRIERS: CarrierEntry[] = [
  { id: 'GHN', label: 'Giao Hàng Nhanh', isBuiltIn: true, prefixPatterns: [/^GHN/i, /^GYYY/i] },
  { id: 'ViettelPost', label: 'Viettel Post', isBuiltIn: true, prefixPatterns: [/^VT/i, /^VTP/i, /^\d{9}$/] },
  { id: 'BestExpress', label: 'Best Express', isBuiltIn: true, prefixPatterns: [/^84\d{12}$/] },
  { id: 'NhatTin', label: 'Nhất Tín Logistics', isBuiltIn: true, prefixPatterns: [/^CP\d{11}$/i] },
  { id: 'LazadaExpress', label: 'Lazada Express', isBuiltIn: true, prefixPatterns: [/^LEX/i, /^LZD/i] },
  { id: 'ShopeeXpress', label: 'Shopee Express', isBuiltIn: true, prefixPatterns: [/^SPX/i, /^VN\d+/i] },
  { id: 'J&T', label: 'J&T Express', isBuiltIn: true, prefixPatterns: [/^8\d{11}$/, /^JNT/i] },
  { id: 'VNPost', label: 'VNPost', isBuiltIn: true, prefixPatterns: [/^[A-Z]{2}\d{8,9}VN$/i] },
  { id: 'GHTK', label: 'Giao hàng tiết kiệm', isBuiltIn: true, prefixPatterns: [/^S\d+/i, /^GHTK/i, /^1\d{9}$/] },
  { id: 'Khac', label: 'Đơn vị khác', isBuiltIn: true },
];

/** IDs của tất cả built-in carriers */
export const BUILT_IN_CARRIER_IDS: ReadonlySet<string> = new Set(
  BUILT_IN_CARRIERS.map((c) => c.id)
);

/**
 * @deprecated Dùng BUILT_IN_CARRIERS thay thế. Giữ lại để backward compat.
 */
export const DON_VI_VAN_CHUYEN_LIST = BUILT_IN_CARRIERS;

export const APP_CONFIG = {
  APP_NAME: 'Quay Video Đóng Hàng',
  VERSION: '1.0.0',
  IDB_NAME: 'quay_video_db',
  IDB_VERSION: 1,
  IDB_STORES: {
    QUEUE: 'upload_queue',
    CONFIG: 'app_config'
  },
  MAX_RECORD_TIME_SECONDS: 600, // 10 phút tối đa theo đặc tả
  TIME_SLICE_MS: 1000,          // MediaRecorder emit blob chunk mỗi 1s
  RESUMABLE_CHUNK_SIZE: 5 * 1024 * 1024, // 5MB Google Drive chunk
  MAX_RETRIES: 5,
  BASE_RETRY_DELAY_MS: 2000
} as const;
