import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useContinuousSession } from '../src/hooks/use-continuous-session';

describe('useContinuousSession', () => {
  it('initializes with empty session and isInContinuousSession false', () => {
    const { result } = renderHook(() => useContinuousSession());

    expect(result.current.sessionCodes).toEqual([]);
    expect(result.current.isInContinuousSession).toBe(false);
  });

  it('starts a session with an initial barcode', () => {
    const { result } = renderHook(() => useContinuousSession());

    act(() => {
      result.current.startSession('SPX001');
    });

    expect(result.current.sessionCodes).toEqual(['SPX001']);
    expect(result.current.isInContinuousSession).toBe(false);
  });

  it('adds codes to session and sets isInContinuousSession to true when length > 1', () => {
    const { result } = renderHook(() => useContinuousSession());

    act(() => {
      result.current.startSession('SPX001');
    });

    act(() => {
      result.current.addCodeToSession('SPX002');
    });

    expect(result.current.sessionCodes).toEqual(['SPX001', 'SPX002']);
    expect(result.current.isInContinuousSession).toBe(true);

    // Adding duplicate code does not duplicate entries
    act(() => {
      result.current.addCodeToSession('SPX002');
    });

    expect(result.current.sessionCodes).toEqual(['SPX001', 'SPX002']);

    act(() => {
      result.current.addCodeToSession('SPX003');
    });

    expect(result.current.sessionCodes).toEqual(['SPX001', 'SPX002', 'SPX003']);
    expect(result.current.isInContinuousSession).toBe(true);
  });

  it('resets session on endSession', () => {
    const { result } = renderHook(() => useContinuousSession());

    act(() => {
      result.current.startSession('SPX001');
      result.current.addCodeToSession('SPX002');
    });

    expect(result.current.isInContinuousSession).toBe(true);

    act(() => {
      result.current.endSession();
    });

    expect(result.current.sessionCodes).toEqual([]);
    expect(result.current.isInContinuousSession).toBe(false);
  });
});
