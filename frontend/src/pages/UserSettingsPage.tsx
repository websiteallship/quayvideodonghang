import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Camera,
  HardDrive,
  ScanBarcode,
  Info,
  MapPin,
  LogOut,
  RefreshCw,
  Check,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useCameraStore } from '@/stores/camera-store';
import { useConfigStore } from '@/stores/config-store';
import { useAuthStore } from '@/stores/auth-store';
import { useUserSettingsStore } from '@/stores/user-settings-store';
import { useGeolocation } from '@/hooks/use-geolocation';
import { APP_CONFIG } from '@/config/constants';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Settings Card wrapper */
function SettingsCard({
  icon: Icon,
  iconColor,
  title,
  badge,
  children,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('rounded-3xl shadow-xs', className)}>
      <CardContent className="flex flex-col gap-5 p-5 md:p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 text-base font-bold text-foreground">
            <Icon className={cn('size-5', iconColor)} aria-hidden="true" />
            <span>{title}</span>
          </div>
          {badge}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

/** Toggle row inside settings cards */
function ToggleRow({
  title,
  description,
  checked,
  onChange,
  id,
  showBorder = false,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  id: string;
  showBorder?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between py-2',
        showBorder && 'border-t border-border/60 pt-3'
      )}
    >
      <div className="min-w-0 flex-1 pr-4">
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-5 shrink-0 accent-primary cursor-pointer"
        aria-label={title}
      />
    </div>
  );
}

/** Info row for Station Info card */
function InfoRow({
  label,
  value,
  mono = false,
  showBorder = true,
}: {
  label: string;
  value: string;
  mono?: boolean;
  showBorder?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between py-2',
        showBorder && 'border-b border-border/60'
      )}
    >
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          'text-xs font-bold text-foreground',
          mono && 'font-mono'
        )}
      >
        {value}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page: UserSettingsPage
