/// <reference lib="webworker" />
import { idbService } from '../services/idb-service';
import { APP_CONFIG } from '../config/constants';
import type { QueueItem } from '../types';
import {
  MainMessage,
  WorkerMessage,
  WorkerMessageStartPayload,
  WorkerMessageCancelPayload,
  WorkerMessageUpdateTokenPayload
} from './upload-worker-types';

const RETRY_CONFIG = {
  maxRetries: APP_CONFIG.MAX_RETRIES,
  baseDelayMs: APP_CONFIG.BASE_RETRY_DELAY_MS,
  maxDelayMs: 32_000,
  jitterPercent: 0.2
} as const;

let apiBaseUrl = '';
let authToken: string | null = null;
let isSyncing = false;
let currentItemController: AbortController | null = null;
let currentItemId: string | null = null;
let globalAbortController: AbortController | null = null;

// Helper to post messages back to Main Thread
const postMainMessage = (msg: MainMessage) => {
  self.postMessage(msg);
};

// Exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  signal?: AbortSignal,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  let lastError: Error = new Error('Unknown retry error');

  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (signal?.aborted) throw err;
      lastError = err instanceof Error ? err : new Error(String(err));

      const isFatal = lastError.message.includes('SESSION_EXPIRED') ||
                      lastError.message.includes('401') ||
                      lastError.message.includes('403') ||
                      lastError.message.includes('404') ||
                      lastError.message.includes('410');
      if (isFatal || attempt >= RETRY_CONFIG.maxRetries) break;

      onRetry?.(attempt + 1, lastError);

      const delay = Math.min(
        RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt),
        RETRY_CONFIG.maxDelayMs
      );
      const jitter = delay * RETRY_CONFIG.jitterPercent * (Math.random() * 2 - 1);
      await new Promise((r) => setTimeout(r, Math.max(0, delay + jitter)));
    }
  }

  throw lastError;
}

// Fetch helper with Auth token
async function authFetch(url: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }
  return fetch(url, { ...options, headers });
}

async function authFetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error?.message) {
        message = data.error.message;
      } else if (data?.error?.issues && Array.isArray(data.error.issues)) {
        message = data.error.issues.map((i: any) => `${i.path?.join('.') || 'field'}: ${i.message}`).join(', ');
      } else if (data?.error) {
        message = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
      }
    } catch {}
    throw new Error(message);
  }
  return res.json();
}

async function queryByteOffset(uploadUrl: string, totalSize: number): Promise<number> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15_000);

    let res: Response;
    try {
      res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Length': '0',
          'Content-Range': `bytes */${totalSize}`
        },
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (res.status === 308) {
      const range = res.headers.get('Range');
      if (range) {
        const match = range.match(/bytes=0-(\d+)/);
        return match ? parseInt(match[1], 10) + 1 : 0;
      }
      return 0;
    }
    if (res.ok) return totalSize;
    if (res.status === 404 || res.status === 410 || res.status === 401) {
      throw new Error('SESSION_EXPIRED');
    }
    return 0;
  } catch (err) {
    if (err instanceof Error && err.message === 'SESSION_EXPIRED') throw err;
    return 0;
  }
}

async function uploadBlobWithResume(
  uploadUrl: string,
  blob: Blob,
  onProgress: (progress: number) => void,
  signal?: AbortSignal
): Promise<string> {
  const totalSize = blob.size;
  const chunkSize = APP_CONFIG.RESUMABLE_CHUNK_SIZE;
  let offset = 0;

  while (offset < totalSize) {
    if (signal?.aborted) throw new Error('Upload bị hủy');

    const chunkEnd = Math.min(offset + chunkSize, totalSize);
    const chunk = blob.slice(offset, chunkEnd);

    const response = await retryWithBackoff(
      async () => {
        const chunkAbortController = new AbortController();
        const timeoutId = setTimeout(() => chunkAbortController.abort(), 45_000);
        const handleAbort = () => chunkAbortController.abort();
        signal?.addEventListener('abort', handleAbort);

        let res: Response;
        try {
          res = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
              'Content-Length': `${chunk.size}`,
              'Content-Range': `bytes ${offset}-${chunkEnd - 1}/${totalSize}`
            },
            body: chunk,
            signal: chunkAbortController.signal
          });
        } finally {
          clearTimeout(timeoutId);
          signal?.removeEventListener('abort', handleAbort);
        }

        if (res.status === 404 || res.status === 410 || res.status === 401) {
          throw new Error(`SESSION_EXPIRED (${res.status})`);
        }
        if (res.status >= 500) {
          throw new Error(`Drive server error (${res.status})`);
        }
        return res;
      },
      signal,
      async (attempt, error) => {
        console.warn(`[WORKER_UPLOAD_RETRY] offset=${offset}, attempt=${attempt}: ${error.message}`);
        try {
          const resumedOffset = await queryByteOffset(uploadUrl, totalSize);
          if (resumedOffset > offset) {
            offset = resumedOffset;
          }
        } catch {}
      }
    );

    if (response.status === 308) {
      const rangeHeader = response.headers.get('Range');
      if (rangeHeader) {
        const match = rangeHeader.match(/bytes=0-(\d+)/);
        if (match) {
          offset = parseInt(match[1], 10) + 1;
        } else {
          offset = chunkEnd;
        }
      } else {
        offset = chunkEnd;
      }
      const pct = Math.min(95, Math.round((offset / totalSize) * 75) + 20);
      onProgress(pct);
    } else if (response.ok) {
      onProgress(95);
      try {
        const data = await response.json();
        return data.id || '';
      } catch {
        return '';
      }
    } else {
      if (response.status === 404 || response.status === 410 || response.status === 401) {
        throw new Error(`SESSION_EXPIRED (${response.status})`);
      }
      const txt = await response.text().catch(() => '');
      throw new Error(`Drive upload error (${response.status}): ${txt}`);
    }
  }
  return '';
}

