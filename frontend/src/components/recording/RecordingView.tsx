// ---------------------------------------------------------------------------
// RecordingView — Fullscreen camera view during active video recording
// Tham chiếu: docs/roadmap.md (Step 2.1), docs/11-ui-design-system.md (Mục 2.1)
// Rules: .agents/rules/01-ui-ux.md (Nút Dừng >= 56px, pulse animation)
// ---------------------------------------------------------------------------

import { useRef, useEffect, useState, useMemo } from 'react';
import { Square, AlertCircle, ScanLine, Layers } from 'lucide-react';
import type { OverlayInfo } from '../../hooks/use-media-recorder';
import type { VideoOrientation, VideoRotation } from '../../stores/user-settings-store';
import { RecordTimer } from './RecordTimer';
import { formatDuration } from '../../utils/format';
import { cn } from '../../lib/utils';

interface RecordingViewProps {
  /** Active camera stream */
  stream: MediaStream | null;
  /** Overlay information */
  overlayInfo: OverlayInfo;
  /** Duration in seconds */
  duration: number;
  /** Whether currently recording */
  isRecording: boolean;
  /** Video orientation setting: 'auto' | 'landscape' | 'portrait' */
  orientation?: VideoOrientation;
  /** Video rotation setting: 0 | 90 | 180 | 270 */
  rotation?: VideoRotation;
  /** Error message if any */
  error?: string | null;
  /** Callback to stop recording */
  onStopRecording: () => void;
  /** Ref callback to attach source video element */
  onAttachVideoRef?: (el: HTMLVideoElement | null) => void;
  /** Barcode của đơn tiếp theo đang chuẩn bị chuyển (nếu có) */
  nextBarcode?: string | null;
  /** Tổng số đơn đã quét trong phiên hiện tại */
  sessionCount?: number;
}

