import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getOrderStatusBadge, WARNING_CONFIGS } from '../constants';
import { CanhBaoType, TrangThaiDongHang, TrangThaiKiemHoan } from '../types';
import { AlertTriangle, Copy, PauseCircle, CornerDownLeft, PackageCheck, PackageOpen } from 'lucide-react';

interface OrderBadgeProps {
  status?: string | null;
  packingStatus?: TrangThaiDongHang | null;
  returnStatus?: TrangThaiKiemHoan | null;
  warning?: CanhBaoType | null;
  className?: string;
}

export const OrderBadge: React.FC<OrderBadgeProps> = ({
  status,
  packingStatus,
  returnStatus,
  warning,
  className,
}) => {
  const statusInfo = getOrderStatusBadge(status);
  const warningConfig = warning ? WARNING_CONFIGS[warning] : null;

  const renderWarningIcon = () => {
    switch (warning) {
      case 'DON_HUY':
        return <AlertTriangle size={11} className="shrink-0" />;
      case 'QUET_TRUNG':
        return <Copy size={11} className="shrink-0" />;
      case 'HOLD_DON':
        return <PauseCircle size={11} className="shrink-0" />;
      case 'DANG_HOAN':
        return <CornerDownLeft size={11} className="shrink-0" />;
      default:
        return null;
    }
  };

  return (
    <div className={cn('flex items-center gap-1.5 flex-wrap', className)}>
      {/* 1. Trạng thái đơn hàng VietFul / Sàn */}
      <Badge
        variant="outline"
        className={cn(
          'text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full border shadow-none',
          statusInfo.className
        )}
      >
        {statusInfo.label}
      </Badge>

      {/* 2. Trạng thái đóng hàng / kiểm hoàn */}
      {packingStatus === 'da_dong' && (
        <Badge
          variant="outline"
          className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border-emerald-500/25 dark:text-emerald-400 gap-1 shadow-none"
        >
          <PackageCheck size={10} />
          <span>Đã đóng</span>
        </Badge>
      )}

      {returnStatus && returnStatus !== 'khong_ap_dung' && (
        <Badge
          variant="outline"
          className={cn(
            'text-[10px] font-semibold px-2 py-0.5 rounded gap-1 shadow-none',
            returnStatus === 'chua_kiem'
              ? 'bg-purple-500/10 text-purple-600 border-purple-500/25 dark:text-purple-400'
              : returnStatus === 'da_kiem_tot'
              ? 'bg-sky-500/10 text-sky-600 border-sky-500/25 dark:text-sky-400'
              : 'bg-rose-500/10 text-rose-600 border-rose-500/25 dark:text-rose-400'
          )}
        >
          <PackageOpen size={10} />
          <span>
            {returnStatus === 'chua_kiem'
              ? 'Chờ kiểm hoàn'
              : returnStatus === 'da_kiem_tot'
              ? 'Đã kiểm tốt'
              : 'Đã kiểm hỏng'}
          </span>
        </Badge>
      )}

      {/* 3. Cảnh báo nghiệp vụ nếu có */}
      {warningConfig && (
        <Badge
          variant="outline"
          className={cn(
            'text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border shadow-xs inline-flex items-center gap-1 animate-pulse',
            warningConfig.badgeClass
          )}
        >
          {renderWarningIcon()}
          <span>{warningConfig.label}</span>
        </Badge>
      )}
    </div>
  );
};
