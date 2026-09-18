import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  ScanLine,
  UploadCloud,
  History,
  Settings,
  Menu,
  Settings2,
  Users,
  Truck,
  Building2,
} from 'lucide-react';
import { useUploadStore } from '@/stores/upload-store';
import { useConfigStore } from '@/stores/config-store';
import { useAuthStore } from '@/stores/auth-store';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

export const BottomNav: React.FC = () => {
  const { queue } = useUploadStore();
  const { isRecordingActive } = useConfigStore();
  const { user } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);

  const isAdmin = user?.vai_tro === 'admin';

  const pendingCount = queue.filter(
    (q) => q.status === 'cho_upload' || q.status === 'dang_upload'
  ).length;

  // Ẩn hoàn toàn BottomNav khi đang quay video
  if (isRecordingActive) {
    return null;
  }

  const baseNavItems = [
    { to: '/', label: 'Quét & Quay', icon: ScanLine },
    {
      to: '/queue',
      label: 'Hàng đợi',
      icon: UploadCloud,
      badge: pendingCount > 0 ? pendingCount : null,
    },
    { to: '/history', label: 'Lịch sử', icon: History },
  ];

  const adminMenuItems = [
    { to: '/admin/settings', label: 'Cấu hình hệ thống', icon: Settings2 },
    { to: '/admin/warehouses', label: 'Quản lý kho', icon: Building2 },
    { to: '/admin/carriers', label: 'Đơn vị vận chuyển', icon: Truck },
    { to: '/admin/employees', label: 'Quản lý nhân viên', icon: Users },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 flex items-center justify-around z-50 border-t border-border bg-background/90 backdrop-blur-md">
      {baseNavItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 min-w-[64px] min-h-[48px] text-xs font-medium transition-colors ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`
            }
          >
            <div className="relative">
              <Icon size={22} />
              {item.badge !== null && item.badge !== undefined && (
                <span className="absolute -top-1.5 -right-2.5 bg-amber-500 text-white font-bold text-[10px] rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                  {item.badge}
                </span>
              )}
            </div>
            <span>{item.label}</span>
          </NavLink>
        );
      })}

      {!isAdmin ? (
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 min-w-[64px] min-h-[48px] text-xs font-medium transition-colors ${
              isActive
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`
          }
        >
          <Settings size={22} />
          <span>Cài đặt</span>
        </NavLink>
      ) : (
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center justify-center gap-0.5 min-w-[64px] min-h-[48px] text-xs font-medium transition-colors text-muted-foreground hover:text-foreground outline-none cursor-pointer">
              <Menu size={22} />
              <span>Menu</span>
            </button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader className="mb-4">
              <SheetTitle>Menu Quản Trị</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-2 gap-3 overflow-y-auto pb-6">
              {adminMenuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex flex-col items-center justify-center gap-2.5 p-4 rounded-xl border transition-all ${
                        isActive
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      }`
                    }
                  >
                    <Icon size={24} />
                    <span className="text-xs font-semibold text-center leading-tight">
                      {item.label}
                    </span>
                  </NavLink>
                );
              })}
              <NavLink
                to="/settings"
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-2.5 p-4 rounded-xl border transition-all col-span-2 ${
                    isActive
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  }`
                }
              >
                <Settings size={24} />
                <span className="text-xs font-semibold text-center">
                  Cài đặt cá nhân
                </span>
              </NavLink>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </nav>
  );
};
