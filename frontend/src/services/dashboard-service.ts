// ---------------------------------------------------------------------------
// Dashboard Service — Fetch stats + localStorage cache + offline fallback
// Tham chiếu: docs/06-api-backend-specification.md, .agents/rules/05-offline-and-reliability.md
// ---------------------------------------------------------------------------

import { apiClient, requestJson } from './api-client';
import { API_ENDPOINTS } from '../config/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NhanVienHoatDong {
  ma: string;
  ten: string;
  don: number;
  mb: number;
  last_active: string;
}

export interface DashboardStats {
  tong_don: number;
  da_upload: number;
  dang_cho: number;
  loi: number;
  tong_dung_luong_mb: number;
  nhan_vien_hom_nay: NhanVienHoatDong[];
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

const CACHE_KEY = 'dashboard_stats_cache';

interface CachedStats {
  data: DashboardStats;
  timestamp: number;
}

function getCachedStats(): DashboardStats | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached: CachedStats = JSON.parse(raw);
    // Only return cache from today (same date in +7 timezone)
    const cachedDate = new Date(cached.timestamp).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    const nowDate = new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    if (cachedDate !== nowDate) return null;
    return cached.data;
  } catch {
    return null;
  }
}

function setCachedStats(data: DashboardStats): void {
  try {
    const cached: CachedStats = { data, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
  } catch {
    // Ignore quota/security errors
  }
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export interface FetchStatsResult {
  stats: DashboardStats;
  isFromCache: boolean;
}

export async function fetchDashboardStats(
  startDate?: string,
  endDate?: string
): Promise<FetchStatsResult> {
  const isCustomDateRange = !!(startDate && endDate);

  // Try network first
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    let statsUrl: string = API_ENDPOINTS.DASHBOARD.STATS;
    if (isCustomDateRange) {
      const searchParams = new URLSearchParams();
      searchParams.set('startDate', startDate!);
      searchParams.set('endDate', endDate!);
      const separator = statsUrl.includes('?') ? '&' : '?';
      statsUrl = `${statsUrl}${separator}${searchParams.toString()}`;
    }

    const res = await requestJson<DashboardStats>(
      apiClient.get(statsUrl)
    );

    if (res.success && res.data) {
      // Only cache if it's the default "today" view
      if (!isCustomDateRange) {
        setCachedStats(res.data);
      }
      return { stats: res.data, isFromCache: false };
    }
  }

  // Fallback to cache (only applies if we are not fetching a custom date range)
  if (!isCustomDateRange) {
    const cached = getCachedStats();
    if (cached) {
      return { stats: cached, isFromCache: true };
    }
  }

  // Empty default
  return {
    stats: {
      tong_don: 0,
      da_upload: 0,
      dang_cho: 0,
      loi: 0,
      tong_dung_luong_mb: 0,
      nhan_vien_hom_nay: [],
    },
    isFromCache: true,
  };
}