export function RecordingView({
  stream,
  overlayInfo,
  duration,
  isRecording,
  orientation = 'auto',
  rotation = 0,
  error,
  onStopRecording,
  onAttachVideoRef,
  nextBarcode,
  sessionCount,
}: RecordingViewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [frameDimensions, setFrameDimensions] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  const [streamDimensions, setStreamDimensions] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
      onAttachVideoRef?.(videoRef.current);
    }
  }, [stream, onAttachVideoRef]);

  // Track size of the viewfinder frame to correctly scale 90°/270° video transform
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setFrameDimensions({ width: Math.round(width), height: Math.round(height) });
        }
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setStreamDimensions({
        width: videoRef.current.videoWidth || 0,
        height: videoRef.current.videoHeight || 0,
      });
    }
  };

  // Lock body scroll on mobile during recording
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  const isPortraitStreamOrDevice = useMemo(() => {
    if (streamDimensions.width > 0 && streamDimensions.height > 0) {
      return streamDimensions.height > streamDimensions.width;
    }
    if (typeof window !== 'undefined') {
      return window.innerHeight > window.innerWidth;
    }
    return false;
  }, [streamDimensions]);

  const effectiveOrientation = useMemo(() => {
    if (orientation === 'landscape') return 'landscape';
    if (orientation === 'portrait') return 'portrait';
    return isPortraitStreamOrDevice ? 'portrait' : 'landscape';
  }, [orientation, isPortraitStreamOrDevice]);

  const isLandscape = effectiveOrientation === 'landscape';

  // Apply rotation and aspect-ratio preservation to match canvas recording exactly
  const isRotated90or270 = rotation === 90 || rotation === 270;
  const videoStyle = useMemo<React.CSSProperties>(() => {
    if (isRotated90or270) {
      const w = frameDimensions.height > 0 ? `${frameDimensions.height}px` : '100%';
      const h = frameDimensions.width > 0 ? `${frameDimensions.width}px` : '100%';
      return {
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: w,
        height: h,
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
        objectFit: 'cover',
      };
    }
    if (rotation === 180) {
      return {
        width: '100%',
        height: '100%',
        transform: 'rotate(180deg)',
        objectFit: 'cover',
      };
    }
    return {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
    };
  }, [isRotated90or270, rotation, frameDimensions]);

  const isDongGoi = overlayInfo.loaiBienBan === 'dong_goi';

  return (
    <div className="recording-view" role="region" aria-label="Màn hình đang quay video">
      {/* Top Bar HUD */}
      <div className="w-full z-30 flex items-center justify-between p-3 sm:p-5 pointer-events-auto shrink-0 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-2">
          {sessionCount && sessionCount > 1 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-md text-white border border-white/15 text-xs font-bold shadow-lg">
              <Layers size={14} className="text-primary" />
              <span>Phiên: {sessionCount} đơn</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-white/90 border border-white/10 text-[11px] font-mono shadow-sm">
            <span>{isLandscape ? '16:9 Ngang' : '9:16 Dọc'}</span>
            {rotation !== 0 && <span className="text-amber-400 font-bold">· {rotation}°</span>}
          </div>
        </div>

        <div className="shrink-0">
          <RecordTimer duration={duration} isRecording={isRecording} />
        </div>
      </div>

      {/* Center Viewfinder Stage (Exact Aspect Ratio 16:9 or 9:16) */}
      <div className="relative flex-1 w-full flex items-center justify-center overflow-hidden min-h-0">
        {nextBarcode && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 bg-primary/95 text-primary-foreground px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2 font-bold text-sm animate-pulse border border-primary-foreground/20">
            <ScanLine size={18} />
            <span>Chuyển sang: {nextBarcode}...</span>
          </div>
        )}

        <div
          ref={frameRef}
          className={cn(
            'relative flex items-center justify-center overflow-hidden transition-all duration-200 shadow-2xl bg-black',
            isLandscape
              ? 'w-full aspect-video max-h-full border-y border-white/20'
              : 'h-full aspect-[9/16] max-w-full border-x border-white/20'
          )}
          style={{
            aspectRatio: isLandscape ? '16 / 9' : '9 / 16',
          }}
        >
          {/* Live Video Preview */}
          <video
            ref={videoRef}
            onLoadedMetadata={handleLoadedMetadata}
            className="block"
            style={videoStyle}
            playsInline
            muted
            autoPlay
          />

          {/* Viewfinder corner guides for parcel alignment inside the actual recording frame */}
          <div className="recording-view__guide-corners" aria-hidden="true">
            <div className="guide-corner guide-corner--tl" />
            <div className="guide-corner guide-corner--tr" />
            <div className="guide-corner guide-corner--bl" />
            <div className="guide-corner guide-corner--br" />
          </div>

          {/* Minimal Bottom Left HUD (Matches Canvas output coordinates) */}
          <div className="absolute bottom-2.5 sm:bottom-3 left-2.5 sm:left-3 right-2.5 sm:right-3 z-20 flex flex-col gap-0.5 text-white font-mono text-[10px] sm:text-[11px] leading-[1.35] pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
            <div className="font-bold text-[12px] sm:text-[13px]">
              [{isDongGoi ? 'ĐÓNG GÓI' : 'KHUI HÀNG'}] {overlayInfo.maVanDon}
            </div>
            <div>
              NV: {overlayInfo.maNhanVien} | {overlayInfo.donViVc}
            </div>
            <div>
              {overlayInfo.gpsCoords 
                ? `${overlayInfo.gpsCoords.lat.toFixed(5)}, ${overlayInfo.gpsCoords.lng.toFixed(5)}${overlayInfo.gpsAddress ? ` · ${overlayInfo.gpsAddress}` : ''}`
                : 'GPS: đang tìm...'}
            </div>
            <div className="text-amber-400">
              {overlayInfo.warehouseName || 'Kho: chưa cấu hình'}
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              <span className="opacity-80">
                {now.toLocaleTimeString('vi-VN')} {now.toLocaleDateString('vi-VN')}
              </span>
              <span className="text-red-400 font-bold font-mono text-[10px] sm:text-[11px] flex items-center gap-1 bg-black/60 px-1.5 py-0.5 rounded border border-red-500/30">
                <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                REC {formatDuration(duration)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Error banner if any */}
      {error && (
        <div className="recording-view__error-banner z-30 mx-4" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Bottom Controls: Prominent STOP button */}
      <div className="w-full z-30 flex items-center justify-center p-3 sm:p-5 pointer-events-auto shrink-0 bg-gradient-to-t from-black/80 to-transparent">
        <button
          type="button"
          className="btn-recording-stop"
          onClick={onStopRecording}
          aria-label="Dừng quay video"
        >
          <div className="btn-recording-stop__icon-wrap">
            <Square size={24} fill="currentColor" aria-hidden="true" />
          </div>
          <span className="btn-recording-stop__label">DỪNG QUAY</span>
        </button>
      </div>
    </div>
  );
}
