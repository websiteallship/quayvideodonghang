// ---------------------------------------------------------------------------
// RecordingView — Fullscreen camera view during active video recording
// Tham chiếu: docs/roadmap.md (Step 2.1), docs/11-ui-design-system.md (Mục 2.1)
// Rules: .agents/rules/01-ui-ux.md (Nút Dừng >= 56px, pulse animation)
// ---------------------------------------------------------------------------

import { useRef, useEffect, useState } from 'react';
import { Square, AlertCircle, ScanLine, Layers } from 'lucide-react';
import type { OverlayInfo } from '../../hooks/use-media-recorder';
import { RecordTimer } from './RecordTimer';
import { formatDuration } from '../../utils/format';

interface RecordingViewProps {
  /** Active camera stream */
  stream: MediaStream | null;
  /** Overlay information */
  overlayInfo: OverlayInfo;
  /** Duration in seconds */
  duration: number;
  /** Whether currently recording */
  isRecording: boolean;
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
  error,
  onStopRecording,
  onAttachVideoRef,
  nextBarcode,
  sessionCount,
}: RecordingViewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
      onAttachVideoRef?.(videoRef.current);
    }
  }, [stream, onAttachVideoRef]);

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

  const isDongGoi = overlayInfo.loaiBienBan === 'dong_goi';

  return (
    <div className="recording-view" role="region" aria-label="Màn hình đang quay video">
      {/* Live Video Preview */}
      <div className="recording-view__video-wrap">
        <video
          ref={videoRef}
          className="recording-view__video"
          playsInline
          muted
          autoPlay
        />
      </div>

      {/* Viewfinder corner guides for parcel alignment */}
      <div className="recording-view__guide-corners" aria-hidden="true">
        <div className="guide-corner guide-corner--tl" />
        <div className="guide-corner guide-corner--tr" />
        <div className="guide-corner guide-corner--bl" />
        <div className="guide-corner guide-corner--br" />
      </div>

      {/* Top Left: Session Badge (if in continuous session) */}
      {sessionCount && sessionCount > 1 && (
        <div className="absolute top-5 left-5 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md text-white border border-white/15 text-xs font-bold shadow-lg">
          <Layers size={14} className="text-primary" />
          <span>Phiên: {sessionCount} đơn</span>
        </div>
      )}

      {/* Top Center Notification: Transitioning to next barcode */}
      {nextBarcode && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-20 bg-primary/95 text-primary-foreground px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2 font-bold text-sm animate-pulse border border-primary-foreground/20">
          <ScanLine size={18} />
          <span>Chuyển sang: {nextBarcode}...</span>
        </div>
      )}

      {/* Top Right: Record Timer */}
      <div className="absolute top-3.5 right-3.5 sm:top-5 sm:right-5 z-30">
        <RecordTimer duration={duration} isRecording={isRecording} />
      </div>

      {/* Minimal Bottom Left HUD (Matches Canvas output) */}
      <div className="absolute bottom-28 left-3 right-3 z-20 flex flex-col gap-0.5 text-white font-mono text-[11px] leading-[1.4] pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
        <div className="font-bold text-[13px]">
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
          <span className="text-red-400 font-bold font-mono text-[11px] flex items-center gap-1 bg-black/60 px-1.5 py-0.5 rounded border border-red-500/30">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            REC {formatDuration(duration)}
          </span>
        </div>
      </div>

      {/* Error banner if any */}
      {error && (
        <div className="recording-view__error-banner" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Bottom Controls: Prominent STOP button */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10">
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
