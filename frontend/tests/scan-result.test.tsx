import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScanResult } from '../src/components/scanner/ScanResult';
import type { BarcodeResult } from '../src/types';

describe('ScanResult Component', () => {
  const mockBarcode: BarcodeResult = {
    rawValue: 'GHN123456789',
    format: 'code_128',
    source: 'camera',
  };

  it('renders scanned code and auto-detected carrier', () => {
    const onStart = vi.fn();
    const onRescan = vi.fn();

    render(
      <ScanResult
        result={mockBarcode}
        onStartRecording={onStart}
        onRescan={onRescan}
      />
    );

    expect(screen.getByText('GHN123456789')).toBeTruthy();
    expect(screen.getByText(/CODE 128/)).toBeTruthy();
    expect(screen.getByText(/Tự động nhận diện: Giao Hàng Nhanh/)).toBeTruthy();
  });

  it('renders duplicate warning when isDuplicate is true', () => {
    const onStart = vi.fn();
    const onRescan = vi.fn();

    render(
      <ScanResult
        result={mockBarcode}
        isDuplicate={true}
        duplicateInfo={{
          nhanVien: 'NV003',
          thoiGian: '15/09/2026 10:30:00',
          soLuong: 2,
        }}
        onStartRecording={onStart}
        onRescan={onRescan}
      />
    );

    expect(screen.getByText(/Mã đã có video.*\(2 lần\)/)).toBeTruthy();
    expect(screen.getByText(/NV003/)).toBeTruthy();
    expect(screen.getByText('Quay thêm video mới')).toBeTruthy();
    expect(screen.getByText('Ghi đè video cũ')).toBeTruthy();
  });

  it('allows user to proceed with recording even if duplicate (warn but don\'t block)', () => {
    const onStart = vi.fn();
    const onRescan = vi.fn();

    render(
      <ScanResult
        result={mockBarcode}
        isDuplicate={true}
        duplicateInfo={{
          nhanVien: 'NV001',
          thoiGian: '15/09/2026 10:00:00',
          soLuong: 1,
        }}
        onStartRecording={onStart}
        onRescan={onRescan}
      />
    );

    const startBtn = screen.getByRole('button', { name: /Quay thêm video mới/ });
    fireEvent.click(startBtn);

    expect(onStart).toHaveBeenCalledWith({
      maVanDon: 'GHN123456789',
      donViVc: 'GHN',
      loaiBienBan: 'dong_goi',
      overwrite: false,
    });
  });

  it('renders checking indicator and disables start button when isChecking is true', () => {
    render(
      <ScanResult
        result={mockBarcode}
        isChecking={true}
        onStartRecording={vi.fn()}
        onRescan={vi.fn()}
      />
    );

    expect(screen.getByText(/Đang kiểm tra mã trùng/)).toBeTruthy();
    const startBtn = screen.getByRole('button', { name: /Bắt đầu quay/ });
    expect(startBtn).toHaveProperty('disabled', true);
  });

  it('pre-selects work mode from initialLoaiBienBan prop', () => {
    const onStart = vi.fn();

    render(
      <ScanResult
        result={mockBarcode}
        initialLoaiBienBan="khui_hang"
        onStartRecording={onStart}
        onRescan={vi.fn()}
      />
    );

    const startBtn = screen.getByRole('button', { name: /Bắt đầu quay/ });
    fireEvent.click(startBtn);

    expect(onStart).toHaveBeenCalledWith({
      maVanDon: 'GHN123456789',
      donViVc: 'GHN',
      loaiBienBan: 'khui_hang',
      overwrite: false,
    });
  });
});
