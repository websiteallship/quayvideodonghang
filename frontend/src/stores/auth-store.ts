import { create } from 'zustand';
import { AuthUser } from '../types';
import { 
  getStoredToken, setStoredToken, removeStoredToken,
  getStoredUser, setStoredUser, removeStoredUser,
  apiClient 
} from '../services/api-client';
import { API_ENDPOINTS } from '../config/api';

import { useUserSettingsStore } from './user-settings-store';
import { useOnboardingStore } from './onboarding-store';
import { useConfigStore } from './config-store';
import { clearDashboardStatsCache } from '../services/dashboard-service';

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setAuth: (token: string, user: AuthUser) => void;
  logout: () => void;
  verifyToken: () => Promise<boolean>;
  /** Check token validity WITHOUT triggering logout/redirect. Returns true if valid. */
  checkTokenValid: () => Promise<boolean>;
  /** Silently login with PIN using existing ma_nhan_vien to recover session without page reload */
  silentLogin: (pin: string) => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: getStoredToken(),
  user: getStoredUser(),
  isAuthenticated: !!getStoredToken(),
  isLoading: false,

  setAuth: (token: string, user: AuthUser) => {
    setStoredToken(token);
    setStoredUser(user);
    set({ token, user, isAuthenticated: true });
    if (user?.ma_nhan_vien) {
      useUserSettingsStore.getState().loadUserSettings(user.ma_nhan_vien);
      useOnboardingStore.getState().loadUserOnboarding(user.ma_nhan_vien);
      useConfigStore.getState().loadUserWarehouse(user.ma_nhan_vien);
    }
  },

  logout: () => {
    removeStoredToken();
    removeStoredUser();
    clearDashboardStatsCache();
    useUserSettingsStore.getState().resetUserSettings();
    useOnboardingStore.getState().resetOnboarding();
    useConfigStore.getState().clearWarehouse();
    set({ token: null, user: null, isAuthenticated: false });
  },


  verifyToken: async () => {
    const token = get().token;
    if (!token) {
      set({ isAuthenticated: false, user: null });
      return false;
    }

    try {
      set({ isLoading: true });
      const res = await apiClient.get(API_ENDPOINTS.AUTH.VERIFY).json<{
        success: boolean;
        data: { nhan_vien: AuthUser };
      }>();

      if (res.success && res.data) {
        const nhanVien = res.data.nhan_vien;
        set({ user: nhanVien, isAuthenticated: true });
        if (nhanVien?.ma_nhan_vien) {
          useUserSettingsStore.getState().loadUserSettings(nhanVien.ma_nhan_vien);
          useOnboardingStore.getState().loadUserOnboarding(nhanVien.ma_nhan_vien);
          useConfigStore.getState().loadUserWarehouse(nhanVien.ma_nhan_vien);
        }
        return true;
      }
      get().logout();
      return false;
    } catch {
      get().logout();
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  checkTokenValid: async () => {
    const token = get().token;
    if (!token) return false;

    try {
      const res = await apiClient.get(API_ENDPOINTS.AUTH.VERIFY, {
        throwHttpErrors: false,
      });
      if (res.status === 401) return false;
      const body = await res.json() as { success: boolean; data?: { nhan_vien: AuthUser } };
      if (body.success && body.data) {
        set({ user: body.data.nhan_vien });
        return true;
      }
      return false;
    } catch {
      // Network error — assume valid to avoid blocking offline uploads
      return true;
    }
  },

  silentLogin: async (pin: string) => {
    const user = get().user;
    if (!user || !user.ma_nhan_vien) return false;

    try {
      const res = await fetch(API_ENDPOINTS.AUTH.LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ma_nhan_vien: user.ma_nhan_vien,
          pin
        })
      });

      const body = await res.json();
      if (res.ok && body.success && body.data) {
        get().setAuth(body.data.token, body.data.nhan_vien);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
}));
