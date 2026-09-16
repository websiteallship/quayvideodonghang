import React from 'react';

export interface ProgressBarProps {
  progress: number; // 0 - 100
  showLabel?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  showLabel = false,
  className
}) => {
  const clamped = Math.min(100, Math.max(0, progress));

  return (
    <div style={{ width: '100%' }} className={className}>
      <div
        style={{
          width: '100%',
          height: '8px',
          backgroundColor: 'var(--color-bg-elevated)',
          borderRadius: 'var(--radius-full)',
          overflow: 'hidden',
          border: '1px solid var(--color-border)'
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${clamped}%`,
            background: 'linear-gradient(90deg, var(--color-primary-500) 0%, var(--color-accent-400) 100%)',
            borderRadius: 'var(--radius-full)',
            transition: 'width 0.3s ease-out'
          }}
        />
      </div>
      {showLabel && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-secondary)',
            marginTop: '4px',
            fontFamily: 'var(--font-mono)'
          }}
        >
          {Math.round(clamped)}%
        </div>
      )}
    </div>
  );
};
