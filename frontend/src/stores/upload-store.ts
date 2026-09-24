import { create } from 'zustand';
import { QueueItem } from '../types';
import { idbService, StorageEstimateResult } from '../services/idb-service';
import { uploadService } from '../services/upload-service';
import { MainMessage, WorkerMessage } from '../workers/upload-worker-types';
import { getStoredToken, API_BASE } from '../services/api-client';

export interface UploadState {
  queue: QueueItem[];
  currentUpload: string | null;
  /** Backward compatible alias for currentUpload */
  currentUploadId: string | null;
  progress: number;
  isSyncing: boolean;
  totalToSync: number;
  syncedInSession: number;
  storageEstimate: StorageEstimateResult | null;
  storageWarning: string | null;
  workerRef: Worker | null;

  initWorker: () => void;
  terminateWorker: () => void;
  startSync: () => void;
  stopSync: () => void;
  notifyEnqueue: () => void;
  
  loadQueue: () => Promise<void>;
  addToQueue: (item: QueueItem) => Promise<void>;
  retryItem: (id: string) => Promise<void>;
  cancelItem: (id: string) => Promise<void>;
  removeCompleted: () => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  removeItems: (ids: string[]) => Promise<void>;
  
  // Backward compatibility stubs for UI
  abortSync: () => void;
  processQueue: () => Promise<void>;

  setCurrentUpload: (id: string | null, progress?: number) => void;
  setProgress: (progress: number) => void;
  setIsSyncing: (isSyncing: boolean) => void;
  checkStorage: () => Promise<StorageEstimateResult | null>;
}

