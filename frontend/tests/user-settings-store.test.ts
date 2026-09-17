import { describe, it, expect, beforeEach } from 'vitest';
import { useUserSettingsStore, DEFAULT_USER_SETTINGS } from '../src/stores/user-settings-store';

describe('useUserSettingsStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useUserSettingsStore.getState().resetSettings();
  });

  it('initializes with default values', () => {
    const state = useUserSettingsStore.getState();
    expect(state.videoResolution).toBe(DEFAULT_USER_SETTINGS.videoResolution);
    expect(state.autoRecordAfterScan).toBe(true);
    expect(state.soundBeepEnabled).toBe(true);
  });

  it('updates videoResolution override', () => {
    useUserSettingsStore.getState().setVideoResolution('1080p');
    expect(useUserSettingsStore.getState().videoResolution).toBe('1080p');

    useUserSettingsStore.getState().setVideoResolution('720p');
    expect(useUserSettingsStore.getState().videoResolution).toBe('720p');
  });

  it('updates autoRecordAfterScan toggle', () => {
    useUserSettingsStore.getState().setAutoRecordAfterScan(false);
    expect(useUserSettingsStore.getState().autoRecordAfterScan).toBe(false);

    useUserSettingsStore.getState().setAutoRecordAfterScan(true);
    expect(useUserSettingsStore.getState().autoRecordAfterScan).toBe(true);
  });

  it('updates soundBeepEnabled toggle', () => {
    useUserSettingsStore.getState().setSoundBeepEnabled(false);
    expect(useUserSettingsStore.getState().soundBeepEnabled).toBe(false);

    useUserSettingsStore.getState().setSoundBeepEnabled(true);
    expect(useUserSettingsStore.getState().soundBeepEnabled).toBe(true);
  });

  it('resets settings to defaults', () => {
    useUserSettingsStore.getState().setVideoResolution('1080p');
    useUserSettingsStore.getState().setAutoRecordAfterScan(false);
    useUserSettingsStore.getState().setSoundBeepEnabled(false);

    useUserSettingsStore.getState().resetSettings();

    const state = useUserSettingsStore.getState();
    expect(state.videoResolution).toBe('720p');
    expect(state.autoRecordAfterScan).toBe(true);
    expect(state.soundBeepEnabled).toBe(true);
  });
});
