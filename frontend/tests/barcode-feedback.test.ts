import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  playSuccessBeep,
  playWarningBeep,
  playTone,
  vibrateSuccess,
  vibrateWarning,
  feedbackSuccess,
  feedbackWarning,
  cleanupAudio,
  SOUND_PATHS,
} from '../src/utils/barcode-feedback';

// ---------------------------------------------------------------------------
// AudioContext mock
// ---------------------------------------------------------------------------

interface MockOscillator {
  type: string;
  frequency: { setValueAtTime: ReturnType<typeof vi.fn> };
  connect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
}

interface MockGain {
  gain: { setValueAtTime: ReturnType<typeof vi.fn>; linearRampToValueAtTime: ReturnType<typeof vi.fn> };
  connect: ReturnType<typeof vi.fn>;
}

let mockOscillators: MockOscillator[];
let mockGains: MockGain[];

function createMockAudioContext() {
  mockOscillators = [];
  mockGains = [];

  class MockAudioContext {
    state = 'running';
    currentTime = 0;
    destination = {};

    resume() {
      return Promise.resolve();
    }

    close() {
      this.state = 'closed';
      return Promise.resolve();
    }

    createOscillator() {
      const osc: MockOscillator = {
        type: 'sine',
        frequency: { setValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };
      mockOscillators.push(osc);
      return osc;
    }

    createGain() {
      const gain: MockGain = {
        gain: {
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      };
      mockGains.push(gain);
      return gain;
    }
  }

  Object.defineProperty(globalThis, 'AudioContext', {
    value: MockAudioContext,
    writable: true,
    configurable: true,
  });
}

// ---------------------------------------------------------------------------
// Mock Audio element
// ---------------------------------------------------------------------------

interface MockAudioInstance {
  src: string;
  currentTime: number;
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  load: ReturnType<typeof vi.fn>;
}

let mockAudioInstances: MockAudioInstance[] = [];

function setupMockAudio(shouldFail = false) {
  mockAudioInstances = [];

  class MockAudio {
    src: string;
    currentTime = 0;
    load = vi.fn();
    pause = vi.fn();
    play = vi.fn().mockImplementation(() => {
      if (shouldFail) {
        return Promise.reject(new Error('Autoplay blocked'));
      }
      return Promise.resolve();
    });

    constructor(src?: string) {
      this.src = src || '';
      mockAudioInstances.push(this);
    }
  }

  Object.defineProperty(globalThis, 'Audio', {
    value: MockAudio,
    writable: true,
    configurable: true,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('barcode-feedback', () => {
  beforeEach(() => {
    cleanupAudio();
    createMockAudioContext();
    setupMockAudio(false);

    Object.defineProperty(navigator, 'vibrate', {
      value: vi.fn().mockReturnValue(true),
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    cleanupAudio();
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // MP3 Audio beeps
  // -----------------------------------------------------------------------

  describe('playSuccessBeep', () => {
    it('plays success_sound_scan.mp3 audio file', () => {
      playSuccessBeep();

      const successAudio = mockAudioInstances.find((a) => a.src === SOUND_PATHS.success);
      expect(successAudio).toBeDefined();
      expect(successAudio?.play).toHaveBeenCalled();
    });

    it('resets currentTime to 0 before playing for rapid scans', () => {
      playSuccessBeep();

      const successAudio = mockAudioInstances.find((a) => a.src === SOUND_PATHS.success);
      expect(successAudio?.currentTime).toBe(0);
    });
  });

  describe('playWarningBeep', () => {
    it('plays warning_sound_scan.mp3 audio file', () => {
      playWarningBeep();

      const warningAudio = mockAudioInstances.find((a) => a.src === SOUND_PATHS.warning);
      expect(warningAudio).toBeDefined();
      expect(warningAudio?.play).toHaveBeenCalled();
    });

    it('immediately stops success audio when warning beep is triggered', () => {
      playSuccessBeep();
      const successAudio = mockAudioInstances.find((a) => a.src === SOUND_PATHS.success);
      expect(successAudio?.play).toHaveBeenCalled();

      playWarningBeep();
      expect(successAudio?.pause).toHaveBeenCalled();
      expect(successAudio?.currentTime).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // Synthetic Web Audio Fallback
  // -----------------------------------------------------------------------

  describe('playTone (Web Audio fallback)', () => {
    it('creates oscillator at specified frequency and connects gain', () => {
      playTone(2400, 100, 0.85);

      expect(mockOscillators).toHaveLength(1);
      expect(mockOscillators[0].frequency.setValueAtTime).toHaveBeenCalledWith(2400, 0);
      expect(mockOscillators[0].connect).toHaveBeenCalled();
      expect(mockGains[0].connect).toHaveBeenCalled();
      expect(mockOscillators[0].start).toHaveBeenCalled();
      expect(mockOscillators[0].stop).toHaveBeenCalled();
    });

    it('sets oscillator type correctly', () => {
      playTone(2400, 100, 0.85, 'sine');

      expect(mockOscillators[0].type).toBe('sine');
    });
  });

  // -----------------------------------------------------------------------
  // Haptic vibration
  // -----------------------------------------------------------------------

  describe('vibrateSuccess', () => {
    it('calls navigator.vibrate(100)', () => {
      vibrateSuccess();

      expect(navigator.vibrate).toHaveBeenCalledWith(100);
    });
  });

  describe('vibrateWarning', () => {
    it('calls navigator.vibrate([100, 50, 100])', () => {
      vibrateWarning();

      expect(navigator.vibrate).toHaveBeenCalledWith([100, 50, 100]);
    });
  });

  // -----------------------------------------------------------------------
  // Combined feedback
  // -----------------------------------------------------------------------

  describe('feedbackSuccess', () => {
    it('plays success sound and triggers vibration', () => {
      feedbackSuccess();

      const successAudio = mockAudioInstances.find((a) => a.src === SOUND_PATHS.success);
      expect(successAudio?.play).toHaveBeenCalled();
      expect(navigator.vibrate).toHaveBeenCalledWith(100);
    });
  });

  describe('feedbackWarning', () => {
    it('plays warning sound and triggers warning vibration', () => {
      feedbackWarning();

      const warningAudio = mockAudioInstances.find((a) => a.src === SOUND_PATHS.warning);
      expect(warningAudio?.play).toHaveBeenCalled();
      expect(navigator.vibrate).toHaveBeenCalledWith([100, 50, 100]);
    });
  });

  // -----------------------------------------------------------------------
  // Cleanup
  // -----------------------------------------------------------------------

  describe('cleanupAudio', () => {
    it('closes AudioContext', () => {
      playTone(2400, 100); // Initialize context
      cleanupAudio();

      playTone(2400, 100);
      expect(mockOscillators).toHaveLength(2);
    });
  });
});
