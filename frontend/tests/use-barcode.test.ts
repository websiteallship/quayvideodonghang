import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBarcode, resetNativeSupportCache } from '../src/hooks/use-barcode';

// ---------------------------------------------------------------------------
// Mock BarcodeDetector (native) — must use class for `new` to work
// ---------------------------------------------------------------------------

let mockDetectResults: Array<{ rawValue: string; format: string; boundingBox: DOMRectReadOnly }>;

class MockBarcodeDetector {
  constructor(_opts: { formats: string[] }) {
    // noop
  }

  detect(_source: unknown): Promise<typeof mockDetectResults> {
    return Promise.resolve(mockDetectResults);
  }
}

function setupNativeBarcodeDetector(results: Array<{ rawValue: string; format: string }> = []) {
  mockDetectResults = results.map((r) => ({
    rawValue: r.rawValue,
    format: r.format,
    boundingBox: { x: 0, y: 0, width: 100, height: 100 } as DOMRectReadOnly,
  }));

  Object.defineProperty(globalThis, 'BarcodeDetector', {
    value: MockBarcodeDetector,
    writable: true,
    configurable: true,
  });
}

function removeNativeBarcodeDetector() {
  Reflect.deleteProperty(globalThis, 'BarcodeDetector');
}

// ---------------------------------------------------------------------------
// Mock video element ref
// ---------------------------------------------------------------------------

function createMockVideoRef(readyState: number = HTMLMediaElement.HAVE_ENOUGH_DATA) {
  const video = {
    readyState,
    videoWidth: 640,
    videoHeight: 480,
  } as unknown as HTMLVideoElement;

  return { current: video };
}

// ---------------------------------------------------------------------------
// Mock requestAnimationFrame
// ---------------------------------------------------------------------------

let rafCallbacks: Array<(time: number) => void> = [];
let rafId = 0;

function setupRaf() {
  rafCallbacks = [];
  rafId = 0;

  vi.stubGlobal('requestAnimationFrame', vi.fn((cb: (time: number) => void) => {
    rafCallbacks.push(cb);
    return ++rafId;
  }));

  vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => {
    void id;
  }));
}

