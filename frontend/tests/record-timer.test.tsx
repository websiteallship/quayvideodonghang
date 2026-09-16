import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RecordTimer } from '../src/components/recording/RecordTimer';

describe('RecordTimer Component', () => {
  it('renders initial 00:00 duration', () => {
    render(<RecordTimer duration={0} isRecording={true} />);

    expect(screen.getByText('00:00')).toBeTruthy();
    expect(screen.getByRole('timer')).toBeTruthy();
  });

  it('formats seconds into MM:SS format correctly', () => {
    render(<RecordTimer duration={65} isRecording={true} />);

    expect(screen.getByText('01:05')).toBeTruthy();
  });

  it('formats hours into HH:MM:SS format when duration >= 3600s', () => {
    render(<RecordTimer duration={3665} isRecording={true} />);

    expect(screen.getByText('01:01:05')).toBeTruthy();
  });

  it('adds pulsing class when isRecording is true', () => {
    const { container } = render(<RecordTimer duration={10} isRecording={true} />);

    const dot = container.querySelector('.record-timer__dot');
    expect(dot?.classList.contains('record-timer__dot--pulse')).toBe(true);
  });
});
