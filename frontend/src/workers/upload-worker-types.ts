export type WorkerMessageType =
  | 'START'
  | 'STOP'
  | 'CANCEL_ITEM'
  | 'ENQUEUE'
  | 'UPDATE_TOKEN'
  | 'PROCESS_ALL';

export interface WorkerMessage {
  type: WorkerMessageType;
  payload?: unknown;
}

export interface WorkerMessageStartPayload {
  token: string | null;
  apiBase: string;
}

export interface WorkerMessageCancelPayload {
  id: string;
}

export interface WorkerMessageEnqueuePayload {
  id?: string; // Optional, just to trigger a queue check
}

export interface WorkerMessageUpdateTokenPayload {
  token: string | null;
}

export type MainMessageType =
  | 'PROGRESS'
  | 'ITEM_STARTED'
  | 'ITEM_DONE'
  | 'ITEM_ERROR'
  | 'QUEUE_EMPTY'
  | 'WORKER_READY'
  | 'SYNC_STARTED'
  | 'SYNC_STOPPED';

export type MainMessage =
  | { type: 'WORKER_READY'; payload?: undefined }
  | { type: 'SYNC_STARTED'; payload?: undefined }
  | { type: 'SYNC_STOPPED'; payload?: undefined }
  | { type: 'QUEUE_EMPTY'; payload?: undefined }
  | { type: 'ITEM_STARTED'; payload: MainMessageItemPayload }
  | { type: 'ITEM_DONE'; payload: MainMessageItemPayload }
  | { type: 'PROGRESS'; payload: MainMessageProgressPayload }
  | { type: 'ITEM_ERROR'; payload: MainMessageErrorPayload };

export interface MainMessageProgressPayload {
  id: string;
  percent: number;
}

export interface MainMessageItemPayload {
  id: string;
}

export interface MainMessageErrorPayload {
  id: string;
  message: string;
  retryCount: number;
}
