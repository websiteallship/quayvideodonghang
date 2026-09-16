import React from 'react';
import { cn } from '@/utils/cn';
import { UploadStatus } from '@/types';
import { CheckCircle2, Clock, AlertCircle, RefreshCw } from 'lucide-react';

export interface BadgeProps {
  status: UploadStatus | 'default';
  label?: string;
  icon?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, label, icon, className }) => {
  let defaultIcon: React.ReactNode = null;
  let defaultLabel = label;
  let statusClass = '';

  switch (status) {
    case 'da_upload':
      statusClass = 'badge-success';
      defaultLabel = defaultLabel || 'Đã lưu';
      defaultIcon = <CheckCircle2 size={13} />;
      break;
    case 'cho_upload':
      statusClass = 'badge-warning';
      defaultLabel = defaultLabel || 'Chờ tải';
      defaultIcon = <Clock size={13} />;
      break;
    case 'dang_upload':
      statusClass = 'badge-info';
      defaultLabel = defaultLabel || 'Đang tải';
      defaultIcon = <RefreshCw size={13} className="animate-spin" />;
      break;
    case 'loi':
      statusClass = 'badge-error';
      defaultLabel = defaultLabel || 'Lỗi';
      defaultIcon = <AlertCircle size={13} />;
      break;
    default:
      statusClass = 'badge-info';
      defaultLabel = defaultLabel || 'Thông tin';
  }

  return (
    <span className={cn('badge', statusClass, className)}>
      {icon !== undefined ? icon : defaultIcon}
      <span>{defaultLabel}</span>
    </span>
  );
};
