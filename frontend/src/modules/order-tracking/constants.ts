import { CanhBaoType } from './types';

export interface WarningConfig {
  label: string;
  color: string;
  badgeClass: string;
  alertClass: string;
  description: string;
}

export const WARNING_CONFIGS: Record<CanhBaoType, WarningConfig | null> = {
  NONE: null,
  DON_HUY: {
    label: 'ĐƠN ĐÃ HỦY',
    color: 'rose',
    badgeClass: 'bg-rose-500/15 text-rose-600 border-rose-500/30 dark:text-rose-400 dark:border-rose-500/40',
    alertClass: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200',
    description: 'Đơn hàng này đã bị hủy trên sàn/VietFul. Tuyệt đối không xuất hàng hoặc cần thu hồi gấp!',
  },
  QUET_TRUNG: {
    label: 'QUÉT TRÙNG',
    color: 'amber',
    badgeClass: 'bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400 dark:border-amber-500/40',
    alertClass: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200',
    description: 'Mã này đã có video quay trước đó. Vui lòng kiểm tra lại thời gian và nhân viên ghi hình.',
  },
  HOLD_DON: {
    label: 'HOLD ĐƠN',
    color: 'orange',
    badgeClass: 'bg-orange-500/15 text-orange-600 border-orange-500/30 dark:text-orange-400 dark:border-orange-500/40',
    alertClass: 'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-900 text-orange-800 dark:text-orange-200',
    description: 'Đơn hàng đang bị tạm giữ xử lý hoặc có sự cố hoãn giao từ đối tác vận chuyển.',
  },
  DANG_HOAN: {
    label: 'CHỜ KIỂM HOÀN',
    color: 'violet',
    badgeClass: 'bg-violet-500/15 text-violet-600 border-violet-500/30 dark:text-violet-400 dark:border-violet-500/40',
    alertClass: 'bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-900 text-violet-800 dark:text-violet-200',
    description: 'Kiện hàng hoàn trả về kho đang chờ nhân viên kiểm tra tình trạng hàng hóa.',
  },
};

export function getOrderStatusBadge(status?: string | null): { label: string; className: string } {
  if (!status) {
    return {
      label: 'Chờ đóng gói',
      className: 'bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-400',
    };
  }

  const s = status.toUpperCase();
  if (s.includes('CANCEL') || s === 'DA_HUY') {
    return {
      label: 'Đã hủy',
      className: 'bg-rose-500/10 text-rose-600 border-rose-500/25 dark:text-rose-400',
    };
  }
  if (s === 'OR_PACKED' || s === 'DA_DONG_GOI') {
    return {
      label: 'Đã đóng gói',
      className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25 dark:text-emerald-400',
    };
  }
  if (s === 'OR_PICKED') {
    return {
      label: 'Đã lấy hàng',
      className: 'bg-sky-500/10 text-sky-600 border-sky-500/25 dark:text-sky-400',
    };
  }
  if (s === 'OR_SHIPPED') {
    return {
      label: 'Đang giao',
      className: 'bg-blue-500/10 text-blue-600 border-blue-500/25 dark:text-blue-400',
    };
  }
  if (s === 'OR_DELIVERED') {
    return {
      label: 'Đã giao hàng',
      className: 'bg-teal-500/10 text-teal-600 border-teal-500/25 dark:text-teal-400',
    };
  }
  if (s === 'OR_RETURNED' || s === 'DA_HOAN') {
    return {
      label: 'Hàng hoàn',
      className: 'bg-violet-500/10 text-violet-600 border-violet-500/25 dark:text-violet-400',
    };
  }
  if (s === 'OR_DELAY') {
    return {
      label: 'Hoãn giao',
      className: 'bg-amber-500/10 text-amber-600 border-amber-500/25 dark:text-amber-400',
    };
  }

  return {
    label: status,
    className: 'bg-muted text-muted-foreground border-border',
  };
}

export function getMerchantBadgeColor(merchantName?: string | null): string {
  if (!merchantName) {
    return 'bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-400';
  }

  const hash = Array.from(merchantName).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const palettes = [
    'bg-indigo-500/10 text-indigo-600 border-indigo-500/25 dark:text-indigo-400',
    'bg-amber-500/10 text-amber-600 border-amber-500/25 dark:text-amber-400',
    'bg-teal-500/10 text-teal-600 border-teal-500/25 dark:text-teal-400',
    'bg-purple-500/10 text-purple-600 border-purple-500/25 dark:text-purple-400',
    'bg-cyan-500/10 text-cyan-600 border-cyan-500/25 dark:text-cyan-400',
  ];

  return palettes[hash % palettes.length];
}
