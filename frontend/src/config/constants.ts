import { DonViVanChuyen } from '../types';

export const DON_VI_VAN_CHUYEN_LIST: { id: DonViVanChuyen; label: string; prefixPatterns?: RegExp[] }[] = [
  { id: 'GHN', label: 'Giao Hàng Nhanh', prefixPatterns: [/^GHN/i, /^GYYY/i] },
  { id: 'ViettelPost', label: 'Viettel Post', prefixPatterns: [/^VT/i, /^VTP/i, /^\d{9}$/] },
  { id: 'BestExpress', label: 'Best Express', prefixPatterns: [/^84\d{12}$/] },
  { id: 'NhatTin', label: 'Nhất Tín Logistics', prefixPatterns: [/^CP\d{11}$/i] },
  { id: 'LazadaExpress', label: 'Lazada Express', prefixPatterns: [/^LEX/i, /^LZD/i] },
  { id: 'ShopeeXpress', label: 'Shopee Express', prefixPatterns: [/^SPX/i, /^VN\d+/i] },
  { id: 'J&T', label: 'J&T Express', prefixPatterns: [/^8\d{11}$/, /^JNT/i] },
  { id: 'VNPost', label: 'VNPost', prefixPatterns: [/^[A-Z]{2}\d{8,9}VN$/i] },
  { id: 'GHTK', label: 'Giao hàng tiết kiệm', prefixPatterns: [/^S\d+/i, /^GHTK/i, /^1\d{9}$/] },
  { id: 'Khac', label: 'Đơn vị khác' }
];

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
