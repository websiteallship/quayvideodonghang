import { create } from 'zustand';
import { ThietBiType } from '../types';
import { KhoHang } from '../types/kho-hang';
import { apiClient } from '../services/api-client';
import { API_ENDPOINTS } from '../config/api';

export type AppTheme = 'light' | 'dark';

interface ConfigState {
  isOnline: boolean;
  deviceType: ThietBiType;
  theme: AppTheme;
  warehouseName: string;
  warehouseId: string;
  warehouses: KhoHang[];
  warehousesLoading: boolean;
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

export const useConfigStore = create<ConfigState>((set, get) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  deviceType: 'pc_webcam',
  theme: getInitialTheme(),
  warehouseName: getInitialWarehouseName(),
  warehouseId: getInitialWarehouseId(),
  warehouses: [],
  warehousesLoading: false,
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

