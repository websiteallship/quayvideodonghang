// ---------------------------------------------------------------------------
// useBarcode — Camera-based Barcode Scanner Hook
// Tham chiếu: docs/02-dac-ta-ky-thuat.md (mục 3.2), docs/08-frontend-architecture.md
// Rules: 03-performance.md (lazy import, throttle 10fps), 04-device-and-hardware.md
// ---------------------------------------------------------------------------

import { useState, useCallback, useRef, useEffect } from 'react';
import type { RefObject } from 'react';
import type { BarcodeResult, BarcodeFormat, ScannerBackend } from '../types/barcode';
import { SUPPORTED_BARCODE_FORMATS, ZXING_FORMAT_MAP, NATIVE_FORMAT_MAP } from '../types/barcode';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UseBarcodeReturn {
  /** Whether the scan loop is currently running */
  isScanning: boolean;
  /** Last successful scan result */
  result: BarcodeResult | null;
  /** Error message (Vietnamese for warehouse workers) */
  error: string | null;
  /** Which scanning engine is active */
  scannerBackend: ScannerBackend;
  /** Start the camera scanning loop */
  startScanning: () => void;
  /** Stop the camera scanning loop */
  stopScanning: () => void;
  /** Clear result and prepare for next scan */
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Target ~10fps scan rate per Rule 03 (100ms between scans) */
const SCAN_INTERVAL_MS = 100;

// ---------------------------------------------------------------------------
// Native BarcodeDetector type declarations
// (Not yet in TypeScript lib — declare minimal interface)
// ---------------------------------------------------------------------------

interface DetectedBarcode {
  rawValue: string;
  format: string;
  boundingBox: DOMRectReadOnly;
}

interface BarcodeDetectorInstance {
  detect: (source: ImageBitmapSource) => Promise<DetectedBarcode[]>;
}

interface BarcodeDetectorConstructor {
  new (options: { formats: string[] }): BarcodeDetectorInstance;
  getSupportedFormats?: () => Promise<string[]>;
}

// ---------------------------------------------------------------------------
// zxing-wasm lazy loader
// ---------------------------------------------------------------------------

type ZxingReadBarcodesFn = (
  imageData: ImageData,
  options?: unknown
) => Promise<Array<{ text: string; format: string }>>;

/** Cached zxing readBarcodes function (lazy loaded) */
let zxingReadBarcodes: ZxingReadBarcodesFn | null = null;
let zxingLoadPromise: Promise<void> | null = null;

export async function loadZxingWasm(): Promise<void> {
  if (zxingReadBarcodes) return;
  if (zxingLoadPromise) {
    await zxingLoadPromise;
    return;
  }

  zxingLoadPromise = (async () => {
    try {
      const module = await import('zxing-wasm');
      zxingReadBarcodes = module.readBarcodes as unknown as ZxingReadBarcodesFn;
    } catch {
      throw new Error('Không thể tải thư viện quét mã. Vui lòng thử lại.');
    }
  })();

  await zxingLoadPromise;
}

// Preload zxing-wasm in background for zero-latency scanning
if (typeof window !== 'undefined') {
  void loadZxingWasm().catch(() => {});
}

// ---------------------------------------------------------------------------
// Feature detection
// ---------------------------------------------------------------------------

function hasNativeBarcodeDetector(): boolean {
  return 'BarcodeDetector' in globalThis;
}

let nativeSupportCached: boolean | null = null;

export function resetNativeSupportCache(): void {
  nativeSupportCached = null;
}

/**
 * Verifies if native BarcodeDetector supports 1D barcode formats (specifically code_128).
 * In desktop Chromium (Windows/Linux), BarcodeDetector only supports qr_code!
 * If 1D barcode formats are not supported natively, we must use zxing-wasm.
 */
export async function checkNativeBarcodeDetectorSupport(): Promise<boolean> {
  if (nativeSupportCached !== null) return nativeSupportCached;

  if (!('BarcodeDetector' in globalThis)) {
    nativeSupportCached = false;
    return false;
  }

  try {
    const BarcodeDetectorCtor = (
      globalThis as unknown as { BarcodeDetector: BarcodeDetectorConstructor }
    ).BarcodeDetector;

    if (typeof BarcodeDetectorCtor?.getSupportedFormats === 'function') {
      const formats = await BarcodeDetectorCtor.getSupportedFormats();
      nativeSupportCached = formats.includes('code_128');
    } else {
      nativeSupportCached = true;
    }
  } catch {
    nativeSupportCached = false;
  }

  return nativeSupportCached;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useBarcode(
  videoRef: RefObject<HTMLVideoElement | null>,
  onDetected?: (result: BarcodeResult) => void
): UseBarcodeReturn {
  // 1. State
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<BarcodeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scannerBackend, setScannerBackend] = useState<ScannerBackend>(
    hasNativeBarcodeDetector() ? 'native' : 'zxing-wasm'
  );

  // 2. Refs
  const onDetectedRef = useRef(onDetected);
  const rafIdRef = useRef<number>(0);
  const lastScanTimeRef = useRef<number>(0);
  const isScanningRef = useRef<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nativeDetectorRef = useRef<BarcodeDetectorInstance | null>(null);
  const scanLoopRef = useRef<(() => void) | null>(null);

  // 3. Effects
  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    if (hasNativeBarcodeDetector()) {
      void checkNativeBarcodeDetectorSupport().then((supports1D) => {
        if (!supports1D) {
          setScannerBackend('zxing-wasm');
        }
      });
    }
  }, []);

  // -----------------------------------------------------------------------
  // Canvas helper — reuse offscreen canvas for frame capture
  // -----------------------------------------------------------------------

  const getCanvas = useCallback((): HTMLCanvasElement => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    return canvasRef.current;
  }, []);

  const captureFrame = useCallback((video: HTMLVideoElement): ImageData | null => {
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return null;
    }

    const canvas = getCanvas();
    const width = video.videoWidth;
    const height = video.videoHeight;

    if (width === 0 || height === 0) return null;
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, width, height);
    return ctx.getImageData(0, 0, width, height);
  }, [getCanvas]);

  // -----------------------------------------------------------------------
  // Native BarcodeDetector scan
  // -----------------------------------------------------------------------

  const scanWithNative = useCallback(async (video: HTMLVideoElement): Promise<BarcodeResult | null> => {
    try {
      if (!nativeDetectorRef.current) {
        const BarcodeDetectorCtor = (globalThis as unknown as { BarcodeDetector: BarcodeDetectorConstructor }).BarcodeDetector;
        nativeDetectorRef.current = new BarcodeDetectorCtor({
          formats: SUPPORTED_BARCODE_FORMATS,
        });
      }

      const results = await nativeDetectorRef.current.detect(video);
      if (results.length === 0) return null;

      const detected = results[0];
      const format = NATIVE_FORMAT_MAP[detected.format] ?? (detected.format as BarcodeFormat);

      if (!SUPPORTED_BARCODE_FORMATS.includes(format)) return null;

      return {
        rawValue: detected.rawValue,
        format,
        source: 'camera',
      };
    } catch {
      return null;
    }
  }, []);

  // -----------------------------------------------------------------------
  // zxing-wasm scan (high precision for 1D Code128, Code39, EAN-13, and QR)
  // -----------------------------------------------------------------------

  const scanWithZxing = useCallback(async (video: HTMLVideoElement): Promise<BarcodeResult | null> => {
    if (!zxingReadBarcodes) return null;

    const imageData = captureFrame(video);
    if (!imageData) return null;

    try {
      const results = await zxingReadBarcodes(imageData, {
        tryHarder: true,
        tryRotate: true,
        tryInvert: true,
        tryDownscale: true,
        maxNumberOfSymbols: 1,
        formats: [
          'QRCode',
          'Code128',
          'Code39',
          'EAN13',
          'EAN8',
          'UPCA',
          'UPCE',
          'ITF',
          'Codabar',
        ],
      });
      if (results.length === 0) return null;

      const detected = results[0];
      const mappedFormat = ZXING_FORMAT_MAP[detected.format];
      if (!mappedFormat) return null;

      return {
        rawValue: detected.text,
        format: mappedFormat,
        source: 'camera',
      };
    } catch {
      return null;
    }
  }, [captureFrame]);

  // -----------------------------------------------------------------------
  // Scan loop (requestAnimationFrame + throttle)
  // Use ref to avoid self-referencing in useCallback.
  // -----------------------------------------------------------------------

  // Keep scanLoop implementation in ref — updated via effect (not during render)
  useEffect(() => {
    scanLoopRef.current = () => {
      if (!isScanningRef.current) return;

      const now = performance.now();

      // Throttle to ~10fps
      if (now - lastScanTimeRef.current < SCAN_INTERVAL_MS) {
        rafIdRef.current = requestAnimationFrame(() => scanLoopRef.current?.());
        return;
      }

      lastScanTimeRef.current = now;

      const video = videoRef.current;
      if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        rafIdRef.current = requestAnimationFrame(() => scanLoopRef.current?.());
        return;
      }

      // Hybrid scan runner: try native first, and fallback to zxing-wasm if native returns nothing
      const executeScan = async (): Promise<BarcodeResult | null> => {
        if (scannerBackend === 'native') {
          const nativeResult = await scanWithNative(video);
          if (nativeResult) return nativeResult;
          // Fallback to zxing-wasm if loaded (ensures 1D barcodes are decoded even if native is QR-only)
          if (zxingReadBarcodes) {
            return scanWithZxing(video);
          }
          return null;
        }
        return scanWithZxing(video);
      };

      executeScan()
        .then((scanResult) => {
          if (!isScanningRef.current) return;

          if (scanResult && scanResult.rawValue.trim().length > 0) {
            // Auto-stop on successful detection
            isScanningRef.current = false;
            setIsScanning(false);
            setResult(scanResult);
            setError(null);
            onDetectedRef.current?.(scanResult);
            return;
          }

          // Continue scanning
          if (isScanningRef.current) {
            rafIdRef.current = requestAnimationFrame(() => scanLoopRef.current?.());
          }
        })
        .catch(() => {
          // Continue scanning despite individual frame errors
          if (isScanningRef.current) {
            rafIdRef.current = requestAnimationFrame(() => scanLoopRef.current?.());
          }
        });
    };
  }, [videoRef, scannerBackend, scanWithNative, scanWithZxing]);

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  const startScanning = useCallback(async () => {
    if (isScanningRef.current) return;

    setError(null);
    setResult(null);

    // Determine optimal backend: check if native supports 1D barcodes
    let backend = scannerBackend;
    if (backend === 'native') {
      const supports1D = await checkNativeBarcodeDetectorSupport();
      if (!supports1D) {
        backend = 'zxing-wasm';
        setScannerBackend('zxing-wasm');
      }
    }

    // Always ensure zxing-wasm is loaded for 1D decoding capability
    try {
      await loadZxingWasm();
    } catch (err) {
      if (backend === 'zxing-wasm') {
        setError(err instanceof Error ? err.message : 'Lỗi khởi tạo bộ quét mã');
        return;
      }
    }

    isScanningRef.current = true;
    setIsScanning(true);
    lastScanTimeRef.current = 0;
    rafIdRef.current = requestAnimationFrame(() => scanLoopRef.current?.());
  }, [scannerBackend]);

  const stopScanning = useCallback(() => {
    isScanningRef.current = false;
    setIsScanning(false);
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = 0;
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  // -----------------------------------------------------------------------
  // Cleanup on unmount
  // -----------------------------------------------------------------------

  useEffect(() => {
    return () => {
      isScanningRef.current = false;
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = 0;
      }
      // Release offscreen canvas
      canvasRef.current = null;
      nativeDetectorRef.current = null;
    };
  }, []);

  return {
    isScanning,
    result,
    error,
    scannerBackend,
    startScanning,
    stopScanning,
    reset,
  };
}
