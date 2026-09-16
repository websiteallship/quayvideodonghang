import React, { useState } from 'react';
import { Camera, Smartphone, ShieldCheck, Database, Sun, Moon, MapPin, Building2 } from 'lucide-react';
import { useCameraStore } from '@/stores/camera-store';
import { useConfigStore } from '@/stores/config-store';
import { useGeolocation } from '@/hooks/use-geolocation';
import { APP_CONFIG } from '@/config/constants';

export const SettingsPage: React.FC = () => {
  const { facingMode, toggleFacing, selectedDeviceId } = useCameraStore();
  const { theme, toggleTheme, warehouseName, setWarehouseName } = useConfigStore();
  const { coords, isLoading: gpsLoading, error: gpsError, requestLocation, clearCache } = useGeolocation();
  const [warehouseInput, setWarehouseInput] = useState(warehouseName);

  const handleWarehouseSave = () => {
    setWarehouseName(warehouseInput.trim());
  };

  return (
    <div className="page-stack">
      <div>
        <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)' }}>
          Cài đặt hệ thống
        </h2>
        <p className="text-xs-secondary">
          Cấu hình thiết bị, camera và vị trí kho vận
        </p>
      </div>

      <div className="glass-panel" style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {/* Theme Settings */}
        <div className="settings-row">
          {theme === 'light' ? (
            <Sun size={20} color="var(--color-accent-400)" />
          ) : (
            <Moon size={20} color="var(--color-accent-400)" />
          )}
          <div className="settings-row__info">
            <div className="settings-row__title">Giao diện hiển thị</div>
            <div className="settings-row__desc">
              {theme === 'light' ? 'Giao diện sáng (Light Mode — Tối ưu kho)' : 'Giao diện tối (Dark Mode)'}
            </div>
          </div>
          <button
            className="btn btn-secondary btn-compact"
            onClick={toggleTheme}
          >
            {theme === 'light' ? 'Chuyển Dark' : 'Chuyển Light'}
          </button>
        </div>

        {/* Warehouse Name */}
        <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 'var(--space-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <Building2 size={20} color="var(--color-accent-400)" />
            <div className="settings-row__info">
              <div className="settings-row__title">Tên kho / Chi nhánh</div>
              <div className="settings-row__desc">
                Hiển thị trên watermark video (cháy vào file)
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', paddingLeft: '32px' }}>
            <input
              type="text"
              className="input-field"
              placeholder="VD: Kho Quận 7 - HCM"
              value={warehouseInput}
              onChange={(e) => setWarehouseInput(e.target.value)}
              onBlur={handleWarehouseSave}
              onKeyDown={(e) => e.key === 'Enter' && handleWarehouseSave()}
              style={{
                flex: 1,
                height: '36px',
                fontSize: 'var(--text-sm)',
              }}
            />
            {warehouseName && (
              <span className="settings-status flex-center">
                Đã lưu
              </span>
            )}
          </div>
        </div>

        {/* GPS Location */}
        <div className="settings-row">
          <MapPin size={20} color="var(--color-accent-400)" />
          <div className="settings-row__info">
            <div className="settings-row__title">Vị trí GPS</div>
            <div className="settings-row__desc">
              {coords
                ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}${coords.address ? ` — ${coords.address}` : ''}`
                : gpsError
                  ? gpsError
                  : 'Chưa xác định (tự động lấy khi quay video)'}
            </div>
          </div>
          <button
            className="btn btn-secondary btn-compact"
            onClick={() => { clearCache(); void requestLocation(); }}
            disabled={gpsLoading}
          >
            {gpsLoading ? 'Đang lấy...' : 'Kiểm tra GPS'}
          </button>
        </div>

        {/* Camera Device */}
        <div className="settings-row">
          <Camera size={20} color="var(--color-accent-400)" />
          <div className="settings-row__info">
            <div className="settings-row__title">Thiết bị Camera</div>
            <div className="settings-row__desc">
              {selectedDeviceId ? `ID: ${selectedDeviceId.slice(0, 16)}...` : 'Tự động chọn (Camera sau)'}
            </div>
          </div>
          <button
            className="btn btn-secondary btn-compact"
            onClick={toggleFacing}
          >
            {facingMode === 'environment' ? 'Camera sau' : 'Camera trước'}
          </button>
        </div>

        {/* Screen Wake Lock */}
        <div className="settings-row">
          <Smartphone size={20} color="var(--color-accent-400)" />
          <div className="settings-row__info">
            <div className="settings-row__title">Chế độ màn hình (Wake Lock)</div>
            <div className="settings-row__desc">
              Giữ màn hình luôn sáng trong suốt quá trình quay video
            </div>
          </div>
          <span className="settings-status">Bật</span>
        </div>

        {/* Offline Storage */}
        <div className="settings-row">
          <Database size={20} color="var(--color-accent-400)" />
          <div className="settings-row__info">
            <div className="settings-row__title">Lưu trữ ngoại tuyến</div>
            <div className="settings-row__desc">
              IndexedDB: {APP_CONFIG.IDB_NAME} (v{APP_CONFIG.IDB_VERSION})
            </div>
          </div>
          <span className="settings-status">Sẵn sàng</span>
        </div>

        {/* PWA Version */}
        <div className="settings-row">
          <ShieldCheck size={20} color="var(--color-accent-400)" />
          <div className="settings-row__info">
            <div className="settings-row__title">Phiên bản PWA</div>
            <div className="settings-row__desc">
              v{APP_CONFIG.VERSION} — HTTPS Secured
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
