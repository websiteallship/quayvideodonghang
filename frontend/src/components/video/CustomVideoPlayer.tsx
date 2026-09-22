import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize
} from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { formatDuration } from '@/utils/format';

interface CustomVideoPlayerProps {
  src: string;
  expectedDuration?: number; // Thời lượng chuẩn lưu trong database (giây)
  title?: string;
  className?: string;
  onError?: () => void;
}

export const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({
  src,
  expectedDuration = 0,
  title,
  className = '',
  onError,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset loading state when source changes
  useEffect(() => {
    setIsLoading(true);
  }, [src]);

  // Thời lượng hiển thị: ưu tiên expectedDuration từ DB, fallback sang videoDuration nếu hợp lệ
  const totalDuration = useMemo(() => {
    if (expectedDuration && expectedDuration > 0) return expectedDuration;
    if (Number.isFinite(videoDuration) && videoDuration > 1) return videoDuration;
    return 0;
  }, [expectedDuration, videoDuration]);

  // Tự động ẩn controls sau 2.5s không rê chuột
  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2500);
    }
  }, [isPlaying]);

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  // Xử lý nạp metadata của video
  const handleLoadedMetadata = useCallback(() => {
    if (!videoRef.current) return;
    const vid = videoRef.current;
    
    // Nếu trình duyệt nhận diện duration hợp lệ (> 1s và hữu hạn)
    if (Number.isFinite(vid.duration) && vid.duration > 1) {
      setVideoDuration(vid.duration);
    }

    // Fix bug WebM MediaRecorder trong Chromium: seek tới 1e101 để buộc demuxer đọc cluster cuối
    if (expectedDuration && (vid.duration === Infinity || isNaN(vid.duration) || vid.duration <= 1)) {
      try {
        vid.currentTime = 1e101;
        const onTime = () => {
          vid.removeEventListener('timeupdate', onTime);
          vid.currentTime = 0;
        };
        vid.addEventListener('timeupdate', onTime, { once: true });
      } catch {
        // Safe catch
      }
    }
  }, [expectedDuration]);

  // Cập nhật currentTime theo chu kỳ phát
  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  }, []);

  // Toggle Play / Pause
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused || videoRef.current.ended) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  // Tua video khi kéo / click seek bar
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    setCurrentTime(targetTime);
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
    }
  };

  // Tua nhanh / lùi 5s
  const seekRelative = (seconds: number) => {
    if (!videoRef.current) return;
    const maxTime = totalDuration > 0 ? totalDuration : (videoRef.current.duration || 100);
    const newTime = Math.max(0, Math.min(videoRef.current.currentTime + seconds, maxTime));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Toggle Mute
  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMute = !isMuted;
    videoRef.current.muted = nextMute;
    setIsMuted(nextMute);
  };

  // Volume slider
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      const shouldMute = val === 0;
      videoRef.current.muted = shouldMute;
      setIsMuted(shouldMute);
    }
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Keyboard controls khi active
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Chỉ bắt khi đang mở dialog hoặc container có focus
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        seekRelative(-5);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        seekRelative(5);
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        toggleMute();
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay]);

  // Tính phần trăm thanh tiến trình chuẩn xác
  const progressPercent = totalDuration > 0
    ? Math.min(100, Math.max(0, (currentTime / totalDuration) * 100))
    : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={`relative w-full h-full bg-black group select-none overflow-hidden ${className}`}
    >
      {/* HTML5 Video Element */}
      <video
        ref={videoRef}
        src={src}
        playsInline
        webkit-playsinline="true"
        preload="auto"
        onClick={togglePlay}
        onLoadStart={() => setIsLoading(true)}
        onLoadedData={() => setIsLoading(false)}
        onCanPlay={() => {
          setIsLoading(false);
          setIsBuffering(false);
        }}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => {
          setIsLoading(false);
          setIsBuffering(false);
        }}
        onEnded={() => setIsPlaying(false)}
        onError={() => {
          setIsLoading(false);
          setIsBuffering(false);
          const err = videoRef.current?.error;
          console.warn('[CustomVideoPlayer] Playback error code:', err?.code, err?.message);
          onError?.();
        }}
        className="w-full h-full object-contain cursor-pointer"
      />

      {/* Buffering / Loading Spinner */}
      {(isLoading || isBuffering) && (
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center gap-2.5 bg-black/40 backdrop-blur-[2px] z-30">
          <Spinner size={36} className="text-white" />
          <span className="text-xs font-medium text-white/90 select-none">
            {isLoading ? 'Đang tải video...' : 'Đang nạp dữ liệu...'}
          </span>
        </div>
      )}

      {/* Title / Watermark Overlay */}
      {title && (
        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-xs text-[11px] font-mono text-white/90 z-20 pointer-events-none select-none">
          {title}
        </div>
      )}

      {/* Center Big Play Button (khi đang pause và không loading) */}
      {!isPlaying && !isBuffering && !isLoading && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Phát video"
          className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-primary/90 hover:bg-primary text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95 z-20 cursor-pointer"
        >
          <Play size={24} fill="currentColor" className="ml-1" />
        </button>
      )}

      {/* Bottom Controls Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-30 px-3 py-2.5 bg-gradient-to-t from-black/90 via-black/60 to-transparent transition-opacity duration-200 flex flex-col gap-1.5 ${
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Timeline Progress Slider */}
        <div className="relative w-full flex items-center h-4 group/seek cursor-pointer">
          {/* Background track */}
          <div className="absolute left-0 right-0 h-1 group-hover/seek:h-1.5 rounded-full bg-white/20 transition-all">
            {/* Played progress fill */}
            <div
              className="h-full rounded-full bg-primary relative"
              style={{ width: `${progressPercent}%` }}
            >
              {/* Thumb dot */}
              <div className="absolute -right-1.5 -top-[3px] w-2.5 h-2.5 rounded-full bg-white shadow-md opacity-0 group-hover/seek:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* Interactive Range Input (invisible overlay) */}
          <input
            type="range"
            min={0}
            max={totalDuration > 0 ? totalDuration : 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            aria-label="Thanh thời lượng video"
            className="w-full h-full opacity-0 cursor-pointer z-10"
          />
        </div>

        {/* Buttons Row */}
        <div className="flex items-center justify-between text-white text-xs">
          <div className="flex items-center gap-2">
            {/* Play/Pause toggle */}
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Tạm dừng' : 'Phát'}
              className="p-1.5 hover:bg-white/15 rounded-md transition-colors text-white cursor-pointer"
            >
              {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
            </button>

            {/* Replay 5s */}
            <button
              type="button"
              onClick={() => seekRelative(-5)}
              aria-label="Tua lại 5 giây"
              title="Tua lại 5 giây"
              className="p-1 hover:bg-white/15 rounded text-white/80 hover:text-white transition-colors cursor-pointer text-[10px] font-mono"
            >
              -5s
            </button>

            {/* Forward 5s */}
            <button
              type="button"
              onClick={() => seekRelative(5)}
              aria-label="Tua tới 5 giây"
              title="Tua tới 5 giây"
              className="p-1 hover:bg-white/15 rounded text-white/80 hover:text-white transition-colors cursor-pointer text-[10px] font-mono"
            >
              +5s
            </button>

            {/* Time Display: formatDuration(currentTime) / formatDuration(totalDuration) */}
            <div className="font-mono text-[11px] text-white/90 pl-1">
              <span>{formatDuration(Math.floor(currentTime))}</span>
              <span className="text-white/40 mx-1">/</span>
              <span className="text-white/70">
                {totalDuration > 0 ? formatDuration(Math.floor(totalDuration)) : '--:--'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Volume Control */}
            <div className="flex items-center gap-1 group/vol">
              <button
                type="button"
                onClick={toggleMute}
                aria-label={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
                className="p-1.5 hover:bg-white/15 rounded-md transition-colors text-white cursor-pointer"
              >
                {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                aria-label="Âm lượng"
                className="w-12 h-1 accent-primary cursor-pointer hidden sm:inline-block"
              />
            </div>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
              className="p-1.5 hover:bg-white/15 rounded-md transition-colors text-white cursor-pointer"
            >
              {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
