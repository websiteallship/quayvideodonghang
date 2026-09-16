import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkBarcodeDuplicate, isValidMaVanDon } from '../src/services/bien-ban-service';
import { apiClient } from '../src/services/api-client';

describe('bien-ban-service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isValidMaVanDon', () => {
    it('validates standard carrier tracking codes', () => {
      expect(isValidMaVanDon('GHN0123456789')).toBe(true);
      expect(isValidMaVanDon('SPX123456789VN')).toBe(true);
      expect(isValidMaVanDon('VTP-123_456')).toBe(true);
      expect(isValidMaVanDon('1234')).toBe(true);
    });

    it('rejects codes shorter than 4 chars', () => {
      expect(isValidMaVanDon('')).toBe(false);
      expect(isValidMaVanDon('A')).toBe(false);
      expect(isValidMaVanDon('123')).toBe(false);
    });

    it('rejects codes longer than 64 chars', () => {
      expect(isValidMaVanDon('A'.repeat(65))).toBe(false);
    });

    it('rejects codes with special characters or spaces', () => {
      expect(isValidMaVanDon('GHN 123')).toBe(false);
      expect(isValidMaVanDon('GHN<script>')).toBe(false);
      expect(isValidMaVanDon("GHN' OR '1'='1")).toBe(false);
      expect(isValidMaVanDon('GHN@123')).toBe(false);
    });
  });

  describe('checkBarcodeDuplicate', () => {
    it('returns error response for invalid tracking codes without calling API', async () => {
      const getSpy = vi.spyOn(apiClient, 'get');
      const res = await checkBarcodeDuplicate('bad');

      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('INVALID_MA_VAN_DON');
      expect(getSpy).not.toHaveBeenCalled();
    });

    it('returns graceful offline response when navigator.onLine is false', async () => {
      vi.stubGlobal('navigator', { onLine: false });
      const getSpy = vi.spyOn(apiClient, 'get');

      const res = await checkBarcodeDuplicate('GHN0123456789');

      expect(res.success).toBe(true);
      expect(res.data?.da_co_video).toBe(false);
      expect(res.data?.is_offline).toBe(true);
      expect(getSpy).not.toHaveBeenCalled();

      vi.unstubAllGlobals();
    });

    it('returns duplicate check data on API success', async () => {
      const mockData = {
        success: true,
        data: {
          da_co_video: true,
          so_luong_video: 2,
          video_gan_nhat: {
            id: 'video-123',
            loai_bien_ban: 'dong_goi',
            thoi_gian_tao: '2026-09-15T09:00:00Z',
            ma_nhan_vien: 'NV001',
          },
        },
      };

      vi.spyOn(apiClient, 'get').mockResolvedValue({
        json: () => Promise.resolve(mockData),
      } as unknown as Response);

      const res = await checkBarcodeDuplicate('GHN0123456789');

      expect(res.success).toBe(true);
      expect(res.data?.da_co_video).toBe(true);
      expect(res.data?.so_luong_video).toBe(2);
      expect(res.data?.video_gan_nhat?.ma_nhan_vien).toBe('NV001');
    });

    it('returns graceful fallback when API fails with network error', async () => {
      vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('Network disconnected'));

      const res = await checkBarcodeDuplicate('GHN0123456789');

      expect(res.success).toBe(true);
      expect(res.data?.da_co_video).toBe(false);
      expect(res.data?.is_offline).toBe(true);
    });

    it('re-throws AbortError on request cancellation', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';

      vi.spyOn(apiClient, 'get').mockRejectedValue(abortError);

      await expect(checkBarcodeDuplicate('GHN0123456789')).rejects.toThrow('Aborted');
    });
  });
});
