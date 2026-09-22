import { create } from 'zustand';

export type GuideTab = 'steps' | 'shortcuts' | 'faq';

interface OnboardingState {
  hasSeenGuide: boolean;
  isGuideModalOpen: boolean;
  activeTab: GuideTab;
  currentUserId: string | null;
  loadUserOnboarding: (maNhanVien: string) => void;
  setHasSeenGuide: (seen: boolean) => void;
  openGuideModal: (tab?: GuideTab) => void;
  closeGuideModal: () => void;
  setActiveTab: (tab: GuideTab) => void;
  resetOnboarding: () => void;
}

function getInitialUser(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem('auth_user') || localStorage.getItem('auth_user');
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed?.ma_nhan_vien || null;
    }
  } catch {}
  return null;
}

function checkHasSeenGuide(user: string | null): boolean {
  if (typeof window === 'undefined' || !user) return false;
  try {
    return localStorage.getItem(`operator_onboarding_${user}`) === 'true';
  } catch {
    return false;
  }
}

const initialUser = getInitialUser();
const initialSeen = checkHasSeenGuide(initialUser);

export const useOnboardingStore = create<OnboardingState>()((set, get) => ({
  hasSeenGuide: initialSeen,
  isGuideModalOpen: false,
  activeTab: 'steps',
  currentUserId: initialUser,

  loadUserOnboarding: (maNhanVien: string) => {
    const seen = checkHasSeenGuide(maNhanVien);
    set({
      currentUserId: maNhanVien,
      hasSeenGuide: seen,
    });
  },

  setHasSeenGuide: (seen: boolean) => {
    const user = get().currentUserId;
    if (user && typeof window !== 'undefined') {
      try {
        localStorage.setItem(`operator_onboarding_${user}`, seen ? 'true' : 'false');
      } catch {}
    }
    set({ hasSeenGuide: seen });
  },

  openGuideModal: (tab: GuideTab = 'steps') =>
    set({ isGuideModalOpen: true, activeTab: tab }),

  closeGuideModal: () => set({ isGuideModalOpen: false }),

  setActiveTab: (tab: GuideTab) => set({ activeTab: tab }),

  resetOnboarding: () =>
    set({
      currentUserId: null,
      hasSeenGuide: false,
      isGuideModalOpen: false,
      activeTab: 'steps',
    }),
}));
