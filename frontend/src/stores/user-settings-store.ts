import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { useConfigStore } from './config-store';

export type VideoResolution = '1080p' | '720p';
export type VideoFps = 15 | 20 | 24 | 30 | 48 | 60;
export type VideoOrientation = 'auto' | 'landscape' | 'portrait';
export type VideoRotation = 0 | 90 | 180 | 270;

export interface UserSettingsState {
  /** Local video resolution ('1080p' or '720p') */
  videoResolution: VideoResolution;
  /** Whether user explicitly chose a local resolution on this device */
  isResolutionOverridden: boolean;
  /** Local video FPS (15-60) */
  videoFps: VideoFps;
  /** Whether user explicitly chose a local FPS on this device */
  isFpsOverridden: boolean;
  /** Video frame orientation: 'auto' (detect), 'landscape' (16:9), 'portrait' (9:16) */
  videoOrientation: VideoOrientation;
  /** Camera sensor rotation offset: 0, 90, 180, 270 degrees */
  videoRotation: VideoRotation;
  /** Flag marking whether the camera has completed initial onboarding setup */
  isCameraConfigured: boolean;
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
  setVideoOrientation: (orientation: VideoOrientation) => void;
  setVideoRotation: (rotation: VideoRotation) => void;
  setCameraConfigured: (configured: boolean) => void;
  resetCameraConfiguration: () => void;
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
  videoOrientation: 'auto',
  videoRotation: 0,
  isCameraConfigured: false,
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

function sanitizeSettings(data: unknown): Partial<UserSettingsState> {
  if (!data || typeof data !== 'object') return {};
  const record = data as Record<string, unknown>;
  const clean: Partial<UserSettingsState> = {};

  if (record.videoResolution === '720p' || record.videoResolution === '1080p') {
    clean.videoResolution = record.videoResolution;
  }
  if (typeof record.isResolutionOverridden === 'boolean') {
    clean.isResolutionOverridden = record.isResolutionOverridden;
  }
  if (typeof record.videoFps === 'number' && [15, 20, 24, 30, 48, 60].includes(record.videoFps)) {
    clean.videoFps = record.videoFps as VideoFps;
  }
  if (typeof record.isFpsOverridden === 'boolean') {
    clean.isFpsOverridden = record.isFpsOverridden;
  }
  if (record.videoOrientation === 'auto' || record.videoOrientation === 'landscape' || record.videoOrientation === 'portrait') {
    clean.videoOrientation = record.videoOrientation;
  }
  if (record.videoRotation === 0 || record.videoRotation === 90 || record.videoRotation === 180 || record.videoRotation === 270) {
    clean.videoRotation = record.videoRotation;
  }
  if (typeof record.isCameraConfigured === 'boolean') {
    clean.isCameraConfigured = record.isCameraConfigured;
  }
  if (typeof record.autoRecordAfterScan === 'boolean') {
    clean.autoRecordAfterScan = record.autoRecordAfterScan;
  }
  if (typeof record.soundBeepEnabled === 'boolean') {
    clean.soundBeepEnabled = record.soundBeepEnabled;
  }
  if (typeof record.shiftTarget === 'number' && Number.isFinite(record.shiftTarget) && record.shiftTarget > 0 && record.shiftTarget <= 10000) {
    clean.shiftTarget = Math.floor(record.shiftTarget);
  }

  return clean;
}

function getSafeStorageKey(user: string | null): string {
  if (!user) return 'user_settings';
  const clean = user.replace(/[^A-Za-z0-9_-]/g, '');
  return clean ? `user_settings_${clean}` : 'user_settings';
}

function readFromStorage(user: string | null): Partial<UserSettingsState> {
  if (typeof window === 'undefined') return {};
  try {
    const key = getSafeStorageKey(user);
    const raw = localStorage.getItem(key) || (!user ? null : localStorage.getItem('user_settings'));
    if (raw) {
      return sanitizeSettings(JSON.parse(raw));
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
    videoOrientation: state.videoOrientation,
    videoRotation: state.videoRotation,
    isCameraConfigured: state.isCameraConfigured,
    autoRecordAfterScan: state.autoRecordAfterScan,
    soundBeepEnabled: state.soundBeepEnabled,
    shiftTarget: state.shiftTarget,
  };
  const key = getSafeStorageKey(user);
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

    setVideoOrientation: (videoOrientation) =>
      set((state) => {
        const next = { ...state, videoOrientation };
        saveToStorage(state.activeUser, next);
        return next;
      }),

    setVideoRotation: (videoRotation) =>
      set((state) => {
        const next = { ...state, videoRotation };
        saveToStorage(state.activeUser, next);
        return next;
      }),

    setCameraConfigured: (isCameraConfigured) =>
      set((state) => {
        const next = { ...state, isCameraConfigured };
        saveToStorage(state.activeUser, next);
        return next;
      }),

    resetCameraConfiguration: () =>
      set((state) => {
        const next = {
          ...state,
          videoOrientation: 'auto' as VideoOrientation,
          videoRotation: 0 as VideoRotation,
          isCameraConfigured: false,
        };
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
        const clamped = Math.min(10000, Math.max(1, Math.floor(shiftTarget) || 300));
        const next = { ...state, shiftTarget: clamped };
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