async function simulateProgress(
  onProgress: (pct: number) => void,
  from: number,
  to: number,
  signal?: AbortSignal
) {
  const steps = 6;
  const stepSize = (to - from) / steps;
  for (let i = 1; i <= steps; i++) {
    if (signal?.aborted) throw new Error('Upload bị hủy');
    await new Promise((r) => setTimeout(r, 60));
    onProgress(Math.round(from + stepSize * i));
  }
}

async function initUploadSession(item: QueueItem, signal: AbortSignal): Promise<{ resumable_upload_url: string; target_file_name: string }> {
  const initPayload = {
    id: item.id,
    ma_van_don: item.ma_van_don ? item.ma_van_don.trim() : 'UNKNOWN',
    don_vi_vc: item.don_vi_vc ? item.don_vi_vc.trim() : 'Khac',
    loai_bien_ban: item.loai_bien_ban,
    ma_nhan_vien: item.ma_nhan_vien,
    thiet_bi: item.thiet_bi || 'mobile',
    thoi_luong_video: Math.round(item.thoi_luong_video || 0),
    kich_thuoc_bytes: item.kich_thuoc_bytes || item.blob?.size || 1,
    mime_type: item.mime_type || item.blob?.type || 'video/webm',
    kho_hang_id: item.kho_hang_id || undefined
  };

  const initData = await authFetchJson<any>(`${apiBaseUrl}/upload/init`, {
    method: 'POST',
    body: JSON.stringify(initPayload),
    signal
  });

  if (!initData.success || !initData.data) {
    throw new Error('Khởi tạo phiên tải lên thất bại: ' + (initData.error?.message || 'Không có phản hồi từ máy chủ'));
  }

  return {
    resumable_upload_url: initData.data.resumable_upload_url,
    target_file_name: initData.data.target_file_name
  };
}

async function processSingleItem(item: QueueItem, signal: AbortSignal) {
  const onProgress = (percent: number) => {
    postMainMessage({ type: 'PROGRESS', payload: { id: item.id, percent } });
  };

  onProgress(5);

  let resumable_upload_url = item.resumable_session_url || '';
  let target_file_name = '';

  // 1. Init session
  if (!resumable_upload_url || resumable_upload_url.includes('mock-drive-upload')) {
    const session = await initUploadSession(item, signal);
    resumable_upload_url = session.resumable_upload_url;
    target_file_name = session.target_file_name;
  }

  onProgress(20);

  // Persist URL for crash recovery
  if (resumable_upload_url && item.blob) {
    try {
      await idbService.updateItem(item.id, { resumable_session_url: resumable_upload_url });
    } catch {}
  }

  // 2. Upload chunked with automatic session recovery
  let driveFileId = '';
  if (resumable_upload_url && !resumable_upload_url.includes('mock-drive-upload')) {
    if (item.blob) {
      try {
        driveFileId = await uploadBlobWithResume(resumable_upload_url, item.blob, onProgress, signal);
      } catch (err: unknown) {
        if (signal.aborted) throw err;
        const errMsg = err instanceof Error ? err.message : String(err);
        const isSessionDead = errMsg.includes('SESSION_EXPIRED') ||
                              errMsg.includes('404') ||
                              errMsg.includes('410') ||
                              errMsg.includes('401') ||
                              errMsg.includes('Failed to fetch') ||
                              errMsg.includes('Load failed');

        if (isSessionDead) {
          console.warn('[WORKER] Stale or expired resumable URL detected. Refreshing session...');
          resumable_upload_url = '';
          try {
            await idbService.updateItem(item.id, { resumable_session_url: undefined });
          } catch {}

          const fresh = await initUploadSession(item, signal);
          resumable_upload_url = fresh.resumable_upload_url;
          target_file_name = fresh.target_file_name;

          try {
            await idbService.updateItem(item.id, { resumable_session_url: resumable_upload_url });
          } catch {}

          onProgress(20);
          driveFileId = await uploadBlobWithResume(resumable_upload_url, item.blob, onProgress, signal);
        } else {
          throw err;
        }
      }
    }
  } else {
    await simulateProgress(onProgress, 20, 95, signal);
    driveFileId = `mock_${item.id.slice(0, 8)}`;
  }

  onProgress(95);

  // 3. Complete
  await authFetchJson<any>(`${apiBaseUrl}/upload/complete`, {
    method: 'POST',
    body: JSON.stringify({
      id: item.id,
      drive_file_id: driveFileId,
      drive_file_name: target_file_name || `${item.ma_van_don}_${Date.now()}.webm`
    }),
    signal
  });

  onProgress(100);
}

