import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkModeStore, WORK_MODE_STORAGE_KEY } from '../src/stores/work-mode-store';

describe('useWorkModeStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useWorkModeStore.getState().clearWorkMode();
  });

  it('initializes with null when localStorage is empty', () => {
    expect(useWorkModeStore.getState().workMode).toBeNull();
  });

  it('updates state and persists to localStorage on setWorkMode', () => {
    useWorkModeStore.getState().setWorkMode('dong_goi');

    expect(useWorkModeStore.getState().workMode).toBe('dong_goi');
    expect(localStorage.getItem(WORK_MODE_STORAGE_KEY)).toBe('dong_goi');

    useWorkModeStore.getState().setWorkMode('khui_hang');

    expect(useWorkModeStore.getState().workMode).toBe('khui_hang');
    expect(localStorage.getItem(WORK_MODE_STORAGE_KEY)).toBe('khui_hang');
  });

  it('clears state and removes from localStorage on clearWorkMode', () => {
    useWorkModeStore.getState().setWorkMode('dong_goi');
    expect(useWorkModeStore.getState().workMode).toBe('dong_goi');

    useWorkModeStore.getState().clearWorkMode();

    expect(useWorkModeStore.getState().workMode).toBeNull();
    expect(localStorage.getItem(WORK_MODE_STORAGE_KEY)).toBeNull();
  });
});
