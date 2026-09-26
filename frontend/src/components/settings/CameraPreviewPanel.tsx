import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Camera, X, RotateCw, AlertCircle, RefreshCw } from 'lucide-react';
import type { VideoOrientation, VideoRotation, VideoResolution } from '../../stores/user-settings-store';
import { useCameraStore } from '../../stores/camera-store';
import { useAuthStore } from '../../stores/auth-store';
import { useConfigStore } from '../../stores/config-store';
import {
  drawCanvasOverlay,
  resolveCanvasSize,
  computeEffectiveRotation,
  type OverlayInfo,
} from '../../hooks/use-media-recorder';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { cn } from '../../lib/utils';

export interface CameraPreviewPanelProps {
  /** Current orientation setting being previewed */
  orientation: VideoOrientation;
  /** Current rotation setting being previewed */
  rotation: VideoRotation;
  /** Current resolution setting (default '720p') */
  resolution?: VideoResolution;
  /** Whether panel is visible */
  isOpen: boolean;
  /** Callback when panel closes */
  onClose?: () => void;
  /** Optional stream provided from parent; if omitted, panel requests its own stream */
  sourceStream?: MediaStream | null;
  /** Additional wrapper class names */
  className?: string;
}

export const CameraPreviewPanel: React.FC<CameraPreviewPanelProps> = ({
  orientation,
  rotation,
  resolution = '720p',
  isOpen,
  onClose,
  sourceStream,
  className,
}) => {
  const [internalStream, setInternalStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [streamResolution, setStreamResolution] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const selectedDeviceId = useCameraStore((s) => s.selectedDeviceId);
  const facingMode = useCameraStore((s) => s.facingMode);
  const user = useAuthStore((s) => s.user);
  const warehouseName = useConfigStore((s) => s.warehouseName);

  // Active stream: preferred sourceStream, fallback to internally acquired stream
  const activeStream = sourceStream || internalStream;

  // Demo overlay information matching standard packaging format
  const demoOverlay: OverlayInfo = useMemo(
    () => ({
      maVanDon: 'DEMO123456789',
      donViVc: 'GHN',
      loaiBienBan: 'dong_goi',
      maNhanVien: user?.ma_nhan_vien || 'NV001',
      warehouseName: warehouseName || 'Kho Demo Test',
    }),
    [user?.ma_nhan_vien, warehouseName]
  );

  // Target base resolution dimensions
  const baseDim = useMemo(() => {
    return resolution === '1080p'
      ? { width: 1920, height: 1080 }
      : { width: 1280, height: 720 };
  }, [resolution]);

  // Request camera stream if parent did not provide one and panel is open
  useEffect(() => {
    if (!isOpen || sourceStream) return;

    let isMounted = true;
    let localStream: MediaStream | null = null;

    async function initCamera() {
      setCameraError(null);
      try {
        const constraints: MediaStreamConstraints = {
          video: selectedDeviceId
            ? { deviceId: { exact: selectedDeviceId } }
            : { facingMode: { ideal: facingMode || 'environment' } },
          audio: false,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        localStream = stream;
        setInternalStream(stream);
      } catch (err) {
        if (!isMounted) return;
        const msg =
          err instanceof DOMException && err.name === 'NotAllowedError'
            ? 'Quyền truy cập camera bị từ chối. Vui lòng cho phép quyền trong cài đặt trình duyệt.'
            : 'Không thể kết nối camera xem trước. Vui lòng kiểm tra thiết bị.';
        setCameraError(msg);
      }
    }

    void initCamera();

    return () => {
      isMounted = false;
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      setInternalStream(null);
    };
  }, [isOpen, sourceStream, selectedDeviceId, facingMode]);

  // Keep references to orientation, rotation, baseDim, and demoOverlay to avoid restarting video stream on UI setting change
  const orientationRef = useRef(orientation);
  useEffect(() => {
    orientationRef.current = orientation;
  }, [orientation]);

  const rotationRef = useRef(rotation);
  useEffect(() => {
    rotationRef.current = rotation;
  }, [rotation]);

  const baseDimRef = useRef(baseDim);
  useEffect(() => {
    baseDimRef.current = baseDim;
  }, [baseDim]);

  const demoOverlayRef = useRef(demoOverlay);
  useEffect(() => {
    demoOverlayRef.current = demoOverlay;
  }, [demoOverlay]);

  const streamResolutionRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });

  // Setup video element and canvas animation loop — only runs when activeStream or isOpen changes
  useEffect(() => {
    if (!isOpen || !activeStream) return;

    const video = document.createElement('video');
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.srcObject = activeStream;
    videoRef.current = video;

    const handleLoadedMetadata = () => {
      if (video.videoWidth && video.videoHeight) {
        streamResolutionRef.current = { width: video.videoWidth, height: video.videoHeight };
        setStreamResolution({ width: video.videoWidth, height: video.videoHeight });
      }
    };
    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    const playPromise = video.play();
    if (playPromise !== undefined) {
      void playPromise.catch(() => {});
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    startTimeRef.current = Date.now();
    let lastFrameTime = 0;
    const targetFps = 30;
    const frameInterval = 1000 / targetFps;

    let isPaused = false;
    const renderLoop = (timestamp: number) => {
      if (isPaused) return;

      if (timestamp - lastFrameTime >= frameInterval) {
        lastFrameTime = timestamp;

        const vW = video.videoWidth || 0;
        const vH = video.videoHeight || 0;

        if (vW > 0 && vH > 0) {
          if (streamResolutionRef.current.width === 0) {
            streamResolutionRef.current = { width: vW, height: vH };
            setStreamResolution({ width: vW, height: vH });
          }

          const isPortraitStream = vH > vW;
          const { canvasWidth, canvasHeight } = resolveCanvasSize(
            baseDimRef.current.width,
            baseDimRef.current.height,
            orientationRef.current,
            isPortraitStream
          );

          if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
          }

          const elapsedSec = Math.max(0, Math.floor((Date.now() - startTimeRef.current) / 1000));
          // Auto-compensate rotation for orientation/stream mismatch
          const effectiveRot = computeEffectiveRotation(
            rotationRef.current,
            orientationRef.current,
            vW,
            vH
          );
          drawCanvasOverlay(
            ctx,
            video,
            canvasWidth,
            canvasHeight,
            demoOverlayRef.current,
            new Date(),
            elapsedSec,
            effectiveRot
          );
        }
      }

      animFrameIdRef.current = requestAnimationFrame(renderLoop);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        isPaused = true;
        if (animFrameIdRef.current) {
          cancelAnimationFrame(animFrameIdRef.current);
          animFrameIdRef.current = null;
        }
      } else {
        if (isPaused) {
          isPaused = false;
          lastFrameTime = 0;
          animFrameIdRef.current = requestAnimationFrame(renderLoop);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    animFrameIdRef.current = requestAnimationFrame(renderLoop);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.pause();
      video.srcObject = null;
      videoRef.current = null;
    };
  }, [isOpen, activeStream]);

  if (!isOpen) return null;

  // Calculate current canvas output dimensions
  const isPortraitStream = streamResolution.height > streamResolution.width;
  const { canvasWidth, canvasHeight } = resolveCanvasSize(
    baseDim.width,
    baseDim.height,
    orientation,
    isPortraitStream
  );
  const isLandscape = canvasWidth >= canvasHeight;

  return (
    <Card className={cn('relative overflow-hidden border-border bg-card shadow-sm', className)}>
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 p-3 sm:p-4">
        <div className="flex items-center gap-2">
          <Camera className="size-4 text-primary" aria-hidden="true" />
          <CardTitle className="text-sm font-bold text-foreground">
            Xem trước Camera (Live Preview)
          </CardTitle>
        </div>
        {onClose && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="size-9 min-h-[36px] min-w-[36px] rounded-lg text-muted-foreground hover:text-foreground"
            aria-label="Đóng xem trước camera"
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-3 p-3 sm:p-4">
        {cameraError ? (
          <Alert variant="destructive" className="rounded-xl border-rose-500/20 bg-rose-500/10 text-rose-600">
            <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
            <AlertDescription className="text-xs leading-relaxed font-medium">
              {cameraError}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="relative flex w-full items-center justify-center overflow-hidden rounded-2xl bg-slate-950/90 p-2 sm:p-3 border border-border/50 shadow-inner min-h-[220px]">
            <div
              className={cn(
                'relative flex items-center justify-center overflow-hidden rounded-xl shadow-lg transition-all duration-300',
                isLandscape
                  ? 'w-full aspect-video max-h-[300px]'
                  : 'h-[280px] sm:h-[340px] aspect-[9/16] max-w-full border border-white/10'
              )}
              style={{
                aspectRatio: `${canvasWidth} / ${canvasHeight}`,
              }}
            >
              <canvas
                ref={canvasRef}
                className="h-full w-full object-contain block"
                style={{
                  aspectRatio: `${canvasWidth} / ${canvasHeight}`,
                }}
              />
              {streamResolution.width === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/80 text-muted-foreground">
                  <RefreshCw className="size-5 animate-spin text-primary" aria-hidden="true" />
                  <span className="text-xs font-medium">Đang khởi tạo camera...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Technical Debug Information Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
          <Badge variant="outline" className="gap-1 border-border font-mono text-muted-foreground">
            <span>Canvas:</span>
            <span className="font-semibold text-foreground">
              {canvasWidth}×{canvasHeight} ({isLandscape ? '16:9' : '9:16'})
            </span>
          </Badge>

          <Badge variant="outline" className="gap-1 border-border font-mono text-muted-foreground">
            <span>Camera stream:</span>
            <span className="font-semibold text-foreground">
              {streamResolution.width > 0
                ? `${streamResolution.width}×${streamResolution.height}`
                : 'Đang nạp...'}
            </span>
          </Badge>

          <Badge
            variant="outline"
            className={cn(
              'gap-1 font-mono',
              rotation !== 0
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold'
                : 'border-border text-muted-foreground'
            )}
          >
            <RotateCw className="size-3" aria-hidden="true" />
            <span>Góc xoay:</span>
            <span className="text-foreground">{rotation}°</span>
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};
