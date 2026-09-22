import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface Window {
    __pwaInstallPrompt?: BeforeInstallPromptEvent;
  }
}

export type PWAInstallPlatform = 'ios' | 'android' | 'desktop';

const PWA_DISMISSED_KEY = 'pwa_prompt_dismissed_until';
const PWA_NEVER_SHOW_KEY = 'pwa_prompt_never_show';

export function isPWAPromptDismissed(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    if (localStorage.getItem(PWA_NEVER_SHOW_KEY) === 'true') {
      return true;
    }
    const dismissedUntil = localStorage.getItem(PWA_DISMISSED_KEY);
    if (dismissedUntil) {
      const untilTime = parseInt(dismissedUntil, 10);
      if (!isNaN(untilTime) && Date.now() < untilTime) {
        return true;
      }
    }
  } catch {
    return false;
  }
  return false;
}

export function dismissPWAPrompt(days: number = 7): void {
  if (typeof window === 'undefined') return;
  try {
    const until = Date.now() + days * 24 * 60 * 60 * 1000;
    localStorage.setItem(PWA_DISMISSED_KEY, until.toString());
  } catch {
    // ignore
  }
}

export function neverShowPWAPromptAgain(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PWA_NEVER_SHOW_KEY, 'true');
  } catch {
    // ignore
  }
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    typeof window !== 'undefined' ? (window.__pwaInstallPrompt || null) : null
  );
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [platform, setPlatform] = useState<PWAInstallPlatform>('desktop');

  // Detect platform
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ua = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /android/.test(ua);

    if (isIOS) {
      setPlatform('ios');
    } else if (isAndroid) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }

    // Check if running in standalone mode (already installed)
    const checkInstalled = () => {
      const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      const isAndroidReferrer = document.referrer.includes('android-app://');
      setIsInstalled(isStandaloneMedia || isIOSStandalone || isAndroidReferrer);
    };

    checkInstalled();

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      setIsInstalled(e.matches);
    };
    mediaQuery.addEventListener('change', handleMediaChange);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      window.__pwaInstallPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
    };

    const handleAppInstalled = () => {
      window.__pwaInstallPrompt = undefined;
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      mediaQuery.removeEventListener('change', handleMediaChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const triggerInstall = useCallback(async (): Promise<'prompted' | 'manual'> => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
          setDeferredPrompt(null);
          window.__pwaInstallPrompt = undefined;
        }
        return 'prompted';
      } catch {
        return 'manual';
      }
    }
    return 'manual';
  }, [deferredPrompt]);

  return {
    isInstalled,
    canInstall: !isInstalled,
    hasNativePrompt: !!deferredPrompt,
    platform,
    triggerInstall,
    isDismissed: isPWAPromptDismissed(),
    dismissPrompt: dismissPWAPrompt,
    neverShowAgain: neverShowPWAPromptAgain,
  };
}
