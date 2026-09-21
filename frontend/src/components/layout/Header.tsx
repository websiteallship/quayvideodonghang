import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Video, Wifi, WifiOff, LogOut, User, Sun, Moon, Settings, UploadCloud, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useConfigStore } from '@/stores/config-store';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { InstallPWAButton } from '@/components/pwa/InstallPWAButton';

export const Header: React.FC = () => {
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuthStore();
  const { isOnline, theme, toggleTheme, warehouseName } = useConfigStore();
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);

  const getPageTitle = (pathname: string) => {
    switch (pathname) {
      case '/':
        return 'Quét & Quay Video';
      case '/queue':
        return 'Hàng Đợi Đồng Bộ';
      case '/history':
        return 'Lịch Sử Biên Bản';
      case '/settings':
        return 'Cài Đặt Hệ Thống';
      case '/admin/settings':
        return 'Cấu Hình Hệ Thống';
      case '/admin/carriers':
        return 'Đơn Vị Vận Chuyển';
      case '/admin/employees':
        return 'Quản Lý Nhân Viên';
      default:
        return 'Kho Vận';
    }
  };

  return (
    <header className="sticky top-0 z-40 h-14 sm:h-[60px] lg:h-16 px-3.5 sm:px-6 lg:px-8 flex items-center justify-between border-b border-border bg-card/60 backdrop-blur-md shrink-0 select-none">
      {/* Mobile Brand Header */}
      <div className="flex lg:hidden items-center gap-2 min-w-0 shrink-0">
        <div className="size-8 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-2xs shrink-0">
          <Video size={17} className="stroke-[2.2]" />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-foreground tracking-tight whitespace-nowrap">
            Quay Video Kho
          </h1>
        </div>
      </div>

      {/* Desktop Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="hidden lg:flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <Link to="/" className="hover:text-foreground transition-colors">
          Kho Vận
        </Link>
        <span>/</span>
        <span className="text-foreground">{getPageTitle(location.pathname)}</span>
      </nav>

      {/* Header Right Action Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Install PWA Button */}
        <InstallPWAButton />

        {/* Dark / Light Mode Toggle Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          title={theme === 'light' ? 'Chuyển sang giao diện tối' : 'Chuyển sang giao diện sáng'}
          aria-label="Đổi giao diện sáng/tối"
          className="size-8 sm:size-9 rounded-full border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted shadow-2xs shrink-0"
        >
          {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
        </Button>

        {/* Network Status Badge (Desktop / Tablet) */}
        <div
          title={isOnline ? 'Đang kết nối mạng' : 'Mất kết nối — Chế độ Offline'}
          className={`hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-full border text-xs font-semibold select-none shrink-0 transition-colors ${
            isOnline
              ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/25'
              : 'text-destructive bg-destructive/10 border-destructive/30 animate-pulse'
          }`}
        >
          <span
            className={`size-2 rounded-full shrink-0 ${
              isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-destructive'
            }`}
          />
          {isOnline ? (
            <Wifi size={13} className="hidden md:inline" />
          ) : (
            <WifiOff size={13} className="shrink-0" />
          )}
          <span>{isOnline ? 'Online' : 'Offline'}</span>
        </div>

        {/* User Avatar & Dropdown Menu */}
        {isAuthenticated && user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                title={`Tài khoản: ${user.ma_nhan_vien} (${isOnline ? 'Online' : 'Offline'})`}
                aria-label="Menu tài khoản người dùng"
                className="relative size-8 sm:size-9 rounded-full border-border bg-card hover:bg-muted text-foreground flex items-center justify-center shadow-2xs cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/30 shrink-0"
              >
                <div className="size-6 sm:size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                  <User size={14} className="sm:w-[15px] sm:h-[15px]" />
                </div>

                {/* Mobile Online / Offline Dot Indicator */}
                <span
                  className={`sm:hidden absolute -top-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-card ${
                    isOnline ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                  }`}
                  aria-hidden="true"
                />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-64 p-2 bg-card text-card-foreground border-border shadow-xl rounded-2xl">
              {/* User profile summary */}
              <div className="flex items-center gap-3 p-2.5 bg-muted/40 rounded-xl border border-border/60">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                  {user.ma_nhan_vien ? user.ma_nhan_vien.slice(0, 2).toUpperCase() : 'AD'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs text-foreground truncate">
                    {user.ten || user.ma_nhan_vien}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] font-mono font-bold text-muted-foreground">
                      {user.ma_nhan_vien}
                    </span>
                    <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      {user.vai_tro === 'admin' ? 'Quản trị viên' : 'Nhân viên'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Warehouse branch info */}
              {warehouseName && (
                <div className="px-2.5 py-1.5 mt-1 text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="truncate">{warehouseName}</span>
                </div>
              )}

              <DropdownMenuSeparator className="my-1.5" />

              {/* Quick links */}
              <DropdownMenuItem asChild>
                <Link to="/settings" className="flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer w-full text-xs">
                  <Settings size={14} className="text-muted-foreground" />
                  <span>Cài đặt hệ thống</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link to="/queue" className="flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer w-full text-xs">
                  <UploadCloud size={14} className="text-muted-foreground" />
                  <span>Hàng đợi tải lên</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-1.5" />

              {/* Logout action */}
              <DropdownMenuItem
                onClick={() => setIsLogoutOpen(true)}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer font-semibold text-xs"
              >
                <LogOut size={14} className="text-destructive" />
                <span>Đăng xuất</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <AlertDialog open={isLogoutOpen} onOpenChange={setIsLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="text-destructive h-5 w-5" />
              Xác nhận đăng xuất
            </AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn đăng xuất khỏi hệ thống? Các video đang chờ tải lên vẫn được lưu lại an toàn trên thiết bị và sẽ được tiếp tục đồng bộ khi bạn hoặc ai đó đăng nhập lại.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
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
    </header>
  );
};
