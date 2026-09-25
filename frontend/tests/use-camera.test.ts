import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCamera, getResolutionChain } from '../src/hooks/use-camera';
import { useCameraStore } from '../src/stores/camera-store';
import { useUserSettingsStore } from '../src/stores/user-settings-store';

// ---------------------------------------------------------------------------
// Mock navigator.mediaDevices
// ---------------------------------------------------------------------------

const mockGetUserMedia = vi.fn();
const mockEnumerateDevices = vi.fn();
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();

const mockTrackStop = vi.fn();
const mockTrackAddEventListener = vi.fn();

function createMockStream(deviceId = 'mock-device-1'): MediaStream {
  const mockTrack = {
    stop: mockTrackStop,
    addEventListener: mockTrackAddEventListener,
    removeEventListener: vi.fn(),
    getSettings: () => ({ deviceId }),
    kind: 'video',
    enabled: true,
  } as unknown as MediaStreamTrack;

  return {
    getTracks: () => [mockTrack],
    getVideoTracks: () => [mockTrack],
    getAudioTracks: () => [],
  } as unknown as MediaStream;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockTrackStop.mockReset();
  mockTrackAddEventListener.mockReset();

  // Reset Zustand stores
  useUserSettingsStore.getState().resetSettings();
  useCameraStore.setState({
    selectedDeviceId: null,
    facingMode: 'environment',
    devices: [],
  });

  // Setup navigator.mediaDevices mock
  Object.defineProperty(navigator, 'mediaDevices', {
    value: {
      getUserMedia: mockGetUserMedia,
      enumerateDevices: mockEnumerateDevices,
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
    },
    writable: true,
    configurable: true,
  });

  mockEnumerateDevices.mockResolvedValue([
    { kind: 'videoinput', deviceId: 'mock-device-1', label: 'USB Webcam', groupId: 'g1' },
    { kind: 'videoinput', deviceId: 'mock-device-2', label: 'Integrated Camera', groupId: 'g2' },
    { kind: 'audioinput', deviceId: 'audio-1', label: 'Mic', groupId: 'g3' },
  ]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useCamera', () => {
  describe('startCamera', () => {
    it('should open camera stream successfully', async () => {
      const mockStream = createMockStream();
      mockGetUserMedia.mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() => useCamera());

      expect(result.current.stream).toBeNull();
      expect(result.current.isLoading).toBe(false);

      await act(async () => {
        await result.current.startCamera();
      });

      expect(result.current.stream).toBe(mockStream);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mockGetUserMedia).toHaveBeenCalledTimes(1);
    });

    it('should request camera with facingMode environment by default', async () => {
      const mockStream = createMockStream();
      mockGetUserMedia.mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() => useCamera());

      await act(async () => {
        await result.current.startCamera();
      });

      const constraints = mockGetUserMedia.mock.calls[0][0];
      expect(constraints.video.facingMode).toEqual({ ideal: 'environment' });
      expect(constraints.audio).toBe(false);
    });

    it('should request camera with exact deviceId when specified', async () => {
      const mockStream = createMockStream('specific-device');
      mockGetUserMedia.mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() => useCamera());

      await act(async () => {
        await result.current.startCamera('specific-device');
      });

      const constraints = mockGetUserMedia.mock.calls[0][0];
      expect(constraints.video.deviceId).toEqual({ exact: 'specific-device' });
    });

    it('should request 720p resolution as first attempt by default', async () => {
      const mockStream = createMockStream();
      mockGetUserMedia.mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() => useCamera());

      await act(async () => {
        await result.current.startCamera();
      });

      const constraints = mockGetUserMedia.mock.calls[0][0];
      expect(constraints.video.width).toEqual({ ideal: 1280 });
      expect(constraints.video.height).toEqual({ ideal: 720 });
    });

    it('should request 1080p resolution when overridden in useUserSettingsStore', async () => {
      useUserSettingsStore.getState().setVideoResolution('1080p');

      const mockStream = createMockStream();
      mockGetUserMedia.mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() => useCamera());

      await act(async () => {
        await result.current.startCamera();
      });

      const constraints = mockGetUserMedia.mock.calls[0][0];
      expect(constraints.video.width).toEqual({ ideal: 1920 });
      expect(constraints.video.height).toEqual({ ideal: 1080 });
    });

    it('should fallback to lower resolution on OverconstrainedError', async () => {
      const overconstrained = new DOMException('Overconstrained', 'OverconstrainedError');
      const mockStream = createMockStream();

      mockGetUserMedia
        .mockRejectedValueOnce(overconstrained) // 720p fails
        .mockResolvedValueOnce(mockStream);       // 480p succeeds

      const { result } = renderHook(() => useCamera());

      await act(async () => {
        await result.current.startCamera();
      });

      expect(mockGetUserMedia).toHaveBeenCalledTimes(2);
      expect(result.current.stream).toBe(mockStream);
      expect(result.current.error).toBeNull();

      // Second call should have 480p
      const secondConstraints = mockGetUserMedia.mock.calls[1][0];
      expect(secondConstraints.video.width).toEqual({ ideal: 854 });
      expect(secondConstraints.video.height).toEqual({ ideal: 480 });
    });

    it('should load devices after successful camera start', async () => {
      const mockStream = createMockStream();
      mockGetUserMedia.mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() => useCamera());

      await act(async () => {
        await result.current.startCamera();
      });

      expect(mockEnumerateDevices).toHaveBeenCalled();
      // Should have 2 videoinput devices in store
      const storeDevices = useCameraStore.getState().devices;
      expect(storeDevices).toHaveLength(2);
      expect(storeDevices[0].kind).toBe('videoinput');
    });

    it('should listen for track ended event (USB webcam disconnect)', async () => {
      const mockStream = createMockStream();
      mockGetUserMedia.mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() => useCamera());

      await act(async () => {
        await result.current.startCamera();
      });

      expect(mockTrackAddEventListener).toHaveBeenCalledWith(
        'ended',
        expect.any(Function)
      );
    });
  });

  describe('error handling', () => {
    it('should map NotAllowedError to permission_denied', async () => {
      const notAllowed = new DOMException('Permission denied', 'NotAllowedError');
      mockGetUserMedia.mockRejectedValueOnce(notAllowed);

      const { result } = renderHook(() => useCamera());

      await act(async () => {
        await result.current.startCamera();
      });

      expect(result.current.error).not.toBeNull();
      expect(result.current.error!.code).toBe('permission_denied');
      expect(result.current.error!.userMessage).toContain('camera');
    });

    it('should map NotFoundError to not_found', async () => {
      const notFound = new DOMException('No devices', 'NotFoundError');
      mockGetUserMedia.mockRejectedValueOnce(notFound);

      const { result } = renderHook(() => useCamera());

      await act(async () => {
        await result.current.startCamera();
      });

      expect(result.current.error!.code).toBe('not_found');
      expect(result.current.error!.userMessage).toContain('webcam');
    });

    it('should map NotReadableError to not_readable', async () => {
      const notReadable = new DOMException('Device in use', 'NotReadableError');
      mockGetUserMedia.mockRejectedValueOnce(notReadable);

      const { result } = renderHook(() => useCamera());

      await act(async () => {
        await result.current.startCamera();
      });

      expect(result.current.error!.code).toBe('not_readable');
    });

    it('should set not_supported error when getUserMedia unavailable', async () => {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useCamera());

      await act(async () => {
        await result.current.startCamera();
      });

      expect(result.current.error!.code).toBe('not_supported');
    });
  });

  describe('stopCamera', () => {
    it('should stop all tracks and clear stream', async () => {
      const mockStream = createMockStream();
      mockGetUserMedia.mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() => useCamera());

      await act(async () => {
        await result.current.startCamera();
      });

      expect(result.current.stream).toBe(mockStream);

      act(() => {
        result.current.stopCamera();
      });

      expect(mockTrackStop).toHaveBeenCalled();
      expect(result.current.stream).toBeNull();
    });
  });

  describe('switchDevice', () => {
    it('should stop current stream and start new with specified deviceId', async () => {
      const stream1 = createMockStream('device-1');
      const stream2 = createMockStream('device-2');

      mockGetUserMedia
        .mockResolvedValueOnce(stream1)
        .mockResolvedValueOnce(stream2);

      const { result } = renderHook(() => useCamera());

      await act(async () => {
        await result.current.startCamera('device-1');
      });

      await act(async () => {
        await result.current.switchDevice('device-2');
      });

      // Should have stopped first stream's tracks
      expect(mockTrackStop).toHaveBeenCalled();
      // Should persist deviceId in store
      expect(useCameraStore.getState().selectedDeviceId).toBe('device-2');
    });
  });

  describe('toggleFacing', () => {
    it('should toggle facingMode in store', async () => {
      const mockStream = createMockStream();
      mockGetUserMedia.mockResolvedValue(mockStream);

      const { result } = renderHook(() => useCamera());

      expect(useCameraStore.getState().facingMode).toBe('environment');

      await act(async () => {
        await result.current.toggleFacing();
      });

      expect(useCameraStore.getState().facingMode).toBe('user');
    });
  });

  describe('ondevicechange listener', () => {
    it('should register devicechange listener on mount', () => {
      renderHook(() => useCamera());

      expect(mockAddEventListener).toHaveBeenCalledWith(
        'devicechange',
        expect.any(Function)
      );
    });

    it('should remove devicechange listener on unmount', () => {
      const { unmount } = renderHook(() => useCamera());

      unmount();

      expect(mockRemoveEventListener).toHaveBeenCalledWith(
        'devicechange',
        expect.any(Function)
      );
    });
  });

  describe('cleanup on unmount', () => {
    it('should stop all tracks on unmount (Rule 03)', async () => {
      const mockStream = createMockStream();
      mockGetUserMedia.mockResolvedValueOnce(mockStream);

      const { result, unmount } = renderHook(() => useCamera());

      await act(async () => {
        await result.current.startCamera();
      });

      unmount();

      expect(mockTrackStop).toHaveBeenCalled();
    });
  });

  describe('getResolutionChain with forceOrientation', () => {
    it('returns landscape dimensions when forceOrientation is landscape', () => {
      const chain720 = getResolutionChain('720p', 30, 'landscape');
      expect(chain720[0].width.ideal).toBe(1280);
      expect(chain720[0].height.ideal).toBe(720);
      expect(chain720[0].frameRate.ideal).toBe(30);

      const chain1080 = getResolutionChain('1080p', 60, 'landscape');
      expect(chain1080[0].width.ideal).toBe(1920);
      expect(chain1080[0].height.ideal).toBe(1080);
      expect(chain1080[0].frameRate.ideal).toBe(60);
    });

    it('returns inverted portrait dimensions when forceOrientation is portrait', () => {
      const chain720 = getResolutionChain('720p', 30, 'portrait');
      expect(chain720[0].width.ideal).toBe(720);
      expect(chain720[0].height.ideal).toBe(1280);
      expect(chain720[0].frameRate.ideal).toBe(30);

      const chain1080 = getResolutionChain('1080p', 24, 'portrait');
      expect(chain1080[0].width.ideal).toBe(1080);
      expect(chain1080[0].height.ideal).toBe(1920);
      expect(chain1080[0].frameRate.ideal).toBe(24);
    });
  });
});
