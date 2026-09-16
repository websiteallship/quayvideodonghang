import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWakeLock } from '../src/hooks/use-wake-lock';

describe('useWakeLock', () => {
  let mockSentinel: { released: boolean; release: ReturnType<typeof vi.fn>; addEventListener: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockSentinel = {
      released: false,
      release: vi.fn().mockImplementation(() => {
        mockSentinel.released = true;
        return Promise.resolve();
      }),
      addEventListener: vi.fn(),
    };

    Object.defineProperty(navigator, 'wakeLock', {
      value: {
        request: vi.fn().mockResolvedValue(mockSentinel),
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('detects wakeLock API support correctly', () => {
    const { result } = renderHook(() => useWakeLock());
    expect(result.current.isSupported).toBe(true);
    expect(result.current.isLocked).toBe(false);
  });

  it('acquires wake lock when request is called', async () => {
    const { result } = renderHook(() => useWakeLock());

    let success: boolean = false;
    await act(async () => {
      success = await result.current.request();
    });

    expect(success).toBe(true);
    expect(result.current.isLocked).toBe(true);
    expect(navigator.wakeLock.request).toHaveBeenCalledWith('screen');
  });

  it('releases wake lock when release is called', async () => {
    const { result } = renderHook(() => useWakeLock());

    await act(async () => {
      await result.current.request();
    });
    expect(result.current.isLocked).toBe(true);

    await act(async () => {
      await result.current.release();
    });

    expect(result.current.isLocked).toBe(false);
    expect(mockSentinel.release).toHaveBeenCalled();
  });

  it('handles gracefully when wakeLock is not supported', async () => {
    // Delete wakeLock property
    // @ts-expect-error test unsupported browser
    delete navigator.wakeLock;

    const { result } = renderHook(() => useWakeLock());
    expect(result.current.isSupported).toBe(false);

    let res = false;
    await act(async () => {
      res = await result.current.request();
    });
    expect(res).toBe(false);
    expect(result.current.isLocked).toBe(false);
  });
});
