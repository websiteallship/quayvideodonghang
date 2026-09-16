import { create } from 'zustand';
import { ThietBiType } from '../types';

export type AppTheme = 'light' | 'dark';

interface ConfigState {
  isOnline: boolean;
  deviceType: ThietBiType;
  theme: AppTheme;
  warehouseName: string;
  /** Global flag: true when video recording is actively in progress */
  isRecordingActive: boolean;
  setIsOnline: (online: boolean) => void;
  setDeviceType: (deviceType: ThietBiType) => void;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
  setWarehouseName: (name: string) => void;
  setIsRecordingActive: (active: boolean) => void;
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

export const useConfigStore = create<ConfigState>((set, get) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  deviceType: 'pc_webcam',
  theme: getInitialTheme(),
  warehouseName: getInitialWarehouseName(),
  isRecordingActive: false,

  setIsOnline: (isOnline: boolean) => set({ isOnline }),
  setDeviceType: (deviceType: ThietBiType) => set({ deviceType }),

  setTheme: (theme: AppTheme) => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('app_theme', theme);
    }
    set({ theme });
  },

  toggleTheme: () => {
    const current = get().theme;
    const next = current === 'light' ? 'dark' : 'light';
    get().setTheme(next);
  },

  setWarehouseName: (name: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('warehouse_name', name);
    }
    set({ warehouseName: name });
  },

  setIsRecordingActive: (active: boolean) => set({ isRecordingActive: active }),
}));

