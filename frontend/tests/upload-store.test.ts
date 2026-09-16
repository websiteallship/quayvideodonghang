import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useUploadStore } from '../src/stores/upload-store';
import { idbService } from '../src/services/idb-service';
import { QueueItem } from '../src/types';

describe('uploadStore (Zustand Upload Queue Store)', () => {
  beforeEach(async () => {
    // Reset store state
    useUploadStore.setState({
      queue: [],
      currentUpload: null,
      currentUploadId: null,
      progress: 0,
      isSyncing: false,
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

  it('addToQueue should save item in IDB and sync store queue', async () => {
    const item: QueueItem = {
      id: 'test-item-1',
      ma_van_don: 'ORDER123',
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

    await useUploadStore.getState().addToQueue(item);

    const storeState = useUploadStore.getState();
    expect(storeState.queue.length).toBe(1);
    expect(storeState.queue[0].id).toBe('test-item-1');

    const inDb = await idbService.getItem('test-item-1');
    expect(inDb).toBeDefined();
  });

  it('retryItem should reset error, increment retry_count, and set status to cho_upload', async () => {
    const item: QueueItem = {
      id: 'test-retry-1',
      ma_van_don: 'ORDER_RETRY',
      don_vi_vc: 'GHTK',
      loai_bien_ban: 'dong_goi',
      ma_nhan_vien: 'NV01',
      thiet_bi: 'pc_webcam',
      thoi_luong_video: 15,
      kich_thuoc_bytes: 2048,
      mime_type: 'video/webm',
      blob: new Blob(['data']),
      status: 'loi',
      last_error: 'Network connection lost',
      retry_count: 1,
      created_at: Date.now()
    };

    await idbService.saveItem(item);
    await useUploadStore.getState().loadQueue();

    await useUploadStore.getState().retryItem('test-retry-1');

    const updated = useUploadStore.getState().queue.find((q) => q.id === 'test-retry-1');
    expect(updated?.status).toBe('cho_upload');
    expect(updated?.retry_count).toBe(2);
    expect(updated?.last_error).toBeUndefined();
  });

  it('removeCompleted should remove only items with status da_upload', async () => {
    const item1: QueueItem = {
      id: 'item-done',
      ma_van_don: 'ORDER_DONE',
      don_vi_vc: 'GHN',
      loai_bien_ban: 'dong_goi',
      ma_nhan_vien: 'NV01',
      thiet_bi: 'pc_webcam',
      thoi_luong_video: 10,
      kich_thuoc_bytes: 1024,
      mime_type: 'video/webm',
      blob: new Blob(['data']),
      status: 'da_upload',
      retry_count: 0,
      created_at: Date.now()
    };

    const item2: QueueItem = {
      id: 'item-pending',
      ma_van_don: 'ORDER_PENDING',
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

    await idbService.saveItem(item1);
    await idbService.saveItem(item2);
    await useUploadStore.getState().loadQueue();

    expect(useUploadStore.getState().queue.length).toBe(2);

    await useUploadStore.getState().removeCompleted();

    const remaining = useUploadStore.getState().queue;
    expect(remaining.length).toBe(1);
    expect(remaining[0].id).toBe('item-pending');
  });

  it('worker messages update store state appropriately', async () => {
    // 1. Setup mock worker
    useUploadStore.getState().initWorker();
    const worker = useUploadStore.getState().workerRef as any;
    expect(worker).toBeDefined();

    // 2. Add an item
    const item: QueueItem = {
      id: 'worker-item-1',
      ma_van_don: 'WORKER_MSG',
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

    // 3. Simulate Worker events
    // SYNC_STARTED
    await worker.onmessage?.({ data: { type: 'SYNC_STARTED' } } as any);
    expect(useUploadStore.getState().isSyncing).toBe(true);
    expect(useUploadStore.getState().totalToSync).toBe(1);

    // ITEM_STARTED
    await worker.onmessage?.({ data: { type: 'ITEM_STARTED', payload: { id: 'worker-item-1' } } } as any);
    expect(useUploadStore.getState().currentUpload).toBe('worker-item-1');
    expect(useUploadStore.getState().queue.find(q => q.id === 'worker-item-1')?.status).toBe('dang_upload');

    // PROGRESS
    await worker.onmessage?.({ data: { type: 'PROGRESS', payload: { id: 'worker-item-1', percent: 50 } } } as any);
    expect(useUploadStore.getState().progress).toBe(50);

    // ITEM_DONE
    await worker.onmessage?.({ data: { type: 'ITEM_DONE', payload: { id: 'worker-item-1' } } } as any);
    expect(useUploadStore.getState().syncedInSession).toBe(1);
    expect(useUploadStore.getState().queue.find(q => q.id === 'worker-item-1')).toBeUndefined(); // removed from queue array

    // SYNC_STOPPED
    await worker.onmessage?.({ data: { type: 'SYNC_STOPPED' } } as any);
    expect(useUploadStore.getState().isSyncing).toBe(false);
  });

  it('checkStorage should set storageWarning if remainingMB is under 500MB', async () => {
    vi.spyOn(idbService, 'getStorageEstimate').mockResolvedValue({
      quota: 1000 * 1024 * 1024,
      usage: 800 * 1024 * 1024,
      remainingMB: 200 // < 500MB
    });

    await useUploadStore.getState().checkStorage();

    const state = useUploadStore.getState();
    expect(state.storageWarning).toContain('dưới 500MB');
    expect(state.storageEstimate?.remainingMB).toBe(200);
  });

  it('cancelItem should revert item status to cho_upload and clear currentUpload', async () => {
    const item: QueueItem = {
      id: 'test-cancel-1',
      ma_van_don: 'ORDER_CANCEL',
      don_vi_vc: 'GHN',
      loai_bien_ban: 'dong_goi',
      ma_nhan_vien: 'NV01',
      thiet_bi: 'pc_webcam',
      thoi_luong_video: 10,
      kich_thuoc_bytes: 1024,
      mime_type: 'video/webm',
      blob: new Blob(['data']),
      status: 'dang_upload',
      retry_count: 0,
      created_at: Date.now()
    };

    await idbService.saveItem(item);
    await useUploadStore.getState().loadQueue();
    useUploadStore.setState({ currentUpload: 'test-cancel-1', currentUploadId: 'test-cancel-1', progress: 45 });

    await useUploadStore.getState().cancelItem('test-cancel-1');

    const state = useUploadStore.getState();
    expect(state.currentUpload).toBeNull();
    expect(state.progress).toBe(0);

    const updated = state.queue.find((q) => q.id === 'test-cancel-1');
    expect(updated?.status).toBe('cho_upload');

    const inDb = await idbService.getItem('test-cancel-1');
    expect(inDb?.status).toBe('cho_upload');
  });

  it('cancelItem posts CANCEL_ITEM message to worker and reverts status to cho_upload', async () => {
    const item: QueueItem = {
      id: 'test-cancel-active',
      ma_van_don: 'ORDER_ACTIVE_CANCEL',
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
    
    useUploadStore.getState().initWorker();
    const worker = useUploadStore.getState().workerRef as any;

    await useUploadStore.getState().cancelItem('test-cancel-active');

    // Verify worker received message
    expect(worker.postMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: 'CANCEL_ITEM',
      payload: { id: 'test-cancel-active' }
    }));

    const updated = useUploadStore.getState().queue.find((q) => q.id === 'test-cancel-active');
    expect(updated?.status).toBe('cho_upload');
  });
});
