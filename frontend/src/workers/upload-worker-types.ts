export type WorkerMessageType =
  | 'START'
  | 'STOP'
  | 'CANCEL_ITEM'
  | 'ENQUEUE'
  | 'UPDATE_TOKEN'
  | 'PROCESS_ALL';

export interface WorkerMessage {
  type: WorkerMessageType;
  payload?: any;
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

export interface MainMessage {
  type: MainMessageType;
  payload?: any;
}

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
