import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBarcodeGun } from '../src/hooks/use-barcode-gun';

// ---------------------------------------------------------------------------
// Helpers — simulate keydown events
// ---------------------------------------------------------------------------

function fireKeyDown(key: string, options?: Partial<KeyboardEvent>) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  window.dispatchEvent(event);
}


// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useBarcodeGun', () => {
  let onScan: Mock<(code: string) => void>;

  beforeEach(() => {
    onScan = vi.fn();
    // Mock performance.now for timing control
    let time = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => {
      time += 10; // 10ms intervals — fast enough for barcode gun
      return time;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // Initial state
  // -----------------------------------------------------------------------

  describe('initial state', () => {
    it('starts with isListening false', () => {
      const { result } = renderHook(() => useBarcodeGun(onScan));

      expect(result.current.isListening).toBe(false);
      expect(result.current.lastInput).toBe('');
    });
  });

  // -----------------------------------------------------------------------
  // Enable / Disable
  // -----------------------------------------------------------------------

  describe('enable / disable', () => {
    it('sets isListening to true when enabled', () => {
      const { result } = renderHook(() => useBarcodeGun(onScan));

      act(() => {
        result.current.enable();
      });

      expect(result.current.isListening).toBe(true);
    });

    it('sets isListening to false when disabled', () => {
      const { result } = renderHook(() => useBarcodeGun(onScan));

      act(() => {
        result.current.enable();
      });

      act(() => {
        result.current.disable();
      });

      expect(result.current.isListening).toBe(false);
    });

    it('cleans up listener on unmount', () => {
      const removeEventSpy = vi.spyOn(window, 'removeEventListener');

      const { result, unmount } = renderHook(() => useBarcodeGun(onScan));

      act(() => {
        result.current.enable();
      });

      unmount();

      expect(removeEventSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function),
        expect.objectContaining({ capture: true })
      );
    });
  });

  // -----------------------------------------------------------------------
  // Rapid input detection (barcode gun)
  // -----------------------------------------------------------------------

  describe('rapid input (barcode gun)', () => {
    it('emits scan result for rapid keystroke sequence ending with Enter', () => {
      const { result } = renderHook(() => useBarcodeGun(onScan));

      act(() => {
        result.current.enable();
      });

      // Simulate rapid keystrokes (all within 50ms intervals via mocked performance.now)
      act(() => {
        fireKeyDown('G');
        fireKeyDown('H');
        fireKeyDown('N');
        fireKeyDown('0');
        fireKeyDown('1');
        fireKeyDown('2');
        fireKeyDown('3');
        fireKeyDown('Enter');
      });

      expect(onScan).toHaveBeenCalledWith('GHN0123');
      expect(result.current.lastInput).toBe('GHN0123');
    });

    it('does not emit for short codes (< 4 chars)', () => {
      const { result } = renderHook(() => useBarcodeGun(onScan));

      act(() => {
        result.current.enable();
      });

      act(() => {
        fireKeyDown('A');
        fireKeyDown('B');
        fireKeyDown('Enter');
      });

      expect(onScan).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // Slow typing (not a gun)
  // -----------------------------------------------------------------------

  describe('slow typing', () => {
    it('resets buffer when time between keystrokes exceeds threshold', () => {
      let time = 0;
      vi.spyOn(performance, 'now').mockImplementation(() => {
        time += 100; // 100ms between keys — too slow for barcode gun
        return time;
      });

      const { result } = renderHook(() => useBarcodeGun(onScan));

      act(() => {
        result.current.enable();
      });

      act(() => {
        fireKeyDown('A');
        fireKeyDown('B');
        fireKeyDown('C');
        fireKeyDown('D');
        fireKeyDown('E');
        fireKeyDown('Enter');
      });

      // Each key is >50ms apart, so buffer resets between keys.
      // Only last char 'E' remains (length 1 < 4 minimum), so no scan emitted.
      expect(onScan).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // Modifier keys and special keys
  // -----------------------------------------------------------------------

  describe('modifier and special keys', () => {
    it('ignores keystrokes with Ctrl held', () => {
      const { result } = renderHook(() => useBarcodeGun(onScan));

      act(() => {
        result.current.enable();
      });

      act(() => {
        fireKeyDown('c', { ctrlKey: true });
        fireKeyDown('Enter');
      });

      expect(onScan).not.toHaveBeenCalled();
    });

    it('ignores non-printable keys (clears buffer)', () => {
      const { result } = renderHook(() => useBarcodeGun(onScan));

      act(() => {
        result.current.enable();
      });

      act(() => {
        fireKeyDown('A');
        fireKeyDown('B');
        fireKeyDown('Shift'); // Non-printable, resets buffer
        fireKeyDown('C');
        fireKeyDown('D');
        fireKeyDown('Enter');
      });

      // Buffer was reset at Shift, so only "CD" remains (< 4 chars)
      expect(onScan).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // Does not emit when disabled
  // -----------------------------------------------------------------------

  describe('disabled state', () => {
    it('does not emit scan when listener is disabled', () => {
      renderHook(() => useBarcodeGun(onScan));

      // Never enabled — listener not attached
      act(() => {
        fireKeyDown('G');
        fireKeyDown('H');
        fireKeyDown('N');
        fireKeyDown('1');
        fireKeyDown('2');
        fireKeyDown('Enter');
      });

      expect(onScan).not.toHaveBeenCalled();
    });
  });
});
