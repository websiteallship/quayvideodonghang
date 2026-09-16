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
    <nav
      className="glass-panel"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 50,
        borderRadius: 0,
        borderLeft: 'none',
        borderRight: 'none',
        borderBottom: 'none'
      }}
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              minWidth: '64px',
              minHeight: '48px',
              color: isActive ? 'var(--color-accent-400)' : 'var(--color-text-muted)',
              textDecoration: 'none',
              position: 'relative'
            })}
          >
            <div style={{ position: 'relative' }}>
              <Icon size={22} />
              {item.badge !== null && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-10px',
                    backgroundColor: 'var(--color-warning)',
                    color: '#000',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    borderRadius: 'var(--radius-full)',
                    minWidth: '16px',
                    height: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px'
                  }}
                >
                  {item.badge}
                </span>
              )}
            </div>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-medium)' }}>
              {item.label}
            </span>
          </NavLink>
        );
      })}
    </nav>
  );
};