// ---------------------------------------------------------------------------
export const UserSettingsPage: React.FC = () => {
  // Global & Device Stores
  const { facingMode, toggleFacing, selectedDeviceId, devices, setDevices, setDevice } =
    useCameraStore();
  const { warehouseName, setWarehouseName, isOnline } = useConfigStore();
  const { user, logout } = useAuthStore();
  const {
    videoResolution,
    setVideoResolution,
    autoRecordAfterScan,
    setAutoRecordAfterScan,
    soundBeepEnabled,
    setSoundBeepEnabled,
  } = useUserSettingsStore();

  const {
    coords,
    isLoading: gpsLoading,
    error: gpsError,
    requestLocation,
    clearCache,
  } = useGeolocation();

  // Local state for warehouse name input
  const [warehouseInput, setWarehouseInput] = useState(warehouseName);
  const [warehouseSaved, setWarehouseSaved] = useState(!!warehouseName);

  // Enumerate camera devices on mount
  useEffect(() => {
    async function enumerate() {
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices.filter((d) => d.kind === 'videoinput');
        setDevices(videoDevices);
      } catch {
        // Permission denied or no devices
      }
    }
    void enumerate();
  }, [setDevices]);

  // Warehouse name save handler
  const handleWarehouseSave = useCallback(() => {
    const trimmed = warehouseInput.trim();
    setWarehouseName(trimmed);
    if (trimmed) {
      setWarehouseSaved(true);
      setTimeout(() => setWarehouseSaved(false), 2000);
    }
  }, [warehouseInput, setWarehouseName]);

  // User info
  const userName = user?.ten ?? 'Nhân viên';
  const userRole = user?.vai_tro === 'admin' ? 'Quản trị viên' : 'Nhân viên';
  const userCode = user?.ma_nhan_vien ?? '---';
  const userInitials = useMemo(() => getInitials(userName), [userName]);

  // Selected camera label
  const selectedCameraLabel = useMemo(() => {
    if (!selectedDeviceId || devices.length === 0) {
      return facingMode === 'environment' ? 'Camera sau (Mặc định)' : 'Camera trước';
    }
    const found = devices.find((d) => d.deviceId === selectedDeviceId);
    return found?.label || `Device ${selectedDeviceId.slice(0, 8)}...`;
  }, [selectedDeviceId, devices, facingMode]);

  return (
    <div className="flex flex-col gap-4 p-4 pb-24 lg:gap-6 lg:p-6 lg:pb-8 max-w-5xl mx-auto w-full">
      {/* ─── Page Header (Desktop) ─── */}
      <div className="hidden lg:block">
        <h2 className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
          Cài đặt trạm làm việc
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cấu hình thiết bị phần cứng webcam, súng quét barcode, âm thanh và thông tin bàn đóng gói
        </p>
      </div>

      {/* ─── Station Profile Card (Mobile only) ─── */}
      <Card className="rounded-3xl shadow-xs lg:hidden">
        <CardContent className="flex items-center gap-3.5 p-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-sm font-black text-white shadow-sm">
            {userInitials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-bold text-foreground">
                {userCode} ({userRole})
              </span>
              <Badge
                variant="outline"
                className={cn(
                  'shrink-0 text-[9px] font-bold',
                  isOnline
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
                    : 'border-rose-500/30 bg-rose-500/10 text-rose-600'
                )}
              >
                {isOnline ? 'Online' : 'Offline'}
              </Badge>
            </div>
            <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
              Bàn: <strong className="font-mono text-foreground">{warehouseName || '---'}</strong> • {userName}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Horizontal Tabs Navigation ─── */}
      <Tabs defaultValue="camera" className="w-full flex flex-col gap-3.5">
        {/* Scrollable Horizontal Tabs List */}
        <div className="overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex h-12 w-full min-w-max sm:min-w-0 items-center justify-start sm:grid sm:grid-cols-4 rounded-2xl bg-muted/70 p-1 border border-border/50 gap-1 sm:gap-0">
            <TabsTrigger
              value="camera"
              className="flex items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-4 py-2 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs min-h-[40px] shrink-0"
            >
              <Camera className="size-4 shrink-0 text-primary" aria-hidden="true" />
              <span>Ghi hình &amp; Âm thanh</span>
            </TabsTrigger>
            <TabsTrigger
              value="storage"
              className="flex items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-4 py-2 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs min-h-[40px] shrink-0"
            >
              <HardDrive className="size-4 shrink-0 text-emerald-500" aria-hidden="true" />
              <span>Lưu trữ Drive</span>
            </TabsTrigger>
            <TabsTrigger
              value="barcode"
              className="flex items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-4 py-2 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs min-h-[40px] shrink-0"
            >
              <ScanBarcode className="size-4 shrink-0 text-amber-500" aria-hidden="true" />
              <span>Súng quét Barcode</span>
            </TabsTrigger>
            <TabsTrigger
              value="station"
              className="flex items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-4 py-2 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs min-h-[40px] shrink-0"
            >
              <Info className="size-4 shrink-0 text-blue-500" aria-hidden="true" />
              <span>Thông tin Trạm</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ═══ Tab 1: Camera & Microphone ═══ */}
        <TabsContent value="camera" className="mt-0 focus-visible:outline-none">
          <SettingsCard
            icon={Camera}
            iconColor="text-primary"
            title="Thiết bị Ghi hình & Âm thanh"
          >
            <div className="flex flex-col gap-4 text-xs">
              {/* Camera Select */}
              <div>
                <label
                  htmlFor="settings-camera-select"
                  className="mb-1.5 block text-xs font-semibold text-muted-foreground"
                >
                  Webcam quay đóng gói
                </label>
                <select
                  id="settings-camera-select"
                  value={selectedDeviceId ?? ''}
                  onChange={(e) => {
                    if (e.target.value) setDevice(e.target.value);
                    else toggleFacing();
                  }}
                  className="h-11 w-full rounded-xl border border-border bg-muted/40 px-3 text-xs font-medium text-foreground focus:outline-none"
                >
                  {devices.length > 0 ? (
                    devices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Camera ${d.deviceId.slice(0, 8)}...`}
                      </option>
                    ))
                  ) : (
                    <option value="">
                      {selectedCameraLabel}
                    </option>
                  )}
                </select>
              </div>

              {/* Resolution Toggle (User Override) */}
              <div className="flex flex-col gap-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground">
                      Độ phân giải video ghi hình
                    </label>
                    <span className="text-[11px] text-muted-foreground/80">
                      Override cục bộ trên thiết bị này
                    </span>
                  </div>
                  <Badge variant="outline" className="w-fit font-mono text-[11px] font-semibold border-border">
                    Đang chọn: <strong className="ml-1 text-foreground">{videoResolution}</strong>
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <Button
                    type="button"
                    variant={videoResolution === '1080p' ? 'default' : 'outline'}
                    className={cn(
                      'h-auto min-h-[52px] flex-col items-start justify-center p-3 rounded-2xl text-left transition-all',
                      videoResolution === '1080p' && 'shadow-xs border-primary'
                    )}
                    onClick={() => setVideoResolution('1080p')}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold">1080p (Full HD)</span>
                      {videoResolution === '1080p' && <Check className="size-3.5 shrink-0" />}
                    </div>
                    <span
                      className={cn(
                        'text-[11px] font-normal mt-0.5',
                        videoResolution === '1080p'
                          ? 'text-primary-foreground/80'
                          : 'text-muted-foreground'
                      )}
                    >
                      Khuyên dùng • Hình ảnh nét
                    </span>
                  </Button>

                  <Button
                    type="button"
                    variant={videoResolution === '720p' ? 'default' : 'outline'}
                    className={cn(
                      'h-auto min-h-[52px] flex-col items-start justify-center p-3 rounded-2xl text-left transition-all',
                      videoResolution === '720p' && 'shadow-xs border-primary'
                    )}
                    onClick={() => setVideoResolution('720p')}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold">720p (HD)</span>
                      {videoResolution === '720p' && <Check className="size-3.5 shrink-0" />}
                    </div>
                    <span
                      className={cn(
                        'text-[11px] font-normal mt-0.5',
                        videoResolution === '720p'
                          ? 'text-primary-foreground/80'
                          : 'text-muted-foreground'
                      )}
                    >
                      Tiết kiệm dung lượng bộ nhớ
                    </span>
                  </Button>
                </div>
              </div>

              {/* Camera facing info */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 rounded-2xl border border-border/60 bg-muted/30 p-3.5 text-xs">
                <span className="text-muted-foreground">Chuyển hướng camera (Trước / Sau)</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={toggleFacing}
                  className="gap-1.5 h-9 rounded-xl w-full sm:w-auto shrink-0 font-medium"
                >
                  <RefreshCw className="size-3.5" aria-hidden="true" />
                  {facingMode === 'environment' ? 'Camera sau (Mặc định)' : 'Camera trước'}
                </Button>
              </div>
            </div>
          </SettingsCard>
        </TabsContent>

        {/* ═══ Tab 2: Google Drive Storage (Read-only) ═══ */}
        <TabsContent value="storage" className="mt-0 focus-visible:outline-none">
          <SettingsCard
            icon={HardDrive}
            iconColor="text-emerald-500"
            title="Google Drive Storage (Cloudflare Workers)"
            badge={
              <Badge variant="secondary" className="text-[10px] font-bold">
                Chỉ xem (Admin quản trị)
              </Badge>
            }
          >
            <div className="flex flex-col gap-4 text-xs">
              {/* Notice */}
              <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
                Cấu hình kết nối Google Drive và hạn mức lưu trữ được thiết lập toàn cục bởi Quản trị viên. Trạm kho chỉ xem trạng thái kết nối thực tế.
              </div>

              {/* Service Account */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  Service Account kết nối
                </label>
                <div className="truncate rounded-xl border border-border bg-muted/50 p-3 font-mono text-[11px] text-foreground">
                  sa-drive-uploader@warehouse-system.iam.gserviceaccount.com
                </div>
              </div>

              {/* Drive Folder */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                  Thư mục Drive lưu trữ (Shared Drive)
                </label>
                <div className="rounded-xl border border-border bg-muted/50 p-3">
                  <span className="font-mono text-xs font-bold text-foreground">
                    SHARED_DRIVE_KHO_TONG / {new Date().toISOString().slice(0, 7)}
                  </span>
                </div>
              </div>

              {/* Storage Usage */}
              <div>
                <div className="mb-2 flex justify-between text-xs font-semibold text-muted-foreground">
                  <span>Dung lượng Shared Drive đã dùng</span>
                  <span className="font-mono font-bold text-foreground">420 GB / 2 TB (21%)</span>
                </div>
                <Progress value={21} className="h-2.5 rounded-full" />
              </div>

              {/* Connection status */}
              <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/30 p-3">
                {isOnline ? (
                  <Wifi className="size-4 text-emerald-500 shrink-0" aria-hidden="true" />
                ) : (
                  <WifiOff className="size-4 text-rose-500 shrink-0" aria-hidden="true" />
                )}
                <span
                  className={cn(
                    'text-xs font-semibold',
                    isOnline ? 'text-emerald-600' : 'text-rose-600'
                  )}
                >
                  {isOnline ? 'Máy chủ Google Drive & Cloudflare Workers kết nối ổn định' : 'Mất kết nối mạng'}
                </span>
              </div>
            </div>
          </SettingsCard>
        </TabsContent>

        {/* ═══ Tab 3: Barcode Gun Config ═══ */}
        <TabsContent value="barcode" className="mt-0 focus-visible:outline-none">
          <SettingsCard
            icon={ScanBarcode}
            iconColor="text-amber-500"
            title="Cấu hình Súng quét Barcode USB"
          >
            <div className="flex flex-col gap-3 text-xs">
              <ToggleRow
                id="settings-auto-record"
                title="Tự động kích hoạt quay video sau khi quét"
                description="Sau khi nhận mã vận đơn hợp lệ từ súng quét, hệ thống đếm ngược 1s và tự động bắt đầu ghi hình"
                checked={autoRecordAfterScan}
                onChange={setAutoRecordAfterScan}
              />
              <ToggleRow
                id="settings-sound-beep"
                title="Âm thanh phản hồi (Bíp)"
                description="Phát âm thanh bíp thông báo khi quét thành công hoặc cảnh báo mã lỗi/trùng"
                checked={soundBeepEnabled}
                onChange={setSoundBeepEnabled}
                showBorder
              />
            </div>
          </SettingsCard>
        </TabsContent>

        {/* ═══ Tab 4: Station & Warehouse Info ═══ */}
        <TabsContent value="station" className="mt-0 focus-visible:outline-none">
          <div className="flex flex-col gap-4">
            <SettingsCard
              icon={Info}
              iconColor="text-blue-500"
              title="Thông tin Trạm làm việc & Ca trực"
            >
              <div className="flex flex-col gap-3 text-xs">
                {/* Warehouse Name — Editable */}
                <div>
                  <label
                    htmlFor="settings-warehouse-name"
                    className="mb-1.5 block text-xs font-semibold text-muted-foreground"
                  >
                    Chi nhánh kho / Tên bàn đóng gói
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id="settings-warehouse-name"
                      type="text"
                      placeholder="VD: Kho Quận 7 - HCM"
                      value={warehouseInput}
                      onChange={(e) => setWarehouseInput(e.target.value)}
                      onBlur={handleWarehouseSave}
                      onKeyDown={(e) => e.key === 'Enter' && handleWarehouseSave()}
                      className="h-11 flex-1 rounded-xl text-xs"
                    />
                    {warehouseSaved && (
                      <Badge
                        variant="outline"
                        className="shrink-0 gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 px-3"
                      >
                        <Check className="size-3" aria-hidden="true" />
                        Đã lưu
                      </Badge>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Static Info Rows */}
                <InfoRow
                  label="Tài khoản nhân viên"
                  value={`${userCode} (${userRole})`}
                />
                <InfoRow
                  label="Tên nhân viên"
                  value={userName}
                />

                {/* GPS Location */}
                <div className="flex items-center justify-between py-2 border-b border-border/60">
                  <div className="min-w-0 flex-1 pr-3">
                    <span className="text-xs text-muted-foreground">Vị trí GPS trạm</span>
                    <div className="mt-0.5 text-[11px] text-muted-foreground truncate">
                      {coords
                        ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}${coords.address ? ` — ${coords.address}` : ''}`
                        : gpsError
                          ? gpsError
                          : 'Chưa xác định'}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      clearCache();
                      void requestLocation();
                    }}
                    disabled={gpsLoading}
                    className="shrink-0 gap-1.5 h-9 rounded-xl"
                  >
                    <MapPin className="size-3.5" aria-hidden="true" />
                    {gpsLoading ? 'Đang lấy...' : 'Kiểm tra'}
                  </Button>
                </div>

                {/* Device Info */}
                <InfoRow
                  label="Chế độ giữ màn hình"
                  value="Screen Wake Lock: Hoạt động"
                />
                <InfoRow
                  label="Bộ nhớ đệm ngoại tuyến"
                  value={`${APP_CONFIG.IDB_NAME} (v${APP_CONFIG.IDB_VERSION})`}
                  mono
                />
                <InfoRow
                  label="Phiên bản ứng dụng PWA"
                  value={`v${APP_CONFIG.VERSION} (Offline-Ready)`}
                  mono
                  showBorder={false}
                />
              </div>
            </SettingsCard>

            {/* Logout Button */}
            <Card className="rounded-3xl shadow-xs border-destructive/30 bg-destructive/5">
              <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4">
                <div className="text-xs text-muted-foreground">
                  Đăng xuất khỏi phiên làm việc hiện tại để bảo vệ dữ liệu trạm kho
                </div>
                <Button
                  variant="destructive"
                  size="default"
                  className="h-11 gap-2 rounded-2xl text-xs font-bold shrink-0 px-5"
                  onClick={logout}
                >
                  <LogOut className="size-4" aria-hidden="true" />
                  ĐĂNG XUẤT CA LÀM VIỆC
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserSettingsPage;
