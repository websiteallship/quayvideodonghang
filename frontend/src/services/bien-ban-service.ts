// ---------------------------------------------------------------------------
// BienBan Service — API Client for Bien Ban (video records)
// Tham chiếu: docs/06-api-backend-specification.md (mục 3.3), docs/roadmap.md Step 1.3
// Rules: 02-security.md, 05-offline-and-reliability.md
// ---------------------------------------------------------------------------

import { apiClient, API_BASE } from './api-client';
import type { ApiResponse, CheckMaVanDonResult } from '../types';

export interface CheckBarcodeOptions {
  /** Optional AbortSignal for cancellation / race condition prevention */
  signal?: AbortSignal;
}

/**
 * Validate tracking code format client-side before sending.
 * Rules: 02-security.md — regex: chữ, số, gạch nối, gạch dưới, 4-64 ký tự
 */
export function isValidMaVanDon(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  const trimmed = code.trim();
  if (trimmed.length < 4 || trimmed.length > 64) return false;
  return /^[a-zA-Z0-9_-]+$/.test(trimmed);
}

/**
 * Kiểm tra mã vận đơn đã có video trước đó chưa (phát hiện quét trùng).
 * Gọi: GET /api/bien-ban/check/:ma_van_don
 *
 * Hỗ trợ:
 * - Client-side validation (chặn gửi ký tự không hợp lệ)
 * - Offline graceful fallback (không block nhân viên kho khi mất mạng)
 * - AbortSignal hỗ trợ cancel race condition
 */
export async function checkBarcodeDuplicate(
  maVanDon: string,
  loaiBienBan: string = 'dong_goi',
  options?: CheckBarcodeOptions
): Promise<ApiResponse<CheckMaVanDonResult>> {
  const trimmedCode = maVanDon.trim();

  // Validate format client-side
  if (!isValidMaVanDon(trimmedCode)) {
    return {
      success: false,
      error: {
        code: 'INVALID_MA_VAN_DON',
        message: 'Mã vận đơn không hợp lệ (4-64 ký tự chữ, số, gạch nối)',
      },
    };
  }

  // Chế độ ngoại tuyến: Rule 05 — Offline-First, không block kho vận
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      success: true,
      data: {
        da_co_video: false,
        so_luong_video: 0,
        video_gan_nhat: null,
        is_offline: true,
      },
    };
  }

  try {
    const url = `${API_BASE}/bien-ban/check/${encodeURIComponent(trimmedCode)}?loai_bien_ban=${encodeURIComponent(loaiBienBan)}`;
    const response = await apiClient.get(url, {
      signal: options?.signal,
      throwHttpErrors: false,
    });

    if (!response.ok) {
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: `Lỗi kiểm tra mã vận đơn (HTTP ${response.status})`,
        },
      };
    }

    const body = (await response.json()) as ApiResponse<CheckMaVanDonResult>;
    return body;
  } catch (err: unknown) {
    // Re-throw AbortError để hook xử lý race condition
    if (err instanceof Error && err.name === 'AbortError') {
      throw err;
    }

    // Khi lỗi mạng bất ngờ: Fallback graceful để nhân viên vẫn quay được
    return {
      success: true,
      data: {
        da_co_video: false,
        so_luong_video: 0,
        video_gan_nhat: null,
        is_offline: true,
      },
    };
  }
}

export interface BienBanFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  ma_van_don?: string;
  ngay_tu?: string;
  ngay_den?: string;
  don_vi_vc?: string;
  loai_bien_ban?: string;
  trang_thai?: string;
  ma_nhan_vien?: string;
}

export interface BienBanListResponse {
  items: Array<import('../types').BienBan & { ten_nhan_vien?: string }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface BienBanViewUrlResponse {
  view_url: string;
  stream_url: string;
  expires_in: number;
  drive_file_id: string;
}

/**
 * Lấy danh sách biên bản có phân trang và bộ lọc
 */
export async function fetchBienBanList(
  params: BienBanFilterParams = {},
  signal?: AbortSignal
): Promise<ApiResponse<BienBanListResponse>> {
  try {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.search) searchParams.set('search', params.search.trim());
    if (params.ma_van_don) searchParams.set('ma_van_don', params.ma_van_don.trim());
    if (params.ngay_tu) searchParams.set('ngay_tu', params.ngay_tu);
    if (params.ngay_den) searchParams.set('ngay_den', params.ngay_den);
    if (params.don_vi_vc && params.don_vi_vc !== 'all') searchParams.set('don_vi_vc', params.don_vi_vc);
    if (params.loai_bien_ban && params.loai_bien_ban !== 'all') searchParams.set('loai_bien_ban', params.loai_bien_ban);
    if (params.trang_thai && params.trang_thai !== 'all') searchParams.set('trang_thai', params.trang_thai);
    if (params.ma_nhan_vien && params.ma_nhan_vien !== 'all') searchParams.set('ma_nhan_vien', params.ma_nhan_vien.trim());

    const queryString = searchParams.toString();
    const url = `${API_BASE}/bien-ban${queryString ? `?${queryString}` : ''}`;

    const res = await apiClient.get(url, {
      signal,
      throwHttpErrors: false
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      let parsed: ApiResponse<BienBanListResponse> | null = null;
      try { parsed = JSON.parse(errorText); } catch { /* empty */ }
      return parsed ?? {
        success: false,
        error: {
          code: 'API_ERROR',
          message: `Lỗi tải danh sách biên bản (HTTP ${res.status})`
        }
      };
    }

    return (await res.json()) as ApiResponse<BienBanListResponse>;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') throw err;
    return {
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: err instanceof Error ? err.message : 'Không thể tải danh sách biên bản'
      }
    };
  }
}

/**
 * Lấy chi tiết 1 biên bản
 */
export async function fetchBienBanDetail(
  id: string,
  signal?: AbortSignal
): Promise<ApiResponse<import('../types').BienBan & { ten_nhan_vien?: string }>> {
  try {
    const res = await apiClient.get(`${API_BASE}/bien-ban/${encodeURIComponent(id)}`, {
      signal,
      throwHttpErrors: false
    });

    if (!res.ok) {
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: `Lỗi tải chi tiết biên bản (HTTP ${res.status})`
        }
      };
    }

    return (await res.json()) as ApiResponse<import('../types').BienBan & { ten_nhan_vien?: string }>;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') throw err;
    return {
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: err instanceof Error ? err.message : 'Không thể tải chi tiết biên bản'
      }
    };
  }
}

/**
 * Lấy URL xem video tạm thời từ Google Drive
 */
export async function fetchBienBanViewUrl(
  id: string,
  signal?: AbortSignal
): Promise<ApiResponse<BienBanViewUrlResponse>> {
  try {
    const res = await apiClient.get(`${API_BASE}/bien-ban/${encodeURIComponent(id)}/view-url`, {
      signal,
      throwHttpErrors: false
    });

    if (!res.ok) {
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: `Lỗi tảo link xem video (HTTP ${res.status})`
        }
      };
    }

    return (await res.json()) as ApiResponse<BienBanViewUrlResponse>;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') throw err;
    return {
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: err instanceof Error ? err.message : 'Không thể tạo link xem video'
      }
    };
  }
}
