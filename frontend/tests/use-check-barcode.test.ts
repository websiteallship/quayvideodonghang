import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCheckBarcode } from '../src/hooks/use-check-barcode';
import * as bienBanService from '../src/services/bien-ban-service';
import * as feedbackModule from '../src/utils/barcode-feedback';

describe('useCheckBarcode', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts with clean initial state', () => {
    const { result } = renderHook(() => useCheckBarcode());

    expect(result.current.isChecking).toBe(false);
    expect(result.current.isDuplicate).toBe(false);
    expect(result.current.duplicateInfo).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('detects duplicate code and triggers warning feedback', async () => {
    const feedbackSpy = vi.spyOn(feedbackModule, 'feedbackWarning').mockImplementation(() => {});

    vi.spyOn(bienBanService, 'checkBarcodeDuplicate').mockResolvedValue({
      success: true,
      data: {
        da_co_video: true,
        so_luong_video: 3,
        video_gan_nhat: {
          id: 'v-1',
          loai_bien_ban: 'dong_goi',
          thoi_gian_tao: '2026-09-15T08:30:00Z',
          ma_nhan_vien: 'NV002',
        },
      },
    });

    const { result } = renderHook(() => useCheckBarcode());

    await act(async () => {
      await result.current.checkCode('GHN0123456789');
    });

    expect(result.current.isChecking).toBe(false);
    expect(result.current.isDuplicate).toBe(true);
    expect(result.current.duplicateInfo).toEqual({
      nhanVien: 'NV002',
      thoiGian: expect.any(String),
      soLuong: 3,
      localItems: [],
      source: 'remote',
    });
    expect(feedbackSpy).toHaveBeenCalledTimes(1);
  });

  it('handles clean barcode with no previous video', async () => {
    const feedbackSpy = vi.spyOn(feedbackModule, 'feedbackWarning').mockImplementation(() => {});

    vi.spyOn(bienBanService, 'checkBarcodeDuplicate').mockResolvedValue({
      success: true,
      data: {
        da_co_video: false,
        so_luong_video: 0,
        video_gan_nhat: null,
      },
    });

    const { result } = renderHook(() => useCheckBarcode());

    await act(async () => {
      await result.current.checkCode('GHN0123456789');
    });

    expect(result.current.isChecking).toBe(false);
    expect(result.current.isDuplicate).toBe(false);
    expect(result.current.duplicateInfo).toBeNull();
    expect(feedbackSpy).not.toHaveBeenCalled();
  });

  it('sets error when service returns failure', async () => {
    const feedbackSpy = vi.spyOn(feedbackModule, 'feedbackWarning').mockImplementation(() => {});

    vi.spyOn(bienBanService, 'checkBarcodeDuplicate').mockResolvedValue({
      success: false,
      error: {
        code: 'INVALID_MA_VAN_DON',
        message: 'Mã vận đơn không hợp lệ',
      },
    });

    const { result } = renderHook(() => useCheckBarcode());

    await act(async () => {
      await result.current.checkCode('bad');
    });

    expect(result.current.isChecking).toBe(false);
    expect(result.current.error).toBe('Mã vận đơn không hợp lệ');
    expect(feedbackSpy).toHaveBeenCalledTimes(1);
  });

  it('resets state when reset is called', async () => {
    vi.spyOn(bienBanService, 'checkBarcodeDuplicate').mockResolvedValue({
      success: true,
      data: {
        da_co_video: true,
        so_luong_video: 1,
        video_gan_nhat: {
          id: 'v-1',
          loai_bien_ban: 'dong_goi',
          thoi_gian_tao: '2026-09-15T08:30:00Z',
          ma_nhan_vien: 'NV001',
        },
      },
    });

    const { result } = renderHook(() => useCheckBarcode());

    await act(async () => {
      await result.current.checkCode('GHN123456789');
    });

    expect(result.current.isDuplicate).toBe(true);

    act(() => {
      result.current.reset();
    });

    expect(result.current.isChecking).toBe(false);
    expect(result.current.isDuplicate).toBe(false);
    expect(result.current.duplicateInfo).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