export const useUploadStore = create<UploadState>((set, get) => ({
  queue: [],
  currentUpload: null,
  currentUploadId: null,
  progress: 0,
  isSyncing: false,
  totalToSync: 0,
  syncedInSession: 0,
  storageEstimate: null,
  storageWarning: null,
  workerRef: null,

  initWorker: () => {
    const state = get();
    if (state.workerRef) return; // Already initialized

    const worker = new Worker(new URL('../workers/upload.worker.ts', import.meta.url), { type: 'module' });
    
    worker.onmessage = async (e: MessageEvent<MainMessage>) => {
      const msg = e.data;
      switch (msg.type) {
        case 'WORKER_READY':
          if (typeof navigator !== 'undefined' && navigator.onLine) {
            get().startSync();
          }
          break;
        case 'SYNC_STARTED':
          set((s) => ({ 
            isSyncing: true, 
            totalToSync: s.queue.filter(q => q.status === 'cho_upload' || q.status === 'loi').length,
            syncedInSession: 0
          }));
          break;
        case 'SYNC_STOPPED':
          set({ isSyncing: false, currentUpload: null, currentUploadId: null, progress: 0 });
          await get().loadQueue();
          break;
        case 'QUEUE_EMPTY':
          set({ isSyncing: false, currentUpload: null, currentUploadId: null, progress: 0 });
          break;
        case 'ITEM_STARTED':
          set((s) => ({
            currentUpload: msg.payload.id,
            currentUploadId: msg.payload.id,
            progress: 0,
            queue: s.queue.map(q => q.id === msg.payload.id ? { ...q, status: 'dang_upload' as const } : q)
          }));
          break;
        case 'PROGRESS':
          if (get().currentUpload === msg.payload.id) {
            set({ progress: msg.payload.percent });
          }
          break;
        case 'ITEM_DONE':
          set((s) => ({
            syncedInSession: s.syncedInSession + 1,
            queue: s.queue.filter(q => q.id !== msg.payload.id)
          }));
          break;
        case 'ITEM_ERROR':
          set((s) => ({
            queue: s.queue.map(q => 
              q.id === msg.payload.id 
                ? { ...q, status: 'loi' as const, last_error: msg.payload.message, retry_count: msg.payload.retryCount } 
                : q
            )
          }));
          break;
      }
    };

    set({ workerRef: worker });
  },

  terminateWorker: () => {
    const { workerRef } = get();
    if (workerRef) {
      workerRef.terminate();
      set({ workerRef: null, isSyncing: false, currentUpload: null, currentUploadId: null, progress: 0 });
    }
  },

  startSync: () => {
    const { workerRef } = get();
    if (workerRef) {
      const token = getStoredToken();
      workerRef.postMessage({
        type: 'START',
        payload: { token, apiBase: API_BASE }
      } as WorkerMessage);
    }
  },

  stopSync: () => {
    const { workerRef } = get();
    if (workerRef) {
      workerRef.postMessage({ type: 'STOP' } as WorkerMessage);
    }
  },

  notifyEnqueue: () => {
    const { workerRef } = get();
    if (workerRef) {
      workerRef.postMessage({ type: 'ENQUEUE' } as WorkerMessage);
    }
  },

  loadQueue: async () => {
    try {
      const items = await idbService.getAll();
      
      // Auto-recover stuck 'dang_upload' items from previous crashed sessions
      let needsReload = false;
      for (const item of items) {
        if (item.status === 'dang_upload') {
          await idbService.updateItem(item.id, { status: 'loi', last_error: 'Đang tải lên thì bị gián đoạn' });
          needsReload = true;
        }
      }

      if (needsReload) {
        const freshItems = await idbService.getAll();
        set({ queue: freshItems });
      } else {
        set({ queue: items });
      }
    } catch (err) {
      console.error('Failed to load upload queue from IDB:', err);
    }
  },

  addToQueue: async (item: QueueItem) => {
    await idbService.saveItem(item);
    await get().loadQueue();
    get().notifyEnqueue();
  },

  setCurrentUpload: (id: string | null, progress: number = 0) => {
    set({ currentUpload: id, currentUploadId: id, progress });
  },

  setProgress: (progress: number) => {
    set({ progress });
  },

  setIsSyncing: (isSyncing: boolean) => {
    set({ isSyncing });
  },

  removeItem: async (id: string) => {
    await idbService.deleteItem(id);
    await get().loadQueue();
  },

  removeItems: async (ids: string[]) => {
    for (const id of ids) {
      await idbService.deleteItem(id);
    }
    await get().loadQueue();
  },

  removeCompleted: async () => {
    const { queue } = get();
    const completedItems = queue.filter((item) => item.status === 'da_upload');
    for (const item of completedItems) {
      await idbService.deleteItem(item.id);
    }
    await get().loadQueue();
  },

  retryItem: async (id: string) => {
    const item = await idbService.getItem(id);
    if (!item) return;

    await idbService.updateItem(id, {
      status: 'cho_upload',
      retry_count: 0,
      last_error: undefined
    });
    await get().loadQueue();
    get().notifyEnqueue(); // Trigger worker to pick it up
  },

  abortSync: () => {
    get().stopSync();
  },

  cancelItem: async (id: string) => {
    const { workerRef, currentUpload } = get();
    
    // 1. Tell worker to abort if it's currently uploading this item
    if (workerRef) {
      workerRef.postMessage({ type: 'CANCEL_ITEM', payload: { id } } as WorkerMessage);
    }

    // 2. Update UI immediately
    if (currentUpload === id) {
      set({ currentUpload: null, currentUploadId: null, progress: 0 });
    }

    // 3. Revert IDB status
    try {
      await idbService.updateItem(id, { status: 'cho_upload', last_error: undefined });
      set((s) => ({
        queue: s.queue.map((q) => (q.id === id ? { ...q, status: 'cho_upload' as const, last_error: undefined } : q))
      }));
    } catch {}

    // 4. Notify backend
    void uploadService.cancelUpload(id);
    await get().loadQueue();
  },

  // Stub for backward compatibility with UI components calling processQueue
  processQueue: async () => {
    get().startSync();
  },

  checkStorage: async () => {
    try {
      const estimate = await idbService.getStorageEstimate();
      let warning: string | null = null;
      if (estimate.remainingMB !== undefined && estimate.remainingMB < 500) {
        warning = `Dung lượng thiết bị còn ${estimate.remainingMB}MB (dưới 500MB). Vui lòng giải phóng bộ nhớ để tiếp tục quay video.`;
      }
      set({ storageEstimate: estimate, storageWarning: warning });
      return estimate;
    } catch (err) {
      console.warn('Check storage estimate failed:', err);
      return null;
    }
  }
}));
