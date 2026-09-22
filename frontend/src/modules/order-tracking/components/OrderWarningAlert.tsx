import React from 'react';
import { AlertTriangle, Copy, PauseCircle, CornerDownLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WARNING_CONFIGS } from '../constants';
import type { OrderTrackingInfo } from '../types';

interface OrderWarningAlertProps {
  order?: OrderTrackingInfo | null;
  className?: string;
}

export const OrderWarningAlert: React.FC<OrderWarningAlertProps> = ({ order, className }) => {
  if (!order || !order.canh_bao || order.canh_bao === 'NONE') {
    return null;
  }

  const config = WARNING_CONFIGS[order.canh_bao];
  if (!config) return null;

  const renderIcon = () => {
    switch (order.canh_bao) {
      case 'DON_HUY':
        return <AlertTriangle size={18} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />;
      case 'QUET_TRUNG':
        return <Copy size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />;
      case 'HOLD_DON':
        return <PauseCircle size={18} className="text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />;
      case 'DANG_HOAN':
        return <CornerDownLeft size={18} className="text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />;
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        'p-3.5 rounded-xl border flex items-start gap-3 shadow-xs transition-all',
        config.alertClass,
        className
      )}
    >
      {renderIcon()}
      <div className="flex-1 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-extrabold tracking-wide uppercase">{config.label}</span>
          {order.ma_don_hang && (
            <span className="font-mono font-semibold px-1.5 py-0.2 rounded bg-black/5 dark:bg-white/10">
              Đơn: {order.ma_don_hang}
            </span>
          )}
        </div>
        <p className="mt-1 font-medium leading-relaxed opacity-90">{config.description}</p>
        {order.ghi_chu_don && (
          <p className="mt-1 text-[11px] italic opacity-85">
            Ghi chú từ sàn: &quot;{order.ghi_chu_don}&quot;
          </p>
        )}
      </div>
    </div>
  );
};
