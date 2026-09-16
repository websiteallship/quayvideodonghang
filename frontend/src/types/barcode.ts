// ---------------------------------------------------------------------------
// Barcode Types — PWA Quay Video Kho Vận
// Tham chiếu: docs/02-dac-ta-ky-thuat.md (mục 3.2), docs/08-frontend-architecture.md
// ---------------------------------------------------------------------------

/** Supported barcode formats for warehouse shipping labels */
export type BarcodeFormat = 'qr_code' | 'code_128' | 'code_39' | 'ean_13';

/** How the barcode was scanned */
export type BarcodeSource = 'camera' | 'gun' | 'manual';

/** Which scanner engine is active */
export type ScannerBackend = 'native' | 'zxing-wasm';

/** Result from a successful barcode scan */
export interface BarcodeResult {
  /** The decoded barcode string (e.g. "GHN0123456789") */
  rawValue: string;
  /** Detected barcode format */
  format: BarcodeFormat;
  /** Input source: camera scanner or USB barcode gun */
  source: BarcodeSource;
}

/**
 * Map native BarcodeDetector format strings to our BarcodeFormat.
 */
export const SUPPORTED_BARCODE_FORMATS: BarcodeFormat[] = [
  'qr_code',
  'code_128',
  'code_39',
  'ean_13',
];

/**
 * Normalizes native BarcodeDetector format strings.
 */
export const NATIVE_FORMAT_MAP: Record<string, BarcodeFormat> = {
  qr_code: 'qr_code',
  code_128: 'code_128',
  code_39: 'code_39',
  ean_13: 'ean_13',
  ean_8: 'ean_13',
  upc_a: 'ean_13',
  upc_e: 'ean_13',
  itf: 'code_128',
  codabar: 'code_128',
};

/**
 * Map zxing-wasm format strings to our BarcodeFormat.
 * Handles canonical names (EAN13, Code128, Code39, QRCode),
 * variants (Code39Std, Code39Ext, EAN8, UPCA, UPCE), and labels.
 */
export const ZXING_FORMAT_MAP: Record<string, BarcodeFormat> = {
  // QR Codes
  'QRCode': 'qr_code',
  'QR Code': 'qr_code',
  'MicroQRCode': 'qr_code',
  'RMQRCode': 'qr_code',
  'qr_code': 'qr_code',

  // Code 128
  'Code128': 'code_128',
  'Code 128': 'code_128',
  'code_128': 'code_128',

  // Code 39
  'Code39': 'code_39',
  'Code 39': 'code_39',
  'Code39Std': 'code_39',
  'Code39Ext': 'code_39',
  'code_39': 'code_39',

  // EAN / UPC
  'EAN13': 'ean_13',
  'EAN-13': 'ean_13',
  'EAN8': 'ean_13',
  'EAN-8': 'ean_13',
  'UPCA': 'ean_13',
  'UPC-A': 'ean_13',
  'UPCE': 'ean_13',
  'UPC-E': 'ean_13',
  'ean_13': 'ean_13',
  'ean_8': 'ean_13',
  'upc_a': 'ean_13',
  'upc_e': 'ean_13',

  // Other 1D logistics barcodes
  'ITF': 'code_128',
  'ITF-14': 'code_128',
  'Codabar': 'code_128',
};

/** Thông tin video gần nhất nếu đã có trong hệ thống */
export interface VideoGanNhat {
  id: string;
  loai_bien_ban: string;
  thoi_gian_tao: string;
  ma_nhan_vien: string;
}

/** Kết quả kiểm tra mã vận đơn trùng (GET /api/bien-ban/check/:ma_van_don) */
export interface CheckMaVanDonResult {
  /** Mã đã có video trong hệ thống hay chưa */
  da_co_video: boolean;
  /** Tổng số video đã quay cho mã này */
  so_luong_video: number;
  /** Thông tin video gần nhất (nếu có) */
  video_gan_nhat: VideoGanNhat | null;
  /** Trạng thái kiểm tra ngoại tuyến */
  is_offline?: boolean;
}

