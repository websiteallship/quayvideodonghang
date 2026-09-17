// ---------------------------------------------------------------------------
// RecordingView — Fullscreen camera view during active video recording
// Tham chiếu: docs/roadmap.md (Step 2.1), docs/11-ui-design-system.md (Mục 2.1)
// Rules: .agents/rules/01-ui-ux.md (Nút Dừng >= 56px, pulse animation)
// ---------------------------------------------------------------------------

import { useRef, useEffect, useState } from 'react';
import { Square, AlertCircle } from 'lucide-react';
import type { OverlayInfo } from '../../hooks/use-media-recorder';
import { RecordTimer } from './RecordTimer';

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
}

export function RecordingView({
  stream,
  overlayInfo,
  duration,
  isRecording,
  error,
  onStopRecording,
  onAttachVideoRef,
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

      {/* Top Right: Record Timer */}
      <div className="absolute top-5 right-5 z-10">
        <RecordTimer duration={duration} isRecording={isRecording} />
      </div>

      {/* Minimal Bottom Left HUD (Matches Canvas output) */}
      <div className="absolute bottom-28 left-3 right-3 z-10 flex flex-col gap-0.5 text-white font-mono text-[11px] leading-[1.4] pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
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
        <div className="opacity-80">
          {now.toLocaleTimeString('vi-VN')} {now.toLocaleDateString('vi-VN')}
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
