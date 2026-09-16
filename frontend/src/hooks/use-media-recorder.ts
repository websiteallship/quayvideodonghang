// ---------------------------------------------------------------------------
// useMediaRecorder — Video recording hook with real-time canvas watermark overlay
// Tham chiếu: docs/roadmap.md (Step 2.1), docs/02-dac-ta-ky-thuat.md (Mục 3.3)
// Rules: .agents/rules/03-performance.md, 04-device-and-hardware.md, 05-offline-and-reliability.md
// ---------------------------------------------------------------------------

import { useState, useRef, useCallback, useEffect } from 'react';
import type { DonViVanChuyen, LoaiBienBan } from '../types';
import { useWakeLock } from './use-wake-lock';

export interface OverlayInfo {
  maVanDon: string;
  donViVc: DonViVanChuyen;
  loaiBienBan: LoaiBienBan;
  maNhanVien: string;
  gpsCoords?: { lat: number; lng: number } | null;
  gpsAddress?: string;
  warehouseName?: string;
}

export interface UseMediaRecorderOptions {
  stream: MediaStream | null;
  overlayInfo: OverlayInfo;
  targetWidth?: number;  // default 1280
  targetHeight?: number; // default 720
  fps?: number;          // default 30
  bitrate?: number;      // default 2_000_000 (2 Mbps)
}

export interface UseMediaRecorderReturn {
  isRecording: boolean;
  isPaused: boolean;
  duration: number; // Duration in seconds
  blob: Blob | null;
  previewUrl: string | null;
  mimeType: string;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  discardRecording: () => void;
  attachSourceVideo: (video: HTMLVideoElement | null) => void;
}

/**
 * Detect the best supported video MIME type for the current browser/device.
 * iOS Safari prefers video/mp4; codecs=avc1; Chromium prefers video/webm;codecs=vp9 or vp8.
 */
export function getSupportedMimeType(): string {
  if (typeof MediaRecorder === 'undefined') {
    return 'video/webm';
  }

  const preferredTypes = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/mp4;codecs=avc1',
    'video/mp4',
  ];

  for (const type of preferredTypes) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return 'video/webm';
}

// M5: Cache Intl formatters — toLocaleString is expensive (ICU lookup) and was called 30-60x/s
const timeFormatter = typeof Intl !== 'undefined'
  ? new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  : null;
const dateFormatter = typeof Intl !== 'undefined'
  ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  : null;

/**
 * Draw on canvas: camera frame + high-contrast watermark overlay
 */
export function drawCanvasOverlay(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  width: number,
  height: number,
  overlay: OverlayInfo,
  now: Date
): void {
  // 1. Draw camera video frame scaled to canvas
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    ctx.drawImage(video, 0, 0, width, height);
  } else {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
  }

  // 2. Top-left Badge: Mode & Barcode
  // Define text shadow for readability without bulky boxes
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;

  // Render everything compactly at the bottom left to save space
  const isDongGoi = overlay.loaiBienBan === 'dong_goi';
  const line1 = `[${isDongGoi ? 'ĐÓNG GÓI' : 'KHUI HÀNG'}] ${overlay.maVanDon}`;
  const line2 = `NV: ${overlay.maNhanVien} | ĐVVC: ${overlay.donViVc}`;
  
  let line3 = 'GPS: N/A (Đang tìm hoặc từ chối)';
  if (overlay.gpsCoords) {
    const coordsText = `${overlay.gpsCoords.lat.toFixed(5)}, ${overlay.gpsCoords.lng.toFixed(5)}`;
    line3 = overlay.gpsAddress
      ? `GPS: ${coordsText} — ${overlay.gpsAddress}`
      : `GPS: ${coordsText}`;
  }

  const line4 = `Kho: ${overlay.warehouseName || 'Chưa cấu hình (Vào Cài đặt)'}`;
  // M5: Use cached formatters instead of toLocaleTimeString/toLocaleDateString per frame
  const timeStr = timeFormatter ? timeFormatter.format(now) : now.toLocaleTimeString('vi-VN');
  const dateStr = dateFormatter ? dateFormatter.format(now) : now.toLocaleDateString('vi-VN');
  const line5 = `${timeStr} ${dateStr}`;

  const startX = 20;
  let currentY = height - 160; // Start higher to fit all lines
  const lineHeight = 28;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  // Line 1: Mode + Code
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px monospace';
  ctx.fillText(line1, startX, currentY);
  currentY += lineHeight;

  // Line 2: NV + DVVC
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px monospace';
  ctx.fillText(line2, startX, currentY);
  currentY += lineHeight;

  // Line 3: GPS
  ctx.fillStyle = overlay.gpsCoords ? '#7dd3fc' : '#cbd5e1';
  ctx.font = 'bold 16px monospace';
  const maxChars3 = 55;
  const displayLine3 = line3.length > maxChars3 ? line3.slice(0, maxChars3) + '…' : line3;
  ctx.fillText(displayLine3, startX, currentY);
  currentY += lineHeight;

  // Line 4: Warehouse
  ctx.fillStyle = overlay.warehouseName ? '#fbbf24' : '#cbd5e1';
  ctx.font = 'bold 18px monospace';
  ctx.fillText(line4, startX, currentY);
  currentY += lineHeight;

  // Line 5: Timestamp
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px monospace';
  ctx.fillText(line5, startX, currentY);

  // Bottom-right Badge: Watermark
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('QuayVideo Kho PWA', width - 20, height - 20);

  // Clear shadow before exit
  ctx.shadowColor = 'transparent';
}

