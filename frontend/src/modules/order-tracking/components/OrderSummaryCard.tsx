import React, { useState } from 'react';
import { ShoppingBag, Copy, Check, RefreshCw, FileText, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MerchantBadge } from './MerchantBadge';
import { OrderBadge } from './OrderBadge';
import { syncOrderFromVietful } from '../services/order-tracking-service';
import { showToast } from '@/stores/toast-store';
import type { OrderTrackingInfo } from '../types';

interface OrderSummaryCardProps {
  order?: OrderTrackingInfo | null;
  maVanDon?: string;
  onOrderUpdated?: (order: OrderTrackingInfo) => void;
}

export const OrderSummaryCard: React.FC<OrderSummaryCardProps> = ({
  order,
  maVanDon,
  onOrderUpdated,
}) => {
  const [copied, setCopied] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const targetCode = order?.ma_don_hang || order?.ma_van_don || maVanDon;

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      showToast.success('Đã sao chép mã đơn hàng', text);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast.error('Không thể sao chép');
    }
  };

  const handleSync = async () => {
    if (!targetCode || isSyncing) return;
    setIsSyncing(true);
    showToast.info('Đang đồng bộ trực tiếp từ VietFul API...');

    const res = await syncOrderFromVietful(targetCode, order?.merchant_id || undefined);
    if (res.success && res.data?.order) {
      showToast.success('Đã đồng bộ đơn hàng từ VietFul thành công');
      if (onOrderUpdated) {
        onOrderUpdated(res.data.order);
      }
    } else {
      showToast.error(res.error?.message || 'Không thể đồng bộ từ VietFul');
    }
    setIsSyncing(false);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-3.5 space-y-3 shadow-xs">
      {/* Card Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
          <ShoppingBag size={15} className="text-blue-500" />
          <span>Thông tin đơn hàng &amp; Đối soát</span>
        </div>

        {targetCode && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void handleSync()}
            disabled={isSyncing}
            className="h-7 px-2 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 gap-1 cursor-pointer"
            title="Đồng bộ lại thông tin mới nhất từ VietFul WMS"
          >
            <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'Đang sync...' : 'Đồng bộ VietFul'}</span>
          </Button>
        )}
      </div>

      {order ? (
        <div className="space-y-2.5 text-xs">
          {/* Mã đơn hàng */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Mã đơn hàng sàn:</span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold text-foreground">
                {order.ma_don_hang || '—'}
              </span>
              {order.ma_don_hang && (
                <button
                  type="button"
                  onClick={() => void handleCopy(order.ma_don_hang!)}
                  className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Sao chép"
                >
                  {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                </button>
              )}
            </div>
          </div>

          {/* Nhà bán */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Nhà bán (Merchant):</span>
            <MerchantBadge name={order.nha_ban} />
          </div>

          {/* Trạng thái đơn & Đóng gói */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Trạng thái xử lý:</span>
            <OrderBadge
              status={order.trang_thai_don}
              packingStatus={order.trang_thai_dong_hang}
              returnStatus={order.trang_thai_kiem_hoan}
              warning={order.canh_bao}
            />
          </div>

          {/* Tóm tắt sản phẩm đối soát */}
          {order.san_pham_summary && (
            <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60 flex flex-col gap-1">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                <CheckCircle2 size={11} className="text-emerald-500" />
                Sản phẩm đóng gói (SKU &amp; Số lượng):
              </span>
              <span className="font-mono font-semibold text-xs text-foreground select-all break-words">
                {order.san_pham_summary}
              </span>
            </div>
          )}

          {/* Ghi chú đóng gói từ khách / sàn */}
          {order.ghi_chu_don && (
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2">
              <FileText size={14} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div>
                <span className="font-bold block text-[11px]">Ghi chú đóng gói:</span>
                <p className="mt-0.5 italic">{order.ghi_chu_don}</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 rounded-lg bg-muted/30 border border-border/60 text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            Chưa có thông tin đơn hàng VietFul cho mã vận đơn này.
          </p>
          {targetCode && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleSync()}
              disabled={isSyncing}
              className="h-8 text-xs font-semibold gap-1.5 cursor-pointer"
            >
              <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
              <span>Tìm kiếm trên VietFul</span>
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
