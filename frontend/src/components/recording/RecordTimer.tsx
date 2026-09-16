// ---------------------------------------------------------------------------
// RecordTimer — Real-time duration counter with pulsing recording indicator
// Tham chiếu: docs/roadmap.md (Step 2.1), .agents/rules/01-ui-ux.md
// ---------------------------------------------------------------------------

import { formatDuration } from '../../utils/format';

interface RecordTimerProps {
  /** Duration in seconds */
  duration: number;
  /** Is actively recording (shows red pulsing dot) */
  isRecording?: boolean;
  /** Custom className */
  className?: string;
}

export function RecordTimer({
  duration,
  isRecording = true,
  className = '',
}: RecordTimerProps) {
  const formattedTime = formatDuration(duration);

  return (
    <div
      className={`record-timer ${className}`.trim()}
      role="timer"
      aria-live="polite"
      aria-label={`Thời lượng quay: ${formattedTime}`}
    >
      <div
        className={`record-timer__dot ${isRecording ? 'record-timer__dot--pulse' : ''}`}
        aria-hidden="true"
      />
      <span className="record-timer__digits">{formattedTime}</span>
    </div>
  );
}
