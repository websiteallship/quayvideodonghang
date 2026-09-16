import { describe, it, expect, beforeEach } from 'vitest';
import { detectDeviceType } from '../src/hooks/use-device-type';

// ---------------------------------------------------------------------------
// Helpers to mock browser environment
// ---------------------------------------------------------------------------

function setUA(ua: string) {
  Object.defineProperty(navigator, 'userAgent', {
    value: ua,
    writable: true,
    configurable: true,
  });
}

function setTouch(hasTouch: boolean, maxTouchPoints = 0) {
  if (hasTouch) {
    Object.defineProperty(window, 'ontouchstart', {
      value: () => {},
      writable: true,
      configurable: true,
    });
  } else {
    // Must delete property — `'ontouchstart' in window` checks existence
    Reflect.deleteProperty(window, 'ontouchstart');
  }
  Object.defineProperty(navigator, 'maxTouchPoints', {
    value: maxTouchPoints,
    writable: true,
    configurable: true,
  });
}

function setScreen(width: number) {
  Object.defineProperty(window.screen, 'width', {
    value: width,
    writable: true,
    configurable: true,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('detectDeviceType', () => {
  beforeEach(() => {
    // Reset to desktop defaults
    setUA('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    setTouch(false, 0);
    setScreen(1920);
  });

  it('should detect Android phone as mobile', () => {
    setUA('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36');
    setTouch(true, 5);
    setScreen(412);

    expect(detectDeviceType()).toBe('mobile');
  });

  it('should detect iPhone as mobile', () => {
    setUA('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15');
    setTouch(true, 5);
    setScreen(390);

    expect(detectDeviceType()).toBe('mobile');
  });

  it('should detect iPad as mobile (camera facing logic)', () => {
    setUA('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15');
    setTouch(true, 5);
    setScreen(810);

    expect(detectDeviceType()).toBe('mobile');
  });

  it('should detect small touch device as mobile even with generic UA', () => {
    setUA('Mozilla/5.0 (Linux; Android 14)');
    setTouch(true, 5);
    setScreen(360);

    expect(detectDeviceType()).toBe('mobile');
  });

  it('should detect desktop without touch as pc_webcam', () => {
    setUA('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    setTouch(false, 0);
    setScreen(1920);

    expect(detectDeviceType()).toBe('pc_webcam');
  });

  it('should detect touch-enabled large screen as laptop (hybrid)', () => {
    setUA('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    setTouch(true, 10);
    setScreen(1366);

    expect(detectDeviceType()).toBe('laptop');
  });
});
