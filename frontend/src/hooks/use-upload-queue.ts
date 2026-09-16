import { useEffect, useCallback } from 'react';
import { useUploadStore } from '../stores/upload-store';
import { idbService } from '../services/idb-service';
import { BienBanMetadata, QueueItem } from '../types';

export interface UseUploadQueueOptions {
  /** 
   * Whether recording is currently in progress (for beforeunload protection).
   * Notice: We no longer pause uploads during recording because 
   * uploading is now offloaded to a Web Worker, which frees up the Main Thread.
   */
  isRecording?: boolean;
}

export function useUploadQueue(options: UseUploadQueueOptions = {}) {
  const { isRecording = false } = options;

  const queue = useUploadStore((s) => s.queue);
  const currentUpload = useUploadStore((s) => s.currentUpload);
  const currentProgress = useUploadStore((s) => s.progress);
  const isSyncing = useUploadStore((s) => s.isSyncing);
  const totalToSync = useUploadStore((s) => s.totalToSync);
  const syncedInSession = useUploadStore((s) => s.syncedInSession);
  const storageEstimate = useUploadStore((s) => s.storageEstimate);
  const storageWarning = useUploadStore((s) => s.storageWarning);

  const loadQueue = useUploadStore((s) => s.loadQueue);
  const checkStorage = useUploadStore((s) => s.checkStorage);
  const removeCompleted = useUploadStore((s) => s.removeCompleted);
  const removeItem = useUploadStore((s) => s.removeItem);
  const removeItems = useUploadStore((s) => s.removeItems);
  const cancelItem = useUploadStore((s) => s.cancelItem);
  const retryItem = useUploadStore((s) => s.retryItem);
  
  // Worker lifecycle methods
  const initWorker = useUploadStore((s) => s.initWorker);
  const startSync = useUploadStore((s) => s.startSync);
  const stopSync = useUploadStore((s) => s.stopSync);
  const notifyEnqueue = useUploadStore((s) => s.notifyEnqueue);

  const pendingCount = queue.filter(
    (item) => item.status === 'cho_upload' || item.status === 'dang_upload'
  ).length;
  const errorCount = queue.filter((item) => item.status === 'loi').length;
  const completedCount = queue.filter((item) => item.status === 'da_upload').length;
  const isUploading = isSyncing || currentUpload !== null;

  // 1. Initialize Worker on mount, terminate on unmount
  useEffect(() => {
    initWorker();
    void loadQueue();
    void checkStorage();
    void idbService.requestPersistentStorage();
    
    return () => {
      // NOTE: Terminate worker only when the entire app unmounts (e.g. if this hook is used globally)
      // Since this is used in HomePage/QueuePage, we might not want to terminate it on every route change.
      // But for safety against leaks if multiple components mount it:
      // Actually, zustand store holds the worker. We shouldn't terminate it aggressively if we want background uploads.
      // We'll let the browser kill the worker when the tab closes.
    };
  }, [initWorker, loadQueue, checkStorage]);

  // 2. Online / Offline listener: auto-retry / resume sync on reconnect
  useEffect(() => {
    const handleOnline = () => {
      void loadQueue();
      startSync(); // Start worker sync
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [loadQueue, startSync]);

  // 3. VisibilityChange listener: reload and resume when app returns to foreground
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void loadQueue();
        void checkStorage();
        if (typeof navigator !== 'undefined' && navigator.onLine) {
          startSync();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadQueue, checkStorage, startSync]);

  // 4. BeforeUnload protection: Prevent accidental tab closure during recording or active uploading
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isRecording || isUploading) {
        e.preventDefault();
        e.returnValue = ''; // Standard requirement for modern browsers
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isRecording, isUploading]);

  /**
   * Enqueue a new video recording into IndexedDB and queue store.
   */
  const enqueue = useCallback(
    async (video: Blob, metadata: BienBanMetadata): Promise<QueueItem> => {
      // 1. Immediately save to IndexedDB (Offline-First)
      const queueItem = await idbService.saveVideo(video, metadata);

      // 2. Refresh store queue
      await loadQueue();
      await checkStorage();

      // 3. Trigger worker to start uploading
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        notifyEnqueue();
      }

      return queueItem;
    },
    [loadQueue, checkStorage, notifyEnqueue]
  );

  const processAll = useCallback(async () => {
    startSync();
  }, [startSync]);

  // For backward compatibility with UI expecting these methods:
  // Note: Since Worker handles queue sequentially on its own, 
  // uploadSelected and uploadSingle just trigger startSync for now.
  const uploadSelected = useCallback(
    async (ids: string[]) => {
      if (!ids.length) return;
      startSync();
    },
    [startSync]
  );

  const uploadSingle = useCallback(
    async (_id: string) => {
      startSync();
    },
    [startSync]
  );

  const retryOne = useCallback(
    async (id: string) => {
      await retryItem(id);
    },
    [retryItem]
  );

  const retryFailed = useCallback(async () => {
    const failedItems = queue.filter((item) => item.status === 'loi');
    for (const item of failedItems) {
      await retryItem(item.id);
    }
  }, [queue, retryItem]);

  const removeSelected = useCallback(
    async (ids: string[]) => {
      await removeItems(ids);
      await checkStorage();
    },
    [removeItems, checkStorage]
  );

  return {
    queue,
    pendingCount,
    errorCount,
    completedCount,
    isUploading,
    isSyncing,
    currentProgress,
    currentUpload,
    totalToSync,
    syncedInSession,
    storageEstimate,
    storageWarning,
    enqueue,
    processAll,
    uploadSelected,
    uploadSingle,
    retryFailed,
    retryOne,
    removeCompleted,
    removeItem,
    removeSelected,
    cancelItem,
    abortSync: stopSync,
    checkStorage,
    loadQueue
  };
}
