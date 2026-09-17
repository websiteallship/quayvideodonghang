import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';

export type VideoResolution = '1080p' | '720p';

export interface UserSettingsState {
  /** Local video resolution override ('1080p' or '720p') */
  videoResolution: VideoResolution;
  /** Automatically trigger recording 1s after a valid scan */
  autoRecordAfterScan: boolean;
  /** Play sound beep on barcode scan or warning */
  soundBeepEnabled: boolean;
}

export interface UserSettingsActions {
  setVideoResolution: (res: VideoResolution) => void;
  setAutoRecordAfterScan: (enabled: boolean) => void;
  setSoundBeepEnabled: (enabled: boolean) => void;
  resetSettings: () => void;
}

export type UserSettingsStore = UserSettingsState & UserSettingsActions;

export const DEFAULT_USER_SETTINGS: UserSettingsState = {
  videoResolution: '720p',
  autoRecordAfterScan: true,
  soundBeepEnabled: true,
};

export const useUserSettingsStore = create<UserSettingsStore>()(
  subscribeWithSelector(
    persist(
      (set) => ({
        ...DEFAULT_USER_SETTINGS,
        setVideoResolution: (videoResolution) => set({ videoResolution }),
        setAutoRecordAfterScan: (autoRecordAfterScan) => set({ autoRecordAfterScan }),
        setSoundBeepEnabled: (soundBeepEnabled) => set({ soundBeepEnabled }),
        resetSettings: () => set(DEFAULT_USER_SETTINGS),
      }),
      {
        name: 'user_settings',
      }
    )
  )
);
