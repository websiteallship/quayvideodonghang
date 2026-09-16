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
  onSaveAndContinue: (blob: Blob, duration: number) => void;
  /** Called when user discards the video and wants to re-record */
  onDiscardAndRetry: () => void;
}

export function VideoPreview({
  blob,
  previewUrl,
  duration,
  overlayInfo,
  onSaveAndContinue,
  onDiscardAndRetry,
}: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
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
          playPromise.catch(() => {});
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
          className="video-preview-card__player"
          style={{ cursor: 'pointer' }}
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

      {/* Actions */}
      <div className="video-preview-card__actions">
        <button
          type="button"
          className="btn-preview-save"
          onClick={() => onSaveAndContinue(blob, duration)}
        >
          <Check size={20} aria-hidden="true" />
          <span>Lưu & Tiếp tục</span>
        </button>

        <button
          type="button"
          className="btn-preview-discard"
          onClick={onDiscardAndRetry}
        >
          <RotateCcw size={18} aria-hidden="true" />
          <span>Quay lại</span>
        </button>
      </div>
    </div>
  );
}
