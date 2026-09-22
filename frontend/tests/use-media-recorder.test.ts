import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useMediaRecorder,
  getSupportedMimeType,
  drawCanvasOverlay,
  type OverlayInfo,
} from '../src/hooks/use-media-recorder';

describe('useMediaRecorder', () => {
  const mockOverlay: OverlayInfo = {
    maVanDon: 'GHN987654321',
    donViVc: 'GHN',
    loaiBienBan: 'dong_goi',
    maNhanVien: 'NV002',
  };

  class MockMediaRecorder {
    state: 'inactive' | 'recording' | 'paused' = 'inactive';
    stream: MediaStream;
    ondataavailable: ((e: { data: Blob }) => void) | null = null;
    onstop: (() => void) | null = null;
    onerror: ((e: Event) => void) | null = null;

    static isTypeSupported(type: string): boolean {
      return type.includes('webm');
    }

    constructor(stream: MediaStream) {
      this.stream = stream;
    }

    start(_timeslice?: number) {
      this.state = 'recording';
    }

    stop() {
      this.state = 'inactive';
      if (this.ondataavailable) {
        this.ondataavailable({ data: new Blob(['recorded-video'], { type: 'video/webm' }) });
      }
      if (this.onstop) {
        this.onstop();
      }
    }
  }

  let mockMediaStream: MediaStream;

  beforeEach(() => {
    vi.useFakeTimers();

    Object.defineProperty(globalThis, 'MediaRecorder', {
      value: MockMediaRecorder,
      writable: true,
      configurable: true,
    });

    // Mock MediaStream
    mockMediaStream = {
      getTracks: vi.fn().mockReturnValue([]),
      getVideoTracks: vi.fn().mockReturnValue([]),
      getAudioTracks: vi.fn().mockReturnValue([]),
      addTrack: vi.fn(),
      removeTrack: vi.fn(),
    } as unknown as MediaStream;

    // Mock HTMLCanvasElement.captureStream & getContext
    HTMLCanvasElement.prototype.captureStream = vi.fn().mockReturnValue(mockMediaStream);
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      drawImage: vi.fn(),
      fillRect: vi.fn(),
      fillStyle: '',
      font: '',
      textAlign: '',
      beginPath: vi.fn(),
      roundRect: vi.fn(),
      fill: vi.fn(),
      arc: vi.fn(),
      fillText: vi.fn(),
    });

    // Mock HTMLMediaElement.prototype.play & pause
    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    HTMLMediaElement.prototype.pause = vi.fn();

    // Mock URL.createObjectURL and revokeObjectURL
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-video-url');
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('getSupportedMimeType', () => {
    it('returns a supported MIME type matching MediaRecorder capabilities', () => {
      const mime = getSupportedMimeType();
      expect(mime).toBe('video/webm;codecs=vp9,opus');
    });
  });

  describe('drawCanvasOverlay', () => {
    it('executes canvas drawing commands with expected watermark text', () => {
      const fillTextSpy = vi.fn();
      const mockCtx = {
        drawImage: vi.fn(),
        fillRect: vi.fn(),
        fillStyle: '',
        font: '',
        textAlign: '',
        beginPath: vi.fn(),
        roundRect: vi.fn(),
        fill: vi.fn(),
        arc: vi.fn(),
        fillText: fillTextSpy,
      } as unknown as CanvasRenderingContext2D;

      const mockVideo = {
        readyState: 4, // HAVE_ENOUGH_DATA
      } as unknown as HTMLVideoElement;

      drawCanvasOverlay(mockCtx, mockVideo, 1280, 720, mockOverlay, new Date('2026-09-15T10:00:00Z'));

      expect(fillTextSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ĐÓNG GÓI] GHN987654321'),
        expect.any(Number),
        expect.any(Number)
      );
      expect(fillTextSpy).toHaveBeenCalledWith('QuayVideo Kho - by Allship', expect.any(Number), expect.any(Number));
    });
  });

  describe('useMediaRecorder Hook State & Controls', () => {
    it('starts with idle state', () => {
      const { result } = renderHook(() =>
        useMediaRecorder({
          stream: mockMediaStream,
          overlayInfo: mockOverlay,
        })
      );

      expect(result.current.isRecording).toBe(false);
      expect(result.current.duration).toBe(0);
      expect(result.current.blob).toBeNull();
      expect(result.current.previewUrl).toBeNull();
    });

    it('starts recording, counts duration, and stops cleanly returning Blob', async () => {
      const { result } = renderHook(() =>
        useMediaRecorder({
          stream: mockMediaStream,
          overlayInfo: mockOverlay,
        })
      );

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.isRecording).toBe(true);

      // Fast-forward 3 seconds
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(result.current.duration).toBe(3);

      let completedBlob: Blob | null = null;
      await act(async () => {
        completedBlob = await result.current.stopRecording();
      });

      expect(result.current.isRecording).toBe(false);
      expect(completedBlob).not.toBeNull();
      expect(result.current.blob).not.toBeNull();
      expect(result.current.previewUrl).toBe('blob:mock-video-url');
    });

    it('discards recording and revokes object URL', async () => {
      const { result } = renderHook(() =>
        useMediaRecorder({
          stream: mockMediaStream,
          overlayInfo: mockOverlay,
        })
      );

      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        await result.current.stopRecording();
      });

      expect(result.current.previewUrl).toBe('blob:mock-video-url');

      act(() => {
        result.current.discardRecording();
      });

      expect(result.current.blob).toBeNull();
      expect(result.current.previewUrl).toBeNull();
      expect(result.current.duration).toBe(0);
      expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-video-url');
    });
  });
});
