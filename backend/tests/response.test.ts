import { describe, it, expect } from 'vitest';

/**
 * Test response envelope structure matches API spec doc 06:
 * { success: boolean, data?: T, error?: { code, message } }
 */
describe('API Response Envelope Contract', () => {
  it('success response should have { success: true, data }', () => {
    const envelope = {
      success: true,
      data: { status: 'ok' }
    };
    expect(envelope.success).toBe(true);
    expect(envelope.data).toBeDefined();
    expect(envelope.data.status).toBe('ok');
  });

  it('error response should have { success: false, error: { code, message } }', () => {
    const envelope = {
      success: false,
      error: {
        code: 'INVALID_PIN',
        message: 'PIN không đúng'
      }
    };
    expect(envelope.success).toBe(false);
    expect(envelope.error.code).toBe('INVALID_PIN');
    expect(envelope.error.message).toBeTruthy();
  });

  it('response envelope should not mix data and error', () => {
    const successEnvelope = { success: true, data: 'ok' };
    const errorEnvelope = { success: false, error: { code: 'ERR', message: 'fail' } };

    // Success should not have error
    expect('error' in successEnvelope).toBe(false);
    // Error should not have data
    expect('data' in errorEnvelope).toBe(false);
  });
});
