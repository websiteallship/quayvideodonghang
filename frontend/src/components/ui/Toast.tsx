import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useToastStore } from '@/stores/toast-store';

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
    success: <CheckCircle2 size={18} className="text-emerald-500 shrink-0" aria-hidden="true" />,
    warning: <AlertTriangle size={18} className="text-amber-500 shrink-0" aria-hidden="true" />,
    error: <AlertCircle size={18} className="text-rose-500 shrink-0" aria-hidden="true" />,
    info: <Info size={18} className="text-sky-500 shrink-0" aria-hidden="true" />
  }[type];

  const borderClass = {
    success: 'border-l-emerald-500',
    warning: 'border-l-amber-500',
    error: 'border-l-rose-500',
    info: 'border-l-sky-500'
  }[type];

  return (
    <div
      role="status"
      className={cn(
        'animate-slide-down flex items-start gap-3 py-3 px-4 border-l-4 min-w-[280px] max-w-[420px] pointer-events-auto rounded-r-2xl rounded-l-md shadow-md bg-card/95 backdrop-blur-md border-y border-r border-border/70 text-card-foreground transition-all duration-200',
        borderClass
      )}
    >
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0 pr-1">
        <div className="text-xs font-bold text-foreground leading-snug">
          {title}
        </div>
        {message && (
          <div className="text-[11px] text-muted-foreground mt-0.5 leading-normal break-words">
            {message}
          </div>
        )}
      </div>
      <button
        onClick={() => onDismiss(id)}
        className="text-muted-foreground/80 hover:text-foreground p-1 rounded-md cursor-pointer transition-colors shrink-0 -mr-1 -mt-0.5"
        aria-label="Đóng thông báo"
      >
        <X size={15} aria-hidden="true" />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <Toast
          key={t.id}
          id={t.id}
          type={t.type}
          title={t.title}
          message={t.message}
          onDismiss={dismissToast}
        />
      ))}
    </div>
  );
};
