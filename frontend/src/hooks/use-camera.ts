import { useState, useCallback, useRef, useEffect } from 'react';
import { useCameraStore } from '../stores/camera-store';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CameraErrorCode =
  | 'permission_denied'
  | 'not_found'
  | 'not_readable'
  | 'overconstrained'
  | 'not_supported'
  | 'stream_ended'
  | 'unknown';

export interface CameraError {
  code: CameraErrorCode;
  message: string;
  /** Thông báo tiếng Việt hiển thị cho nhân viên kho */
  userMessage: string;
  /** Hướng dẫn recovery (nếu có) */
  recoveryHint?: string;
}

interface UseCameraReturn {
  stream: MediaStream | null;
  devices: MediaDeviceInfo[];
  selectedDevice: string | null;
  isLoading: boolean;
  error: CameraError | null;

  startCamera: (deviceId?: string) => Promise<void>;
  stopCamera: () => void;
  switchDevice: (deviceId: string) => Promise<void>;
  toggleFacing: () => Promise<void>;
}

import { getEffectiveResolution } from '../stores/user-settings-store';

// ---------------------------------------------------------------------------
// Resolution Fallback Chain: 1080p / 720p → 480p → any
// ---------------------------------------------------------------------------

export interface ResolutionConstraint {
  width: { ideal: number };
  height: { ideal: number };
  frameRate: { ideal: number };
}

