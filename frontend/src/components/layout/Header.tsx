import React from 'react';
import { Video, Wifi, WifiOff, LogOut, User, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useConfigStore } from '@/stores/config-store';
import { Button } from '../ui/Button';

export const Header: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuthStore();
  const { isOnline, theme, toggleTheme } = useConfigStore();

  return (
    <header
      className="glass-panel"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        height: '60px',
        padding: '0 var(--space-4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 0,
        borderLeft: 'none',
        borderRight: 'none',
        borderTop: 'none'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--color-primary-600) 0%, var(--color-accent-500) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff'
          }}
        >
          <Video size={20} />
        </div>
        <div>
          <h1 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-bold)', color: 'var(--color-text-primary)' }}>
            Quay Video Kho
          </h1>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title={theme === 'light' ? 'Chuyển sang giao diện tối' : 'Chuyển sang giao diện sáng'}
          aria-label="Đổi giao diện sáng/tối"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-secondary)',
            backgroundColor: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            cursor: 'pointer'
          }}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* Network Status Badge */}
        <div
          title={isOnline ? 'Đang kết nối mạng' : 'Mất kết nối — Chế độ Offline'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: 'var(--text-xs)',
            color: isOnline ? 'var(--color-success)' : 'var(--color-error)'
          }}
        >
          {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
          <span style={{ display: 'none' }}>{isOnline ? 'Online' : 'Offline'}</span>
        </div>

        {/* User Info & Logout */}
        {isAuthenticated && user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 8px',
                backgroundColor: 'var(--color-bg-card)',
                borderRadius: 'var(--radius-full)',
                fontSize: 'var(--text-xs)',
                border: '1px solid var(--color-border)'
              }}
            >
              <User size={14} color="var(--color-accent-400)" />
              <span style={{ fontWeight: 'var(--font-semibold)', color: 'var(--color-text-primary)' }}>
                {user.ma_nhan_vien}
              </span>
            </div>
            <Button
              variant="icon"
              size="icon"
              onClick={logout}
              title="Đăng xuất"
              aria-label="Đăng xuất"
              style={{ width: '36px', height: '36px', minHeight: '36px' }}
            >
              <LogOut size={16} />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};
