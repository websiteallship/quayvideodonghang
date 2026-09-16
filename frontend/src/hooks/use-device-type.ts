import { useEffect } from 'react';
import { ThietBiType } from '../types';
import { useConfigStore } from '../stores/config-store';

/**
 * Phát hiện loại thiết bị: mobile | laptop | pc_webcam
 * Heuristic: UA + touchscreen + screen size
 *
 * Nhóm A (mobile): Touch + small screen + mobile UA
 * Nhóm B (pc_webcam): No touch + large screen + desktop UA
 * Nhóm C (laptop): Touch + medium/large screen, hoặc laptop UA patterns
 */
function detectDeviceType(): ThietBiType {
  const ua = navigator.userAgent.toLowerCase();
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const screenWidth = window.screen.width;

  // Mobile: Android phone hoặc iPhone
  const isMobileUA =
    /android.*mobile|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua);

  if (isMobileUA || (hasTouch && screenWidth < 768)) {
    return 'mobile';
  }

  // Tablet (iPad) — treat as mobile for camera facing logic
  const isTablet = /ipad|android(?!.*mobile)/i.test(ua);
  if (isTablet || (hasTouch && screenWidth >= 768 && screenWidth < 1024)) {
    return 'mobile';
  }

  // Laptop: có touch + screen lớn (hybrid), hoặc pattern UA laptop
  if (hasTouch && screenWidth >= 1024) {
    return 'laptop';
  }

  // Mặc định: Desktop PC (webcam USB rời)
  return 'pc_webcam';
}

/**
 * Hook: detect device type on mount, sync to config-store.
 * Returns current detected device type.
 */
export function useDeviceType(): ThietBiType {
  const deviceType = useConfigStore((s) => s.deviceType);
  const setDeviceType = useConfigStore((s) => s.setDeviceType);

  useEffect(() => {
    const detected = detectDeviceType();
    setDeviceType(detected);
  }, [setDeviceType]);

  return deviceType;
}

export { detectDeviceType };
