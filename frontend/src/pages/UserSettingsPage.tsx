import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  ScanBarcode,
  Info,
  MapPin,
  LogOut,
  RefreshCw,
  Check,
  Building2,
  ExternalLink,
  Star,
  Target,
} from 'lucide-react';
import { useCameraStore } from '@/stores/camera-store';
import { useConfigStore } from '@/stores/config-store';
import { useAuthStore } from '@/stores/auth-store';
import { useUserSettingsStore } from '@/stores/user-settings-store';
import { useGeolocation } from '@/hooks/use-geolocation';
import { APP_CONFIG } from '@/config/constants';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { showToast } from '@/stores/toast-store';
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
  const navigate = useNavigate();

  // Global & Device Stores
  const { facingMode, toggleFacing, selectedDeviceId, devices, setDevices, setDevice } =
    useCameraStore();
  const {
    warehouseName,
    warehouseId,
    warehouses,
    warehousesLoading,
    fetchWarehouses,
    setWarehouse,
    isOnline,
    systemConfig,
  } = useConfigStore();
  const { user, logout } = useAuthStore();
  const {
    videoResolution,
    setVideoResolution,
    isResolutionOverridden,
    resetResolutionToSystem,
    videoFps,
    setVideoFps,
    isFpsOverridden,
    resetFpsToSystem,
    autoRecordAfterScan,
    setAutoRecordAfterScan,
    soundBeepEnabled,
    setSoundBeepEnabled,
    shiftTarget,
    setShiftTarget,
  } = useUserSettingsStore();

  const sysDefaultRes = systemConfig?.do_phan_giai === '1920x1080' ? '1080p' : '720p';
  const effectiveRes = isResolutionOverridden ? videoResolution : sysDefaultRes;
  const effectiveFps = isFpsOverridden ? videoFps : 30;

  const {
    coords,
    isLoading: gpsLoading,
    error: gpsError,
    requestLocation,
    clearCache,
  } = useGeolocation();

  const [warehouseSaved, setWarehouseSaved] = useState(false);

  // Tải danh sách kho từ backend khi mount
  useEffect(() => {
    void fetchWarehouses();
  }, [fetchWarehouses]);

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

  // Xử lý chọn kho từ danh sách có sẵn
  const handleWarehouseSelect = useCallback(
    (selectedId: string) => {
      const found = warehouses.find((w) => w.id === selectedId);
      if (found) {
        setWarehouse(found);
        setWarehouseSaved(true);
        showToast.success('Đã lưu cài đặt', `Đã chọn kho làm việc: ${found.ten}`);
        setTimeout(() => setWarehouseSaved(false), 2000);
      }
    },
    [warehouses, setWarehouse]
  );

  // Kho đang được chọn
  const currentWarehouse = useMemo(() => {
    return warehouses.find((w) => w.id === warehouseId || w.ten === warehouseName);
  }, [warehouses, warehouseId, warehouseName]);

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
    <div className="flex flex-col gap-4 lg:gap-6 w-full pb-12 sm:pb-16 lg:pb-20">
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

      <Tabs defaultValue="camera" className="w-full flex flex-col gap-4 lg:gap-6">
        {/* Scrollable Horizontal Tabs List */}
        <div className="overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex h-12 w-full min-w-max sm:min-w-0 items-center justify-start sm:grid sm:grid-cols-3 rounded-2xl bg-muted/70 p-1 border border-border/50 gap-1 sm:gap-0">
            <TabsTrigger
              value="camera"
              className="flex items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-4 py-2 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs min-h-[40px] shrink-0"
            >
              <Camera className="size-4 shrink-0 text-primary" aria-hidden="true" />
              <span>Ghi hình &amp; Âm thanh</span>
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
                  if (e.target.value) {
                    setDevice(e.target.value);
                    const found = devices.find((d) => d.deviceId === e.target.value);
                    showToast.success('Đã lưu cài đặt', `Đã chọn: ${found?.label || 'Camera ' + e.target.value.slice(0, 8)}`);
                  } else {
                    toggleFacing();
                    showToast.success('Đã lưu cài đặt', 'Đã chuyển hướng camera');
                  }
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

            {/* Resolution Toggle (User Override & System Default Sync) */}
            <div className="flex flex-col gap-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground">
                    Độ phân giải video ghi hình
                  </label>
                  <span className="text-[11px] text-muted-foreground/80">
                    {isResolutionOverridden
                      ? 'Đang áp dụng cấu hình tùy chỉnh riêng trên máy này'
                      : `Tự động đồng bộ theo hệ thống (mặc định: ${sysDefaultRes})`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="w-fit font-mono text-[11px] font-semibold border-border">
                    {isResolutionOverridden ? (
                      <span className="text-amber-500 font-medium">Tùy chỉnh: {effectiveRes}</span>
                    ) : (
                      <span className="text-primary font-medium">Hệ thống: {effectiveRes}</span>
                    )}
                  </Badge>
                  {isResolutionOverridden && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        resetResolutionToSystem();
                        showToast.info('Đã hoàn tác', `Độ phân giải quay lại mặc định hệ thống (${sysDefaultRes})`);
                      }}
                    >
                      Đặt lại mặc định
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Button
                  type="button"
                  variant={effectiveRes === '1080p' ? 'default' : 'outline'}
                  className={cn(
                    'h-auto min-h-[52px] flex-col items-start justify-center p-3 rounded-2xl text-left transition-all',
                    effectiveRes === '1080p' && 'shadow-xs border-primary'
                  )}
                  onClick={() => {
                    setVideoResolution('1080p');
                    showToast.success('Đã lưu cài đặt', 'Độ phân giải video: 1080p (Full HD)');
                  }}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold">1080p (Full HD)</span>
                    {effectiveRes === '1080p' && <Check className="size-3.5 shrink-0" />}
                  </div>
                  <span
                    className={cn(
                      'text-[11px] font-normal mt-0.5',
                      effectiveRes === '1080p'
                        ? 'text-primary-foreground/80'
                        : 'text-muted-foreground'
                    )}
                  >
                    Khuyên dùng • Hình ảnh nét
                  </span>
                </Button>

                <Button
                  type="button"
                  variant={effectiveRes === '720p' ? 'default' : 'outline'}
                  className={cn(
                    'h-auto min-h-[52px] flex-col items-start justify-center p-3 rounded-2xl text-left transition-all',
                    effectiveRes === '720p' && 'shadow-xs border-primary'
                  )}
                  onClick={() => {
                    setVideoResolution('720p');
                    showToast.success('Đã lưu cài đặt', 'Độ phân giải video: 720p (HD)');
                  }}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold">720p (HD)</span>
                    {effectiveRes === '720p' && <Check className="size-3.5 shrink-0" />}
                  </div>
                  <span
                    className={cn(
                      'text-[11px] font-normal mt-0.5',
                      effectiveRes === '720p'
                        ? 'text-primary-foreground/80'
                        : 'text-muted-foreground'
                    )}
                  >
                    Tiết kiệm dung lượng bộ nhớ
                  </span>
                </Button>
              </div>
            </div>

            {/* FPS Selector */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">Tốc độ khung hình (FPS)</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] font-bold',
                      isFpsOverridden
                        ? 'bg-amber-500/10 text-amber-600 border-transparent'
                        : 'text-muted-foreground'
                    )}
                  >
                    {isFpsOverridden ? (
                      <>{effectiveFps}fps (Tùy chỉnh)</>
                    ) : (
                      <>30fps (Mặc định)</>
                    )}
                  </Badge>
                  {isFpsOverridden && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        resetFpsToSystem();
                        showToast.info('Đã hoàn tác', 'FPS quay lại mặc định (30fps)');
                      }}
                    >
                      Đặt lại mặc định
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {([
                  { fps: 15 as const, label: '15 fps', desc: 'Siêu tiết kiệm', note: 'Camera cố định' },
                  { fps: 20 as const, label: '20 fps', desc: 'Tiết kiệm', note: 'Đóng gói chậm' },
                  { fps: 24 as const, label: '24 fps', desc: 'Chuẩn phim', note: 'Cân bằng tốt' },
                  { fps: 30 as const, label: '30 fps', desc: 'Mặc định', note: 'Khuyên dùng' },
                  { fps: 48 as const, label: '48 fps', desc: 'Mượt cao', note: 'Thao tác nhanh' },
                  { fps: 60 as const, label: '60 fps', desc: 'Siêu mượt', note: 'Tốn dung lượng' },
                ]).map((opt) => (
                  <Button
                    key={opt.fps}
                    type="button"
                    variant={effectiveFps === opt.fps ? 'default' : 'outline'}
                    className={cn(
                      'h-auto min-h-[48px] flex-col items-start justify-center p-2.5 rounded-2xl text-left transition-all',
                      effectiveFps === opt.fps && 'shadow-xs border-primary'
                    )}
                    onClick={() => {
                      setVideoFps(opt.fps);
                      showToast.success('Đã lưu cài đặt', `Tốc độ khung hình: ${opt.label}`);
                    }}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold">{opt.label}</span>
                      {effectiveFps === opt.fps && <Check className="size-3.5 shrink-0" />}
                    </div>
                    <span
                      className={cn(
                        'text-[10px] font-normal mt-0.5',
                        effectiveFps === opt.fps
                          ? 'text-primary-foreground/80'
                          : 'text-muted-foreground'
                      )}
                    >
                      {opt.desc} • {opt.note}
                    </span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Camera facing info */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 rounded-2xl border border-border/60 bg-muted/30 p-3.5 text-xs">
              <span className="text-muted-foreground">Chuyển hướng camera (Trước / Sau)</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  toggleFacing();
                  const nextFacing = facingMode === 'environment' ? 'Camera trước' : 'Camera sau';
                  showToast.success('Đã lưu cài đặt', `Đã chuyển sang: ${nextFacing}`);
                }}
                className="gap-1.5 h-9 rounded-xl w-full sm:w-auto shrink-0 font-medium"
              >
                <RefreshCw className="size-3.5" aria-hidden="true" />
                {facingMode === 'environment' ? 'Camera sau (Mặc định)' : 'Camera trước'}
              </Button>
            </div>
          </div>
          </SettingsCard>
        </TabsContent>

        {/* ═══ Tab 2: Barcode Gun Config ═══ */}
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
              description="Sau khi nhận mã vận đơn hợp lệ từ súng quét barcode, hệ thống tự động bắt đầu ghi hình (chỉ áp dụng cho súng quét, không áp dụng camera)"
              checked={autoRecordAfterScan}
              onChange={(val) => {
                setAutoRecordAfterScan(val);
                showToast.success(
                  'Đã lưu cài đặt',
                  val ? 'Đã bật tự động ghi hình sau quét' : 'Đã tắt tự động ghi hình'
                );
              }}
            />
            <ToggleRow
              id="settings-sound-beep"
              title="Âm thanh phản hồi (Bíp)"
              description="Phát âm thanh bíp thông báo khi quét thành công hoặc cảnh báo mã lỗi/trùng"
              checked={soundBeepEnabled}
              onChange={(val) => {
                setSoundBeepEnabled(val);
                showToast.success(
                  'Đã lưu cài đặt',
                  val ? 'Đã bật âm thanh phản hồi (Bíp)' : 'Đã tắt âm thanh phản hồi'
                );
              }}
              showBorder
            />
          </div>
          </SettingsCard>
        </TabsContent>

        {/* ═══ Tab 3: Station & Warehouse Info ═══ */}
        <TabsContent value="station" className="mt-0 focus-visible:outline-none flex flex-col gap-4">
          <SettingsCard
            icon={Info}
            iconColor="text-blue-500"
            title="Thông tin Trạm làm việc & Ca trực"
          >
            <div className="flex flex-col gap-3 text-xs">
              {/* Warehouse Selection — Dropdown cố định */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="settings-warehouse-select"
                    className="block text-xs font-semibold text-muted-foreground"
                  >
                    Chi nhánh kho làm việc
                  </label>
                  {currentWarehouse?.la_mac_dinh && (
                    <Badge
                      variant="secondary"
                      className="gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20"
                    >
                      <Star className="size-3 fill-amber-500 text-amber-500" aria-hidden="true" />
                      Kho mặc định
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select
                      value={currentWarehouse?.id || ''}
                      onValueChange={handleWarehouseSelect}
                      disabled={warehousesLoading || warehouses.length === 0}
                    >
                      <SelectTrigger
                        id="settings-warehouse-select"
                        className="h-11 rounded-xl text-xs w-full bg-background"
                      >
                        <SelectValue
                          placeholder={
                            warehousesLoading
                              ? 'Đang tải danh sách kho...'
                              : warehouses.length === 0
                              ? 'Chưa có kho nào (Liên hệ Admin)'
                              : 'Chọn kho làm việc...'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.map((k) => (
                          <SelectItem key={k.id} value={k.id} className="text-xs">
                            <div className="flex items-center justify-between gap-2 w-full">
                              <span className="font-semibold text-foreground">{k.ten}</span>
                              {k.la_mac_dinh && (
                                <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded font-medium">
                                  Mặc định
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {warehouseSaved && (
                    <Badge
                      variant="outline"
                      className="shrink-0 gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 px-3 h-11"
                    >
                      <Check className="size-3" aria-hidden="true" />
                      Đã lưu
                    </Badge>
                  )}
                </div>

                {/* Selected Warehouse Address & Details */}
                {currentWarehouse?.dia_chi && (
                  <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground bg-muted/30 p-2.5 rounded-xl border border-border/40">
                    <MapPin className="size-3.5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{currentWarehouse.dia_chi}</span>
                  </div>
                )}

                {/* Admin Quick Link */}
                {user?.vai_tro === 'admin' && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-muted-foreground">
                      Bạn có quyền Quản trị viên
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/admin/settings?tab=warehouses')}
                      className="h-7 text-xs text-primary hover:text-primary/90 gap-1 px-2 font-medium"
                    >
                      <Building2 className="size-3.5" aria-hidden="true" />
                      Quản lý danh mục kho
                      <ExternalLink className="size-3 ml-0.5" aria-hidden="true" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Personal Shift Target */}
              <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="settings-shift-target"
                    className="block text-xs font-semibold text-muted-foreground"
                  >
                    Chỉ tiêu cá nhân (Số đơn / ca)
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Target className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" aria-hidden="true" />
                    <Input
                      id="settings-shift-target"
                      type="number"
                      min="1"
                      className="h-11 rounded-xl text-xs pl-10 bg-background"
                      value={shiftTarget || ''}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val > 0) {
                          setShiftTarget(val);
                        }
                      }}
                      onBlur={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (isNaN(val) || val <= 0) {
                          setShiftTarget(300); // Reset to default if empty or invalid
                        }
                      }}
                    />
                  </div>
                  <Button
                    variant="outline"
                    className="h-11 px-4 text-xs font-semibold shrink-0"
                    onClick={() => {
                      showToast.success('Đã lưu chỉ tiêu', `Mục tiêu mới: ${shiftTarget} đơn/ca`);
                    }}
                  >
                    Lưu
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Mục tiêu số kiện hàng bạn muốn hoàn thành trong ca làm việc.
                </p>
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
          <Card className="rounded-3xl shadow-xs border-destructive/30 bg-destructive/5 mt-4 sm:mt-6 mb-4">
            <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-5">
              <div className="text-xs text-muted-foreground">
                Đăng xuất khỏi phiên làm việc hiện tại để bảo vệ dữ liệu trạm kho
              </div>
              <Button
                variant="destructive"
                size="default"
                className="h-11 gap-2 rounded-2xl text-xs font-bold shrink-0 px-5 cursor-pointer shadow-xs hover:bg-destructive/90 transition-colors"
                onClick={logout}
              >
                <LogOut className="size-4" aria-hidden="true" />
                ĐĂNG XUẤT CA LÀM VIỆC
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserSettingsPage;
