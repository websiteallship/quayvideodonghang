import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: 'var(--color-bg-primary)',
        color: 'var(--color-text-primary)'
      }}
    >
      <Header />
      <main
        style={{
          flex: 1,
          padding: 'var(--space-4)',
          paddingBottom: '80px', // Đệm để không bị BottomNav che
          maxWidth: '1200px',
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box'
        }}
      >
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
};
