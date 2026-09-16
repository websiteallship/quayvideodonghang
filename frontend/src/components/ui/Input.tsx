import React from 'react';
import { cn } from '@/utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  isMono?: boolean;
  leftIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  isMono = false,
  leftIcon,
  className,
  id,
  style,
  ...props
}, ref) => {
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-medium)',
            color: 'var(--color-text-secondary)'
          }}
        >
          {label}
        </label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
        {leftIcon && (
          <div
            style={{
              position: 'absolute',
              left: 'var(--space-3)',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
              color: 'var(--color-text-muted)'
            }}
          >
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn('input-field', isMono && 'input-mono', className)}
          style={{
            ...(leftIcon ? { paddingLeft: '40px' } : {}),
            ...(error ? { borderColor: 'var(--color-error)' } : {}),
            ...style
          }}
          {...props}
        />
      </div>
      {error && (
        <span
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--color-error)',
            marginTop: '2px'
          }}
        >
          {error}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';
