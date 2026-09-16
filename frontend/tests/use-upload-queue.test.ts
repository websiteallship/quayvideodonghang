import 'fake-indexeddb/auto';
import { Blob as NodeBlob } from 'node:buffer';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUploadQueue } from '../src/hooks/use-upload-queue';
import { useUploadStore } from '../src/stores/upload-store';
import { idbService } from '../src/services/idb-service';

(window as any).Blob = NodeBlob;
(globalThis as any).Blob = NodeBlob;

describe('useUploadQueue Hook', () => {
  beforeEach(async () => {
    useUploadStore.setState({
      queue: [],
      currentUpload: null,
      currentUploadId: null,
      progress: 0,
      isSyncing: false,
      storageEstimate: null,
      storageWarning: null
    });

    const all = await idbService.getAll();
    for (const item of all) {
      await idbService.deleteItem(item.id);
    }
  });

  afterEach(async () => {
    await idbService.closeDb();
    vi.restoreAllMocks();
  });

  it('should initialize and load queue from IDB on mount', async () => {
    let hookResult: any;
    await act(async () => {
      hookResult = renderHook(() => useUploadQueue());
    });

    expect(hookResult.result.current.queue).toEqual([]);
    expect(hookResult.result.current.pendingCount).toBe(0);
    expect(hookResult.result.current.isUploading).toBe(false);
  });

  it('enqueue should save video blob to IDB and refresh queue', async () => {
    let hookResult: any;
    await act(async () => {
      hookResult = renderHook(() => useUploadQueue());
    });

    const blob = new NodeBlob(['video-payload'], { type: 'video/webm' }) as unknown as Blob;

    let queuedItem: any;
    await act(async () => {
      queuedItem = await hookResult.result.current.enqueue(blob, {
        ma_van_don: 'GHN_QUEUE_01',
        don_vi_vc: 'GHN',
        loai_bien_ban: 'dong_goi',
        ma_nhan_vien: 'NV001',
        thoi_luong_video: 8
      });
    });

    expect(queuedItem).toBeDefined();
    expect(queuedItem.id).toBeTruthy();
    expect(hookResult.result.current.queue.length).toBe(1);
    expect(hookResult.result.current.pendingCount).toBe(1);
    expect(hookResult.result.current.queue[0].ma_van_don).toBe('GHN_QUEUE_01');

    // Verify stored in actual IndexedDB
    const inDb = await idbService.getItem(queuedItem.id);
    expect(inDb).toBeDefined();
    expect(inDb?.ma_van_don).toBe('GHN_QUEUE_01');
  });

  it('should register beforeunload prevention when isRecording is true', async () => {
    await act(async () => {
      renderHook(() => useUploadQueue({ isRecording: true }));
    });

    const event = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

    window.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it('should register beforeunload prevention when isUploading is true', async () => {
    let hookResult: any;
    await act(async () => {
      hookResult = renderHook(() => useUploadQueue());
    });

    act(() => {
      useUploadStore.setState({ currentUpload: 'item-uploading-123' });
    });

    expect(hookResult.result.current.isUploading).toBe(true);

    const event = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

    window.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it('should trigger retryFailed for items with loi status', async () => {
    const blob = new NodeBlob(['sample'], { type: 'video/webm' }) as unknown as Blob;
    await idbService.saveVideo(blob, {
      ma_van_don: 'ERR_01',
      don_vi_vc: 'GHN',
      loai_bien_ban: 'dong_goi',
      ma_nhan_vien: 'NV01',
      thoi_luong_video: 5
    });

    const items = await idbService.getAll();
    await idbService.updateItem(items[0].id, { status: 'loi', last_error: 'Timeout' });

    let hookResult: any;
    await act(async () => {
      hookResult = renderHook(() => useUploadQueue());
    });

    await act(async () => {
      await hookResult.result.current.loadQueue();
    });

    expect(hookResult.result.current.errorCount).toBe(1);

    await act(async () => {
      await hookResult.result.current.retryFailed();
    });

    expect(hookResult.result.current.errorCount).toBe(0);
    expect(hookResult.result.current.pendingCount).toBe(1);
    expect(hookResult.result.current.queue[0].status).toBe('cho_upload');
  });

  it('should handle visibilitychange when document becomes visible', async () => {
    const checkStorageSpy = vi.spyOn(idbService, 'getStorageEstimate');

    await act(async () => {
      renderHook(() => useUploadQueue());
    });

    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true
    });

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(checkStorageSpy).toHaveBeenCalled();
  });

  it('should expose cancelItem and revert item when cancelled', async () => {
    let hookResult: any;
    await act(async () => {
      hookResult = renderHook(() => useUploadQueue());
    });

    expect(typeof hookResult.result.current.cancelItem).toBe('function');

    const blob = new NodeBlob(['cancel-sample'], { type: 'video/webm' }) as unknown as Blob;
    await idbService.saveVideo(blob, {
      ma_van_don: 'CANCEL_TEST_01',
      don_vi_vc: 'GHN',
      loai_bien_ban: 'dong_goi',
      ma_nhan_vien: 'NV01',
      thoi_luong_video: 5
    });

    const items = await idbService.getAll();
    await idbService.updateItem(items[0].id, { status: 'dang_upload' });

    await act(async () => {
      await hookResult.result.current.loadQueue();
    });

    expect(hookResult.result.current.queue[0].status).toBe('dang_upload');

    await act(async () => {
      await hookResult.result.current.cancelItem(items[0].id);
    });

    expect(hookResult.result.current.queue[0].status).toBe('cho_upload');
  });
});
