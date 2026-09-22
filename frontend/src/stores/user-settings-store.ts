import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { useConfigStore } from './config-store';

export type VideoResolution = '1080p' | '720p';
export type VideoFps = 15 | 20 | 24 | 30 | 48 | 60;

export interface UserSettingsState {
  /** Local video resolution ('1080p' or '720p') */
  videoResolution: VideoResolution;
  /** Whether user explicitly chose a local resolution on this device */
  isResolutionOverridden: boolean;
  /** Local video FPS (15-60) */
  videoFps: VideoFps;
  /** Whether user explicitly chose a local FPS on this device */
  isFpsOverridden: boolean;
  /** Automatically trigger recording 1s after a valid scan */
  autoRecordAfterScan: boolean;
  /** Play sound beep on barcode scan or warning */
  soundBeepEnabled: boolean;
  /** Daily personal shift target (chỉ tiêu ca), default 300 */
  shiftTarget: number;
  /** Active user ID for isolated storage namespace */
  activeUser: string | null;
}

export interface UserSettingsActions {
  loadUserSettings: (maNhanVien: string) => void;
  resetUserSettings: () => void;
  setVideoResolution: (res: VideoResolution, isOverride?: boolean) => void;
  resetResolutionToSystem: () => void;
  setVideoFps: (fps: VideoFps, isOverride?: boolean) => void;
  resetFpsToSystem: () => void;
  setAutoRecordAfterScan: (enabled: boolean) => void;
  setSoundBeepEnabled: (enabled: boolean) => void;
  setShiftTarget: (target: number) => void;
  resetSettings: () => void;
}

export type UserSettingsStore = UserSettingsState & UserSettingsActions;

export const DEFAULT_USER_SETTINGS: Omit<UserSettingsState, 'activeUser'> = {
  videoResolution: '720p',
  isResolutionOverridden: false,
  videoFps: 30,
  isFpsOverridden: false,
  autoRecordAfterScan: true,
  soundBeepEnabled: true,
  shiftTarget: 300,
};

function getInitialUser(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem('auth_user') || localStorage.getItem('auth_user');
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed?.ma_nhan_vien || null;
    }
  } catch {}
  return null;
}

function readFromStorage(user: string | null): Partial<UserSettingsState> {
  if (typeof window === 'undefined') return {};
  try {
    const key = user ? `user_settings_${user}` : 'user_settings';
    const raw = localStorage.getItem(key) || (!user ? null : localStorage.getItem('user_settings'));
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return {};
}

function saveToStorage(user: string | null, state: UserSettingsState): void {
  if (typeof window === 'undefined') return;
  const dataToSave = {
    videoResolution: state.videoResolution,
    isResolutionOverridden: state.isResolutionOverridden,
    videoFps: state.videoFps,
    isFpsOverridden: state.isFpsOverridden,
    autoRecordAfterScan: state.autoRecordAfterScan,
    soundBeepEnabled: state.soundBeepEnabled,
    shiftTarget: state.shiftTarget,
  };
  const key = user ? `user_settings_${user}` : 'user_settings';
  try {
    localStorage.setItem(key, JSON.stringify(dataToSave));
  } catch {}
}

/** Get effective resolution: user override priority, fallback to system config default */
export function getEffectiveResolution(): VideoResolution {
  const userSettings = useUserSettingsStore.getState();
  if (userSettings.isResolutionOverridden) {
    return userSettings.videoResolution;
  }
  const sysConfig = useConfigStore.getState().systemConfig;
  return sysConfig?.do_phan_giai === '1920x1080' ? '1080p' : '720p';
}

/** Get effective FPS: user override priority, fallback to default 30 */
export function getEffectiveFps(): VideoFps {
  const userSettings = useUserSettingsStore.getState();
  if (userSettings.isFpsOverridden) {
    return userSettings.videoFps;
  }
  return 30;
}

const initialUser = getInitialUser();
const initialSettings = readFromStorage(initialUser);

export const useUserSettingsStore = create<UserSettingsStore>()(
  subscribeWithSelector((set) => ({
    ...DEFAULT_USER_SETTINGS,
    ...initialSettings,
    activeUser: initialUser,

    loadUserSettings: (maNhanVien: string) => {
      const saved = readFromStorage(maNhanVien);
      set({
        ...DEFAULT_USER_SETTINGS,
        ...saved,
        activeUser: maNhanVien,
      });
    },

    resetUserSettings: () => {
      set({
        ...DEFAULT_USER_SETTINGS,
        activeUser: null,
      });
    },

    setVideoResolution: (videoResolution, isOverride = true) =>
      set((state) => {
        const next = { ...state, videoResolution, isResolutionOverridden: isOverride };
        saveToStorage(state.activeUser, next);
        return next;
      }),

    resetResolutionToSystem: () =>
      set((state) => {
        const next = { ...state, isResolutionOverridden: false };
        saveToStorage(state.activeUser, next);
        return next;
      }),

    setVideoFps: (videoFps, isOverride = true) =>
      set((state) => {
        const next = { ...state, videoFps, isFpsOverridden: isOverride };
        saveToStorage(state.activeUser, next);
        return next;
      }),

    resetFpsToSystem: () =>
      set((state) => {
        const next = { ...state, isFpsOverridden: false };
        saveToStorage(state.activeUser, next);
        return next;
      }),

    setAutoRecordAfterScan: (autoRecordAfterScan) =>
      set((state) => {
        const next = { ...state, autoRecordAfterScan };
        saveToStorage(state.activeUser, next);
        return next;
      }),

    setSoundBeepEnabled: (soundBeepEnabled) =>
      set((state) => {
        const next = { ...state, soundBeepEnabled };
        saveToStorage(state.activeUser, next);
        return next;
      }),

    setShiftTarget: (shiftTarget) =>
      set((state) => {
        const next = { ...state, shiftTarget };
        saveToStorage(state.activeUser, next);
        return next;
      }),

    resetSettings: () =>
      set((state) => {
        const next = { ...DEFAULT_USER_SETTINGS, activeUser: state.activeUser };
        saveToStorage(state.activeUser, next);
        return next;
      }),
  }))
);
