// ---------------------------------------------------------------------------
// RecordingView — Fullscreen camera view during active video recording
// Tham chiếu: docs/roadmap.md (Step 2.1), docs/11-ui-design-system.md (Mục 2.1)
// Rules: .agents/rules/01-ui-ux.md (Nút Dừng >= 56px, pulse animation)
// ---------------------------------------------------------------------------

import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Square,
  AlertCircle,
  ScanLine,
  Layers,
  RotateCw,
  Maximize2,
  Minimize2,
  Keyboard,
} from 'lucide-react';
import type { OverlayInfo } from '../../hooks/use-media-recorder';
import { computeEffectiveRotation } from '../../hooks/use-media-recorder';
import { useUserSettingsStore, type VideoOrientation, type VideoRotation } from '../../stores/user-settings-store';
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

  const [isFullscreen, setIsFullscreen] = useState(false);

  // Track viewport orientation (portrait vs landscape)
  const [isViewportPortrait, setIsViewportPortrait] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.innerHeight > window.innerWidth;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsViewportPortrait(window.innerHeight > window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Monitor browser fullscreen state
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    if (typeof document === 'undefined') return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

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

  // Lock body scroll during recording
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

  // Auto-compensate rotation: when landscape + portrait stream → auto 270°
  const effectiveRotation = useMemo(() => {
    return computeEffectiveRotation(
      rotation,
      orientation,
      streamDimensions.width,
      streamDimensions.height
    );
  }, [rotation, orientation, streamDimensions]);

  // When setting is landscape on a mobile device whose viewport is portrait:
  // Default to false so portrait hold stays upright with 16:9 framing, and user can tap button to expand to fullscreen rotated
  const [isLandscapeRotated, setIsLandscapeRotated] = useState(false);
  const shouldRotateForLandscape = isLandscape && isViewportPortrait && isLandscapeRotated;

  const handleCycleCameraRotation = useCallback(() => {
    const nextRot = ((rotation + 90) % 360) as VideoRotation;
    useUserSettingsStore.getState().setVideoRotation(nextRot);
  }, [rotation]);

  const handleToggleOrientation = useCallback(() => {
    const nextOrientation: VideoOrientation = isLandscape ? 'portrait' : 'landscape';
    useUserSettingsStore.getState().setVideoOrientation(nextOrientation);
  }, [isLandscape]);

  // Desktop PC Keyboard shortcuts: Space/Enter to stop, R to rotate camera, F to toggle fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) {
        return;
      }

      if (e.code === 'Space' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onStopRecording();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleCycleCameraRotation();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        handleToggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStopRecording, handleCycleCameraRotation, handleToggleFullscreen]);

  const containerStyle = useMemo<React.CSSProperties>(() => {
    if (shouldRotateForLandscape) {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        width: '100dvh',
        height: '100dvw',
        transform: 'translate(-50%, -50%) rotate(90deg)',
        transformOrigin: 'center center',
        zIndex: 9999,
        margin: 0,
        borderRadius: 0,
      };
    }
    return {
      position: 'fixed',
      inset: 0,
      width: '100vw',
      height: '100dvh',
      zIndex: 9999,
      margin: 0,
      borderRadius: 0,
    };
  }, [shouldRotateForLandscape]);

  // Apply effective rotation (user rotation + auto-compensation) to video preview
  const isEffRotated90or270 = effectiveRotation === 90 || effectiveRotation === 270;
  const videoStyle = useMemo<React.CSSProperties>(() => {
    if (isEffRotated90or270) {
      const w = frameDimensions.height > 0 ? `${frameDimensions.height}px` : '100%';
      const h = frameDimensions.width > 0 ? `${frameDimensions.width}px` : '100%';
      return {
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: w,
        height: h,
        transform: `translate(-50%, -50%) rotate(${effectiveRotation}deg)`,
        objectFit: 'cover',
      };
    }
    if (effectiveRotation === 180) {
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
  }, [isEffRotated90or270, effectiveRotation, frameDimensions]);

  const isDongGoi = overlayInfo.loaiBienBan === 'dong_goi';

  const content = (
    <div
      className="recording-view fixed inset-0 z-[9999] flex flex-col justify-between overflow-hidden bg-black select-none text-white w-screen h-[100dvh]"
      role="region"
      aria-label="Màn hình đang quay video"
      style={containerStyle}
    >
      {/* Top Bar HUD - Protected by safe-area-inset for iPhone Dynamic Island / Notch */}
      <div className="w-full z-30 flex items-center justify-between p-3 sm:p-5 pt-[max(env(safe-area-inset-top),14px)] pointer-events-auto shrink-0 bg-gradient-to-b from-black/85 via-black/40 to-transparent">
        <div className="flex items-center gap-2 flex-wrap">
          {sessionCount && sessionCount > 1 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-md text-white border border-white/15 text-xs font-bold shadow-lg">
              <Layers size={14} className="text-primary" />
              <span>Phiên: {sessionCount} đơn</span>
            </div>
          )}

          {/* Nút Đổi Khung hình trên Top bar (16:9 ⟷ 9:16) */}
          <button
            type="button"
            onClick={handleToggleOrientation}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-black/60 backdrop-blur-md text-white/90 border border-white/15 text-[11px] sm:text-xs font-mono shadow-sm hover:bg-white/20 active:scale-95 transition-all cursor-pointer min-h-[36px]"
            title="Bấm để đổi khung hình (16:9 Ngang ⟷ 9:16 Dọc)"
            aria-label="Đổi tỷ lệ khung hình"
          >
            <span>{isLandscape ? '16:9 Ngang' : '9:16 Dọc'}</span>
            {effectiveRotation !== 0 && <span className="text-amber-400 font-bold">· {effectiveRotation}°</span>}
          </button>

          {/* Quick Camera Rotate Button (0° -> 90° -> 180° -> 270°) */}
          <button
            type="button"
            onClick={handleCycleCameraRotation}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-black/60 backdrop-blur-md text-white/90 border border-white/15 text-[11px] sm:text-xs font-medium hover:bg-white/20 transition-all cursor-pointer active:scale-95 min-h-[36px]"
            title="Đổi góc xoay camera [Phím R] (0°, 90°, 180°, 270°)"
            aria-label="Đổi góc xoay camera"
          >
            <RotateCw className="size-3.5 text-amber-400" />
            <span>Xoay cam{rotation > 0 ? ` ${rotation}°` : ''}</span>
            <kbd className="hidden md:inline-block px-1 py-0.2 rounded bg-white/15 text-[10px] text-white/70 font-mono">
              R
            </kbd>
          </button>

          {/* Browser Fullscreen Toggle */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-black/60 backdrop-blur-md text-white/90 border border-white/15 text-[11px] sm:text-xs font-medium hover:bg-white/20 transition-all cursor-pointer active:scale-95 min-h-[36px]"
            title={isFullscreen ? 'Thu nhỏ [Phím F]' : 'Toàn màn hình không viền [Phím F]'}
            aria-label={isFullscreen ? 'Thu nhỏ màn hình' : 'Toàn màn hình'}
          >
            {isFullscreen ? (
              <Minimize2 className="size-3.5 text-sky-400" />
            ) : (
              <Maximize2 className="size-3.5 text-sky-400" />
            )}
            <span>{isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}</span>
            <kbd className="hidden md:inline-block px-1 py-0.2 rounded bg-white/15 text-[10px] text-white/70 font-mono">
              F
            </kbd>
          </button>

          {/* Mobile Landscape Fullscreen Toggle */}
          {isLandscape && isViewportPortrait && (
            <button
              type="button"
              onClick={() => setIsLandscapeRotated((prev) => !prev)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-black/60 backdrop-blur-md text-white/90 border border-white/15 text-[11px] font-medium hover:bg-white/20 transition-all cursor-pointer active:scale-95 min-h-[36px]"
              title={isLandscapeRotated ? 'Chuyển về khung đứng' : 'Chuyển sang chế độ cầm ngang full màn hình'}
              aria-label={isLandscapeRotated ? 'Chuyển về khung đứng' : 'Cầm ngang full'}
            >
              <Maximize2 className="size-3 text-primary" />
              <span>{isLandscapeRotated ? 'Khung đứng' : 'Cầm ngang full'}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* PC Keyboard Shortcut Hint */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/50 backdrop-blur-md text-white/60 border border-white/10 text-xs font-mono">
            <Keyboard size={13} className="text-white/40" />
            <span>
              Phím tắt: <strong className="text-white/80">Space/Enter</strong> dừng
            </span>
          </div>

          <div className="shrink-0">
            <RecordTimer duration={duration} isRecording={isRecording} />
          </div>
        </div>
      </div>

      {/* Center Viewfinder Stage (Exact Aspect Ratio 16:9 or 9:16) */}
      <div className="relative flex-1 w-full flex items-center justify-center overflow-hidden min-h-0">
        {nextBarcode && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-primary/95 text-primary-foreground px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2 font-bold text-sm animate-pulse border border-primary-foreground/20">
            <ScanLine size={18} />
            <span>Chuyển sang: {nextBarcode}...</span>
          </div>
        )}

        <div
          ref={frameRef}
          className={cn(
            'relative flex items-center justify-center overflow-hidden transition-all duration-200 shadow-2xl bg-black',
            shouldRotateForLandscape
              ? 'w-full h-full'
              : isLandscape
              ? 'w-full h-full max-w-full max-h-full aspect-video border-y border-white/10'
              : 'h-full aspect-[9/16] max-w-full border-x border-white/10'
          )}
          style={
            shouldRotateForLandscape
              ? undefined
              : { aspectRatio: isLandscape ? '16 / 9' : '9 / 16' }
          }
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

          {/* Subtle Viewfinder Centering Guide Label */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 select-none">
            <span className="text-white/20 font-semibold text-xs sm:text-sm tracking-widest uppercase">
              Căn kiện hàng & tem vận đơn
            </span>
          </div>

          {/* Bottom Left Watermark HUD Card (Matches Canvas output coordinates) */}
          <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-20 pointer-events-none max-w-[92vw] sm:max-w-md lg:max-w-lg">
            <div className="bg-black/75 backdrop-blur-md border border-white/20 rounded-2xl p-2.5 sm:p-3.5 text-white font-mono shadow-2xl flex flex-col gap-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              {/* Mã vận đơn & Chế độ */}
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-lg text-xs font-bold tracking-wide uppercase',
                    isDongGoi
                      ? 'bg-emerald-500/25 text-emerald-400 border border-emerald-500/40'
                      : 'bg-amber-500/25 text-amber-400 border border-amber-500/40'
                  )}
                >
                  [{isDongGoi ? 'ĐÓNG GÓI' : 'KHUI HÀNG'}]
                </span>
                <span className="text-sm sm:text-base font-bold tracking-wider text-white">
                  {overlayInfo.maVanDon || 'Chưa có mã'}
                </span>
              </div>

              {/* Thông tin nhân viên & ĐVVC */}
              <div className="text-[11px] sm:text-xs text-slate-300 flex items-center gap-1.5 flex-wrap">
                <span>
                  NV: <strong className="text-white">{overlayInfo.maNhanVien}</strong>
                </span>
                <span className="opacity-40">|</span>
                <span>
                  ĐVVC: <strong className="text-white">{overlayInfo.donViVc}</strong>
                </span>
              </div>

              {/* Địa chỉ GPS & Tên kho */}
              <div className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                {overlayInfo.gpsCoords
                  ? `${overlayInfo.gpsCoords.lat.toFixed(5)}, ${overlayInfo.gpsCoords.lng.toFixed(5)}${
                      overlayInfo.gpsAddress ? ` · ${overlayInfo.gpsAddress}` : ''
                    }`
                  : 'GPS: đang tìm...'}
              </div>
              <div className="text-[11px] sm:text-xs text-amber-400 font-semibold truncate">
                {overlayInfo.warehouseName || 'Kho: chưa cấu hình'}
              </div>

              {/* Thời gian realtime & REC badge */}
              <div className="flex items-center gap-2 pt-1 border-t border-white/10 text-[10px] sm:text-xs">
                <span className="text-slate-300">
                  {now.toLocaleTimeString('vi-VN')} {now.toLocaleDateString('vi-VN')}
                </span>
                <span className="text-red-400 font-bold flex items-center gap-1.5 bg-red-500/15 px-2 py-0.5 rounded-md border border-red-500/30">
                  <span className="inline-block size-2 rounded-full bg-red-500 animate-pulse" />
                  REC {formatDuration(duration)}
                </span>
              </div>
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
      <div className="w-full z-30 flex items-center justify-center p-3 sm:p-5 pb-[max(env(safe-area-inset-bottom),16px)] pointer-events-auto shrink-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent">
        <button
          type="button"
          className="btn-recording-stop flex items-center justify-center gap-3 px-8 py-3.5 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white font-bold text-base sm:text-lg shadow-[0_0_28px_rgba(239,68,68,0.7)] border-2 border-white/40 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          onClick={onStopRecording}
          aria-label="Dừng quay video (Phím Space hoặc Enter)"
        >
          <div className="btn-recording-stop__icon-wrap size-6 rounded-md bg-white text-red-600 flex items-center justify-center shrink-0">
            <Square size={16} fill="currentColor" aria-hidden="true" />
          </div>
          <span className="btn-recording-stop__label">DỪNG QUAY</span>
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/40 text-white/90 border border-white/20 text-xs font-mono font-normal">
            Space
          </kbd>
        </button>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(content, document.body);
  }
  return content;
}

