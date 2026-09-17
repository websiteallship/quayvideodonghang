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
    success: <CheckCircle2 size={20} className="text-green-600" />,
    warning: <AlertTriangle size={20} className="text-orange-600" />,
    error: <AlertCircle size={20} className="text-red-600" />,
    info: <Info size={20} className="text-blue-600" />
  }[type];

  const borderClass = {
    success: 'border-l-green-600',
    warning: 'border-l-orange-600',
    error: 'border-l-red-600',
    info: 'border-l-blue-600'
  }[type];

  return (
    <div
      className={cn(
        'glass-panel animate-slide-down flex items-start gap-3 py-3 px-4 border-l-4 min-w-[280px] max-w-[420px] pointer-events-auto',
        borderClass
      )}
    >
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1">
        <div className="text-sm font-semibold text-foreground">
          {title}
        </div>
        {message && (
          <div className="text-xs text-muted-foreground mt-0.5">
            {message}
          </div>
        )}
      </div>
      <button
        onClick={() => onDismiss(id)}
        className="text-muted-foreground p-0.5 cursor-pointer hover:text-foreground transition-colors"
        aria-label="Đóng thông báo"
      >
        <X size={16} />
      </button>
    </div>
  );
};
