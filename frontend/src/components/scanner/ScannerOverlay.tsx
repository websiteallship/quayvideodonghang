// ---------------------------------------------------------------------------
// ScannerOverlay — Viewfinder animation for camera barcode scanning
// Tham chiếu: docs/08-frontend-architecture.md (component list)
// Rules: 01-ui-ux.md (no emoji, lucide-react icons only)
// ---------------------------------------------------------------------------

import { useState, useCallback } from 'react';
import { Flashlight, FlashlightOff, ScanLine, Package, PackageOpen } from 'lucide-react';
import type { LoaiBienBan } from '../../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScannerOverlayProps {
  /** Whether the scanner is actively scanning */
  isScanning: boolean;
  /** Last scan was successful */
  isSuccess?: boolean;
  /** The camera stream (for torch control) */
  stream?: MediaStream | null;
  /** Whether device is mobile (show torch button) */
  isMobile?: boolean;
  /** Active work mode ('dong_goi' | 'khui_hang' | null) */
  workMode?: LoaiBienBan | null;
}

// ---------------------------------------------------------------------------
// Torch control helper
// ---------------------------------------------------------------------------

async function toggleTorch(stream: MediaStream | null, enable: boolean): Promise<boolean> {
  if (!stream) return false;

  const videoTrack = stream.getVideoTracks()[0];
  if (!videoTrack) return false;

  try {
    await videoTrack.applyConstraints({
      advanced: [{ torch: enable } as MediaTrackConstraintSet],
    });
    return enable;
  } catch {
    // Torch not supported on this device/camera
    return false;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ScannerOverlay({
  isScanning,
  isSuccess = false,
  stream = null,
  isMobile = false,
  workMode = null,
}: ScannerOverlayProps) {
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(true);

  const handleTorchToggle = useCallback(async () => {
    const newState = !torchOn;
    const result = await toggleTorch(stream, newState);
    if (result === newState) {
      setTorchOn(newState);
    } else {
      setTorchSupported(false);
    }
  }, [torchOn, stream]);

  const overlayClass = [
    'scanner-overlay',
    isScanning ? 'scanner-overlay--active' : '',
    isSuccess ? 'scanner-overlay--success' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={overlayClass}>
      {/* Darkened border around viewfinder */}
      <div className="scanner-overlay__mask" />

      {/* Top HUD: Active Work Mode */}
      {workMode && (
        <div className="scanner-work-mode-hud">
          <div className={`scanner-work-mode-badge scanner-work-mode-badge--${workMode}`}>
            {workMode === 'dong_goi' ? (
              <Package size={14} aria-hidden="true" />
            ) : (
              <PackageOpen size={14} aria-hidden="true" />
            )}
            <span>CHẾ ĐỘ: {workMode === 'dong_goi' ? 'ĐÓNG GÓI' : 'KHUI HÀNG'}</span>
          </div>
        </div>
      )}

      {/* Viewfinder frame with corner brackets */}
      <div className="scanner-viewfinder">
        <div className="scanner-viewfinder__corner scanner-viewfinder__corner--tl" />
        <div className="scanner-viewfinder__corner scanner-viewfinder__corner--tr" />
        <div className="scanner-viewfinder__corner scanner-viewfinder__corner--bl" />
        <div className="scanner-viewfinder__corner scanner-viewfinder__corner--br" />

        {/* Animated scan line */}
        {isScanning && !isSuccess && (
          <div className="scanner-scanline" />
        )}
      </div>

      {/* Status text */}
      <div className="scanner-overlay__status">
        <ScanLine size={18} aria-hidden="true" />
        <span>
          {isSuccess ? 'Quét thành công!' : isScanning ? 'Đang quét mã...' : 'Sẵn sàng quét'}
        </span>
      </div>

      {/* Torch toggle (mobile only) */}
      {isMobile && torchSupported && (
        <button
          type="button"
          className="scanner-torch-btn"
          onClick={handleTorchToggle}
          aria-label={torchOn ? 'Tắt đèn flash' : 'Bật đèn flash'}
        >
          {torchOn ? (
            <FlashlightOff size={22} aria-hidden="true" />
          ) : (
            <Flashlight size={22} aria-hidden="true" />
          )}
        </button>
      )}
    </div>
  );
}
