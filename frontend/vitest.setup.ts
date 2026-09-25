import { vi } from 'vitest';
import 'fake-indexeddb/auto';

// Ensure structuredClone preserves jsdom Blobs for fake-indexeddb storage
const nativeStructuredClone = globalThis.structuredClone;

function cloneWithBlobs<T>(val: T): T {
  if (val === null || typeof val !== 'object') {
    return val;
  }
  if (typeof Blob !== 'undefined' && val instanceof Blob) {
    return new Blob([val], { type: val.type }) as unknown as T;
  }
  if (Array.isArray(val)) {
    return val.map(cloneWithBlobs) as unknown as T;
  }
  if (Object.prototype.toString.call(val) === '[object Object]') {
    const copy = { ...(val as Record<string, unknown>) };
    for (const key of Object.keys(copy)) {
      copy[key] = cloneWithBlobs(copy[key]);
    }
    return copy as T;
  }
  return typeof nativeStructuredClone === 'function' ? nativeStructuredClone(val) : val;
}

globalThis.structuredClone = function <T>(value: T): T {
  return cloneWithBlobs(value);
};

if (typeof window !== 'undefined') {
  window.structuredClone = globalThis.structuredClone;
}

class MockWorker {
  url: string;
  onmessage: ((e: MessageEvent) => void) | null = null;
  postMessage: (msg: unknown) => void;
  terminate: () => void;

  constructor(stringUrl: string | URL) {
    this.url = stringUrl.toString();
    this.postMessage = vi.fn();
    this.terminate = vi.fn();
  }
}

// Add MockWorker to global scope
vi.stubGlobal('Worker', MockWorker);
