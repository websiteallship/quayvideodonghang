import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';
import { useConfigStore } from '@/stores/config-store';
import { useUploadStore } from '@/stores/upload-store';

export const AppShell: React.FC = () => {
  const { setIsOnline } = useConfigStore();
  const { loadQueue } = useUploadStore();

  useEffect(() => {
    // Lắng nghe sự kiện Online / Offline
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Tải hàng đợi ban đầu từ IndexedDB
    loadQueue();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setIsOnline, loadQueue]);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 pt-3 lg:pt-6 pb-24 lg:pb-8 box-border min-w-0">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
};