// Loop to process all pending items
async function syncLoop() {
  if (isSyncing) return;
  isSyncing = true;
  postMainMessage({ type: 'SYNC_STARTED' });

  globalAbortController = new AbortController();

  try {
    while (!globalAbortController.signal.aborted) {
      if (!navigator.onLine) break;

      const queue = await idbService.getQueue();
      // Prioritize pending items ('cho_upload') first, then retry errored items ('loi')
      let pendingItems = queue.filter((item) => item.status === 'cho_upload');
      if (pendingItems.length === 0) {
        pendingItems = queue.filter(
          (item) => item.status === 'loi' && item.retry_count < APP_CONFIG.MAX_RETRIES
        );
      }

      if (pendingItems.length === 0) {
        postMainMessage({ type: 'QUEUE_EMPTY' });
        break;
      }

      // Pick the first item
      const item = pendingItems[0];
      currentItemId = item.id;
      currentItemController = new AbortController();
      
      postMainMessage({ type: 'ITEM_STARTED', payload: { id: item.id } });

      try {
        await idbService.updateItem(item.id, { status: 'dang_upload' });
        
        await processSingleItem(item, currentItemController.signal);
        
        // Success
        await idbService.deleteItem(item.id);
        postMainMessage({ type: 'ITEM_DONE', payload: { id: item.id } });

      } catch (err: unknown) {
        if (currentItemController.signal.aborted) {
          // Cancelled by user, ignore
        } else {
          // Error
          const errorMessage = err instanceof Error ? err.message : String(err || 'Upload failed');
          
          // Report error to backend
          try {
            await authFetch(`${apiBaseUrl}/upload/error`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: item.id, loi_message: errorMessage })
            });
          } catch {}

          const newRetryCount = item.retry_count + 1;
          try {
            await idbService.updateItem(item.id, {
              status: 'loi',
              last_error: errorMessage,
              retry_count: newRetryCount,
              resumable_session_url: undefined
            });
          } catch {}

          postMainMessage({
            type: 'ITEM_ERROR',
            payload: { id: item.id, message: errorMessage, retryCount: newRetryCount }
          });

          // Short delay between failed items to avoid tight loop
          await new Promise((r) => setTimeout(r, 1000));
        }
      } finally {
        currentItemId = null;
        currentItemController = null;
      }
    }
  } finally {
    isSyncing = false;
    globalAbortController = null;
    postMainMessage({ type: 'SYNC_STOPPED' });
  }
}

// Cancel a specific item via backend and abort its running task
async function cancelUpload(id: string) {
  try {
    await authFetch(`${apiBaseUrl}/upload/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
  } catch {}
}

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const msg = e.data;
  switch (msg.type) {
    case 'START': {
      const payload = msg.payload as WorkerMessageStartPayload;
      authToken = payload.token;
      apiBaseUrl = payload.apiBase;
      if (!isSyncing) {
        syncLoop();
      }
      break;
    }
    case 'STOP': {
      if (globalAbortController) {
        globalAbortController.abort();
      }
      break;
    }
    case 'CANCEL_ITEM': {
      const payload = msg.payload as WorkerMessageCancelPayload;
      if (currentItemId === payload.id && currentItemController) {
        currentItemController.abort();
      }
      cancelUpload(payload.id);
      break;
    }
    case 'UPDATE_TOKEN': {
      const payload = msg.payload as WorkerMessageUpdateTokenPayload;
      authToken = payload.token;
      // Reset errored items so they can be retried with the new token
      (async () => {
        try {
          const queue = await idbService.getQueue();
          for (const item of queue) {
            if (item.status === 'loi') {
              await idbService.updateItem(item.id, {
                status: 'cho_upload',
                retry_count: 0,
                last_error: undefined,
                resumable_session_url: undefined
              });
            }
          }
        } catch {}
        // Restart sync loop to pick up the reset items
        if (!isSyncing && navigator.onLine) {
          syncLoop();
        }
      })();
      break;
    }
    case 'ENQUEUE':
    case 'PROCESS_ALL': {
      if (!isSyncing && authToken && navigator.onLine) {
        syncLoop();
      }
      break;
    }
  }
};

postMainMessage({ type: 'WORKER_READY' });
