import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UserSettingsPage } from '../src/pages/UserSettingsPage';
import { useUserSettingsStore } from '../src/stores/user-settings-store';
import { useAuthStore } from '../src/stores/auth-store';
import { useCameraStore } from '../src/stores/camera-store';

describe('UserSettingsPage Component', () => {
  beforeEach(() => {
    localStorage.clear();
    useUserSettingsStore.getState().resetSettings();
    useCameraStore.setState({
      devices: [
        { deviceId: 'dev-1', label: 'Webcam C920', kind: 'videoinput', groupId: 'g1' } as MediaDeviceInfo,
      ],
      selectedDeviceId: 'dev-1',
      facingMode: 'environment',
    });
    useAuthStore.setState({
      user: {
        ma_nhan_vien: 'NV002',
        ten: 'Nguyễn Văn B',
        vai_tro: 'nhan_vien',
      },
      isAuthenticated: true,
    });
  });

  function clickTab(name: RegExp | string) {
    const tab = screen.getByRole('tab', { name });
    fireEvent.mouseDown(tab, { button: 0, ctrlKey: false });
  }

  it('renders page header and 4 tabs', () => {
    render(<UserSettingsPage />);

    expect(screen.getByText('Cài đặt trạm làm việc')).toBeTruthy();
    expect(screen.getByRole('tab', { name: /Ghi hình & Âm thanh/ })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /Lưu trữ Drive/ })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /Súng quét Barcode/ })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /Thông tin Trạm/ })).toBeTruthy();
  });

  it('allows user to change video resolution override', () => {
    render(<UserSettingsPage />);

    const res1080Btn = screen.getByRole('button', { name: /1080p/ });
    const res720Btn = screen.getByRole('button', { name: /720p/ });

    expect(res1080Btn).toBeTruthy();
    expect(res720Btn).toBeTruthy();

    fireEvent.click(res1080Btn);
    expect(useUserSettingsStore.getState().videoResolution).toBe('1080p');

    fireEvent.click(res720Btn);
    expect(useUserSettingsStore.getState().videoResolution).toBe('720p');
  });

  it('renders read-only notice in Storage tab', async () => {
    render(<UserSettingsPage />);

    clickTab(/Lưu trữ Drive/);

    expect(await screen.findByText('Chỉ xem (Admin quản trị)')).toBeTruthy();
    expect(screen.getByText(/sa-drive-uploader@warehouse-system.iam.gserviceaccount.com/)).toBeTruthy();
  });

  it('allows user to toggle autoRecordAfterScan and soundBeep in Barcode tab', async () => {
    render(<UserSettingsPage />);

    clickTab(/Súng quét Barcode/);

    const autoRecordCheckbox = (await screen.findByLabelText(/Tự động kích hoạt quay video sau khi quét/)) as HTMLInputElement;
    const soundBeepCheckbox = screen.getByLabelText(/Âm thanh phản hồi \(Bíp\)/) as HTMLInputElement;

    expect(autoRecordCheckbox.checked).toBe(true);
    expect(soundBeepCheckbox.checked).toBe(true);

    fireEvent.click(autoRecordCheckbox);
    expect(useUserSettingsStore.getState().autoRecordAfterScan).toBe(false);

    fireEvent.click(soundBeepCheckbox);
    expect(useUserSettingsStore.getState().soundBeepEnabled).toBe(false);
  });

  it('renders Station Info and handles logout', async () => {
    const mockLogout = vi.fn();
    useAuthStore.setState({ logout: mockLogout });

    render(<UserSettingsPage />);

    clickTab(/Thông tin Trạm/);

    expect(await screen.findByText('Tài khoản nhân viên')).toBeTruthy();
    expect(screen.getByText('Nguyễn Văn B')).toBeTruthy();

    const logoutBtn = screen.getByRole('button', { name: /ĐĂNG XUẤT CA LÀM VIỆC/ });
    fireEvent.click(logoutBtn);

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
