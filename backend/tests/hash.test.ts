import { describe, it, expect } from 'vitest';
import { hashPin, comparePin } from '../src/utils/hash';

describe('hashPin / comparePin', () => {
  it('should hash and verify matching PIN', async () => {
    const hash = await hashPin('1234');
    expect(hash).toBeTruthy();
    expect(hash.startsWith('$2')).toBe(true); // bcrypt prefix

    const match = await comparePin('1234', hash);
    expect(match).toBe(true);
  });

  it('should reject wrong PIN', async () => {
    const hash = await hashPin('1234');
    const match = await comparePin('9999', hash);
    expect(match).toBe(false);
  });

  it('should produce different hashes for same PIN (salt)', async () => {
    const hash1 = await hashPin('0000');
    const hash2 = await hashPin('0000');
    expect(hash1).not.toBe(hash2);
  });
});
