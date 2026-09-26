import { useUserSettingsStore } from '@/stores/user-settings-store';

// ---------------------------------------------------------------------------
// Audio & Haptic Feedback for Barcode Scanning
// Tham chiếu: .agents/rules/01-ui-ux.md (mục 4)
// Uses Web Audio API (AudioContext) — no mp3 files needed, works offline
// ---------------------------------------------------------------------------

/** Shared AudioContext — lazy-initialized on first user interaction */
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof AudioContext === 'undefined') {
    return null;
  }

  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new AudioContext();
  }

  // Resume if suspended (browsers require user gesture)
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume();
  }

  return audioCtx;
}

export const SOUND_PATHS = {
  success: '/sounds/success_sound_scan.mp3',
  warning: '/sounds/warning_sound_scan.mp3',
} as const;

let successAudio: HTMLAudioElement | null = null;
let warningAudio: HTMLAudioElement | null = null;

function getSuccessAudio(): HTMLAudioElement | null {
  if (typeof Audio === 'undefined') return null;
  if (!successAudio) {
    successAudio = new Audio(SOUND_PATHS.success);
    successAudio.preload = 'auto';
  }
  return successAudio;
}

function getWarningAudio(): HTMLAudioElement | null {
  if (typeof Audio === 'undefined') return null;
  if (!warningAudio) {
    warningAudio = new Audio(SOUND_PATHS.warning);
    warningAudio.preload = 'auto';
  }
  return warningAudio;
}

/**
 * Preload sound files in background so they play with zero delay
 */
export function preloadSounds(): void {
  try {
    getSuccessAudio()?.load();
    getWarningAudio()?.load();
  } catch {
    // Ignore preload errors
  }
}

/**
 * Mobile Audio Unlock: Permanently resumes AudioContext and pre-warms audio elements
 * on the first user interaction (touch/click/keypress). Fixes iOS Safari autoplay mute bug.
 */
let isAudioUnlocked = false;

export function unlockAudio(): void {
  if (isAudioUnlocked) return;

  const ctx = getAudioContext();
  if (ctx) {
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    // Play 1-sample silent buffer to unlock Web Audio in iOS Safari
    try {
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    } catch {
      // Ignore
    }
    if (ctx.state === 'running') {
      isAudioUnlocked = true;
    }
  }

  preloadSounds();
}

if (typeof window !== 'undefined') {
  preloadSounds();
  const unlockEvents = ['touchstart', 'touchend', 'click', 'keydown', 'pointerdown'];
  const handleUserGesture = () => {
    unlockAudio();
    if (isAudioUnlocked) {
      unlockEvents.forEach((evt) => window.removeEventListener(evt, handleUserGesture));
    }
  };
  unlockEvents.forEach((evt) => window.addEventListener(evt, handleUserGesture, { passive: true }));
}

/**
 * Generate a tone using Web Audio API OscillatorNode (fallback).
 */
export function playTone(
  frequency: number,
  durationMs: number,
  volume = 0.85,
  type: OscillatorType = 'sine'
): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    void ctx.resume();
  }

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

  // Fast attack (5ms) & clean release to achieve a loud, crisp, piercing scanner beep
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.005);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + durationMs / 1000);

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + durationMs / 1000);
}

/**
 * Stop any active success audio immediately (used when transitioning to warning)
 */
export function stopSuccessAudio(): void {
  if (successAudio) {
    try {
      successAudio.pause();
      successAudio.currentTime = 0;
    } catch {
      // Ignore
    }
  }
}

/**
 * Loud synthesized warning buzzer (2 pulses) for high-noise warehouse environments
 */
export function playWarningTone(): void {
  playTone(400, 200, 0.85, 'sawtooth');
  setTimeout(() => {
    playTone(400, 200, 0.85, 'sawtooth');
  }, 260);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Success beep: plays success_sound_scan.mp3
 * Falls back to 2400Hz crisp tone if audio file playback fails.
 */
export function playSuccessBeep(): void {
  if (!useUserSettingsStore.getState().soundBeepEnabled) return;
  try {
    const audio = getSuccessAudio();
    if (audio) {
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          playTone(2400, 100, 0.85);
        });
      }
      return;
    }
  } catch {
    // Fallback
  }
  playTone(2400, 100, 0.85);
}

/**
 * Warning beep: plays warning_sound_scan.mp3
 * Automatically cuts off success sound and falls back to dual warning tone if playback fails.
 */
export function playWarningBeep(): void {
  if (!useUserSettingsStore.getState().soundBeepEnabled) return;

  // 1. Immediately cut off any running success sound
  stopSuccessAudio();

  // 2. Play warning sound with fallback
  try {
    const audio = getWarningAudio();
    if (audio) {
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          playWarningTone();
        });
      }
      return;
    }
  } catch {
    // Fallback
  }
  playWarningTone();
}

/**
 * Success vibration: 100ms single pulse
 * Rule 01-ui-ux.md: "navigator.vibrate(100)"
 */
export function vibrateSuccess(): void {
  if ('vibrate' in navigator) {
    navigator.vibrate(100);
  }
}

/**
 * Warning vibration: double pulse [100ms, 50ms gap, 100ms]
 * Rule 01-ui-ux.md: "navigator.vibrate([100, 50, 100])"
 */
export function vibrateWarning(): void {
  if ('vibrate' in navigator) {
    navigator.vibrate([100, 50, 100]);
  }
}

/**
 * Combined success feedback: beep + vibrate
 */
export function feedbackSuccess(): void {
  playSuccessBeep();
  vibrateSuccess();
}

/**
 * Combined warning feedback: warning beep + warning vibrate
 */
export function feedbackWarning(): void {
  playWarningBeep();
  vibrateWarning();
}

/**
 * Reset preloaded audio elements (useful for testing and memory cleanup)
 */
export function resetAudioElements(): void {
  successAudio = null;
  warningAudio = null;
}

/**
 * Cleanup shared AudioContext and audio elements (call on app unmount if needed)
 */
export function cleanupAudio(): void {
  resetAudioElements();
  if (audioCtx && audioCtx.state !== 'closed') {
    void audioCtx.close();
    audioCtx = null;
  }
}
