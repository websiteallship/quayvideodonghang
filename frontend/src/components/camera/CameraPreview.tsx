import { useRef, useEffect } from 'react';

interface CameraPreviewProps {
  stream: MediaStream | null;
  isLoading: boolean;
  /** Mirror video khi dùng camera trước (facingMode: 'user') */
  mirrored?: boolean;
  className?: string;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  children?: React.ReactNode;
}

/**
 * CameraPreview — hiển thị camera stream.
 * Rule 04: autoPlay + playsInline + muted (bắt buộc cho iOS Safari).
 * Rule 03: không quản lý stream lifecycle — useCamera hook xử lý.
 */
export function CameraPreview({
  stream,
  isLoading,
  mirrored = false,
  className = '',
  videoRef: externalVideoRef,
  children,
}: CameraPreviewProps) {
  const internalVideoRef = useRef<HTMLVideoElement>(null);
  const activeVideoRef = externalVideoRef ?? internalVideoRef;

  useEffect(() => {
    const video = activeVideoRef.current;
    if (!video) return;

    if (stream) {
      video.srcObject = stream;
      video.play().catch(() => {
        // Autoplay may be restricted until user gesture; video will play on user interaction
      });
    } else {
      video.srcObject = null;
    }

    return () => {
      if (video) {
        video.srcObject = null;
      }
    };
  }, [stream, activeVideoRef]);

  return (
    <div className={`camera-preview ${className}`}>
      {isLoading && (
        <div className="camera-preview__skeleton">
          <div className="camera-preview__skeleton-pulse" />
          <span className="camera-preview__skeleton-text">
            Đang khởi tạo camera...
          </span>
        </div>
      )}

      <video
        ref={activeVideoRef}
        autoPlay
        playsInline
        muted
        onLoadedMetadata={() => {
          activeVideoRef.current?.play().catch(() => {});
        }}
        className={`camera-preview__video ${mirrored ? 'camera-preview__video--mirrored' : ''} ${
          isLoading || !stream ? 'camera-preview__video--hidden' : ''
        }`}
      />
      {children}
    </div>
  );
}
