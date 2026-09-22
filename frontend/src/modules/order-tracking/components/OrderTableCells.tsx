import React, { useState } from 'react';
import { Copy, Check, ShoppingBag } from 'lucide-react';
import { MerchantBadge } from './MerchantBadge';
import { OrderBadge } from './OrderBadge';
import type { OrderTrackingInfo } from '../types';

interface OrderTableCellsProps {
  order?: OrderTrackingInfo | null;
  maVanDon?: string;
}

export const OrderTableCells: React.FC<OrderTableCellsProps> = ({ order, maVanDon }) => {
  const [copied, setCopied] = useState(false);

  if (!order) {
    return (
      <>
        <td className="py-3 px-3 text-muted-foreground/50 text-[11px] italic">
          Chưa đồng bộ
        </td>
        <td className="py-3 px-3">
          <span className="text-[11px] text-muted-foreground/60">—</span>
        </td>
      </>
    );
  }

  const handleCopy = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* 1. Cột Đơn hàng & Nhà bán */}
      <td className="py-3 px-3">
        <div className="flex flex-col gap-1">
          {order.ma_don_hang ? (
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold text-xs text-foreground tracking-wide">
                {order.ma_don_hang}
              </span>
              <button
                type="button"
                onClick={(e) => handleCopy(e, order.ma_don_hang!)}
                className="text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer"
                title="Sao chép mã đơn hàng"
              >
                {copied ? (
                  <Check size={12} className="text-emerald-500" />
                ) : (
                  <Copy size={12} className="text-muted-foreground" />
                )}
              </button>
            </div>
          ) : (
            <span className="text-[11px] text-muted-foreground font-mono">{maVanDon}</span>
          )}

          <div className="flex items-center gap-1 flex-wrap">
            <MerchantBadge name={order.nha_ban} />
          </div>
        </div>
      </td>

      {/* 2. Cột Trạng thái đơn & Cảnh báo */}
      <td className="py-3 px-3">
        <div className="flex flex-col gap-1">
          <OrderBadge
            status={order.trang_thai_don}
            packingStatus={order.trang_thai_dong_hang}
            returnStatus={order.trang_thai_kiem_hoan}
            warning={order.canh_bao}
          />
          {order.san_pham_summary && order.san_pham_summary !== 'Chưa có thông tin SKU' && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono truncate max-w-[200px]" title={order.san_pham_summary}>
              <ShoppingBag size={11} className="shrink-0 opacity-70" />
              <span className="truncate">{order.san_pham_summary}</span>
            </div>
          )}
        </div>
      </td>
    </>
  );
};
