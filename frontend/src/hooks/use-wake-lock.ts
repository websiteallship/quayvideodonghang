// ---------------------------------------------------------------------------
// useWakeLock — Keep screen on during video recording sessions
// Tham chiếu: docs/roadmap.md (Step 2.1), .agents/rules/01-ui-ux.md
// ---------------------------------------------------------------------------

import { useState, useCallback, useEffect, useRef } from 'react';

export interface UseWakeLockReturn {
  /** Whether the Screen Wake Lock API is supported by the current browser */
  isSupported: boolean;
  /** Whether screen lock is currently active */
  isLocked: boolean;
  /** Request the screen to stay on */
  request: () => Promise<boolean>;
  /** Release the screen lock */
  release: () => Promise<void>;
}

export function useWakeLock(): UseWakeLockReturn {
  const [isLocked, setIsLocked] = useState(false);
  const isSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  const sentinelRef = useRef<WakeLockSentinel | null>(null);
  const shouldLockRef = useRef(false);

  const release = useCallback(async () => {
    shouldLockRef.current = false;
    if (sentinelRef.current) {
      try {
        await sentinelRef.current.release();
      } catch {
        // Ignore release errors
      } finally {
        sentinelRef.current = null;
        setIsLocked(false);
      }
    }
  }, []);

  const request = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    shouldLockRef.current = true;

    try {
      if (sentinelRef.current && !sentinelRef.current.released) {
        setIsLocked(true);
        return true;
      }

      const sentinel = await navigator.wakeLock.request('screen');
      sentinelRef.current = sentinel;
      setIsLocked(true);

      sentinel.addEventListener('release', () => {
        // Only update state if we didn't deliberately request it
        if (!shouldLockRef.current) {
          sentinelRef.current = null;
          setIsLocked(false);
        }
      });

      return true;
    } catch {
      sentinelRef.current = null;
      setIsLocked(false);
      return false;
    }
  }, [isSupported]);

  // Re-acquire lock when tab regains visibility (browsers release lock when hidden)
  useEffect(() => {
    if (!isSupported) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && shouldLockRef.current) {
        await request();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isSupported, request]);

  // Release lock on unmount
  useEffect(() => {
    return () => {
      if (sentinelRef.current) {
        void sentinelRef.current.release();
        sentinelRef.current = null;
      }
    };
  }, []);

  return {
    isSupported,
    isLocked,
    request,
    release,
  };
}