export function useMediaRecorder({
  stream,
  overlayInfo,
  targetWidth = 1280,
  targetHeight = 720,
  fps = 30,
  bitrate = 2_000_000,
}: UseMediaRecorderOptions): UseMediaRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const sourceVideoRef = useRef<HTMLVideoElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const compositedStreamRef = useRef<MediaStream | null>(null);

  // H1: Use ref for overlayInfo to avoid stale closure in renderLoop.
  // The renderLoop captures this ref at creation time and always reads latest value.
  const overlayInfoRef = useRef<OverlayInfo>(overlayInfo);
  useEffect(() => {
    overlayInfoRef.current = overlayInfo;
  }, [overlayInfo]);

  // H2: Use ref for previewUrl to avoid closure/dependency issues in cleanup
  const previewUrlRef = useRef<string | null>(null);

  const detectedMimeType = useRef<string>(getSupportedMimeType());

  // Screen Wake Lock integration
  const { request: requestWakeLock, release: releaseWakeLock } = useWakeLock();

  // Attach source video element used for drawing onto canvas
  const attachSourceVideo = useCallback((video: HTMLVideoElement | null) => {
    sourceVideoRef.current = video;
  }, []);

  // H2: Cleanup helper using refs instead of state — no dependency cascade
  const cleanupResources = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
      setPreviewUrl(null);
    }
    if (compositedStreamRef.current) {
      compositedStreamRef.current.getTracks().forEach((track) => track.stop());
      compositedStreamRef.current = null;
    }
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
  }, []); // No dependencies — uses refs only

  // Discard recording and reset all state
  const discardRecording = useCallback(() => {
    cleanupResources();
    setBlob(null);
    setDuration(0);
    setIsRecording(false);
    setIsPaused(false);
    setError(null);
    chunksRef.current = [];
  }, [cleanupResources]);

  // Start video recording with composited canvas overlay
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      cleanupResources();
      chunksRef.current = [];
      setBlob(null);
      setDuration(0);

      if (!stream) {
        throw new Error('Không tìm thấy luồng camera');
      }

      // Check support
      if (typeof MediaRecorder === 'undefined') {
        throw new Error('MediaRecorder không được hỗ trợ trên trình duyệt này');
      }

      // Create offscreen canvas for rendering overlay
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      canvasRef.current = canvas;

      let ctx: CanvasRenderingContext2D | null = null;
      try {
        ctx = canvas.getContext('2d', { alpha: false });
      } catch {
        ctx = null;
      }

      // Create or use source video element to feed the stream into canvas
      let sourceVideo = sourceVideoRef.current;
      if (!sourceVideo) {
        sourceVideo = document.createElement('video');
        sourceVideo.playsInline = true;
        sourceVideo.muted = true;
        sourceVideo.autoplay = true;
        sourceVideo.srcObject = stream;
        try {
          const playPromise = sourceVideo.play();
          if (playPromise !== undefined) {
            await playPromise.catch(() => {});
          }
        } catch {
          // Ignore play errors in environments without media support (e.g. jsdom)
        }
        sourceVideoRef.current = sourceVideo;
      }

      // M1: Frame rendering loop throttled to target FPS (30fps)
      // rAF runs at 60fps — drawing 60fps for 30fps recording wastes ~50% CPU on mobile kho
      const frameDurationMs = 1000 / fps;
      let lastFrameTime = 0;

      const renderLoop = (timestamp: number) => {
        if (timestamp - lastFrameTime >= frameDurationMs) {
          lastFrameTime = timestamp;
          if (ctx && sourceVideo) {
            try {
              // H1: Read overlayInfo from ref — always latest value, no stale closure
              drawCanvasOverlay(ctx, sourceVideo, targetWidth, targetHeight, overlayInfoRef.current, new Date());
            } catch {
              // Ignore frame render errors
            }
          }
        }
        if (typeof requestAnimationFrame === 'function') {
          animFrameIdRef.current = requestAnimationFrame(renderLoop);
        }
      };
      if (typeof requestAnimationFrame === 'function') {
        animFrameIdRef.current = requestAnimationFrame(renderLoop);
      }

      // Capture composited stream from canvas
      let recordStream: MediaStream;
      if (typeof canvas.captureStream === 'function') {
        recordStream = canvas.captureStream(fps);
        // Retain and attach audio tracks from original camera/microphone stream
        const audioTracks = stream.getAudioTracks();
        audioTracks.forEach((track) => recordStream.addTrack(track));
      } else {
        // Fallback: record direct camera stream if canvas.captureStream is unavailable
        recordStream = stream;
      }
      compositedStreamRef.current = recordStream;

      const mimeType = detectedMimeType.current;
      const recorderOptions: MediaRecorderOptions = {
        mimeType,
        videoBitsPerSecond: bitrate,
      };

      const recorder = new MediaRecorder(recordStream, recorderOptions);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onerror = (e: Event) => {
        setError(`Lỗi ghi hình: ${(e as ErrorEvent).message || 'Không rõ nguyên nhân'}`);
      };

      // Request timeslice = 1000 to flush data every second (Rule 03-performance.md)
      recorder.start(1000);
      setIsRecording(true);
      setIsPaused(false);

      // Acquire Screen Wake Lock during recording
      void requestWakeLock();

      // Duration counter (every second)
      timerIntervalRef.current = window.setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể bắt đầu quay video';
      setError(msg);
      setIsRecording(false);
      void releaseWakeLock();
    }
  }, [
    stream,
    // H1: overlayInfo removed from deps — read from overlayInfoRef inside renderLoop
    targetWidth,
    targetHeight,
    fps,
    bitrate,
    cleanupResources,
    requestWakeLock,
    releaseWakeLock,
  ]);

  // Stop video recording and return completed Blob
  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;

      // Stop duration timer
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

      // Stop canvas render loop
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }

      // Release Wake Lock
      void releaseWakeLock();

      if (!recorder || recorder.state === 'inactive') {
        setIsRecording(false);
        resolve(null);
        return;
      }

      recorder.onstop = () => {
        const mimeType = detectedMimeType.current;
        const videoBlob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(videoBlob);

        // H2: Track URL in ref for reliable cleanup
        previewUrlRef.current = url;

        setBlob(videoBlob);
        setPreviewUrl(url);
        setIsRecording(false);
        setIsPaused(false);

        // Stop composited tracks
        if (compositedStreamRef.current) {
          compositedStreamRef.current.getTracks().forEach((t) => t.stop());
          compositedStreamRef.current = null;
        }

        resolve(videoBlob);
      };

      recorder.stop();
    });
  }, [releaseWakeLock]);

  // L3: beforeunload removed — already handled centrally in use-upload-queue.ts
  // which checks both isRecording and isUploading states.

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // Ignore
        }
      }
      if (compositedStreamRef.current) {
        compositedStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      // H2: Use ref for cleanup — avoids stale closure on previewUrl state
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []); // Empty deps — refs don't need deps

  return {
    isRecording,
    isPaused,
    duration,
    blob,
    previewUrl,
    mimeType: detectedMimeType.current,
    error,
    startRecording,
    stopRecording,
    discardRecording,
    attachSourceVideo,
  };
}
