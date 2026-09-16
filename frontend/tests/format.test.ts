import { describe, it, expect } from 'vitest';
import { formatDuration, formatBytes, formatDateTimeVN, formatDateTimeShortVN } from '../src/utils/format';

describe('formatDuration', () => {
  it('should format seconds under 1 minute', () => {
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(5)).toBe('00:05');
    expect(formatDuration(59)).toBe('00:59');
  });

  it('should format minutes and seconds', () => {
    expect(formatDuration(60)).toBe('01:00');
    expect(formatDuration(125)).toBe('02:05');
    expect(formatDuration(3599)).toBe('59:59');
  });

  it('should format hours', () => {
    expect(formatDuration(3600)).toBe('01:00:00');
    expect(formatDuration(3661)).toBe('01:01:01');
    expect(formatDuration(7200)).toBe('02:00:00');
  });

  it('should floor fractional seconds', () => {
    expect(formatDuration(65.7)).toBe('01:05');
  });
});

describe('formatBytes', () => {
  it('should format zero', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('should format bytes', () => {
    expect(formatBytes(100)).toBe('100 B');
    expect(formatBytes(1023)).toBe('1023 B');
  });

  it('should format KB', () => {
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  it('should format MB', () => {
    expect(formatBytes(1048576)).toBe('1 MB');
    expect(formatBytes(10485760)).toBe('10 MB');
  });

  it('should format GB', () => {
    expect(formatBytes(1073741824)).toBe('1 GB');
  });

  it('should respect decimals parameter', () => {
    // parseFloat strips trailing zeros: 1.50 → 1.5
    expect(formatBytes(1536, 2)).toBe('1.5 KB');
    expect(formatBytes(1536, 0)).toBe('2 KB');
  });
});

describe('formatDateTimeVN', () => {
  it('should format valid date string', () => {
    // Use a fixed date to avoid timezone issues
    const date = new Date(2026, 8, 14, 14, 30, 22); // Sept 14 2026 14:30:22
    const result = formatDateTimeVN(date);
    expect(result).toBe('14/09/2026 14:30:22');
  });

  it('should convert SQLite UTC datetime string to Ho Chi Minh +7 time', () => {
    // 07:42:46 UTC -> 14:42:46 in Asia/Ho_Chi_Minh (+7)
    expect(formatDateTimeVN('2026-09-16 07:42:46')).toBe('16/09/2026 14:42:46');
  });

  it('should convert ISO UTC datetime string to Ho Chi Minh +7 time', () => {
    expect(formatDateTimeVN('2026-09-16T07:42:46Z')).toBe('16/09/2026 14:42:46');
  });

  it('should format ISO string with +07:00 offset correctly', () => {
    expect(formatDateTimeVN('2026-09-16T14:42:46+07:00')).toBe('16/09/2026 14:42:46');
  });

  it('should format timestamp number', () => {
    const date = new Date(2026, 0, 1, 8, 5, 3);
    const result = formatDateTimeVN(date.getTime());
    expect(result).toBe('01/01/2026 08:05:03');
  });

  it('should return dash for invalid date', () => {
    expect(formatDateTimeVN('not-a-date')).toBe('—');
    expect(formatDateTimeVN('')).toBe('—');
  });
});

describe('formatDateTimeShortVN', () => {
  it('should format date with full year in Ho Chi Minh +7', () => {
    expect(formatDateTimeShortVN('2026-09-16 07:42:46')).toBe('16/09/2026 14:42:46');
  });

  it('should return dash for invalid date', () => {
    expect(formatDateTimeShortVN('invalid')).toBe('—');
  });
});

