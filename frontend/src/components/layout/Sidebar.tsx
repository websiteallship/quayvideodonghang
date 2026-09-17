import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Video,
  ScanLine,
  UploadCloud,
  History,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useConfigStore } from '@/stores/config-store';
import { useUploadStore } from '@/stores/upload-store';

export const Sidebar: React.FC = () => {
  const { sidebarCollapsed, setSidebarCollapsed } = useConfigStore();
  const { queue } = useUploadStore();

  const pendingCount = queue.filter(
    (q) => q.status === 'cho_upload' || q.status === 'dang_upload'
  ).length;

  const navItems = [
    { to: '/', label: 'Quét & Quay', icon: ScanLine },
    {
      to: '/queue',
      label: 'Hàng đợi',
      icon: UploadCloud,
      badge: pendingCount > 0 ? pendingCount : null,
    },
    { to: '/history', label: 'Lịch sử', icon: History },
    { to: '/settings', label: 'Cài đặt', icon: Settings },
  ];

  return (
    <aside
      aria-label="Thanh điều hướng Desktop"
      className={`hidden lg:flex border-r border-border bg-card/60 flex-col shrink-0 select-none transition-all duration-300 relative ${
        sidebarCollapsed ? 'w-20' : 'w-56 xl:w-60'
      }`}
    >
      {/* Sidebar Brand Header with Collapse / Expand button at top */}
      <div
        className={`h-16 px-4 flex items-center justify-between border-b border-border ${
          sidebarCollapsed ? 'justify-center' : ''
        }`}
      >
        {!sidebarCollapsed ? (
          <>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <Video size={18} className="stroke-[2.2]" />
              </div>
              <span className="text-[15px] font-bold tracking-tight text-emerald-600 dark:text-emerald-400 truncate">
                Quay Video Kho
              </span>
            </div>
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Thu gọn menu sidebar"
              aria-label="Thu gọn menu sidebar"
            >
              <PanelLeftClose size={18} />
            </button>
          </>
        ) : (
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="p-2 rounded-xl text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 transition-all flex items-center justify-center cursor-pointer"
            title="Mở rộng menu sidebar"
            aria-label="Mở rộng menu sidebar"
          >
            <PanelLeftOpen size={20} className="text-emerald-600 dark:text-emerald-400" />
          </button>
        )}
      </div>

      {/* Sidebar Navigation Items */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1.5">
        {!sidebarCollapsed && (
          <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
            Chức năng
          </div>
        )}

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              title={sidebarCollapsed ? item.label : undefined}
              className={({ isActive }) =>
                `group relative flex items-center rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  sidebarCollapsed
                    ? 'justify-center h-12 w-full px-0'
                    : 'justify-between px-3.5 py-2.5 w-full'
                } ${
                  isActive
                    ? 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon
                      size={18}
                      className={`shrink-0 transition-colors ${
                        isActive
                          ? 'text-amber-500'
                          : 'text-muted-foreground group-hover:text-foreground'
                      }`}
                    />
                    {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </div>

                  {!sidebarCollapsed && (
                    <div className="flex items-center gap-1.5">
                      {item.badge !== null && item.badge !== undefined && (
                        <span className="bg-amber-500 text-white font-bold text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                          {item.badge}
                        </span>
                      )}
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                    </div>
                  )}

                  {sidebarCollapsed && item.badge !== null && item.badge !== undefined && (
                    <span className="absolute top-1.5 right-1.5 bg-amber-500 text-white font-bold text-[9px] rounded-full w-4 h-4 flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Sidebar Bottom Footer */}
      <div className="p-3 border-t border-border flex items-center justify-center text-[11px] text-muted-foreground">
        {!sidebarCollapsed ? (
          <div className="w-full flex items-center justify-between">
            <span>Hệ thống kho vận</span>
            <span className="font-mono font-semibold">v1.0.0</span>
          </div>
        ) : (
          <span className="font-mono text-[10px] font-bold text-muted-foreground/80">v1.0</span>
        )}
      </div>
    </aside>
  );
};
