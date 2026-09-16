import { describe, it, expect } from 'vitest';
import { detectCarrier, getCarrierLabel } from '../src/utils/detect-carrier';

// ---------------------------------------------------------------------------
// detectCarrier
// ---------------------------------------------------------------------------

describe('detectCarrier', () => {
  it('detects GHN from "GHN0123456789"', () => {
    expect(detectCarrier('GHN0123456789')).toBe('GHN');
  });

  it('detects GHN case-insensitive', () => {
    expect(detectCarrier('ghn12345')).toBe('GHN');
  });

  it('detects GHTK from "S12345678"', () => {
    expect(detectCarrier('S12345678')).toBe('GHTK');
  });

  it('detects GHTK from "GHTK..." prefix', () => {
    expect(detectCarrier('GHTK001234')).toBe('GHTK');
  });

  it('detects ViettelPost from "VT12345"', () => {
    expect(detectCarrier('VT12345678')).toBe('ViettelPost');
  });

  it('detects J&T from "812345678901" (12-digit starting with 8)', () => {
    expect(detectCarrier('812345678901')).toBe('J&T');
  });

  it('detects J&T from "JNT..." prefix', () => {
    expect(detectCarrier('JNT001234567')).toBe('J&T');
  });

  it('detects ShopeeXpress from "SPX..."', () => {
    expect(detectCarrier('SPX123456789')).toBe('ShopeeXpress');
  });

  it('detects ShopeeXpress from "VN123..." pattern', () => {
    expect(detectCarrier('VN12345678')).toBe('ShopeeXpress');
  });

  it('returns "Khac" for unknown prefix', () => {
    expect(detectCarrier('UNKNOWN123')).toBe('Khac');
  });

  it('returns "Khac" for empty string', () => {
    expect(detectCarrier('')).toBe('Khac');
  });

  it('returns "Khac" for very short code', () => {
    expect(detectCarrier('A')).toBe('Khac');
  });

  it('trims whitespace before matching', () => {
    expect(detectCarrier('  GHN123456  ')).toBe('GHN');
  });
});

// ---------------------------------------------------------------------------
// getCarrierLabel
// ---------------------------------------------------------------------------

describe('getCarrierLabel', () => {
  it('returns label for known carrier', () => {
    expect(getCarrierLabel('GHN')).toBe('Giao Hàng Nhanh');
  });

  it('returns label for J&T', () => {
    expect(getCarrierLabel('J&T')).toBe('J&T Express');
  });

  it('returns fallback label for "Khac"', () => {
    expect(getCarrierLabel('Khac')).toBe('Đơn vị khác');
  });
});
