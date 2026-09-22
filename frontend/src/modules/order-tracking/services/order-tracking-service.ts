import { apiClient, API_BASE } from '../../../services/api-client';
import type { ApiResponse } from '../../../types';
import type { OrderTrackingInfo, VietfulMerchant } from '../types';

/**
 * Đồng bộ trực tiếp đơn hàng từ hệ thống VietFul bằng mã vận đơn hoặc mã đơn hàng
 */
export async function syncOrderFromVietful(
  code: string,
  merchantId?: string
): Promise<ApiResponse<{ order: OrderTrackingInfo }>> {
  try {
    const res = await apiClient
      .post(`${API_BASE}/orders/sync-by-code`, {
        json: { code, merchant_id: merchantId },
      })
      .json<ApiResponse<{ order: OrderTrackingInfo }>>();

    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Không thể kết nối đến máy chủ để đồng bộ';
    return {
      success: false,
      error: {
        code: 'SYNC_ERROR',
        message,
      },
    };
  }
}

/**
 * Tra cứu thông tin đơn hàng
 */
export async function lookupOrder(
  code: string,
  live = false
): Promise<ApiResponse<{ order: OrderTrackingInfo; source?: string }>> {
  try {
    const res = await apiClient
      .get(`${API_BASE}/orders/lookup/${encodeURIComponent(code)}`, {
        searchParams: live ? { live: 'true' } : {},
      })
      .json<ApiResponse<{ order: OrderTrackingInfo; source?: string }>>();

    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi tra cứu đơn hàng';
    return {
      success: false,
      error: {
        code: 'LOOKUP_ERROR',
        message,
      },
    };
  }
}

/**
 * Lấy danh sách cấu hình nhà bán (dành cho bộ lọc & quản trị)
 */
export async function fetchVietfulMerchants(): Promise<ApiResponse<VietfulMerchant[]>> {
  try {
    const res = await apiClient
      .get(`${API_BASE}/admin/vietful-merchants`)
      .json<ApiResponse<VietfulMerchant[]>>();

    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi tải danh sách nhà bán';
    return {
      success: false,
      error: {
        code: 'MERCHANT_FETCH_ERROR',
        message,
      },
    };
  }
}
