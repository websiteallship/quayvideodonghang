import { useState, useCallback } from 'react';

export interface UseContinuousSessionReturn {
  sessionCodes: string[];
  isInContinuousSession: boolean;
  startSession: (initialCode?: string) => void;
  addCodeToSession: (code: string) => void;
  endSession: () => void;
}

/**
 * Hook quản lý phiên quét liên tục (Continuous Scanning Session).
 * Theo dõi danh sách các mã vận đơn đã được ghi hình và lưu tự động trong cùng một phiên.
 */
export function useContinuousSession(): UseContinuousSessionReturn {
  const [sessionCodes, setSessionCodes] = useState<string[]>([]);

  const startSession = useCallback((initialCode?: string) => {
    setSessionCodes(initialCode ? [initialCode] : []);
  }, []);

  const addCodeToSession = useCallback((code: string) => {
    setSessionCodes((prev) => (prev.includes(code) ? prev : [...prev, code]));
  }, []);

  const endSession = useCallback(() => {
    setSessionCodes([]);
  }, []);

  return {
    sessionCodes,
    isInContinuousSession: sessionCodes.length > 1,
    startSession,
    addCodeToSession,
    endSession,
  };
}
