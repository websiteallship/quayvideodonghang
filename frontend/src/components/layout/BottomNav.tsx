import React from 'react';
import { NavLink } from 'react-router-dom';
import { ScanLine, UploadCloud, History, Settings } from 'lucide-react';
import { useUploadStore } from '@/stores/upload-store';
import { useConfigStore } from '@/stores/config-store';

export const BottomNav: React.FC = () => {
  const { queue } = useUploadStore();
  const { isRecordingActive } = useConfigStore();
  const pendingCount = queue.filter(q => q.status === 'cho_upload' || q.status === 'dang_upload').length;

  // Ẩn hoàn toàn BottomNav khi đang quay video
  if (isRecordingActive) {
    return null;
  }

  const navItems = [
    { to: '/', label: 'Quét & Quay', icon: ScanLine },
    { to: '/queue', label: 'Hàng đợi', icon: UploadCloud, badge: pendingCount > 0 ? pendingCount : null },
    { to: '/history', label: 'Lịch sử', icon: History },
    { to: '/settings', label: 'Cài đặt', icon: Settings }
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 flex items-center justify-around z-50 border-t border-border bg-background/90 backdrop-blur-md">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 min-w-[64px] min-h-[48px] text-xs font-medium transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`
            }
          >
            <div className="relative">
              <Icon size={22} />
              {item.badge !== null && (
                <span className="absolute -top-1.5 -right-2.5 bg-amber-500 text-white font-bold text-[10px] rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                  {item.badge}
                </span>
              )}
            </div>
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};
