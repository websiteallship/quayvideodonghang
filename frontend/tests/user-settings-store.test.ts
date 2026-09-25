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
    expect(state.videoOrientation).toBe('auto');
    expect(state.videoRotation).toBe(0);
    expect(state.isCameraConfigured).toBe(false);
    expect(state.autoRecordAfterScan).toBe(true);
    expect(state.soundBeepEnabled).toBe(true);
  });

  it('updates videoOrientation and videoRotation', () => {
    useUserSettingsStore.getState().setVideoOrientation('landscape');
    expect(useUserSettingsStore.getState().videoOrientation).toBe('landscape');

    useUserSettingsStore.getState().setVideoRotation(90);
    expect(useUserSettingsStore.getState().videoRotation).toBe(90);

    useUserSettingsStore.getState().setVideoRotation(180);
    expect(useUserSettingsStore.getState().videoRotation).toBe(180);

    useUserSettingsStore.getState().setVideoOrientation('portrait');
    expect(useUserSettingsStore.getState().videoOrientation).toBe('portrait');
  });

  it('updates isCameraConfigured flag and resets camera configuration', () => {
    expect(useUserSettingsStore.getState().isCameraConfigured).toBe(false);

    useUserSettingsStore.getState().setCameraConfigured(true);
    expect(useUserSettingsStore.getState().isCameraConfigured).toBe(true);

    useUserSettingsStore.getState().setVideoOrientation('landscape');
    useUserSettingsStore.getState().setVideoRotation(270);

    useUserSettingsStore.getState().resetCameraConfiguration();
    const state = useUserSettingsStore.getState();
    expect(state.isCameraConfigured).toBe(false);
    expect(state.videoOrientation).toBe('auto');
    expect(state.videoRotation).toBe(0);
  });

  it('persists orientation and rotation per user in localStorage', () => {
    useUserSettingsStore.getState().loadUserSettings('NV001');
    useUserSettingsStore.getState().setVideoOrientation('landscape');
    useUserSettingsStore.getState().setVideoRotation(90);
    useUserSettingsStore.getState().setCameraConfigured(true);

    const raw = localStorage.getItem('user_settings_NV001');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.videoOrientation).toBe('landscape');
    expect(parsed.videoRotation).toBe(90);
    expect(parsed.isCameraConfigured).toBe(true);

    // Switch to another user
    useUserSettingsStore.getState().loadUserSettings('NV002');
    const stateNV002 = useUserSettingsStore.getState();
    expect(stateNV002.isCameraConfigured).toBe(false);
    expect(stateNV002.videoOrientation).toBe('auto');
    expect(stateNV002.videoRotation).toBe(0);
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
    useUserSettingsStore.getState().setVideoOrientation('landscape');
    useUserSettingsStore.getState().setVideoRotation(180);
    useUserSettingsStore.getState().setCameraConfigured(true);
    useUserSettingsStore.getState().setAutoRecordAfterScan(false);
    useUserSettingsStore.getState().setSoundBeepEnabled(false);

    useUserSettingsStore.getState().resetSettings();

    const state = useUserSettingsStore.getState();
    expect(state.videoResolution).toBe('720p');
    expect(state.videoOrientation).toBe('auto');
    expect(state.videoRotation).toBe(0);
    expect(state.isCameraConfigured).toBe(false);
    expect(state.autoRecordAfterScan).toBe(true);
    expect(state.soundBeepEnabled).toBe(true);
  });

  it('sanitizes and filters out invalid or malicious localStorage payloads (Security & Stability)', () => {
    const maliciousPayload = JSON.stringify({
      videoResolution: 'invalid_res',
      videoOrientation: 'hacked_orientation',
      videoRotation: 45,
      videoFps: 999,
      shiftTarget: -500,
      injectedProp: '<script>alert(1)</script>',
    });
    localStorage.setItem('user_settings_NV003', maliciousPayload);

    useUserSettingsStore.getState().loadUserSettings('NV003');
    const state = useUserSettingsStore.getState();

    expect(state.videoResolution).toBe('720p');
    expect(state.videoOrientation).toBe('auto');
    expect(state.videoRotation).toBe(0);
    expect(state.videoFps).toBe(30);
    expect(state.shiftTarget).toBe(300);
    expect((state as any).injectedProp).toBeUndefined();
  });
});
