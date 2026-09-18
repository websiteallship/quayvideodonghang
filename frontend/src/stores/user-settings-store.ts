import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
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
}

export interface UserSettingsActions {
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

export const DEFAULT_USER_SETTINGS: UserSettingsState = {
  videoResolution: '720p',
  isResolutionOverridden: false,
  videoFps: 30,
  isFpsOverridden: false,
  autoRecordAfterScan: true,
  soundBeepEnabled: true,
  shiftTarget: 300,
};

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

export const useUserSettingsStore = create<UserSettingsStore>()(
  subscribeWithSelector(
    persist(
      (set) => ({
        ...DEFAULT_USER_SETTINGS,
        setVideoResolution: (videoResolution, isOverride = true) =>
          set({ videoResolution, isResolutionOverridden: isOverride }),
        resetResolutionToSystem: () =>
          set({ isResolutionOverridden: false }),
        setVideoFps: (videoFps, isOverride = true) =>
          set({ videoFps, isFpsOverridden: isOverride }),
        resetFpsToSystem: () =>
          set({ isFpsOverridden: false }),
        setAutoRecordAfterScan: (autoRecordAfterScan) => set({ autoRecordAfterScan }),
        setSoundBeepEnabled: (soundBeepEnabled) => set({ soundBeepEnabled }),
        setShiftTarget: (shiftTarget) => set({ shiftTarget }),
        resetSettings: () => set(DEFAULT_USER_SETTINGS),
      }),
      {
        name: 'user_settings',
      }
    )
  )
);
