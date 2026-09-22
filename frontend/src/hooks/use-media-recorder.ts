// ---------------------------------------------------------------------------
// useMediaRecorder — Video recording hook with real-time canvas watermark overlay
// Tham chiếu: docs/roadmap.md (Step 2.1), docs/02-dac-ta-ky-thuat.md (Mục 3.3)
// Rules: .agents/rules/03-performance.md, 04-device-and-hardware.md, 05-offline-and-reliability.md
// ---------------------------------------------------------------------------

import { useState, useRef, useCallback, useEffect } from 'react';
import type { DonViVanChuyen, LoaiBienBan } from '../types';
import { useWakeLock } from './use-wake-lock';
import { formatDuration } from '../utils/format';

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

  // Ưu tiên video/mp4 (H.264/AVC) để phát được native trên 100% thiết bị (iOS Safari, Android, Desktop).
  // Fallback sang video/webm nếu trình duyệt không hỗ trợ quay MP4.
  const preferredTypes = [
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
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
  now: Date,
  duration: number = 0
): void {
  // 1. Draw camera video frame scaled to canvas preserving aspect ratio (object-fit: cover)
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth && video.videoHeight) {
    const vWidth = video.videoWidth;
    const vHeight = video.videoHeight;
    const videoRatio = vWidth / vHeight;
    const canvasRatio = width / height;

    let sx = 0;
    let sy = 0;
    let sWidth = vWidth;
    let sHeight = vHeight;

    if (videoRatio > canvasRatio) {
      // Video rộng hơn canvas -> crop 2 bên trái/phải để giữ đúng tỉ lệ không bị kéo dẹt
      sWidth = vHeight * canvasRatio;
      sx = (vWidth - sWidth) / 2;
    } else {
      // Video cao hơn canvas -> crop trên/dưới
      sHeight = vWidth / canvasRatio;
      sy = (vHeight - sHeight) / 2;
    }

    ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, width, height);
  } else if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    ctx.drawImage(video, 0, 0, width, height);
  } else {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
  }

  // 2. Watermark Overlay
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;

  const isPortrait = height > width;
  const durationStr = formatDuration(duration);

  // 2A. Top-right Live REC Badge directly on Canvas
  const badgeWidth = isPortrait ? 104 : 116;
  const badgeHeight = isPortrait ? 26 : 28;
  const badgeX = width - badgeWidth - (isPortrait ? 16 : 20);
  const badgeY = isPortrait ? 16 : 20;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, badgeHeight / 2);
  } else {
    ctx.rect(badgeX, badgeY, badgeWidth, badgeHeight);
  }
  ctx.fill();

  // Red Dot
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(badgeX + 14, badgeY + badgeHeight / 2, isPortrait ? 4 : 5, 0, Math.PI * 2);
  ctx.fill();

  // REC Time text
  ctx.fillStyle = '#ffffff';
  ctx.font = isPortrait ? 'bold 12px monospace' : 'bold 13px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`REC ${durationStr}`, badgeX + 24, badgeY + badgeHeight / 2 + 1);

  // 2B. Bottom Left Information Overlay
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
  const timeStr = timeFormatter ? timeFormatter.format(now) : now.toLocaleTimeString('vi-VN');
  const dateStr = dateFormatter ? dateFormatter.format(now) : now.toLocaleDateString('vi-VN');
  const line5 = `${timeStr} ${dateStr} · REC ${durationStr}`;

  const startX = isPortrait ? 16 : 20;
  const lineHeight = isPortrait ? 24 : 28;
  let currentY = height - (isPortrait ? 150 : 160);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  // Line 1: Mode + Code
  ctx.fillStyle = '#ffffff';
  ctx.font = isPortrait ? 'bold 17px monospace' : 'bold 20px monospace';
  ctx.fillText(line1, startX, currentY);
  currentY += lineHeight;

  // Line 2: NV + DVVC
  ctx.fillStyle = '#ffffff';
  ctx.font = isPortrait ? 'bold 15px monospace' : 'bold 18px monospace';
  ctx.fillText(line2, startX, currentY);
  currentY += lineHeight;

  // Line 3: GPS
  ctx.fillStyle = overlay.gpsCoords ? '#7dd3fc' : '#cbd5e1';
  ctx.font = isPortrait ? 'bold 14px monospace' : 'bold 16px monospace';
  const maxChars3 = isPortrait ? 38 : 55;
  const displayLine3 = line3.length > maxChars3 ? line3.slice(0, maxChars3) + '…' : line3;
  ctx.fillText(displayLine3, startX, currentY);
  currentY += lineHeight;

  // Line 4: Warehouse
  ctx.fillStyle = overlay.warehouseName ? '#fbbf24' : '#cbd5e1';
  ctx.font = isPortrait ? 'bold 15px monospace' : 'bold 18px monospace';
  const maxChars4 = isPortrait ? 40 : 60;
  const displayLine4 = line4.length > maxChars4 ? line4.slice(0, maxChars4) + '…' : line4;
  ctx.fillText(displayLine4, startX, currentY);
  currentY += lineHeight;

  // Line 5: Timestamp & REC Duration
  ctx.fillStyle = '#ffffff';
  ctx.font = isPortrait ? 'bold 15px monospace' : 'bold 18px monospace';
  ctx.fillText(line5, startX, currentY);

  // Bottom-right Badge: Watermark
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = isPortrait ? '13px sans-serif' : '16px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('QuayVideo Kho - by Allship', width - (isPortrait ? 16 : 20), height - (isPortrait ? 16 : 20));

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
  const recordingStartTimeRef = useRef<number>(0);

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
            await playPromise.catch(() => { });
          }
        } catch {
          // Ignore play errors in environments without media support (e.g. jsdom)
        }
        sourceVideoRef.current = sourceVideo;
      }

      // Đợi sourceVideo nạp metadata để nhận diện chiều quay (Portrait vs Landscape)
      const isJsdom = typeof navigator !== 'undefined' && navigator.userAgent.includes('jsdom');
      if (!isJsdom && sourceVideo.readyState < HTMLMediaElement.HAVE_METADATA) {
        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, 300);
          sourceVideo!.onloadedmetadata = () => {
            clearTimeout(timer);
            resolve();
          };
        });
      }

      // Nhận diện hướng thiết bị và camera:
      const isDevicePortrait = typeof window !== 'undefined' && (
        window.innerHeight > window.innerWidth ||
        window.matchMedia?.('(orientation: portrait)').matches
      );
      const isMobile = typeof navigator !== 'undefined' && (
        /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
        ('ontouchstart' in window && window.innerWidth < 1024)
      );

      // Xác định tỉ lệ hướng quay thực tế của camera
      const videoTrack = stream.getVideoTracks()[0];
      const settings = videoTrack?.getSettings ? videoTrack.getSettings() : undefined;
      const vWidth = sourceVideo.videoWidth || settings?.width || 0;
      const vHeight = sourceVideo.videoHeight || settings?.height || 0;

      // Ưu tiên: nếu là thiết bị di động đang cầm dọc HOẶC camera stream có chiều cao > chiều rộng
      const isPortrait = (isMobile && isDevicePortrait) || (vHeight > 0 && vWidth > 0 && vHeight > vWidth);

      // Giữ nguyên tỉ lệ quay: dọc (720x1280 / 1080x1920) hoặc ngang (1280x720 / 1920x1080)
      const canvasWidth = isPortrait ? Math.min(targetWidth, targetHeight) : Math.max(targetWidth, targetHeight);
      const canvasHeight = isPortrait ? Math.max(targetWidth, targetHeight) : Math.min(targetWidth, targetHeight);

      // Create offscreen canvas for rendering overlay
      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      canvasRef.current = canvas;

      let ctx: CanvasRenderingContext2D | null = null;
      try {
        ctx = canvas.getContext('2d', { alpha: false });
      } catch {
        ctx = null;
      }

      // M1: Frame rendering loop throttled to target FPS (30fps)
      // rAF runs at 60fps — drawing 60fps for 30fps recording wastes ~50% CPU on mobile kho
      const frameDurationMs = 1000 / fps;
      let lastFrameTime = 0;
      recordingStartTimeRef.current = Date.now();

      const renderLoop = (timestamp: number) => {
        if (timestamp - lastFrameTime >= frameDurationMs) {
          lastFrameTime = timestamp;
          const activeVideo = sourceVideoRef.current || sourceVideo;
          if (ctx && activeVideo) {
            try {
              const elapsedSec = Math.max(0, Math.floor((Date.now() - recordingStartTimeRef.current) / 1000));
              // H1: Read overlayInfo from ref — always latest value, no stale closure
              drawCanvasOverlay(ctx, activeVideo, canvasWidth, canvasHeight, overlayInfoRef.current, new Date(), elapsedSec);
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
