import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  resolveCanvasSize,
  drawObjectFitCover,
  drawRotatedCameraFrame,
  drawCanvasOverlay,
  type OverlayInfo,
} from '../src/hooks/use-media-recorder';

describe('Canvas Rotation & Math Engine (Step 2.3)', () => {
  describe('resolveCanvasSize', () => {
    it('resolves 720p landscape correctly', () => {
      const res = resolveCanvasSize(1280, 720, 'landscape');
      expect(res.canvasWidth).toBe(1280);
      expect(res.canvasHeight).toBe(720);
    });

    it('resolves 720p portrait correctly', () => {
      const res = resolveCanvasSize(1280, 720, 'portrait');
      expect(res.canvasWidth).toBe(720);
      expect(res.canvasHeight).toBe(1280);
    });

    it('resolves 1080p landscape correctly', () => {
      const res = resolveCanvasSize(1920, 1080, 'landscape');
      expect(res.canvasWidth).toBe(1920);
      expect(res.canvasHeight).toBe(1080);
    });

    it('resolves 1080p portrait correctly', () => {
      const res = resolveCanvasSize(1920, 1080, 'portrait');
      expect(res.canvasWidth).toBe(1080);
      expect(res.canvasHeight).toBe(1920);
    });

    it('handles auto mode with device/stream portrait fallback', () => {
      const portraitRes = resolveCanvasSize(1280, 720, 'auto', true);
      expect(portraitRes.canvasWidth).toBe(720);
      expect(portraitRes.canvasHeight).toBe(1280);

      const landscapeRes = resolveCanvasSize(1280, 720, 'auto', false);
      expect(landscapeRes.canvasWidth).toBe(1280);
      expect(landscapeRes.canvasHeight).toBe(720);
    });
  });

  describe('drawObjectFitCover', () => {
    let mockCtx: CanvasRenderingContext2D;

    beforeEach(() => {
      mockCtx = {
        drawImage: vi.fn(),
      } as unknown as CanvasRenderingContext2D;
    });

    it('crops left and right when video is wider than canvas ratio', () => {
      // 16:9 video (1920x1080, ratio 1.777) into 4:3 canvas (800x600, ratio 1.333)
      const mockVideo = {
        videoWidth: 1920,
        videoHeight: 1080,
        readyState: HTMLMediaElement.HAVE_ENOUGH_DATA,
      } as HTMLVideoElement;

      drawObjectFitCover(mockCtx, mockVideo, 0, 0, 800, 600);

      // sWidth = 1080 * (800/600) = 1440; sx = (1920 - 1440) / 2 = 240
      expect(mockCtx.drawImage).toHaveBeenCalledWith(
        mockVideo,
        240,
        0,
        1440,
        1080,
        0,
        0,
        800,
        600
      );
    });

    it('crops top and bottom when video is taller than canvas ratio', () => {
      // 4:3 video (800x600, ratio 1.333) into 16:9 canvas (1280x720, ratio 1.777)
      const mockVideo = {
        videoWidth: 800,
        videoHeight: 600,
        readyState: HTMLMediaElement.HAVE_ENOUGH_DATA,
      } as HTMLVideoElement;

      drawObjectFitCover(mockCtx, mockVideo, 0, 0, 1280, 720);

      // sHeight = 800 / (1280/720) = 450; sy = (600 - 450) / 2 = 75
      expect(mockCtx.drawImage).toHaveBeenCalledWith(
        mockVideo,
        0,
        75,
        800,
        450,
        0,
        0,
        1280,
        720
      );
    });

    it('safely handles zero video dimensions without crashing or NaN', () => {
      const mockVideo = {
        videoWidth: 0,
        videoHeight: 0,
        readyState: HTMLMediaElement.HAVE_CURRENT_DATA,
      } as HTMLVideoElement;

      drawObjectFitCover(mockCtx, mockVideo, 0, 0, 1280, 720);
      expect(mockCtx.drawImage).toHaveBeenCalledWith(mockVideo, 0, 0, 1280, 720);
    });
  });

  describe('drawRotatedCameraFrame', () => {
    let mockCtx: CanvasRenderingContext2D;

    beforeEach(() => {
      mockCtx = {
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        drawImage: vi.fn(),
        fillRect: vi.fn(),
        fillStyle: '',
      } as unknown as CanvasRenderingContext2D;
    });

    it('draws without rotate transform when rotation is 0', () => {
      const mockVideo = {
        videoWidth: 1280,
        videoHeight: 720,
        readyState: HTMLMediaElement.HAVE_ENOUGH_DATA,
      } as HTMLVideoElement;

      drawRotatedCameraFrame(mockCtx, mockVideo, 1280, 720, 0);

      expect(mockCtx.rotate).not.toHaveBeenCalled();
      expect(mockCtx.drawImage).toHaveBeenCalledWith(
        mockVideo,
        0,
        0,
        1280,
        720,
        0,
        0,
        1280,
        720
      );
    });

    it('applies 180 degree rotation transform around center', () => {
      const mockVideo = {
        videoWidth: 1280,
        videoHeight: 720,
        readyState: HTMLMediaElement.HAVE_ENOUGH_DATA,
      } as HTMLVideoElement;

      drawRotatedCameraFrame(mockCtx, mockVideo, 1280, 720, 180);

      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.translate).toHaveBeenCalledWith(640, 360);
      expect(mockCtx.rotate).toHaveBeenCalledWith(Math.PI);
      expect(mockCtx.translate).toHaveBeenCalledWith(-640, -360);
      expect(mockCtx.restore).toHaveBeenCalled();
    });

    it('swaps draw bounds when rotating 90 degrees', () => {
      const mockVideo = {
        videoWidth: 720,
        videoHeight: 1280,
        readyState: HTMLMediaElement.HAVE_ENOUGH_DATA,
      } as HTMLVideoElement;

      // Canvas 1280x720, rotation 90
      drawRotatedCameraFrame(mockCtx, mockVideo, 1280, 720, 90);

      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.translate).toHaveBeenCalledWith(640, 360);
      expect(mockCtx.rotate).toHaveBeenCalledWith(Math.PI / 2);
      expect(mockCtx.translate).toHaveBeenCalledWith(-360, -640);
      // dWidth and dHeight are swapped: 720 and 1280
      expect(mockCtx.drawImage).toHaveBeenCalledWith(
        mockVideo,
        0,
        0,
        720,
        1280,
        0,
        0,
        720,
        1280
      );
      expect(mockCtx.restore).toHaveBeenCalled();
    });

    it('swaps draw bounds when rotating 270 degrees', () => {
      const mockVideo = {
        videoWidth: 720,
        videoHeight: 1280,
        readyState: HTMLMediaElement.HAVE_ENOUGH_DATA,
      } as HTMLVideoElement;

      drawRotatedCameraFrame(mockCtx, mockVideo, 1280, 720, 270);

      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.translate).toHaveBeenCalledWith(640, 360);
      expect(mockCtx.rotate).toHaveBeenCalledWith((270 * Math.PI) / 180);
      expect(mockCtx.translate).toHaveBeenCalledWith(-360, -640);
      expect(mockCtx.restore).toHaveBeenCalled();
    });

    it('renders black fill when video has not loaded current data', () => {
      const mockVideo = {
        videoWidth: 0,
        videoHeight: 0,
        readyState: HTMLMediaElement.HAVE_NOTHING,
      } as HTMLVideoElement;

      drawRotatedCameraFrame(mockCtx, mockVideo, 1280, 720, 90);

      expect(mockCtx.fillStyle).toBe('#000000');
      expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 1280, 720);
    });
  });

  describe('drawCanvasOverlay with rotation', () => {
    it('executes both camera rotation and overlay text rendering', () => {
      const mockCtx = {
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        drawImage: vi.fn(),
        fillRect: vi.fn(),
        beginPath: vi.fn(),
        fill: vi.fn(),
        arc: vi.fn(),
        fillText: vi.fn(),
        roundRect: vi.fn(),
        fillStyle: '',
        font: '',
        textAlign: '',
        textBaseline: '',
        shadowColor: '',
        shadowBlur: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
      } as unknown as CanvasRenderingContext2D;

      const mockVideo = {
        videoWidth: 1280,
        videoHeight: 720,
        readyState: HTMLMediaElement.HAVE_ENOUGH_DATA,
      } as HTMLVideoElement;

      const mockOverlay: OverlayInfo = {
        maVanDon: 'VN123456789',
        donViVc: 'GHN',
        loaiBienBan: 'dong_goi',
        maNhanVien: 'NV001',
        warehouseName: 'Kho Test',
      };

      drawCanvasOverlay(mockCtx, mockVideo, 1280, 720, mockOverlay, new Date(), 10, 90);

      // Camera frame was rotated
      expect(mockCtx.rotate).toHaveBeenCalledWith(Math.PI / 2);
      // Watermark text was drawn directly
      expect(mockCtx.fillText).toHaveBeenCalledWith(
        expect.stringContaining('VN123456789'),
        expect.any(Number),
        expect.any(Number)
      );
    });
  });
});
