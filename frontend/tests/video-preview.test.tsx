import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VideoPreview } from '../src/components/recording/VideoPreview';
import type { OverlayInfo } from '../src/hooks/use-media-recorder';

describe('VideoPreview Component', () => {
  const mockOverlay: OverlayInfo = {
    maVanDon: 'GHN123456789',
    donViVc: 'GHN',
    loaiBienBan: 'dong_goi',
    maNhanVien: 'NV003',
  };

  const mockBlob = new Blob(['video-content'], { type: 'video/webm' });
  const mockUrl = 'blob:http://localhost:5173/test-uuid';

  it('renders package code and carrier metadata', () => {
    render(
      <VideoPreview
        blob={mockBlob}
        previewUrl={mockUrl}
        duration={12}
        overlayInfo={mockOverlay}
        onSaveAndContinue={vi.fn()}
        onDiscardAndRetry={vi.fn()}
      />
    );

    expect(screen.getByText('GHN123456789')).toBeTruthy();
    expect(screen.getByText('Đóng gói')).toBeTruthy();
    expect(screen.getByText('GHN')).toBeTruthy();
    expect(screen.getByText('00:12')).toBeTruthy();
  });

  it('calls onSaveAndContinue when save button is clicked', () => {
    const onSave = vi.fn();
    render(
      <VideoPreview
        blob={mockBlob}
        previewUrl={mockUrl}
        duration={15}
        overlayInfo={mockOverlay}
        onSaveAndContinue={onSave}
        onDiscardAndRetry={vi.fn()}
      />
    );

    const saveBtn = screen.getByRole('button', { name: /Lưu & Tiếp tục/i });
    fireEvent.click(saveBtn);

    expect(onSave).toHaveBeenCalledWith(mockBlob, 15);
  });

  it('calls onDiscardAndRetry when discard button is clicked', () => {
    const onDiscard = vi.fn();
    render(
      <VideoPreview
        blob={mockBlob}
        previewUrl={mockUrl}
        duration={15}
        overlayInfo={mockOverlay}
        onSaveAndContinue={vi.fn()}
        onDiscardAndRetry={onDiscard}
      />
    );

    const discardBtn = screen.getByRole('button', { name: /Quay lại/i });
    fireEvent.click(discardBtn);

    expect(onDiscard).toHaveBeenCalled();
  });

  it('defaults to looping last 5 seconds and toggles to full video on click', () => {
    const { container } = render(
      <VideoPreview
        blob={mockBlob}
        previewUrl={mockUrl}
        duration={10}
        overlayInfo={mockOverlay}
        onSaveAndContinue={vi.fn()}
        onDiscardAndRetry={vi.fn()}
      />
    );

    const videoEl = container.querySelector('video') as HTMLVideoElement;
    expect(videoEl).toBeTruthy();
    expect(videoEl.muted).toBe(true);

    // Initial load defaults to last 5s (10 - 5 = 5)
    fireEvent.loadedMetadata(videoEl);
    expect(videoEl.currentTime).toBe(5);

    // Clicking video toggles to full video (0:00)
    fireEvent.click(videoEl);
    expect(videoEl.currentTime).toBe(0);

    // Clicking "5s cuối (Dán tem)" button switches back to last 5s
    const last5sBtn = screen.getByRole('button', { name: /Tua và lặp 5 giây cuối/i });
    fireEvent.click(last5sBtn);
    expect(videoEl.currentTime).toBe(5);

    // Clicking "Xem toàn bộ" button switches to 0:00
    const fullBtn = screen.getByRole('button', { name: /Xem toàn bộ video từ đầu/i });
    fireEvent.click(fullBtn);
    expect(videoEl.currentTime).toBe(0);
  });
});
