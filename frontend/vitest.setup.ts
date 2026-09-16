import { vi } from 'vitest';
import 'fake-indexeddb/auto';

class MockWorker {
  url: string;
  onmessage: ((e: MessageEvent) => void) | null = null;
  postMessage: (msg: any) => void;
  terminate: () => void;

  constructor(stringUrl: string | URL) {
    this.url = stringUrl.toString();
    this.postMessage = vi.fn();
    this.terminate = vi.fn();
  }
}

// Add MockWorker to global scope
vi.stubGlobal('Worker', MockWorker);
