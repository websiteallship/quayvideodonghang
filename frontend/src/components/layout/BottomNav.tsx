import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
  LayoutDashboard,
  BookOpen,
  LogOut,
  AlertTriangle,
} from 'lucide-react';
import { useUploadStore } from '@/stores/upload-store';
import { useConfigStore } from '@/stores/config-store';
import { useAuthStore } from '@/stores/auth-store';
import { useOnboardingStore } from '@/stores/onboarding-store';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export const BottomNav: React.FC = () => {
  const { queue } = useUploadStore();
  const { isRecordingActive, warehouseName } = useConfigStore();
  const { user, logout } = useAuthStore();
  const { openGuideModal } = useOnboardingStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const location = useLocation();

  const isAdmin = user?.vai_tro === 'admin';

  const pendingCount = queue.filter(
    (q) => q.status === 'cho_upload' || q.status === 'dang_upload' || q.status === 'loi'
  ).length;

  // Ẩn hoàn toàn BottomNav khi đang quay video
  if (isRecordingActive) {
    return null;
  }

  // Kiểm tra xem menu admin hoặc settings đang active không (để highlight nút Menu)
  const isMenuRouteActive = location.pathname.startsWith('/admin') || location.pathname === '/settings';

  const baseNavItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
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
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-md flex items-center justify-around pt-1 pb-[max(0.6rem,env(safe-area-inset-bottom))] min-h-[calc(4rem+env(safe-area-inset-bottom))]">
      {baseNavItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center gap-0.5 min-w-[64px] min-h-[48px] text-xs font-medium transition-all duration-200 ${
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-muted-foreground hover:text-foreground'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {/* Active indicator bar */}
                {isActive && (
                  <span className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-b-full bg-emerald-500 transition-all" />
                )}
                <div className={`relative p-1 rounded-lg transition-colors ${isActive ? 'bg-emerald-500/10' : ''}`}>
                  <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
                  {item.badge !== null && item.badge !== undefined && (
                    <span className="absolute -top-1 -right-2 bg-amber-500 text-white font-bold text-[9px] rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 shadow-sm">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
              </>
            )}
          </NavLink>
        );
      })}

      {/* 5th Unified Menu Sheet Trigger (Gộp Hướng dẫn, Cài đặt, Quản trị) */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetTrigger asChild>
          <button
            aria-label="Mở menu tiện ích và hướng dẫn"
            className={`relative flex flex-col items-center justify-center gap-0.5 min-w-[64px] min-h-[48px] text-xs font-medium transition-all duration-200 outline-none cursor-pointer ${
              isMenuRouteActive
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {isMenuRouteActive && (
              <span className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-b-full bg-emerald-500" />
            )}
            <div className={`p-1 rounded-lg transition-colors ${isMenuRouteActive ? 'bg-emerald-500/10' : ''}`}>
              <Menu size={20} strokeWidth={isMenuRouteActive ? 2.4 : 1.8} />
            </div>
            <span className={`text-[10px] ${isMenuRouteActive ? 'font-bold' : 'font-medium'}`}>Menu</span>
          </button>
        </SheetTrigger>
        <SheetContent side="right" className="flex flex-col gap-4 p-5 max-w-sm w-full">
          <SheetHeader className="mb-1 text-left">
            <SheetTitle className="text-base font-bold flex items-center gap-2">
              <Menu size={18} className="text-primary" />
              <span>{isAdmin ? 'Menu Quản Trị & Tiện Ích' : 'Menu Tiện Ích & Kho'}</span>
            </SheetTitle>
          </SheetHeader>

          {/* Quick User Guide Button (Nổi bật cho cả nhân viên và admin) */}
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              openGuideModal('steps');
            }}
            className="flex items-center gap-3 p-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition-all text-left cursor-pointer shadow-2xs"
          >
            <div className="size-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <BookOpen size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold flex items-center gap-1.5">
                <span>Hướng dẫn thao tác kho</span>
                <span className="text-[10px] font-mono px-1 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300">SOP</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                Xem 4 bước quay, phím tắt & sửa sự cố
              </p>
            </div>
          </button>

          {/* Admin Section if Admin */}
          {isAdmin && (
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                Quản trị hệ thống
              </span>
              <div className="grid grid-cols-2 gap-2">
                {adminMenuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex flex-col items-center justify-center gap-2 p-3 rounded-xl border text-center transition-all ${
                          isActive
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                            : 'border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                        }`
                      }
                    >
                      <Icon size={20} />
                      <span className="text-xs leading-tight">{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          )}

          {/* User Settings NavLink */}
          <NavLink
            to="/settings"
            onClick={() => setMenuOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
                isActive
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'border-border bg-card text-foreground hover:bg-muted/50'
              }`
            }
          >
            <div className="size-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground shrink-0">
              <Settings size={20} />
            </div>
            <div>
              <div className="text-xs font-bold">Cài đặt cá nhân & trạm</div>
              <p className="text-[11px] text-muted-foreground">Tùy chỉnh camera, âm thanh, độ phân giải</p>
            </div>
          </NavLink>

          {/* Station & User Info Card at Bottom */}
          <div className="mt-auto pt-3 border-t border-border flex flex-col gap-2">
            <div className="p-3 rounded-xl bg-muted/40 border border-border/60 flex items-center gap-2.5 text-xs">
              <Building2 size={16} className="text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-muted-foreground block">Kho hiện tại:</span>
                <strong className="text-foreground truncate block">{warehouseName || 'Chưa gán kho'}</strong>
              </div>
            </div>
            {user && (
              <div className="px-1 text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Nhân viên: <strong className="text-foreground">{user.ten}</strong></span>
                <span className="font-mono font-semibold">({user.ma_nhan_vien})</span>
              </div>
            )}

            {/* Logout Action Button (Mobile touch target >= 48px) */}
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setIsLogoutOpen(true);
              }}
              className="mt-1 flex items-center justify-center gap-2 p-3 min-h-[48px] rounded-xl border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 font-bold text-xs transition-colors cursor-pointer"
            >
              <LogOut size={16} />
              <span>Đăng xuất tài khoản</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Logout Confirmation Dialog for Mobile */}
      <AlertDialog open={isLogoutOpen} onOpenChange={setIsLogoutOpen}>
        <AlertDialogContent className="max-w-md w-[92vw] rounded-2xl p-5">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-base font-bold text-left">
              <AlertTriangle className={pendingCount > 0 ? "text-amber-500 h-5 w-5 shrink-0" : "text-destructive h-5 w-5 shrink-0"} />
              Xác nhận đăng xuất
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-left text-xs text-muted-foreground mt-2">
                {pendingCount > 0 ? (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 leading-relaxed space-y-1.5">
                    <div className="font-bold flex items-center gap-1.5 text-amber-900 dark:text-amber-200">
                      <span>Cảnh báo: Còn {pendingCount} video chưa tải lên Google Drive!</span>
                    </div>
                    <div>
                      Toàn bộ video này vẫn được <strong>bảo toàn an toàn tuyệt đối trong IndexedDB</strong> của máy và sẽ tự động tiếp tục tải lên khi có ca làm việc tiếp theo đăng nhập.
                    </div>
                  </div>
                ) : (
                  <p>
                    Bạn có chắc chắn muốn đăng xuất khỏi hệ thống? Cài đặt cá nhân của bạn sẽ được lưu lại riêng biệt cho tài khoản này trên máy.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 justify-end mt-4">
            <AlertDialogCancel className="mt-0">Huỷ</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                setIsLogoutOpen(false);
                logout();
              }}
              className="bg-red-600 text-white hover:bg-red-700 border-transparent shadow-sm"
            >
              Đăng xuất
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </nav>
  );
};