function flushRaf(time = 200) {
  const callbacks = [...rafCallbacks];
  rafCallbacks = [];
  callbacks.forEach((cb) => cb(time));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useBarcode', () => {
  beforeEach(() => {
    resetNativeSupportCache();
    setupRaf();
    vi.spyOn(performance, 'now').mockReturnValue(0);
  });

  afterEach(() => {
    removeNativeBarcodeDetector();
    resetNativeSupportCache();
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // Feature detection
  // -----------------------------------------------------------------------

  describe('feature detection', () => {
    it('uses native backend when BarcodeDetector is available', () => {
      setupNativeBarcodeDetector();

      const videoRef = createMockVideoRef();
      const { result } = renderHook(() => useBarcode(videoRef));

      expect(result.current.scannerBackend).toBe('native');
    });

    it('uses zxing-wasm backend when BarcodeDetector is not available', () => {
      removeNativeBarcodeDetector();

      const videoRef = createMockVideoRef();
      const { result } = renderHook(() => useBarcode(videoRef));

      expect(result.current.scannerBackend).toBe('zxing-wasm');
    });
  });

  // -----------------------------------------------------------------------
  // Scan lifecycle
  // -----------------------------------------------------------------------

  describe('scan lifecycle', () => {
    it('starts in idle state', () => {
      setupNativeBarcodeDetector();

      const videoRef = createMockVideoRef();
      const { result } = renderHook(() => useBarcode(videoRef));

      expect(result.current.isScanning).toBe(false);
      expect(result.current.result).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('sets isScanning to true when startScanning is called', async () => {
      setupNativeBarcodeDetector();

      const videoRef = createMockVideoRef();
      const { result } = renderHook(() => useBarcode(videoRef));

      await act(async () => {
        await result.current.startScanning();
      });

      expect(result.current.isScanning).toBe(true);
    });

    it('sets isScanning to false when stopScanning is called', async () => {
      setupNativeBarcodeDetector();

      const videoRef = createMockVideoRef();
      const { result } = renderHook(() => useBarcode(videoRef));

      await act(async () => {
        await result.current.startScanning();
      });

      act(() => {
        result.current.stopScanning();
      });

      expect(result.current.isScanning).toBe(false);
    });

    it('calls requestAnimationFrame when scanning starts', async () => {
      setupNativeBarcodeDetector();

      const videoRef = createMockVideoRef();
      const { result } = renderHook(() => useBarcode(videoRef));

      await act(async () => {
        await result.current.startScanning();
      });

      expect(requestAnimationFrame).toHaveBeenCalled();
    });

    it('calls cancelAnimationFrame when scanning stops', async () => {
      setupNativeBarcodeDetector();

      const videoRef = createMockVideoRef();
      const { result } = renderHook(() => useBarcode(videoRef));

      await act(async () => {
        await result.current.startScanning();
      });

      act(() => {
        result.current.stopScanning();
      });

      expect(cancelAnimationFrame).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // reset()
  // -----------------------------------------------------------------------

  describe('reset', () => {
    it('clears result and error', async () => {
      setupNativeBarcodeDetector();

      const videoRef = createMockVideoRef();
      const { result } = renderHook(() => useBarcode(videoRef));

      act(() => {
        result.current.reset();
      });

      expect(result.current.result).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Cleanup on unmount
  // -----------------------------------------------------------------------

  describe('cleanup', () => {
    it('cancels animation frame on unmount', async () => {
      setupNativeBarcodeDetector();

      const videoRef = createMockVideoRef();
      const { result, unmount } = renderHook(() => useBarcode(videoRef));

      await act(async () => {
        await result.current.startScanning();
      });

      unmount();

      expect(cancelAnimationFrame).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // Native detection path
  // -----------------------------------------------------------------------

  describe('native BarcodeDetector scan', () => {
    it('detects barcode and auto-stops scanning', async () => {
      setupNativeBarcodeDetector([
        { rawValue: 'GHN0123456789', format: 'qr_code' },
      ]);

      const videoRef = createMockVideoRef();
      const { result } = renderHook(() => useBarcode(videoRef));

      await act(async () => {
        await result.current.startScanning();
      });

      // Advance time past throttle interval
      vi.spyOn(performance, 'now').mockReturnValue(200);

      // Flush the rAF callback and wait for async detect() → then() → setState
      // Need multiple microtask ticks for: rAF → detect() → .then() → setState
      await act(async () => {
        flushRaf(200);
        // Multiple awaits to ensure all microtask queues are drained
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(result.current.result).toEqual({
        rawValue: 'GHN0123456789',
        format: 'qr_code',
        source: 'camera',
      });
      expect(result.current.isScanning).toBe(false);
    });

    it('detects 1D code_128 shipping barcode', async () => {
      setupNativeBarcodeDetector([
        { rawValue: 'GHN987654321', format: 'code_128' },
      ]);

      const videoRef = createMockVideoRef();
      const { result } = renderHook(() => useBarcode(videoRef));

      await act(async () => {
        await result.current.startScanning();
      });

      vi.spyOn(performance, 'now').mockReturnValue(200);

      await act(async () => {
        flushRaf(200);
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(result.current.result).toEqual({
        rawValue: 'GHN987654321',
        format: 'code_128',
        source: 'camera',
      });
      expect(result.current.isScanning).toBe(false);
    });

    it('detects 1D ean_13 product barcode', async () => {
      setupNativeBarcodeDetector([
        { rawValue: '8938505963013', format: 'ean_13' },
      ]);

      const videoRef = createMockVideoRef();
      const { result } = renderHook(() => useBarcode(videoRef));

      await act(async () => {
        await result.current.startScanning();
      });

      vi.spyOn(performance, 'now').mockReturnValue(200);

      await act(async () => {
        flushRaf(200);
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(result.current.result).toEqual({
        rawValue: '8938505963013',
        format: 'ean_13',
        source: 'camera',
      });
      expect(result.current.isScanning).toBe(false);
    });

    it('falls back to zxing-wasm if BarcodeDetector only supports qr_code (Windows desktop)', async () => {
      class QROnlyBarcodeDetector {
        static getSupportedFormats() {
          return Promise.resolve(['qr_code']);
        }
        detect() {
          return Promise.resolve([]);
        }
      }

      Object.defineProperty(globalThis, 'BarcodeDetector', {
        value: QROnlyBarcodeDetector,
        writable: true,
        configurable: true,
      });

      const videoRef = createMockVideoRef();
      const { result } = renderHook(() => useBarcode(videoRef));

      await act(async () => {
        await result.current.startScanning();
      });

      expect(result.current.scannerBackend).toBe('zxing-wasm');
    });

    it('continues scanning when no barcode detected', async () => {
      setupNativeBarcodeDetector([]); // No results

      const videoRef = createMockVideoRef();
      const { result } = renderHook(() => useBarcode(videoRef));

      await act(async () => {
        await result.current.startScanning();
      });

      // Advance time past throttle interval
      vi.spyOn(performance, 'now').mockReturnValue(200);

      await act(async () => {
        flushRaf(200);
        await new Promise((r) => setTimeout(r, 10));
      });

      // Should still be scanning (no result found)
      expect(result.current.isScanning).toBe(true);
      expect(result.current.result).toBeNull();
    });
  });
});
