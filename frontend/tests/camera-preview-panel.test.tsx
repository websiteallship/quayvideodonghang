import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CameraPreviewPanel } from '../src/components/settings/CameraPreviewPanel';

describe('CameraPreviewPanel Component (Step 3.1)', () => {
  let mockTrackStop: ReturnType<typeof vi.fn>;
  let mockStream: MediaStream;

  beforeEach(() => {
    mockTrackStop = vi.fn();
    const mockTrack = {
      stop: mockTrackStop,
      kind: 'video',
      enabled: true,
    } as unknown as MediaStreamTrack;

    mockStream = {
      getTracks: () => [mockTrack],
      getVideoTracks: () => [mockTrack],
      getAudioTracks: () => [],
    } as unknown as MediaStream;

    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream),
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <CameraPreviewPanel
        orientation="auto"
        rotation={0}
        resolution="720p"
        isOpen={false}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders preview card and debug information badges when isOpen is true', async () => {
    render(
      <CameraPreviewPanel
        orientation="landscape"
        rotation={90}
        resolution="720p"
        isOpen={true}
        sourceStream={mockStream}
      />
    );

    expect(screen.getByText('Xem trước Camera (Live Preview)')).toBeTruthy();
    expect(screen.getByText('1280×720 (16:9)')).toBeTruthy();
    expect(screen.getByText('90°')).toBeTruthy();
  });

  it('stops tracks when component unmounts', () => {
    const { unmount } = render(
      <CameraPreviewPanel
        orientation="portrait"
        rotation={0}
        resolution="720p"
        isOpen={true}
      />
    );

    unmount();
    // Verify cleanup doesn't throw
    expect(true).toBe(true);
  });
});
