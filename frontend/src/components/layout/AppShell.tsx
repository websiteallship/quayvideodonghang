import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';
import { useConfigStore } from '@/stores/config-store';
import { useUploadStore } from '@/stores/upload-store';
import { Spinner } from '@/components/ui/Spinner';

export const AppShell: React.FC = () => {
  const { setIsOnline, fetchSystemConfig, fetchWarehouses } = useConfigStore();
  const { loadQueue } = useUploadStore();
  const location = useLocation();
  const [isPageLoading, setIsPageLoading] = useState(false);

  useEffect(() => {
    // Hiển thị loading spinner ngắn khi chuyển đổi giữa các trang
    setIsPageLoading(true);
    const timer = setTimeout(() => {
      setIsPageLoading(false);
    }, 220);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  useEffect(() => {
    // Lắng nghe sự kiện Online / Offline
    const handleOnline = () => {
      setIsOnline(true);
      void fetchSystemConfig();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Tải hàng đợi ban đầu từ IndexedDB và đồng bộ cấu hình hệ thống
    loadQueue();
    void fetchSystemConfig();
    void fetchWarehouses();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setIsOnline, loadQueue, fetchSystemConfig, fetchWarehouses]);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background text-foreground">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 pt-3 lg:pt-5 lg:pb-4 box-border min-w-0 overflow-y-auto relative flex flex-col after:content-[''] after:block after:h-44 after:shrink-0 lg:after:h-0">
          {isPageLoading ? (
            <div className="flex flex-col w-full h-full min-h-[50vh] items-center justify-center gap-3 animate-fade-in">
              <Spinner size={36} className="text-primary" />
              <span className="text-xs font-medium text-muted-foreground tracking-wide">
                Đang tải trang...
              </span>
            </div>
          ) : (
            <React.Suspense 
              fallback={
                <div className="flex flex-col w-full h-full min-h-[50vh] items-center justify-center gap-3 animate-fade-in">
                  <Spinner size={36} className="text-primary" />
                  <span className="text-xs font-medium text-muted-foreground tracking-wide">
                    Đang tải trang...
                  </span>
                </div>
              }
            >
              <div key={location.pathname} className="page-enter-active w-full flex-1 flex flex-col min-h-0">
                <Outlet />
              </div>
            </React.Suspense>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
};
