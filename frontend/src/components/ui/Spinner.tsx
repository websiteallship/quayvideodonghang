import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

interface SpinnerProps {
  size?: number;
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 20, className }) => {
  return (
    <Loader2
      size={size}
      className={cn('animate-spin text-muted-foreground', className)}
    />
  );
};
