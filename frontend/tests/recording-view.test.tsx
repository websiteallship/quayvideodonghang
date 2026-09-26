import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecordingView } from '../src/components/recording/RecordingView';
import type { OverlayInfo } from '../src/hooks/use-media-recorder';

describe('RecordingView Component', () => {
  const mockOverlay: OverlayInfo = {
    maVanDon: 'VTP12345678',
    donViVc: 'ViettelPost',
    loaiBienBan: 'dong_goi',
    maNhanVien: 'NV009',
  };

  let mockStream: MediaStream;

  beforeEach(() => {
    mockStream = {
      getTracks: vi.fn().mockReturnValue([]),
    } as unknown as MediaStream;

    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders correctly with overlay info, mode pill, timer, and stop button', () => {
    const onStopRecording = vi.fn();

    render(
      <RecordingView
        stream={mockStream}
        overlayInfo={mockOverlay}
        duration={45}
        isRecording={true}
        onStopRecording={onStopRecording}
      />
    );

    // Mode label & tracking code in compact overlay
    expect(screen.getByText(/ĐÓNG GÓI/)).toBeTruthy();
    expect(screen.getByText(/VTP12345678/)).toBeTruthy();
    // Carrier and staff info
    expect(screen.getByText(/NV009/)).toBeTruthy();
    expect(screen.getByText(/ViettelPost/)).toBeTruthy();
    // Timer MM:SS
    expect(screen.getByText('00:45')).toBeTruthy();
    // Stop button
    const stopButton = screen.getByRole('button', { name: /dừng/i });
    expect(stopButton).toBeTruthy();

    // Clicking stop calls onStopRecording
    fireEvent.click(stopButton);
    expect(onStopRecording).toHaveBeenCalledTimes(1);
  });

  it('locks body overflow on mount and restores on unmount', () => {
    document.body.style.overflow = 'auto';

    const { unmount } = render(
      <RecordingView
        stream={mockStream}
        overlayInfo={mockOverlay}
        duration={10}
        isRecording={true}
        onStopRecording={vi.fn()}
      />
    );

    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).toBe('auto');
  });

  it('renders error banner when error prop is passed', () => {
    render(
      <RecordingView
        stream={mockStream}
        overlayInfo={mockOverlay}
        duration={5}
        isRecording={true}
        error="Lỗi mất tín hiệu camera"
        onStopRecording={vi.fn()}
      />
    );

    expect(screen.getByText('Lỗi mất tín hiệu camera')).toBeTruthy();
  });

  it('renders landscape framing badge when orientation is landscape', () => {
    render(
      <RecordingView
        stream={mockStream}
        overlayInfo={mockOverlay}
        duration={5}
        isRecording={true}
        orientation="landscape"
        rotation={90}
        onStopRecording={vi.fn()}
      />
    );

    expect(screen.getByText('16:9 Ngang')).toBeTruthy();
    expect(screen.getByText('· 90°')).toBeTruthy();
  });

  it('renders portrait framing badge when orientation is portrait', () => {
    render(
      <RecordingView
        stream={mockStream}
        overlayInfo={mockOverlay}
        duration={5}
        isRecording={true}
        orientation="portrait"
        rotation={0}
        onStopRecording={vi.fn()}
      />
    );

    expect(screen.getByText('9:16 Dọc')).toBeTruthy();
  });

  it('allows cycling camera rotation via HUD rotate button', () => {
    render(
      <RecordingView
        stream={mockStream}
        overlayInfo={mockOverlay}
        duration={5}
        isRecording={true}
        orientation="landscape"
        rotation={0}
        onStopRecording={vi.fn()}
      />
    );

    const rotateButton = screen.getByRole('button', { name: /đổi góc xoay camera/i });
    expect(rotateButton).toBeTruthy();
    expect(screen.getByText(/Xoay cam/)).toBeTruthy();

    fireEvent.click(rotateButton);
    // Verified button interaction doesn't throw
  });

  it('toggles mobile landscape fullscreen orientation mode', () => {
    // Force viewport to be portrait
    window.innerHeight = 800;
    window.innerWidth = 400;

    render(
      <RecordingView
        stream={mockStream}
        overlayInfo={mockOverlay}
        duration={5}
        isRecording={true}
        orientation="landscape"
        rotation={0}
        onStopRecording={vi.fn()}
      />
    );

    const toggleButton = screen.getByRole('button', { name: /cầm ngang full/i });
    expect(toggleButton).toBeTruthy();
    expect(screen.getByText('Cầm ngang full')).toBeTruthy();

    // Clicking toggles to Khung đứng
    fireEvent.click(toggleButton);
    expect(screen.getByText('Khung đứng')).toBeTruthy();

    // Clicking again toggles back to Cầm ngang full
    fireEvent.click(toggleButton);
    expect(screen.getByText('Cầm ngang full')).toBeTruthy();
  });
});
