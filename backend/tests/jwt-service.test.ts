import { describe, it, expect } from 'vitest';
import { JwtService } from '../src/services/jwt-service';

const TEST_SECRET = 'test-secret-key-for-jwt-testing-at-least-32-characters-long';

describe('JwtService', () => {
  const service = new JwtService(TEST_SECRET);

  it('should sign and verify a token', async () => {
    const token = await service.sign({
      sub: 'NV001',
      ten: 'Test User',
      vai_tro: 'nhan_vien'
    });

    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // JWT format: header.payload.signature

    const payload = await service.verify(token);
    expect(payload).not.toBeNull();
    expect(payload!.sub).toBe('NV001');
    expect(payload!.ten).toBe('Test User');
    expect(payload!.vai_tro).toBe('nhan_vien');
    expect(payload!.iat).toBeDefined();
    expect(payload!.exp).toBeDefined();
  });

  it('should return null for invalid token', async () => {
    const payload = await service.verify('invalid.token.here');
    expect(payload).toBeNull();
  });

  it('should return null for token signed with different secret', async () => {
    const otherService = new JwtService('another-secret-key-completely-different');
    const token = await otherService.sign({
      sub: 'NV002',
      ten: 'Hacker',
      vai_tro: 'admin'
    });

    const payload = await service.verify(token);
    expect(payload).toBeNull();
  });

  it('should reject expired token', async () => {
    const token = await service.sign(
      { sub: 'NV001', ten: 'Test', vai_tro: 'nhan_vien' },
      0 // expires immediately
    );

    // Wait a tick for expiration
    await new Promise((r) => setTimeout(r, 1100));

    const payload = await service.verify(token);
    expect(payload).toBeNull();
  }, 5000);

  it('should preserve vai_tro admin', async () => {
    const token = await service.sign({
      sub: 'ADMIN',
      ten: 'Admin User',
      vai_tro: 'admin'
    });

    const payload = await service.verify(token);
    expect(payload!.vai_tro).toBe('admin');
  });
});
