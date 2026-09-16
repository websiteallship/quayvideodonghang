// ---------------------------------------------------------------------------
// useRecordingGuard — Chặn thoát khi đang quay video
// Tham chiếu: docs/10-error-handling.md, .agents/rules/05-offline-and-reliability.md
// Chặn: React Router navigation, tab switch (visibilitychange), browser back
// beforeunload đã được xử lý ở use-upload-queue.ts
// ---------------------------------------------------------------------------

import { useEffect, useCallback, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import { useConfigStore } from '../stores/config-store';

export interface UseRecordingGuardOptions {
  /** Whether recording is currently active */
  isActive: boolean;
  /** Callback when user confirms exit during recording */
  onConfirmExit?: () => void;
}

export interface UseRecordingGuardReturn {
  /** Whether the exit confirmation dialog should be shown */
  showExitDialog: boolean;
  /** Confirm exit and proceed with navigation */
  confirmExit: () => void;
  /** Cancel exit and stay on recording */
  cancelExit: () => void;
  /** Warning message from tab visibility change */
  tabSwitchWarning: string | null;
  /** Dismiss the tab switch warning */
  dismissTabWarning: () => void;
}

export function useRecordingGuard({
  isActive,
  onConfirmExit,
}: UseRecordingGuardOptions): UseRecordingGuardReturn {
  const { setIsRecordingActive } = useConfigStore();
  const [tabSwitchWarning, setTabSwitchWarning] = useState<string | null>(null);

  // Sync global recording state
  useEffect(() => {
    setIsRecordingActive(isActive);
    return () => {
      setIsRecordingActive(false);
    };
  }, [isActive, setIsRecordingActive]);

  // React Router navigation blocker
  const blocker = useBlocker(isActive);

  const showExitDialog = blocker.state === 'blocked';

  const confirmExit = useCallback(() => {
    onConfirmExit?.();
    if (blocker.state === 'blocked') {
      blocker.proceed();
    }
  }, [blocker, onConfirmExit]);

  const cancelExit = useCallback(() => {
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
  }, [blocker]);

  // Tab visibility change warning
  useEffect(() => {
    if (!isActive) {
      setTabSwitchWarning(null);
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setTabSwitchWarning('Bạn đang quay video! Vui lòng không chuyển tab.');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive]);

  const dismissTabWarning = useCallback(() => {
    setTabSwitchWarning(null);
  }, []);

  return {
    showExitDialog,
    confirmExit,
    cancelExit,
    tabSwitchWarning,
    dismissTabWarning,
  };
}
