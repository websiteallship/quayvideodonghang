import React from 'react';
import { MerchantBadge } from './MerchantBadge';
import { OrderBadge } from './OrderBadge';
import { AlertTriangle } from 'lucide-react';
import type { OrderTrackingInfo } from '../types';

interface OrderMobileTagProps {
  order?: OrderTrackingInfo | null;
}

export const OrderMobileTag: React.FC<OrderMobileTagProps> = ({ order }) => {
  if (!order) return null;

  const isCancelled = order.canh_bao === 'DON_HUY';

  return (
    <div className="flex flex-col gap-1.5 pt-1 border-t border-border/50">
      {/* Cảnh báo đơn hủy nổi bật trên mobile */}
      {isCancelled && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold animate-pulse">
          <AlertTriangle size={13} className="shrink-0" />
          <span>CẢNH BÁO: ĐƠN HÀNG ĐÃ BỊ HỦY TRÊN SÀN</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">Mã ĐH:</span>
          <span className="font-mono font-bold text-foreground">
            {order.ma_don_hang || '—'}
          </span>
        </div>
        <MerchantBadge name={order.nha_ban} />
      </div>

      <OrderBadge
        status={order.trang_thai_don}
        packingStatus={order.trang_thai_dong_hang}
        returnStatus={order.trang_thai_kiem_hoan}
        warning={order.canh_bao}
      />

      {order.san_pham_summary && order.san_pham_summary !== 'Chưa có thông tin SKU' && (
        <p className="text-[11px] text-muted-foreground font-mono truncate" title={order.san_pham_summary}>
          SP: {order.san_pham_summary}
        </p>
      )}
    </div>
  );
};
