import { describe, it, expect } from 'vitest';
import { APP_CONFIG, DON_VI_VAN_CHUYEN_LIST } from '../src/config/constants';

describe('APP_CONFIG', () => {
  it('should have correct app name', () => {
    expect(APP_CONFIG.APP_NAME).toBe('Quay Video Đóng Hàng');
  });

  it('should have valid IDB config', () => {
    expect(APP_CONFIG.IDB_NAME).toBeTruthy();
    expect(APP_CONFIG.IDB_VERSION).toBeGreaterThanOrEqual(1);
    expect(APP_CONFIG.IDB_STORES.QUEUE).toBe('upload_queue');
  });

  it('should have 10 minute max record time', () => {
    expect(APP_CONFIG.MAX_RECORD_TIME_SECONDS).toBe(600);
  });

  it('should have 1 second timeslice for MediaRecorder', () => {
    expect(APP_CONFIG.TIME_SLICE_MS).toBe(1000);
  });

  it('should have 5MB chunk size', () => {
    expect(APP_CONFIG.RESUMABLE_CHUNK_SIZE).toBe(5 * 1024 * 1024);
  });
});

describe('DON_VI_VAN_CHUYEN_LIST', () => {
  it('should have at least 6 carriers', () => {
    expect(DON_VI_VAN_CHUYEN_LIST.length).toBeGreaterThanOrEqual(6);
  });

  it('should include GHN, GHTK, ViettelPost', () => {
    const ids = DON_VI_VAN_CHUYEN_LIST.map((d) => d.id);
    expect(ids).toContain('GHN');
    expect(ids).toContain('GHTK');
    expect(ids).toContain('ViettelPost');
  });

  it('should include Khac as last carrier', () => {
    const last = DON_VI_VAN_CHUYEN_LIST[DON_VI_VAN_CHUYEN_LIST.length - 1];
    expect(last.id).toBe('Khac');
  });

  it('each carrier should have id and label', () => {
    for (const carrier of DON_VI_VAN_CHUYEN_LIST) {
      expect(carrier.id).toBeTruthy();
      expect(carrier.label).toBeTruthy();
    }
  });
});
