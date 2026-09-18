import { create } from 'zustand';
import { ThietBiType } from '../types';
import { KhoHang } from '../types/kho-hang';
import { apiClient } from '../services/api-client';
import { API_ENDPOINTS } from '../config/api';

export type AppTheme = 'light' | 'dark';

export interface SystemConfig {
  app_name?: string;
  version?: string;
  do_phan_giai: string; // '1280x720' | '1920x1080' | '854x480'
  bitrate_mbps: number;
  watermark: boolean;
  auto_scan: boolean;
  quay_lien_tuc: boolean;
  retention_archive_days: number;
  retention_delete_days: number;
  retention_thang?: number; // Deprecated
  don_vi_vc: string[];
  max_duration_seconds?: number;
  chunk_size?: number;
}

export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  app_name: 'Quay Video Kho Vận',
  version: '1.0.0',
  do_phan_giai: '1280x720',
  bitrate_mbps: 2.0,
  watermark: true,
  auto_scan: false,
  quay_lien_tuc: false,
  retention_archive_days: 30,
  retention_delete_days: 60,
  retention_thang: 6,
  don_vi_vc: ['GHN', 'ViettelPost', 'BestExpress', 'NhatTin', 'LazadaExpress', 'ShopeeXpress', 'J&T', 'VNPost', 'GHTK', 'Khac'],
  max_duration_seconds: 600,
  chunk_size: 5242880,
};

interface ConfigState {
  isOnline: boolean;
  deviceType: ThietBiType;
  theme: AppTheme;
  warehouseName: string;
  warehouseId: string;
  warehouses: KhoHang[];
  warehousesLoading: boolean;
  systemConfig: SystemConfig;
  systemConfigLoading: boolean;
  /** Global flag: true when video recording is actively in progress */
  isRecordingActive: boolean;
  /** Desktop sidebar collapse state */
  sidebarCollapsed: boolean;
  setIsOnline: (online: boolean) => void;
  setDeviceType: (deviceType: ThietBiType) => void;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
  setWarehouseName: (name: string, id?: string) => void;
  setWarehouse: (warehouse: KhoHang) => void;
  fetchWarehouses: () => Promise<void>;
  fetchSystemConfig: () => Promise<void>;
  setIsRecordingActive: (active: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
}

const getInitialTheme = (): AppTheme => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('app_theme');
    if (saved === 'dark' || saved === 'light') return saved;
  }
  return 'light'; // Mặc định light theme theo yêu cầu
};

const getInitialWarehouseName = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('warehouse_name') || '';
  }
  return '';
};

const getInitialWarehouseId = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('warehouse_id') || '';
  }
  return '';
};

const getInitialSidebarCollapsed = (): boolean => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  }
  return false;
};

const getInitialSystemConfig = (): SystemConfig => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('system_config');
    if (saved) {
      try {
        return { ...DEFAULT_SYSTEM_CONFIG, ...JSON.parse(saved) };
      } catch {}
    }
  }
  return DEFAULT_SYSTEM_CONFIG;
};

export const useConfigStore = create<ConfigState>((set, get) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  deviceType: 'pc_webcam',
  theme: getInitialTheme(),
  warehouseName: getInitialWarehouseName(),
  warehouseId: getInitialWarehouseId(),
  warehouses: [],
  warehousesLoading: false,
  systemConfig: getInitialSystemConfig(),
  systemConfigLoading: false,
  isRecordingActive: false,
  sidebarCollapsed: getInitialSidebarCollapsed(),

  setIsOnline: (online: boolean) => set({ isOnline: online }),
  setDeviceType: (deviceType: ThietBiType) => set({ deviceType }),

  setTheme: (theme: AppTheme) => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('app_theme', theme);
    }
    set({ theme });
  },

  toggleTheme: () => {
    const current = get().theme;
    const next = current === 'light' ? 'dark' : 'light';
    get().setTheme(next);
  },

  setWarehouseName: (name: string, id?: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('warehouse_name', name);
      if (id) {
        localStorage.setItem('warehouse_id', id);
      }
    }
    set((state) => ({
      warehouseName: name,
      warehouseId: id !== undefined ? id : state.warehouseId
    }));
  },

  setWarehouse: (warehouse: KhoHang) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('warehouse_name', warehouse.ten);
      localStorage.setItem('warehouse_id', warehouse.id);
    }
    set({
      warehouseName: warehouse.ten,
      warehouseId: warehouse.id
    });
  },

  fetchWarehouses: async () => {
    set({ warehousesLoading: true });
    try {
      const res = await apiClient
        .get(API_ENDPOINTS.CONFIG.KHO_HANG)
        .json<{ success: boolean; data: { items: KhoHang[] } }>();

      if (res.success && Array.isArray(res.data?.items)) {
        const items = res.data.items;
        set({ warehouses: items });

        const currentName = get().warehouseName;
        const currentId = get().warehouseId;

        // Nếu máy chưa có kho hoặc kho cũ không còn tồn tại
        const matched = items.find(
          (k) => (currentId && k.id === currentId) || (currentName && k.ten === currentName)
        );

        if (matched) {
          get().setWarehouse(matched);
        } else {
          // Tự động gán kho mặc định nếu có
          const defaultWarehouse = items.find((k) => k.la_mac_dinh);
          if (defaultWarehouse) {
            get().setWarehouse(defaultWarehouse);
          }
        }
      }
    } catch {
      // Offline fallback: giữ nguyên giá trị đã lưu
    } finally {
      set({ warehousesLoading: false });
    }
  },

  fetchSystemConfig: async () => {
    set({ systemConfigLoading: true });
    try {
      const res = await apiClient
        .get(API_ENDPOINTS.CONFIG.PUBLIC)
        .json<{ success: boolean; data: SystemConfig }>();

      if (res.success && res.data) {
        set({ systemConfig: res.data });
        if (typeof window !== 'undefined') {
          localStorage.setItem('system_config', JSON.stringify(res.data));
        }
      }
    } catch {
      // Offline fallback: giữ nguyên giá trị đã lưu trong localStorage
    } finally {
      set({ systemConfigLoading: false });
    }
  },

  setIsRecordingActive: (active: boolean) => set({ isRecordingActive: active }),

  setSidebarCollapsed: (collapsed: boolean) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar_collapsed', String(collapsed));
    }
    set({ sidebarCollapsed: collapsed });
  },

  toggleSidebar: () => {
    const next = !get().sidebarCollapsed;
    get().setSidebarCollapsed(next);
  },
}));

