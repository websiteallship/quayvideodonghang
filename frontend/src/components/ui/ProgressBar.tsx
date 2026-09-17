import React from 'react';
import { cn } from '@/utils/cn';

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
    <div className={cn("w-full", className)}>
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden border border-border">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-300 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-end text-xs text-muted-foreground mt-1 font-mono">
          {Math.round(clamped)}%
        </div>
      )}
    </div>
  );
};
