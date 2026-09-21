// ---------------------------------------------------------------------------
// Work Mode Store — Quản lý chế độ làm việc: Đóng gói vs Khui hàng
// Tham chiếu: docs/03-uiux-flow.md (mục 2: Mode-First scanning)
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import type { LoaiBienBan } from '../types';

export const WORK_MODE_STORAGE_KEY = 'app_work_mode';

interface WorkModeState {
  /** Chế độ làm việc hiện tại ('dong_goi' | 'khui_hang' | null) */
  workMode: LoaiBienBan | null;
  /** Cập nhật chế độ và lưu vào localStorage */
  setWorkMode: (mode: LoaiBienBan) => void;
  /** Xóa chế độ (reset về null) */
  clearWorkMode: () => void;
}

const getInitialWorkMode = (): LoaiBienBan => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(WORK_MODE_STORAGE_KEY);
    if (saved === 'dong_goi' || saved === 'khui_hang') {
      return saved;
    }
  }
  return 'dong_goi';
};

export const useWorkModeStore = create<WorkModeState>((set) => ({
  workMode: getInitialWorkMode(),

  setWorkMode: (mode: LoaiBienBan) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(WORK_MODE_STORAGE_KEY, mode);
    }
    set({ workMode: mode });
  },

  clearWorkMode: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(WORK_MODE_STORAGE_KEY);
    }
    set({ workMode: null });
  },
}));
