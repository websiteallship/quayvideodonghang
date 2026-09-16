import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useUploadStore } from '../src/stores/upload-store';
import { idbService } from '../src/services/idb-service';
import { QueueItem } from '../src/types';

describe('Queue Bulk Actions & Filters', () => {
  beforeEach(async () => {
    // Reset store state
    useUploadStore.setState({
      queue: [],
      currentUpload: null,
      currentUploadId: null,
      progress: 0,
      isSyncing: false,
      totalToSync: 0,
      syncedInSession: 0,
      storageEstimate: null,
      storageWarning: null
    });

    // Clear IDB
    const all = await idbService.getAll();
    for (const item of all) {
      await idbService.deleteItem(item.id);
    }
  });

  afterEach(async () => {
    await idbService.closeDb();
    vi.restoreAllMocks();
  });

  it('filters items correctly by loai_bien_ban (dong_goi vs khui_hang)', async () => {
    const item1: QueueItem = {
      id: 'item-dg-1',
      ma_van_don: 'ORDER_DG_1',
      don_vi_vc: 'J&T',
      loai_bien_ban: 'dong_goi',
      ma_nhan_vien: 'NV01',
      thiet_bi: 'mobile',
      thoi_luong_video: 10,
      kich_thuoc_bytes: 1024,
      mime_type: 'video/webm',
      blob: new Blob(['data']),
      status: 'cho_upload',
      retry_count: 0,
      created_at: Date.now()
    };

    const item2: QueueItem = {
      id: 'item-kh-1',
      ma_van_don: 'ORDER_KH_1',
      don_vi_vc: 'ShopeeXpress',
      loai_bien_ban: 'khui_hang',
      ma_nhan_vien: 'NV01',
      thiet_bi: 'mobile',
      thoi_luong_video: 12,
      kich_thuoc_bytes: 2048,
      mime_type: 'video/webm',
      blob: new Blob(['data']),
      status: 'cho_upload',
      retry_count: 0,
      created_at: Date.now()
    };

    await idbService.saveItem(item1);
    await idbService.saveItem(item2);
    await useUploadStore.getState().loadQueue();

    const queue = useUploadStore.getState().queue;
    const dongGoiItems = queue.filter((i) => i.loai_bien_ban === 'dong_goi');
    const khuiHangItems = queue.filter((i) => i.loai_bien_ban === 'khui_hang');

    expect(dongGoiItems.length).toBe(1);
    expect(dongGoiItems[0].ma_van_don).toBe('ORDER_DG_1');
    expect(khuiHangItems.length).toBe(1);
    expect(khuiHangItems[0].ma_van_don).toBe('ORDER_KH_1');
  });

  it('removeItems deletes multiple items from IDB and updates store', async () => {
    const item1: QueueItem = {
      id: 'bulk-del-1',
      ma_van_don: 'DEL_1',
      don_vi_vc: 'GHN',
      loai_bien_ban: 'dong_goi',
      ma_nhan_vien: 'NV01',
      thiet_bi: 'pc_webcam',
      thoi_luong_video: 5,
      kich_thuoc_bytes: 512,
      mime_type: 'video/webm',
      blob: new Blob(['data']),
      status: 'cho_upload',
      retry_count: 0,
      created_at: Date.now()
    };

    const item2: QueueItem = {
      id: 'bulk-del-2',
      ma_van_don: 'DEL_2',
      don_vi_vc: 'GHTK',
      loai_bien_ban: 'khui_hang',
      ma_nhan_vien: 'NV01',
      thiet_bi: 'pc_webcam',
      thoi_luong_video: 8,
      kich_thuoc_bytes: 1024,
      mime_type: 'video/webm',
      blob: new Blob(['data']),
      status: 'loi',
      retry_count: 1,
      created_at: Date.now()
    };

    const item3: QueueItem = {
      id: 'keep-1',
      ma_van_don: 'KEEP_1',
      don_vi_vc: 'J&T',
      loai_bien_ban: 'dong_goi',
      ma_nhan_vien: 'NV01',
      thiet_bi: 'pc_webcam',
      thoi_luong_video: 10,
      kich_thuoc_bytes: 2048,
      mime_type: 'video/webm',
      blob: new Blob(['data']),
      status: 'da_upload',
      retry_count: 0,
      created_at: Date.now()
    };

    await idbService.saveItem(item1);
    await idbService.saveItem(item2);
    await idbService.saveItem(item3);
    await useUploadStore.getState().loadQueue();

    expect(useUploadStore.getState().queue.length).toBe(3);

    // Bulk delete items 1 and 2
    await useUploadStore.getState().removeItems(['bulk-del-1', 'bulk-del-2']);

    const remaining = useUploadStore.getState().queue;
    expect(remaining.length).toBe(1);
    expect(remaining[0].id).toBe('keep-1');

    const inDb1 = await idbService.getItem('bulk-del-1');
    const inDb2 = await idbService.getItem('bulk-del-2');
    const inDb3 = await idbService.getItem('keep-1');
    expect(inDb1).toBeUndefined();
    expect(inDb2).toBeUndefined();
    expect(inDb3).toBeDefined();
  });


  it('abortSync stops sync process gracefully', async () => {
    const item: QueueItem = {
      id: 'abort-item-1',
      ma_van_don: 'ABORT_1',
      don_vi_vc: 'GHN',
      loai_bien_ban: 'dong_goi',
      ma_nhan_vien: 'NV01',
      thiet_bi: 'pc_webcam',
      thoi_luong_video: 10,
      kich_thuoc_bytes: 1024,
      mime_type: 'video/webm',
      blob: new Blob(['data']),
      status: 'cho_upload',
      retry_count: 0,
      created_at: Date.now()
    };

    await idbService.saveItem(item);
    await useUploadStore.getState().loadQueue();

    useUploadStore.getState().abortSync();
    expect(useUploadStore.getState().isSyncing).toBe(false);
    expect(useUploadStore.getState().currentUpload).toBeNull();
  });
});
