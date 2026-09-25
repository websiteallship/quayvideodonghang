import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { QueueItem, BienBanMetadata } from '../types';
import { APP_CONFIG } from '../config/constants';

export interface StorageEstimateResult {
  quota?: number;
  usage?: number;
  percentageUsed?: number;
  remainingMB?: number;
}

interface QuayVideoDB extends DBSchema {
  upload_queue: {
    key: string;
    value: QueueItem;
    indexes: {
      'by-status': string;
      'by-created': number;
    };
  };
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let dbPromise: Promise<IDBPDatabase<QuayVideoDB>> | null = null;

function getDb(): Promise<IDBPDatabase<QuayVideoDB>> {
  if (!dbPromise) {
    dbPromise = openDB<QuayVideoDB>(APP_CONFIG.IDB_NAME, APP_CONFIG.IDB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('upload_queue')) {
          const store = db.createObjectStore('upload_queue', { keyPath: 'id' });
          store.createIndex('by-status', 'status');
          store.createIndex('by-created', 'created_at');
        }
      }
    });
  }
  return dbPromise;
}

export const idbService = {
  /**
   * Directly save or update a QueueItem in IndexedDB
   */
  async saveItem(item: QueueItem): Promise<void> {
    const db = await getDb();
    await db.put('upload_queue', item);
  },

  /**
   * Save a newly recorded video blob and metadata into IndexedDB.
   * 
   * Dedup guard: If a video with the same (ma_van_don, loai_bien_ban, kich_thuoc_bytes)
   * was saved within the last 60 seconds, returns the existing item to prevent
   * duplicate records caused by double-tap, UI lag, or rapid re-renders.
   */
  async saveVideo(blob: Blob, metadata: BienBanMetadata): Promise<QueueItem> {
    // --- Dedup guard: chống trùng khi double-tap hoặc UI lag ---
    const DEDUP_WINDOW_MS = 60_000; // 60 seconds
    const now = Date.now();
    const existing = await this.findByMaVanDonAndLoaiBienBan(
      metadata.ma_van_don,
      metadata.loai_bien_ban
    );
    const duplicate = existing.find(
      (item) =>
        item.kich_thuoc_bytes === blob.size &&
        (now - item.created_at) < DEDUP_WINDOW_MS
    );
    if (duplicate) {
      console.warn(
        `[IDB_DEDUP] Skipped duplicate save for ${metadata.ma_van_don} ` +
        `(existing id: ${duplicate.id}, age: ${now - duplicate.created_at}ms)`
      );
      return duplicate;
    }

    const id = metadata.id || generateUUID();
    const item: QueueItem = {
      id,
      ma_van_don: metadata.ma_van_don,
      don_vi_vc: metadata.don_vi_vc,
      loai_bien_ban: metadata.loai_bien_ban,
      ma_nhan_vien: metadata.ma_nhan_vien,
      thiet_bi: metadata.thiet_bi || 'pc_webcam',
      thoi_luong_video: metadata.thoi_luong_video,
      kich_thuoc_bytes: blob.size,
      mime_type: metadata.mime_type || blob.type || 'video/webm',
      blob,
      status: 'cho_upload',
      retry_count: 0,
      created_at: Date.now()
    };
    await this.saveItem(item);
    return item;
  },

  /**
   * Retrieve item by ID
   */
  async getItem(id: string): Promise<QueueItem | undefined> {
    const db = await getDb();
    return db.get('upload_queue', id);
  },

  /**
   * Retrieve video Blob by item ID
   */
  async getVideoBlob(id: string): Promise<Blob | null> {
    const item = await this.getItem(id);
    return item?.blob || null;
  },

  /**
   * Get all items sorted by creation time
   */
  async getAll(): Promise<QueueItem[]> {
    const db = await getDb();
    return db.getAllFromIndex('upload_queue', 'by-created');
  },

  /**
   * Find all queue items matching a specific ma_van_don + loai_bien_ban.
   * Used for local duplicate detection before calling backend API.
   * Returns matches regardless of status (cho_upload, dang_upload, da_upload, loi).
   */
  async findByMaVanDonAndLoaiBienBan(
    maVanDon: string,
    loaiBienBan: string
  ): Promise<QueueItem[]> {
    const all = await this.getAll();
    return all.filter(
      (item) => item.ma_van_don === maVanDon && item.loai_bien_ban === loaiBienBan
    );
  },

  /**
   * Delete all queue items matching a specific ma_van_don + loai_bien_ban.
   * Used when user chooses to overwrite duplicate videos.
   */
  async deleteByMaVanDonAndLoaiBienBan(
    maVanDon: string,
    loaiBienBan: string
  ): Promise<number> {
    const matches = await this.findByMaVanDonAndLoaiBienBan(maVanDon, loaiBienBan);
    for (const item of matches) {
      await this.deleteItem(item.id);
    }
    return matches.length;
  },

  /**
   * Get all pending items for upload (status: 'cho_upload' or 'loi') sorted by creation time
   */
  async getQueue(): Promise<QueueItem[]> {
    const all = await this.getAll();
    return all.filter((item) => item.status === 'cho_upload' || item.status === 'loi');
  },

  /**
   * Get pending items (alias of getQueue)
   */
  async getPending(): Promise<QueueItem[]> {
    return this.getQueue();
  },

  /**
   * Partially update a QueueItem
   */
  async updateItem(id: string, updates: Partial<QueueItem>): Promise<void> {
    const db = await getDb();
    const item = await db.get('upload_queue', id);
    if (!item) throw new Error(`Queue item ${id} not found`);
    const updated = { ...item, ...updates };
    await db.put('upload_queue', updated);
  },

  /**
   * Delete item by ID
   */
  async deleteItem(id: string): Promise<void> {
    const db = await getDb();
    await db.delete('upload_queue', id);
  },

  /**
   * Delete video (alias of deleteItem)
   */
  async deleteVideo(id: string): Promise<void> {
    await this.deleteItem(id);
  },

  /**
   * Query storage estimation from browser (navigator.storage.estimate)
   */
  async getStorageEstimate(): Promise<StorageEstimateResult> {
    if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.estimate === 'function') {
      try {
        const estimate = await navigator.storage.estimate();
        const quota = estimate.quota;
        const usage = estimate.usage;
        let percentageUsed: number | undefined;
        let remainingMB: number | undefined;

        if (quota !== undefined && usage !== undefined && quota > 0) {
          percentageUsed = Math.round((usage / quota) * 100);
          remainingMB = Math.max(0, Math.round((quota - usage) / (1024 * 1024)));
        }

        return { quota, usage, percentageUsed, remainingMB };
      } catch (e) {
        console.warn('Storage estimate failed:', e);
      }
    }
    return {};
  },

  /**
   * Request persistent storage to prevent browser eviction (especially on iOS Safari)
   */
  async requestPersistentStorage(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.persist === 'function') {
      try {
        return await navigator.storage.persist();
      } catch (e) {
        console.warn('Storage persist request failed:', e);
        return false;
      }
    }
    return false;
  },

  /**
   * Close and clear DB connection instance (useful for unit tests)
   */
  async closeDb(): Promise<void> {
    if (dbPromise) {
      const db = await dbPromise;
      db.close();
      dbPromise = null;
    }
  }
};
