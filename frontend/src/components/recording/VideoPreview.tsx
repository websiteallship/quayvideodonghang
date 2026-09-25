import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Check,
  RotateCcw,
  Package,
  PackageOpen,
  HardDrive,
  Clock,
  Repeat,
  Play,
  Layers,
  Info,
  Loader2,
} from 'lucide-react';
import type { OverlayInfo } from '../../hooks/use-media-recorder';
import { formatBytes, formatDuration } from '../../utils/format';

interface VideoPreviewProps {
  /** Blob object of the recorded video */
  blob: Blob;
  /** Blob URL for playback */
  previewUrl: string;
  /** Duration in seconds */
  duration: number;
  /** Information of the parcel */
  overlayInfo: OverlayInfo;
  /** Called when user confirms and wants to queue the video */
  onSaveAndContinue: (blob: Blob, duration: number) => void | Promise<void>;
  /** Called when user discards the video and wants to re-record */
  onDiscardAndRetry: () => void;
  /** Danh sách các mã trong phiên quét liên tục (nếu có) */
  sessionCodes?: string[];
}

export function VideoPreview({
  blob,
  previewUrl,
  duration,
  overlayInfo,
  onSaveAndContinue,
  onDiscardAndRetry,
  sessionCodes,
}: VideoPreviewProps) {
  const codes = sessionCodes && sessionCodes.length > 0 ? sessionCodes : [overlayInfo.maVanDon];
  const isContinuous = codes.length > 1;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [playbackMode, setPlaybackMode] = useState<'last5s' | 'full'>('last5s');
  const startLast5sTime = Math.max(0, duration - 5);

  // Seek and play helper
  const seekAndPlay = useCallback((targetTime: number) => {
    if (videoRef.current) {
      const vid = videoRef.current;
      try {
        vid.currentTime = targetTime;
      } catch {
        // Safe catch for browsers that reject seeking during load
      }
      try {
        const playPromise = vid.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => { });
        }
      } catch {
        // Autoplay policy fallback
      }
    }
  }, []);

  // Handle initial metadata load: start looping last 5s by default
  const handleLoadedMetadata = useCallback(() => {
    if (playbackMode === 'last5s') {
      seekAndPlay(startLast5sTime);
    } else {
      seekAndPlay(0);
    }
  }, [playbackMode, startLast5sTime, seekAndPlay]);

  // Handle video playback loop in last5s mode
  const handleTimeUpdate = useCallback(() => {
    if (playbackMode === 'last5s' && videoRef.current) {
      const vid = videoRef.current;
      // If reached the end of video (or past duration), loop back to last 5s
      if (vid.currentTime >= (vid.duration || duration) - 0.1 || vid.ended) {
        seekAndPlay(startLast5sTime);
      }
    }
  }, [playbackMode, duration, startLast5sTime, seekAndPlay]);

  const handleEnded = useCallback(() => {
    if (playbackMode === 'last5s') {
      seekAndPlay(startLast5sTime);
    }
  }, [playbackMode, startLast5sTime, seekAndPlay]);

  // Switch to full video playback
  const switchToFull = useCallback(() => {
    setPlaybackMode('full');
    seekAndPlay(0);
  }, [seekAndPlay]);

  // Switch to 5s loop playback
  const switchToLast5s = useCallback(() => {
    setPlaybackMode('last5s');
    seekAndPlay(startLast5sTime);
  }, [startLast5sTime, seekAndPlay]);

  // Toggle mode when tapping video
  const handleVideoClick = useCallback(() => {
    if (playbackMode === 'last5s') {
      switchToFull();
    } else {
      switchToLast5s();
    }
  }, [playbackMode, switchToFull, switchToLast5s]);

  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = '';
      }
    };
  }, []);

  const isDongGoi = overlayInfo.loaiBienBan === 'dong_goi';

  return (
    <div className="video-preview-card" role="region" aria-label="Xem lại video đã quay">
      {/* Header Info */}
      <div className="video-preview-card__header">
        <div className="video-preview-card__title-section">
          <div className="video-preview-card__badge-mode">
            {isDongGoi ? (
              <>
                <Package size={16} aria-hidden="true" />
                <span>Đóng gói</span>
              </>
            ) : (
              <>
                <PackageOpen size={16} aria-hidden="true" />
                <span>Khui hàng</span>
              </>
            )}
          </div>
          <span className="video-preview-card__code font-mono">{overlayInfo.maVanDon}</span>
        </div>

        <div className="video-preview-card__meta-tags">
          <span className="video-preview-card__tag">
            <Clock size={13} aria-hidden="true" />
            <span>{formatDuration(duration)}</span>
          </span>
          <span className="video-preview-card__tag">
            <HardDrive size={13} aria-hidden="true" />
            <span>{formatBytes(blob.size)}</span>
          </span>
          <span className="video-preview-card__tag">{overlayInfo.donViVc}</span>
        </div>
      </div>

      {/* Video Player Wrapper */}
      <div className="video-preview-card__player-wrapper">
        <video
          ref={videoRef}
          src={previewUrl}
          controls={playbackMode === 'full'}
          playsInline
          muted
          autoPlay
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onClick={handleVideoClick}
          className="video-preview-card__player cursor-pointer"
        />
      </div>

      {/* Segmented Mode Selector */}
      <div className="video-preview-mode-selector">
        <button
          type="button"
          className={`mode-btn ${playbackMode === 'last5s' ? 'mode-btn--active' : ''}`}
          onClick={switchToLast5s}
          aria-label="Tua và lặp 5 giây cuối"
        >
          <Repeat size={16} aria-hidden="true" />
          <span>5s cuối (Dán tem)</span>
        </button>

        <button
          type="button"
          className={`mode-btn ${playbackMode === 'full' ? 'mode-btn--active' : ''}`}
          onClick={switchToFull}
          aria-label="Xem toàn bộ video từ đầu"
        >
          <Play size={16} aria-hidden="true" />
          <span>Xem toàn bộ (0:00)</span>
        </button>
      </div>

      {/* Session Summary (Hiển thị danh sách mã đơn đã quét trong phiên) */}
      {codes.length > 0 && (
        <div className="rounded-xl border border-border/80 bg-muted/30 p-3.5 flex flex-col gap-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold flex items-center gap-1.5 text-foreground">
              <Layers size={15} className="text-primary" />
              <span>
                {isContinuous
                  ? `Phiên quét liên tục (${codes.length} đơn)`
                  : 'Mã vận đơn đã quét (1 đơn)'}
              </span>
            </span>
            <span
              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${isContinuous
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                  : 'text-blue-600 dark:text-blue-400 bg-blue-500/10'
                }`}
            >
              {isContinuous ? `${codes.length - 1} đơn trước đã lưu` : 'Đang xem trước'}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto py-1">
            {codes.map((code, idx) => {
              const isCurrent = idx === codes.length - 1;
              return (
                <span
                  key={code}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-mono text-[11px] ${isCurrent
                      ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                      : 'bg-background/80 border border-border/70 text-muted-foreground'
                    }`}
                >
                  {!isCurrent && <Check size={12} className="text-emerald-500" />}
                  {code}
                  {isCurrent && (
                    <span className="text-[10px] font-normal opacity-90">
                      {isContinuous ? '(Đơn cuối)' : '(Đang xem)'}
                    </span>
                  )}
                </span>
              );
            })}
          </div>

          <p className="text-[11px] text-muted-foreground leading-tight flex items-center gap-1.5">
            <Info size={14} className="text-primary shrink-0" aria-hidden="true" />
            <span>
              {isContinuous
                ? 'Nếu bấm Hủy đơn cuối này, chỉ video đơn hiện tại bị hủy. Các đơn trước đã lưu an toàn trong hàng đợi.'
                : 'Bấm Lưu & Tiếp tục để đưa video vào hàng đợi tải lên Google Drive.'}
            </span>
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="video-preview-card__actions">
        <button
          type="button"
          className="btn-preview-save"
          disabled={isSaving}
          onClick={async () => {
            if (isSaving) return;
            setIsSaving(true);
            try {
              await onSaveAndContinue(blob, duration);
            } finally {
              setIsSaving(false);
            }
          }}
        >
          {isSaving ? (
            <Loader2 size={20} className="animate-spin" aria-hidden="true" />
          ) : (
            <Check size={20} aria-hidden="true" />
          )}
          <span>
            {isSaving
              ? 'Đang lưu...'
              : isContinuous ? `Lưu đơn cuối & Kết thúc (${codes.length} đơn)` : 'Lưu & Tiếp tục'}
          </span>
        </button>

        <button
          type="button"
          className="btn-preview-discard"
          disabled={isSaving}
          onClick={onDiscardAndRetry}
        >
          <RotateCcw size={18} aria-hidden="true" />
          <span>{isContinuous ? 'Hủy đơn cuối này' : 'Quay lại'}</span>
        </button>
      </div>
    </div>
  );
}
