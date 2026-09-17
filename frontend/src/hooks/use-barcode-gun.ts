// ---------------------------------------------------------------------------
// useBarcodeGun — USB Barcode Gun (HID Keyboard Wedge) Listener
// Tham chiếu: .agents/rules/04-device-and-hardware.md (mục 2)
// Detects rapid keystrokes (<50ms apart) ending with Enter as barcode input
// ---------------------------------------------------------------------------

import { useState, useCallback, useRef, useEffect } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UseBarcodeGunReturn {
  /** Whether the gun listener is active */
  isListening: boolean;
  /** Last raw input string from the gun */
  lastInput: string;
  /** Enable the global keydown listener */
  enable: () => void;
  /** Disable the global keydown listener */
  disable: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Maximum time between keystrokes to be considered rapid (barcode gun) input.
 * USB barcode guns type characters at ~2-10ms intervals.
 * Manual typing is typically >100ms between keystrokes.
 */
const MAX_KEYSTROKE_INTERVAL_MS = 100;

/** Minimum barcode length to accept (avoid false positives from keyboard shortcuts) */
const MIN_BARCODE_LENGTH = 4;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useBarcodeGun(
  onScan: (code: string) => void,
  autoEnable: boolean = false
): UseBarcodeGunReturn {
  const [isListening, setIsListening] = useState(false);
  const [lastInput, setLastInput] = useState('');

  const bufferRef = useRef<string>('');
  const lastKeystrokeRef = useRef<number>(0);
  const isListeningRef = useRef<boolean>(false);
  const onScanRef = useRef(onScan);

  // Keep callback ref fresh without re-registering listener
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  // -----------------------------------------------------------------------
  // Keydown handler
  // -----------------------------------------------------------------------

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isListeningRef.current) return;

    // Ignore modifier keys and special keys (except Enter)
    if (event.ctrlKey || event.altKey || event.metaKey) return;

    const now = performance.now();
    const timeSinceLastKey = now - lastKeystrokeRef.current;

    if (event.key === 'Enter') {
      // Check if we have a valid buffered barcode from rapid input
      const code = bufferRef.current.trim();

      if (code.length >= MIN_BARCODE_LENGTH) {
        // Prevent default form submission etc.
        event.preventDefault();
        event.stopPropagation();

        setLastInput(code);
        onScanRef.current(code);
      }

      // Always reset buffer on Enter
      bufferRef.current = '';
      lastKeystrokeRef.current = 0;
      return;
    }

    // Only buffer single printable characters
    if (event.key.length !== 1) {
      if (event.key === 'Shift') return; // Ignore Shift key without resetting buffer

      // Non-printable key resets buffer
      bufferRef.current = '';
      lastKeystrokeRef.current = 0;
      return;
    }

    // Check timing — if too slow, this is manual typing
    if (bufferRef.current.length > 0 && timeSinceLastKey > MAX_KEYSTROKE_INTERVAL_MS) {
      // Reset buffer — previous chars were manual input
      bufferRef.current = '';
    }

    bufferRef.current += event.key;
    lastKeystrokeRef.current = now;
  }, []);

  // -----------------------------------------------------------------------
  // Enable / Disable
  // -----------------------------------------------------------------------

  const enable = useCallback(() => {
    if (isListeningRef.current) return;

    isListeningRef.current = true;
    setIsListening(true);
    bufferRef.current = '';
    lastKeystrokeRef.current = 0;

    // Capture phase to intercept before any focused input element
    window.addEventListener('keydown', handleKeyDown, { capture: true });
  }, [handleKeyDown]);

  const disable = useCallback(() => {
    isListeningRef.current = false;
    setIsListening(false);
    bufferRef.current = '';
    lastKeystrokeRef.current = 0;

    window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [handleKeyDown]);

  // -----------------------------------------------------------------------
  // Lifecycle — auto-enable & cleanup on unmount
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (autoEnable) {
      enable();
    }
    return () => {
      disable();
    };
  }, [autoEnable, enable, disable]);

  return {
    isListening,
    lastInput,
    enable,
    disable,
  };
}
