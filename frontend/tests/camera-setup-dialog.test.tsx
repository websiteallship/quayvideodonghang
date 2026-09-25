import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CameraSetupDialog } from '../src/components/recording/CameraSetupDialog';
import { useUserSettingsStore } from '../src/stores/user-settings-store';

describe('CameraSetupDialog Component (Step 3.2)', () => {
  beforeEach(() => {
    localStorage.clear();
    useUserSettingsStore.getState().resetSettings();

    // Mock mediaDevices
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn(), kind: 'video' }],
          getVideoTracks: () => [],
          getAudioTracks: () => [],
        }),
      },
      writable: true,
      configurable: true,
    });
  });

  it('does not render when isOpen is false', () => {
    const onComplete = vi.fn();
    render(<CameraSetupDialog isOpen={false} onComplete={onComplete} />);
    expect(screen.queryByText('Cấu hình Camera lần đầu')).toBeNull();
  });

  it('renders dialog with header, preview, and options when isOpen is true', () => {
    const onComplete = vi.fn();
    render(<CameraSetupDialog isOpen={true} onComplete={onComplete} />);

    expect(screen.getByText('Cấu hình Camera lần đầu')).toBeTruthy();
    expect(screen.getByText('1. Khung hình quay video:')).toBeTruthy();
    expect(screen.getByText('Lưu và bắt đầu quay')).toBeTruthy();
  });

  it('updates store and calls onComplete when save button is clicked', () => {
    const onComplete = vi.fn();
    render(<CameraSetupDialog isOpen={true} onComplete={onComplete} />);

    // Select Landscape
    const landscapeBtn = screen.getByText('Ngang (16:9)');
    fireEvent.click(landscapeBtn);

    // Select Rotation 90°
    const rot90Btn = screen.getByText('90°');
    fireEvent.click(rot90Btn);

    // Click Save
    const saveBtn = screen.getByText('Lưu và bắt đầu quay');
    fireEvent.click(saveBtn);

    const state = useUserSettingsStore.getState();
    expect(state.isCameraConfigured).toBe(true);
    expect(state.videoOrientation).toBe('landscape');
    expect(state.videoRotation).toBe(90);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
