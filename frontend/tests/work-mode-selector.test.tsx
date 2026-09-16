import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkModeSelector } from '../src/components/work-mode/WorkModeSelector';

describe('WorkModeSelector Component', () => {
  it('renders both work mode options', () => {
    const onSelect = vi.fn();
    render(<WorkModeSelector selectedMode={null} onSelectMode={onSelect} />);

    expect(screen.getByText('Đóng gói hàng')).toBeTruthy();
    expect(screen.getByText('Khui hàng / Hoàn trả')).toBeTruthy();
    expect(screen.getByText(/Bắt buộc chọn trước khi quét/)).toBeTruthy();
  });

  it('indicates active selection correctly', () => {
    const { rerender } = render(
      <WorkModeSelector selectedMode="dong_goi" onSelectMode={vi.fn()} />
    );

    const dongGoiBtn = screen.getByRole('radio', { name: /Đóng gói hàng/i });
    expect(dongGoiBtn.getAttribute('aria-checked')).toBe('true');
    expect(screen.getByText(/Đã chọn: Đóng gói/)).toBeTruthy();

    rerender(<WorkModeSelector selectedMode="khui_hang" onSelectMode={vi.fn()} />);
    const khuiHangBtn = screen.getByRole('radio', { name: /Khui hàng/i });
    expect(khuiHangBtn.getAttribute('aria-checked')).toBe('true');
    expect(screen.getByText(/Đã chọn: Khui hàng/)).toBeTruthy();
  });

  it('calls onSelectMode with correct mode on button click', () => {
    const onSelect = vi.fn();
    render(<WorkModeSelector selectedMode={null} onSelectMode={onSelect} />);

    const dongGoiBtn = screen.getByRole('radio', { name: /Đóng gói hàng/i });
    fireEvent.click(dongGoiBtn);
    expect(onSelect).toHaveBeenCalledWith('dong_goi');

    const khuiHangBtn = screen.getByRole('radio', { name: /Khui hàng/i });
    fireEvent.click(khuiHangBtn);
    expect(onSelect).toHaveBeenCalledWith('khui_hang');
  });

  it('renders validation error message when provided', () => {
    render(
      <WorkModeSelector
        selectedMode={null}
        onSelectMode={vi.fn()}
        errorMessage="Vui lòng chọn chế độ làm việc"
      />
    );

    expect(screen.getByText('Vui lòng chọn chế độ làm việc')).toBeTruthy();
  });
});
