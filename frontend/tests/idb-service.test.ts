import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { idbService } from '../src/services/idb-service';
import { BienBanMetadata } from '../src/types';

describe('idbService (IndexedDB Queue & Offline Storage)', () => {
  beforeEach(async () => {
    // Clear any previous records
    const all = await idbService.getAll();
    for (const item of all) {
      await idbService.deleteItem(item.id);
    }
  });

  afterEach(async () => {
    await idbService.closeDb();
    vi.restoreAllMocks();
  });

  it('saveVideo should persist video blob and metadata into upload_queue', async () => {
    const blob = new Blob(['sample-video-bytes'], { type: 'video/webm' });
    const metadata: BienBanMetadata = {
      ma_van_don: 'GHN123456789',
      don_vi_vc: 'GHN',
      loai_bien_ban: 'dong_goi',
      ma_nhan_vien: 'NV001',
      thiet_bi: 'pc_webcam',
      thoi_luong_video: 12
    };

    const saved = await idbService.saveVideo(blob, metadata);

    expect(saved.id).toBeTruthy();
    expect(saved.ma_van_don).toBe('GHN123456789');
    expect(saved.status).toBe('cho_upload');
    expect(saved.kich_thuoc_bytes).toBe(blob.size);
    expect(saved.mime_type).toBe('video/webm');
    expect(saved.retry_count).toBe(0);
    expect(saved.created_at).toBeGreaterThan(0);

    const retrieved = await idbService.getItem(saved.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.ma_van_don).toBe('GHN123456789');
  });

  it('getVideoBlob should retrieve stored video blob', async () => {
    const blob = new Blob(['video-test-content'], { type: 'video/mp4' });
    const saved = await idbService.saveVideo(blob, {
      ma_van_don: 'SPX999888',
      don_vi_vc: 'ShopeeXpress',
      loai_bien_ban: 'khui_hang',
      ma_nhan_vien: 'NV002',
      thoi_luong_video: 30
    });

    const retrievedBlob = await idbService.getVideoBlob(saved.id);
    expect(retrievedBlob).toBeDefined();
    expect(retrievedBlob?.size).toBe(blob.size);
    expect(retrievedBlob?.type).toBe('video/mp4');

    const nonExistent = await idbService.getVideoBlob('random-unknown-id');
    expect(nonExistent).toBeNull();
  });

  it('getQueue should only return items with status cho_upload or loi', async () => {
    const blob = new Blob(['test'], { type: 'video/webm' });
    const item1 = await idbService.saveVideo(blob, {
      ma_van_don: 'ORDER1',
      don_vi_vc: 'GHN',
      loai_bien_ban: 'dong_goi',
      ma_nhan_vien: 'NV01',
      thoi_luong_video: 10
    });

    const item2 = await idbService.saveVideo(blob, {
      ma_van_don: 'ORDER2',
      don_vi_vc: 'GHTK',
      loai_bien_ban: 'dong_goi',
      ma_nhan_vien: 'NV01',
      thoi_luong_video: 10
    });

    // Mark item2 as da_upload
    await idbService.updateItem(item2.id, { status: 'da_upload' });

    const queue = await idbService.getQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].id).toBe(item1.id);

    // Mark item2 as loi
    await idbService.updateItem(item2.id, { status: 'loi' });
    const queueAfterError = await idbService.getQueue();
    expect(queueAfterError.length).toBe(2);
  });

  it('deleteVideo / deleteItem should remove item from store', async () => {
    const blob = new Blob(['test'], { type: 'video/webm' });
    const saved = await idbService.saveVideo(blob, {
      ma_van_don: 'VT12345',
      don_vi_vc: 'ViettelPost',
      loai_bien_ban: 'dong_goi',
      ma_nhan_vien: 'NV01',
      thoi_luong_video: 5
    });

    await idbService.deleteVideo(saved.id);
    const item = await idbService.getItem(saved.id);
    expect(item).toBeUndefined();
  });

  it('getStorageEstimate should return quota, usage and remainingMB', async () => {
    // Mock navigator.storage.estimate
    const originalStorage = navigator.storage;
    Object.defineProperty(navigator, 'storage', {
      value: {
        estimate: vi.fn().mockResolvedValue({
          quota: 2 * 1024 * 1024 * 1024, // 2GB
          usage: 500 * 1024 * 1024 // 500MB
        }),
        persist: vi.fn().mockResolvedValue(true)
      },
      writable: true,
      configurable: true
    });

    const estimate = await idbService.getStorageEstimate();
    expect(estimate.quota).toBe(2 * 1024 * 1024 * 1024);
    expect(estimate.usage).toBe(500 * 1024 * 1024);
    expect(estimate.remainingMB).toBe(1548); // ~1548 MB remaining

    const persistResult = await idbService.requestPersistentStorage();
    expect(persistResult).toBe(true);

    Object.defineProperty(navigator, 'storage', {
      value: originalStorage,
      writable: true,
      configurable: true
    });
  });
});