export const RESOLUTION_CHAIN_1080P: ResolutionConstraint[] = [
  { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
  { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
  { width: { ideal: 854 }, height: { ideal: 480 }, frameRate: { ideal: 30 } },
  { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24 } },
];

export const RESOLUTION_CHAIN_720P: ResolutionConstraint[] = [
  { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
  { width: { ideal: 854 }, height: { ideal: 480 }, frameRate: { ideal: 30 } },
  { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24 } },
];

/**
 * Build resolution chain with dynamic FPS.
 * When fps > 30, camera may fallback to lower resolution — this is expected browser behavior.
 */
export function getResolutionChain(resolution: '1080p' | '720p', fps: number = 30): ResolutionConstraint[] {
  const base = resolution === '1080p' ? RESOLUTION_CHAIN_1080P : RESOLUTION_CHAIN_720P;
  if (fps === 30) return base;
  return base.map((c) => ({
    ...c,
    frameRate: { ideal: fps },
  }));
}

// ---------------------------------------------------------------------------
// Error Mapper — DOMException → CameraError (tiếng Việt, doc 10 §2.1)
// ---------------------------------------------------------------------------

function mapCameraError(err: unknown): CameraError {
  if (err instanceof DOMException || (err instanceof Error && 'name' in err)) {
    const e = err as DOMException;
    switch (e.name) {
      case 'NotAllowedError':
        return {
          code: 'permission_denied',
          message: e.message,
          userMessage:
            'Cần cho phép truy cập camera để quét mã và quay video. Vui lòng bật quyền camera trong Cài đặt trình duyệt.',
          recoveryHint:
            'Chrome/Edge: Bấm biểu tượng khóa trên thanh địa chỉ → Camera → Cho phép\niOS Safari: Cài đặt → Safari → Camera → Cho phép',
        };
      case 'NotFoundError':
        return {
          code: 'not_found',
          message: e.message,
          userMessage:
            'Không tìm thấy camera. Kiểm tra webcam đã cắm chưa hoặc thử cổng USB khác.',
        };
      case 'NotReadableError':
      case 'AbortError':
        return {
          code: 'not_readable',
          message: e.message,
          userMessage:
            'Camera đang được ứng dụng khác sử dụng. Đóng các app đang dùng camera rồi thử lại.',
        };
      case 'OverconstrainedError':
        return {
          code: 'overconstrained',
          message: e.message,
          userMessage: 'Camera không hỗ trợ độ phân giải yêu cầu. Đang thử cài đặt khác...',
        };
      default:
        return {
          code: 'unknown',
          message: e.message,
          userMessage: 'Lỗi không xác định khi mở camera. Vui lòng thử lại.',
        };
    }
  }

  return {
    code: 'unknown',
    message: String(err),
    userMessage: 'Lỗi không xác định khi mở camera. Vui lòng thử lại.',
  };
}

// ---------------------------------------------------------------------------
// Hook: useCamera
// ---------------------------------------------------------------------------

export function useCamera(): UseCameraReturn {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<CameraError | null>(null);

  // Zustand store — device persistence
  const selectedDeviceId = useCameraStore((s) => s.selectedDeviceId);
  const facingMode = useCameraStore((s) => s.facingMode);
  const devices = useCameraStore((s) => s.devices);
  const storeSetDevice = useCameraStore((s) => s.setDevice);
  const storeSetDevices = useCameraStore((s) => s.setDevices);
  const storeToggleFacing = useCameraStore((s) => s.toggleFacing);

  // Refs to avoid stale closures
  const streamRef = useRef<MediaStream | null>(null);

  // -----------------------------------------------------------------------
  // loadDevices — enumerateDevices, filter videoinput
  // -----------------------------------------------------------------------
  const loadDevices = useCallback(async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter((d) => d.kind === 'videoinput');
      storeSetDevices(videoDevices);
      return videoDevices;
    } catch {
      storeSetDevices([]);
      return [];
    }
  }, [storeSetDevices]);

  // -----------------------------------------------------------------------
  // stopCamera — Rule 03: bắt buộc stop all tracks
  // -----------------------------------------------------------------------
  const stopCamera = useCallback(() => {
    const currentStream = streamRef.current;
    if (currentStream) {
      currentStream.getTracks().forEach((track) => track.stop());
    }
    streamRef.current = null;
    setStream(null);
    setError(null);
  }, []);

  // -----------------------------------------------------------------------
  // attachTrackEndedListener — Track stream ended event (USB webcam rút giữa chừng)
  // -----------------------------------------------------------------------
  const attachTrackEndedListener = useCallback((newStream: MediaStream) => {
    newStream.getVideoTracks().forEach((track) => {
      track.addEventListener('ended', () => {
        setError({
          code: 'stream_ended',
          message: 'Video track ended unexpectedly',
          userMessage: 'Camera bị ngắt kết nối. Kiểm tra lại cáp USB.',
        });
        streamRef.current = null;
        setStream(null);
      });
    });
  }, []);

  // -----------------------------------------------------------------------
  // startCamera — with auto-fallback resolution chain
  // -----------------------------------------------------------------------
  const startCamera = useCallback(
    async (deviceId?: string) => {
      // Kiểm tra trình duyệt hỗ trợ
      if (!navigator.mediaDevices?.getUserMedia) {
        setError({
          code: 'not_supported',
          message: 'getUserMedia not supported',
          userMessage: 'Trình duyệt không hỗ trợ truy cập camera. Vui lòng dùng Chrome hoặc Safari mới nhất.',
        });
        return;
      }

      setIsLoading(true);
      setError(null);

      // Stop existing stream trước
      stopCamera();

      const targetDeviceId = deviceId ?? selectedDeviceId;

      // Build base video constraints
      const buildConstraints = (
        resolution: ResolutionConstraint | null,
        devId: string | null,
        facing: 'environment' | 'user'
      ): MediaStreamConstraints => {
        const video: MediaTrackConstraints = {
          ...(resolution ?? {}),
        };

        if (devId) {
          // Khi có deviceId cụ thể → exact match (Rule 04: lưu deviceId)
          video.deviceId = { exact: devId };
        } else {
          // Mặc định: facingMode ideal (mobile: camera sau)
          video.facingMode = { ideal: facing };
        }

        return {
          video,
          audio: false, // Audio sẽ được thêm bởi useMediaRecorder
        };
      };

      // Thử resolution chain (ưu tiên user override, fallback cấu hình hệ thống)
      const currentResPref = getEffectiveResolution();
      const resolutionChain = getResolutionChain(currentResPref);

      for (let i = 0; i < resolutionChain.length; i++) {
        try {
          const constraints = buildConstraints(
            resolutionChain[i],
            targetDeviceId,
            facingMode
          );
          const newStream = await navigator.mediaDevices.getUserMedia(constraints);
          streamRef.current = newStream;
          setStream(newStream);
          setIsLoading(false);

          // Track stream ended event (USB webcam rút giữa chừng)
          attachTrackEndedListener(newStream);

          // Cập nhật deviceId thực tế đang sử dụng
          const activeTrack = newStream.getVideoTracks()[0];
          if (activeTrack) {
            const settings = activeTrack.getSettings();
            if (settings.deviceId && settings.deviceId !== targetDeviceId) {
              storeSetDevice(settings.deviceId);
            }
          }

          // Load devices list (labels available sau khi có permission)
          await loadDevices();
          return;
        } catch (err) {
          const isOverconstrained = err instanceof DOMException && err.name === 'OverconstrainedError';
          const isNotFound = err instanceof DOMException && err.name === 'NotFoundError';

          // Nếu có exact deviceId mà bị lỗi Overconstrained hoặc NotFound -> thử không dùng deviceId
          if (targetDeviceId && (isOverconstrained || isNotFound)) {
            try {
              const fallbackConstraints = buildConstraints(
                resolutionChain[i],
                null,
                facingMode
              );
              const newStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
              streamRef.current = newStream;
              setStream(newStream);
              setIsLoading(false);

              attachTrackEndedListener(newStream);

              const activeTrack = newStream.getVideoTracks()[0];
              if (activeTrack) {
                const settings = activeTrack.getSettings();
                if (settings.deviceId) {
                  storeSetDevice(settings.deviceId);
                }
              }

              await loadDevices();
              return;
            } catch (fallbackErr) {
              // Gán lại lỗi để kiểm tra tiếp tục vòng lặp
              err = fallbackErr;
            }
          }

          // Kiểm tra lại lỗi sau khi đã (hoặc không) thử fallback
          if (
            err instanceof DOMException &&
            err.name === 'OverconstrainedError' &&
            i < resolutionChain.length - 1
          ) {
            continue;
          }

          // Lỗi khác (NotAllowedError, NotFoundError, NotReadableError) → dừng luôn
          setError(mapCameraError(err));
          setIsLoading(false);
          return;
        }
      }

      // Nếu hết resolution chain mà vẫn không được → thử any resolution
      try {
        const lastResort = buildConstraints(null, targetDeviceId, facingMode);
        let newStream: MediaStream;
        
        try {
          newStream = await navigator.mediaDevices.getUserMedia(lastResort);
        } catch (err) {
          const isOverconstrained = err instanceof DOMException && err.name === 'OverconstrainedError';
          const isNotFound = err instanceof DOMException && err.name === 'NotFoundError';
          if (targetDeviceId && (isOverconstrained || isNotFound)) {
            const fallbackLastResort = buildConstraints(null, null, facingMode);
            newStream = await navigator.mediaDevices.getUserMedia(fallbackLastResort);
          } else {
            throw err;
          }
        }

        streamRef.current = newStream;
        setStream(newStream);

        attachTrackEndedListener(newStream);

        const activeTrack = newStream.getVideoTracks()[0];
        if (activeTrack) {
          const settings = activeTrack.getSettings();
          if (settings.deviceId) {
            storeSetDevice(settings.deviceId);
          }
        }

        await loadDevices();
      } catch (err) {
        setError(mapCameraError(err));
      } finally {
        setIsLoading(false);
      }
    },
    [selectedDeviceId, facingMode, stopCamera, loadDevices, storeSetDevice, attachTrackEndedListener]
  );

  // -----------------------------------------------------------------------
  // switchDevice — stop current → start new (exact deviceId)
  // -----------------------------------------------------------------------
  const switchDevice = useCallback(
    async (deviceId: string) => {
      storeSetDevice(deviceId);
      await startCamera(deviceId);
    },
    [storeSetDevice, startCamera]
  );

  // -----------------------------------------------------------------------
  // toggleFacing — mobile only: front ↔ back
  // -----------------------------------------------------------------------
  const toggleFacing = useCallback(async () => {
    storeToggleFacing();
    // Stop current camera stream
    stopCamera();

    // Use current store state instead of stale closure
    const newFacing = useCameraStore.getState().facingMode;

    if (!navigator.mediaDevices?.getUserMedia) return;

    setIsLoading(true);
    setError(null);

    const toggleResPref = getEffectiveResolution();
    const toggleChain = getResolutionChain(toggleResPref);

    for (const resolution of toggleChain) {
      try {
        const constraints: MediaStreamConstraints = {
          video: {
            ...resolution,
            facingMode: { ideal: newFacing },
          },
          audio: false,
        };
        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = newStream;
        setStream(newStream);
        setIsLoading(false);

        attachTrackEndedListener(newStream);

        return;
      } catch (err) {
        if (
          err instanceof DOMException &&
          err.name === 'OverconstrainedError'
        ) {
          continue;
        }
        setError(mapCameraError(err));
        setIsLoading(false);
        return;
      }
    }

    setIsLoading(false);
  }, [stopCamera, storeToggleFacing, attachTrackEndedListener]);

  // -----------------------------------------------------------------------
  // ondevicechange — USB webcam plug/unplug (Rule 04)
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!navigator.mediaDevices?.addEventListener) return;

    const handleDeviceChange = () => {
      loadDevices();
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [loadDevices]);

  // Load devices on initial hook mount
  useEffect(() => {
    void loadDevices();
  }, [loadDevices]);

  // -----------------------------------------------------------------------
  // Cleanup on unmount — Rule 03: MUST stop all tracks
  // -----------------------------------------------------------------------
  useEffect(() => {
    return () => {
      const currentStream = streamRef.current;
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
      streamRef.current = null;
    };
  }, []);

  return {
    stream,
    devices,
    selectedDevice: selectedDeviceId,
    isLoading,
    error,
    startCamera,
    stopCamera,
    switchDevice,
    toggleFacing,
  };
}
