import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/utils/cn';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ id, type, title, message, onDismiss }) => {
  const icon = {
    success: <CheckCircle2 size={20} color="var(--color-success)" />,
    warning: <AlertTriangle size={20} color="var(--color-warning)" />,
    error: <AlertCircle size={20} color="var(--color-error)" />,
    info: <Info size={20} color="var(--color-info)" />
  }[type];

  const borderColor = {
    success: 'var(--color-success)',
    warning: 'var(--color-warning)',
    error: 'var(--color-error)',
    info: 'var(--color-info)'
  }[type];

  return (
    <div
      className={cn('glass-panel animate-slide-down')}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--space-3)',
        padding: 'var(--space-3) var(--space-4)',
        borderLeft: `4px solid ${borderColor}`,
        minWidth: '280px',
        maxWidth: '420px',
        pointerEvents: 'auto'
      }}
    >
      <div style={{ marginTop: '2px' }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--color-text-primary)' }}>
          {title}
        </div>
        {message && (
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
            {message}
          </div>
        )}
      </div>
      <button
        onClick={() => onDismiss(id)}
        style={{ color: 'var(--color-text-muted)', padding: '2px', cursor: 'pointer' }}
        aria-label="Đóng thông báo"
      >
        <X size={16} />
      </button>
    </div>
  );
};
