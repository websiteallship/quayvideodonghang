// ---------------------------------------------------------------------------
// DashboardPage — Trang thống kê ca làm việc
// Route: /dashboard
// Tham chiếu: docs/03-uiux-flow.md, docs/06-api-backend-specification.md
// Rules: 01-ui-ux.md (shadcn, lucide-react, touch target ≥48px)
// ---------------------------------------------------------------------------

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  CheckCircle2,
  HardDrive,
  Clock,
  AlertTriangle,
  Check,
  ScanLine,
  ArrowRight,
  PackageOpen,
  Camera,
  Video,
  ScanBarcode,
  Users,
  Target,
  Lightbulb,
  UploadCloud,
  Wifi,
  WifiOff,
  TrendingUp,
  RotateCw,
  ShieldCheck,
  Settings,
} from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { useAuthStore } from '@/stores/auth-store';
import { useUploadStore } from '@/stores/upload-store';
import { useCameraStore } from '@/stores/camera-store';
import { useWorkModeStore } from '@/stores/work-mode-store';
import { useConfigStore } from '@/stores/config-store';
import { useUserSettingsStore } from '@/stores/user-settings-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  fetchDashboardStats,
  type DashboardStats,
  type NhanVienHoatDong,
} from '@/services/dashboard-service';
import { HistoryDateRangePicker } from '@/components/history/HistoryDateRangePicker';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const REFRESH_INTERVAL_MS = 30_000; // Auto-refresh every 30s

// ---------------------------------------------------------------------------
// Hook: useOnlineStatus
// ---------------------------------------------------------------------------
function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

// ---------------------------------------------------------------------------
// Helper: format time ago
// ---------------------------------------------------------------------------
function formatTimeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  return `${hours} giờ trước`;
}

function formatDate(): string {
  return new Date().toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
  });
}

function formatTime(): string {
  return new Date().toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  });
}

// ---------------------------------------------------------------------------
// Sub: Loading Skeleton
// ---------------------------------------------------------------------------
function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6 lg:p-8">
      <Skeleton className="h-10 w-72" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-36 rounded-3xl" />
        <Skeleton className="h-36 rounded-3xl" />
        <Skeleton className="h-36 rounded-3xl" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-24 rounded-3xl" />
        <Skeleton className="h-24 rounded-3xl" />
      </div>
      <Skeleton className="h-40 rounded-3xl" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub: Offline Alert Banner
// ---------------------------------------------------------------------------
function OfflineBanner({ isMobile }: { isMobile?: boolean }) {
  if (isMobile) {
    return (
      <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-[11px]">
        <div className="font-bold flex items-center gap-1.5">
          <WifiOff className="size-3.5" aria-hidden="true" />
          <span>Đang ở chế độ Ngoại tuyến</span>
        </div>
        <p className="mt-0.5 text-[10px] text-amber-700 dark:text-amber-400">
          Dữ liệu hiển thị từ Cache. Video mới lưu an toàn trong IndexedDB.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-300">
      <div className="flex items-center gap-3">
        <div className="size-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
          <WifiOff className="size-5" aria-hidden="true" />
        </div>
        <div>
          <div className="font-bold text-sm">
            Thiết bị đang hoạt động Ngoại tuyến (Offline)
          </div>
          <div className="text-[11px] text-amber-700/90 dark:text-amber-400 mt-0.5">
            Số liệu hiển thị từ bộ nhớ tạm (Cache). Quá trình quét mã &amp;
            quay video vẫn diễn ra bình thường, video được lưu trữ an toàn
            trong IndexedDB và tự động tải lên khi có mạng.
          </div>
        </div>
      </div>
      <Badge
        variant="outline"
        className="px-2.5 py-1 rounded-lg bg-amber-500/20 font-mono font-bold text-[11px] shrink-0 border-amber-500/30 text-amber-700 dark:text-amber-300"
      >
        IndexedDB Active
      </Badge>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub: Stats Metric Card (Desktop)
// ---------------------------------------------------------------------------
interface MetricCardProps {
  label: string;
  value: number | string;
  unit?: string;
  icon: React.ReactNode;
  iconBgClass: string;
  valueColorClass?: string;
  footer?: React.ReactNode;
}

function MetricCard({
  label,
  value,
  unit,
  icon,
  iconBgClass,
  valueColorClass = 'text-foreground',
  footer,
}: MetricCardProps) {
  return (
    <Card className="rounded-3xl shadow-xs flex flex-col justify-between gap-4 relative overflow-hidden">
      <CardContent className="p-5 pt-5 flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {label}
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span
                className={cn(
                  'text-3xl lg:text-4xl font-black font-mono',
                  valueColorClass
                )}
              >
                {value}
              </span>
              {unit && (
                <span className="text-xs text-muted-foreground font-semibold">
                  {unit}
                </span>
              )}
            </div>
          </div>
          <div
            className={cn(
              'size-12 rounded-2xl flex items-center justify-center shrink-0',
              iconBgClass
            )}
          >
            {icon}
          </div>
        </div>
        {footer && (
          <div className="flex items-center justify-between text-xs pt-3 border-t border-border/60">
            {footer}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Sub: Status Card (Pending / Error) — Desktop
// ---------------------------------------------------------------------------
interface StatusCardProps {
  count: number;
  isPending: boolean; // true = amber pending, false = rose error
  description: string;
  onAction: () => void;
}

function StatusCard({
  count,
  isPending,
  description,
  onAction,
}: StatusCardProps) {
  const hasIssue = count > 0;
  const borderClass = isPending
    ? 'border-2 border-amber-500/30 bg-amber-500/5'
    : hasIssue
      ? 'border-2 border-rose-500/40 bg-rose-500/5'
      : 'border-2 border-border bg-card';

  const iconBgClass = isPending
    ? 'bg-amber-500/20 text-amber-600'
    : hasIssue
      ? 'bg-rose-500/20 text-rose-600'
      : 'bg-emerald-500/10 text-emerald-600';

  const StatusIcon = isPending ? Clock : hasIssue ? AlertTriangle : Check;

  const badgeLabel = isPending
    ? 'Chờ đồng bộ'
    : hasIssue
      ? 'Cần tải lại'
      : 'Không có lỗi';

  const badgeClass = isPending
    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-transparent'
    : hasIssue
      ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-transparent'
      : 'bg-emerald-500/10 text-emerald-600 border-transparent';

  return (
    <Card className={cn('rounded-3xl shadow-xs', borderClass)}>
      <CardContent className="p-5 pt-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'size-12 rounded-2xl flex items-center justify-center shrink-0',
              iconBgClass
            )}
          >
            <StatusIcon className="size-6" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'text-2xl font-black font-mono',
                  isPending
                    ? 'text-foreground'
                    : hasIssue
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-foreground'
                )}
              >
                {count} video
              </span>
              <Badge
                variant="outline"
                className={cn(
                  'px-2 py-0.5 rounded-full text-[11px] font-bold',
                  badgeClass
                )}
              >
                {badgeLabel}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {description}
            </p>
          </div>
        </div>

        {isPending ? (
          <Button
            size="sm"
            onClick={onAction}
            className="h-10 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shrink-0"
          >
            <span>Xem hàng đợi</span>
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Button>
        ) : hasIssue ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onAction}
            className="h-10 px-4 rounded-xl border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold text-xs shrink-0"
          >
            <RotateCw className="size-3.5" aria-hidden="true" />
            <span>Thử lại ngay</span>
          </Button>
        ) : (
          <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
            <ShieldCheck className="size-4" aria-hidden="true" />
            <span>100% Ổn định</span>
          </span>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Sub: Hero CTA Card
// ---------------------------------------------------------------------------
interface HeroCTAProps {
  onNavigateToScan: () => void;
}

function HeroCTA({ onNavigateToScan }: HeroCTAProps) {
  const { workMode, setWorkMode } = useWorkModeStore();

  return (
    <Card className="rounded-3xl border-2 border-primary/40 bg-gradient-to-br from-primary/10 via-card to-card shadow-lg">
      <CardContent className="p-6 lg:p-8 pt-6 lg:pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col gap-2 max-w-xl">
          <Badge
            variant="outline"
            className="w-fit px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-bold border-transparent"
          >
            <ScanLine className="size-3.5" aria-hidden="true" />
            <span>THAO TÁC QUAY BIÊN BẢN CHÍNH</span>
          </Badge>
          <h3 className="text-xl lg:text-2xl font-bold tracking-tight text-foreground">
            Sẵn sàng quét mã đơn &amp; quay video
          </h3>
          <p className="text-xs lg:text-sm text-muted-foreground">
            Bắn súng quét barcode USB hoặc đưa đơn vào camera để bắt đầu quy
            trình biên bản đóng gói / khui hàng.
          </p>

          {/* Mode Selector */}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs font-semibold text-muted-foreground">
              Chế độ:
            </span>
            <div className="inline-flex bg-muted/80 p-1 rounded-xl border border-border text-xs font-bold">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setWorkMode('dong_goi')}
                className={cn(
                  'h-auto px-3 py-1 rounded-lg flex items-center gap-1.5',
                  workMode === 'dong_goi'
                    ? 'bg-blue-600 text-white shadow-xs hover:bg-blue-600 hover:text-white'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Package className="size-3.5" aria-hidden="true" />
                <span>Đóng gói hàng</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setWorkMode('khui_hang')}
                className={cn(
                  'h-auto px-3 py-1 rounded-lg flex items-center gap-1.5',
                  workMode === 'khui_hang'
                    ? 'bg-amber-600 text-white shadow-xs hover:bg-amber-600 hover:text-white'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <PackageOpen className="size-3.5" aria-hidden="true" />
                <span>Khui hàng / Trả hàng</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Large CTA Button */}
        <Button
          size="lg"
          onClick={onNavigateToScan}
          className="w-full md:w-auto h-16 px-8 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-base shadow-xl shadow-blue-500/25 active:scale-[0.98] transition-all shrink-0"
        >
          <ScanLine className="size-6" aria-hidden="true" />
          <span>VÀO MÀN HÌNH QUÉT MÃ ĐƠN</span>
          <ArrowRight className="size-5" aria-hidden="true" />
        </Button>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Sub: Hardware Info Panel
// ---------------------------------------------------------------------------
function HardwarePanel({
  onNavigateToSettings,
}: {
  onNavigateToSettings: () => void;
}) {
  const { devices, selectedDeviceId } = useCameraStore();
  const selectedDevice = devices.find((d) => d.deviceId === selectedDeviceId);
  const deviceLabel = selectedDevice?.label || 'Chưa chọn camera';
  
  const warehouseName = useConfigStore((s) => s.warehouseName);
  const sysConfig = useConfigStore((s) => s.systemConfig);
  const userSettings = useUserSettingsStore();

  const effectiveResolution = userSettings.isResolutionOverridden
    ? userSettings.videoResolution
    : sysConfig?.do_phan_giai === '1920x1080' ? '1080p' : '720p';

  const isCameraReady = !!selectedDeviceId;

  return (
    <Card className="rounded-3xl shadow-xs flex flex-col justify-between gap-4">
      <CardContent className="p-6 pt-6 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-border/70 pb-3">
          <div className="flex items-center gap-2.5 font-bold text-sm text-foreground">
            <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Camera className="size-4" aria-hidden="true" />
            </div>
            <span>Thiết bị Ghi hình &amp; Trạm làm việc</span>
          </div>
          <Button
            variant="link"
            size="sm"
            onClick={onNavigateToSettings}
            className="text-xs font-semibold text-primary h-auto p-0"
          >
            <Settings className="size-3.5" aria-hidden="true" />
            <span>Đổi thiết bị</span>
          </Button>
        </div>

        <div className="flex flex-col gap-3 text-xs">
          {/* Camera */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 border border-border/60">
            <div className="flex items-center gap-2.5">
              <Video
                className={cn('size-4', isCameraReady ? 'text-emerald-600' : 'text-muted-foreground')}
                aria-hidden="true"
              />
              <div>
                <div className="font-bold text-foreground">{deviceLabel}</div>
                <div className="text-[11px] text-muted-foreground">
                  Độ phân giải {effectiveResolution} @ 30fps
                </div>
              </div>
            </div>
            {isCameraReady ? (
              <Badge
                variant="outline"
                className="bg-emerald-500/10 text-emerald-600 text-[10px] font-bold border-transparent"
              >
                Hoạt động
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="bg-muted text-muted-foreground text-[10px] font-bold border-transparent"
              >
                Chưa kết nối
              </Badge>
            )}
          </div>

          {/* Barcode */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 border border-border/60">
            <div className="flex items-center gap-2.5">
              <ScanBarcode
                className="size-4 text-amber-600"
                aria-hidden="true"
              />
              <div>
                <div className="font-bold text-foreground">
                  Súng quét Barcode USB HID
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Tự động quay: {userSettings.autoRecordAfterScan ? 'Bật' : 'Tắt'} • Âm báo: {userSettings.soundBeepEnabled ? 'Bật' : 'Tắt'}
                </div>
              </div>
            </div>
            <Badge
              variant="outline"
              className="bg-emerald-500/10 text-emerald-600 text-[10px] font-bold border-transparent"
            >
              Sẵn sàng
            </Badge>
          </div>

          {/* Station */}
          <div className="flex items-center justify-between text-muted-foreground pt-1">
            <span>Trạm làm việc hiện tại:</span>
            <span className="font-mono font-bold text-foreground">
              {warehouseName || 'Chưa thiết lập'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Sub: Admin Staff Panel
// ---------------------------------------------------------------------------
function AdminStaffPanel({
  staff,
  totalDon,
  dateRangeLabel,
}: {
  staff: NhanVienHoatDong[];
  totalDon: number;
  dateRangeLabel: string;
}) {
  return (
    <Card className="rounded-3xl shadow-xs flex flex-col justify-between gap-4">
      <CardContent className="p-6 pt-6 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-border/70 pb-3">
          <div className="flex items-center gap-2.5 font-bold text-sm text-foreground">
            <div className="size-8 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
              <Users className="size-4" aria-hidden="true" />
            </div>
            <span>Nhân viên hoạt động ({staff.length})</span>
          </div>
          <span className="text-[11px] font-bold text-muted-foreground">
            Tổng {totalDon} đơn
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          {staff.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-4 flex flex-col items-center gap-1">
              <span>Chưa có nhân viên hoạt động</span>
              <span className="text-[10px] font-mono">{dateRangeLabel}</span>
            </div>
          )}
          {staff.map((nv) => (
            <div
              key={nv.ma}
              className="p-3 rounded-2xl bg-muted/30 border border-border/60 flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-9 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-foreground shrink-0">
                  {nv.ma.slice(0, 3)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground truncate">
                      {nv.ten}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      ({nv.ma})
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="font-mono font-bold text-sm text-foreground">
                  {nv.don} đơn{' '}
                  <span className="text-[11px] text-muted-foreground">
                    ({nv.mb} MB)
                  </span>
                </div>
                <div className="flex items-center justify-end gap-1.5 mt-0.5 text-[10px]">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-muted-foreground">
                    {formatTimeAgo(nv.last_active)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Sub: Staff Personal Progress Panel
// ---------------------------------------------------------------------------
function StaffProgressPanel({ stats }: { stats: DashboardStats }) {
  const { shiftTarget } = useUserSettingsStore();
  const targetDon = shiftTarget;
  const percent = Math.min(
    Math.round((stats.tong_don / targetDon) * 100),
    100
  );
  const remaining = Math.max(targetDon - stats.tong_don, 0);

  return (
    <Card className="rounded-3xl shadow-xs flex flex-col justify-between gap-4">
      <CardContent className="p-6 pt-6 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-border/70 pb-3">
          <div className="flex items-center gap-2.5 font-bold text-sm text-foreground">
            <div className="size-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Target className="size-4" aria-hidden="true" />
            </div>
            <span>Tiến độ ca làm việc cá nhân</span>
          </div>
          <span className="text-xs font-bold text-emerald-600">
            Đạt {percent}% chỉ tiêu
          </span>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex justify-between text-xs text-muted-foreground font-semibold">
            <span>
              Đã hoàn tất:{' '}
              <strong className="text-foreground">{stats.tong_don} đơn</strong>
            </span>
            <span>
              Mục tiêu ca:{' '}
              <strong className="text-foreground">{targetDon} đơn</strong> (còn{' '}
              {remaining} đơn)
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>

          {/* Tip card */}
          <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 text-xs flex items-start gap-2.5 text-muted-foreground">
            <Lightbulb
              className="size-4 text-amber-500 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div>
              <strong className="text-foreground">Mẹo kho vận:</strong> Nhấn giữ
              bàn đạp chân hoặc dùng súng quét USB để tự động bấm quay, không
              cần chạm chuột vào màn hình máy tính.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Sub: Queue Summary Bar
// ---------------------------------------------------------------------------
function QueueSummaryBar({
  onNavigateToQueue,
  isMobile,
}: {
  onNavigateToQueue: () => void;
  isMobile?: boolean;
}) {
  const queue = useUploadStore((s) => s.queue);
  const pendingItems = queue.filter(
    (q) => q.status === 'cho_upload' || q.status === 'dang_upload'
  );
  const totalMB =
    pendingItems.reduce((sum, q) => sum + (q.kich_thuoc_bytes || 0), 0) /
    1_048_576;

  if (isMobile) {
    return (
      <div className="p-3 rounded-2xl border border-border bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <UploadCloud
            className="size-4 text-amber-500 shrink-0"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <div className="font-bold text-foreground text-[11px] truncate">
              Hàng đợi: {pendingItems.length} video ({totalMB.toFixed(1)} MB)
            </div>
            <div className="text-[9px] text-muted-foreground">
              Đang đồng bộ ngầm khi có Wi-Fi
            </div>
          </div>
        </div>
        <Button
          variant="link"
          size="sm"
          onClick={onNavigateToQueue}
          className="text-[10px] font-bold text-primary shrink-0 h-auto p-0"
        >
          Xem
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-2xl bg-muted/30 border border-border flex items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-3 min-w-0">
        <div className="size-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
          <UploadCloud className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <div className="font-bold text-foreground truncate">
            Hàng đợi tải lên: {pendingItems.length} video ({totalMB.toFixed(1)}{' '}
            MB)
          </div>
          <div className="text-[11px] text-muted-foreground truncate">
            {pendingItems.length > 0
              ? 'Tiến trình tải nền đang hoạt động'
              : 'Không có video chờ tải lên'}
          </div>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={onNavigateToQueue}
        className="h-9 px-4 rounded-xl font-semibold text-xs shrink-0"
      >
        <span>Chi tiết hàng đợi</span>
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MAIN: DashboardPage
// ---------------------------------------------------------------------------
export function DashboardPage() {
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.vai_tro === 'admin';
  const userSettings = useUserSettingsStore();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const today = new Date();
    return { from: today, to: today };
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---------- Fetch ----------
  const loadStats = useCallback(
    async (showSpinner = false) => {
      if (showSpinner) setIsRefreshing(true);
      try {
        let startDate: string | undefined;
        let endDate: string | undefined;
        if (dateRange?.from && dateRange?.to) {
          startDate = format(dateRange.from, 'yyyy-MM-dd');
          endDate = format(dateRange.to, 'yyyy-MM-dd');
        }

        const result = await fetchDashboardStats(startDate, endDate);
        setStats(result.stats);
        setIsFromCache(result.isFromCache);
        setLastUpdated(formatTime());
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [dateRange]
  );

  // Initial load
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Auto-refresh every 30s when online
  useEffect(() => {
    if (isOnline) {
      intervalRef.current = setInterval(() => {
        loadStats();
      }, REFRESH_INTERVAL_MS);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isOnline, loadStats]);

  // ---------- Navigation handlers ----------
  const onNavigateToScan = useCallback(() => navigate('/'), [navigate]);
  const onNavigateToQueue = useCallback(() => navigate('/queue'), [navigate]);
  const onNavigateToSettings = useCallback(
    () => navigate('/settings'),
    [navigate]
  );

  // ---------- Loading state ----------
  if (isLoading || !stats) {
    return <DashboardSkeleton />;
  }

  // ---------- Computed ----------
  const uploadPercent =
    stats.tong_don > 0
      ? Math.round((stats.da_upload / stats.tong_don) * 100)
      : 0;
  const avgMBPerVideo =
    stats.tong_don > 0
      ? (stats.tong_dung_luong_mb / stats.tong_don).toFixed(1)
      : '0';

  const pendingDesc =
    stats.dang_cho > 0
      ? `${stats.dang_cho} video sẵn sàng tự động đẩy lên Google Drive`
      : 'Không có video chờ tải lên';
  const errorDesc =
    stats.loi > 0
      ? `${stats.loi} video bị gián đoạn mạng khi tải lên`
      : 'Mọi video đã xử lý thành công';

  const isTodayRange =
    dateRange?.from &&
    dateRange?.to &&
    isSameDay(dateRange.from, dateRange.to) &&
    isSameDay(dateRange.from, new Date());

  const isSingleDay =
    dateRange?.from &&
    dateRange?.to &&
    isSameDay(dateRange.from, dateRange.to);

  const dateRangeLabel = isTodayRange
    ? `Hôm nay: ${formatDate()}`
    : isSingleDay
    ? `Ngày ${format(dateRange!.from!, 'dd/MM/yyyy')}`
    : dateRange?.from && dateRange?.to
    ? `Từ ${format(dateRange.from, 'dd/MM/yyyy')} đến ${format(dateRange.to, 'dd/MM/yyyy')}`
    : `Hôm nay: ${formatDate()}`;

  // =========================================================================
  // DESKTOP LAYOUT
  // =========================================================================
  const desktopContent = (
    <section className="hidden md:flex flex-1 p-6 lg:p-8 flex-col gap-6 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
              Dashboard Ca Làm Việc
            </h2>
            {!isOnline ? (
              <Badge
                variant="outline"
                className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 border-amber-500/30 flex items-center gap-1.5 animate-pulse"
              >
                <WifiOff className="size-3.5" aria-hidden="true" />
                <span>Ngoại tuyến (Offline)</span>
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border-emerald-500/25 flex items-center gap-1.5"
              >
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Hệ thống trực tuyến</span>
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
            <span>
              <strong>{dateRangeLabel}</strong>
            </span>
            <span>•</span>
            <span>
              Cập nhật lần cuối: {lastUpdated} (tự động làm mới mỗi 30s)
            </span>
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <div className={cn(!isOnline && "pointer-events-none opacity-50")}>
            <HistoryDateRangePicker
              date={dateRange}
              setDate={setDateRange}
              className="w-[240px] lg:w-[280px]"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadStats(true)}
            className="h-10 px-3 rounded-xl font-semibold text-xs"
          >
            <RotateCw
              className={cn('size-3.5', isRefreshing && 'animate-spin text-primary')}
              aria-hidden="true"
            />
            <span>Làm mới</span>
          </Button>
        </div>
      </div>

      {/* Offline Banner */}
      {!isOnline && <OfflineBanner />}

      {/* Row 1: 3 Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          label="Tổng đơn"
          value={stats.tong_don}
          unit="kiện hàng"
          icon={<Package className="size-6" aria-hidden="true" />}
          iconBgClass="bg-blue-500/10 text-blue-600"
          footer={
            <>
              <span className="text-muted-foreground">
                {isAdmin ? 'Toàn bộ kho' : `Chỉ tiêu ca: ${stats.tong_don}/${userSettings.shiftTarget}`}
              </span>
              {isFromCache ? (
                <Badge
                  variant="outline"
                  className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 font-bold text-[10px] border-transparent"
                >
                  Dữ liệu offline
                </Badge>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <TrendingUp className="size-3.5" aria-hidden="true" />
                  <span>Trực tuyến</span>
                </span>
              )}
            </>
          }
        />

        <MetricCard
          label="Đã lưu Google Drive"
          value={stats.da_upload}
          unit={`/ ${stats.tong_don} kiện (${uploadPercent}%)`}
          icon={<CheckCircle2 className="size-6" aria-hidden="true" />}
          iconBgClass="bg-emerald-500/10 text-emerald-600"
          valueColorClass="text-emerald-600 dark:text-emerald-400"
          footer={
            <div className="w-full flex flex-col gap-1.5">
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${uploadPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
                <span>Drive Stream Resumable</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  Hoàn tất {uploadPercent}%
                </span>
              </div>
            </div>
          }
        />

        <MetricCard
          label="Dung lượng video"
          value={stats.tong_dung_luong_mb}
          unit="MB"
          icon={<HardDrive className="size-6" aria-hidden="true" />}
          iconBgClass="bg-indigo-500/10 text-indigo-600"
          valueColorClass="text-indigo-600 dark:text-indigo-400"
          footer={
            <>
              <span className="text-muted-foreground">
                Trung bình: ~{avgMBPerVideo} MB / video
              </span>
              <span className="font-mono font-bold text-foreground">
                MP4 (1080p)
              </span>
            </>
          }
        />
      </div>

      {/* Row 2: Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatusCard
          count={stats.dang_cho}
          isPending
          description={pendingDesc}
          onAction={onNavigateToQueue}
        />
        <StatusCard
          count={stats.loi}
          isPending={false}
          description={errorDesc}
          onAction={onNavigateToQueue}
        />
      </div>

      {/* Hero CTA */}
      <HeroCTA onNavigateToScan={onNavigateToScan} />

      {/* Row 3: Hardware + Role Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HardwarePanel onNavigateToSettings={onNavigateToSettings} />
        {isAdmin ? (
          <AdminStaffPanel
            staff={stats.nhan_vien_hom_nay}
            totalDon={stats.tong_don}
            dateRangeLabel={dateRangeLabel}
          />
        ) : (
          <StaffProgressPanel stats={stats} />
        )}
      </div>

      {/* Queue Summary Bar */}
      <QueueSummaryBar onNavigateToQueue={onNavigateToQueue} />
    </section>
  );

  // =========================================================================
  // MOBILE LAYOUT
  // =========================================================================
  const mobileContent = (
    <section className="md:hidden p-4 flex flex-col gap-4 text-xs overflow-y-auto pb-24">
      {/* Header (simple) */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Dashboard</h2>
          <div className="flex items-center gap-2">
            {!isOnline ? (
              <Badge
                variant="outline"
                className="h-7 px-2.5 rounded-lg text-[10px] font-bold bg-amber-500 text-white border-amber-600 flex items-center gap-1"
              >
                <WifiOff className="size-3" aria-hidden="true" />
                <span>Offline</span>
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="h-7 px-2.5 rounded-lg text-[10px] font-bold bg-card border-border text-muted-foreground flex items-center gap-1"
              >
                <Wifi className="size-3" aria-hidden="true" />
                <span>Online</span>
              </Badge>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={() => loadStats(true)}
              className="size-7 rounded-lg"
            >
              <RotateCw
                className={cn('size-3', isRefreshing && 'animate-spin text-primary')}
                aria-hidden="true"
              />
            </Button>
          </div>
        </div>

        <div className={cn("w-full", !isOnline && "pointer-events-none opacity-50")}>
          <HistoryDateRangePicker
            date={dateRange}
            setDate={setDateRange}
            className="w-full"
          />
        </div>
      </div>

      {/* Offline Banner */}
      {!isOnline && <OfflineBanner isMobile />}

      {/* 4 Metrics in 2x2 Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Tổng đơn */}
        <Card className="rounded-2xl shadow-2xs">
          <CardContent className="p-3 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">
                Tổng đơn
              </span>
              <Package className="size-3.5 text-blue-500" aria-hidden="true" />
            </div>
            <div className="text-2xl font-black text-foreground font-mono mt-1">
              {stats.tong_don}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {isAdmin ? 'Toàn bộ kho' : `Chỉ tiêu: ${stats.tong_don}/35`}
            </div>
          </CardContent>
        </Card>

        {/* Đã lưu Drive */}
        <Card className="rounded-2xl shadow-2xs">
          <CardContent className="p-3 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">
                Đã lưu Drive
              </span>
              <CheckCircle2
                className="size-3.5 text-emerald-500"
                aria-hidden="true"
              />
            </div>
            <div className="text-2xl font-black text-emerald-600 font-mono mt-1">
              {stats.da_upload}
            </div>
            <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
              Tỷ lệ {uploadPercent}%
            </div>
          </CardContent>
        </Card>

        {/* Đang chờ */}
        <Card
          className={cn(
            'rounded-2xl shadow-2xs',
            'border-amber-500/30 bg-amber-500/5'
          )}
        >
          <CardContent className="p-3 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-amber-600 uppercase">
                Đang chờ
              </span>
              <Clock className="size-3.5 text-amber-500" aria-hidden="true" />
            </div>
            <div className="text-2xl font-black text-amber-600 font-mono mt-1">
              {stats.dang_cho}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Chờ đồng bộ
            </div>
          </CardContent>
        </Card>

        {/* Lỗi upload */}
        <Card
          className={cn(
            'rounded-2xl shadow-2xs',
            stats.loi > 0
              ? 'border-rose-500/30 bg-rose-500/5'
              : 'border-border bg-card'
          )}
        >
          <CardContent className="p-3 pt-3">
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  'text-[10px] font-bold uppercase',
                  stats.loi > 0 ? 'text-rose-600' : 'text-muted-foreground'
                )}
              >
                Lỗi upload
              </span>
              {stats.loi > 0 ? (
                <AlertTriangle
                  className="size-3.5 text-rose-500"
                  aria-hidden="true"
                />
              ) : (
                <Check
                  className="size-3.5 text-emerald-500"
                  aria-hidden="true"
                />
              )}
            </div>
            <div
              className={cn(
                'text-2xl font-black font-mono mt-1',
                stats.loi > 0 ? 'text-rose-600' : 'text-foreground'
              )}
            >
              {stats.loi}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {stats.loi > 0 ? 'Cần tải lại' : 'Hoàn tất tốt'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Storage MB Card */}
      <Card className="rounded-2xl shadow-2xs">
        <CardContent className="p-3 pt-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
              <HardDrive className="size-4" aria-hidden="true" />
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">
                Tổng dung lượng video
              </div>
              <div className="font-mono font-bold text-sm text-foreground">
                {stats.tong_dung_luong_mb} MB
              </div>
            </div>
          </div>
          <Badge
            variant="secondary"
            className="text-[10px] font-semibold"
          >
            1080p MP4
          </Badge>
        </CardContent>
      </Card>

      {/* CTA Card */}
      <MobileHeroCTA onNavigateToScan={onNavigateToScan} />

      {/* Camera Info Pill */}
      <MobileCameraPill onNavigateToSettings={onNavigateToSettings} />

      {/* Queue Summary */}
      <QueueSummaryBar onNavigateToQueue={onNavigateToQueue} isMobile />
    </section>
  );

  return (
    <>
      {desktopContent}
      {mobileContent}
    </>
  );
}

// ---------------------------------------------------------------------------
// Mobile-specific sub-components
// ---------------------------------------------------------------------------

function MobileHeroCTA({ onNavigateToScan }: { onNavigateToScan: () => void }) {
  const { workMode, setWorkMode } = useWorkModeStore();

  return (
    <Card className="rounded-3xl border-2 border-primary/40 bg-gradient-to-br from-primary/10 via-card to-card shadow-sm">
      <CardContent className="p-4 pt-4 flex flex-col gap-3">
        {/* Work Mode Toggle */}
        <div className="grid grid-cols-2 gap-1 bg-muted/60 p-0.5 rounded-xl border border-border/70 text-[11px] font-bold">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setWorkMode('dong_goi')}
            className={cn(
              'h-auto py-1.5 rounded-lg flex items-center justify-center gap-1',
              workMode === 'dong_goi'
                ? 'bg-blue-600 text-white shadow-xs hover:bg-blue-600 hover:text-white'
                : 'text-muted-foreground'
            )}
          >
            <Package className="size-3" aria-hidden="true" />
            <span>Đóng gói</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setWorkMode('khui_hang')}
            className={cn(
              'h-auto py-1.5 rounded-lg flex items-center justify-center gap-1',
              workMode === 'khui_hang'
                ? 'bg-amber-600 text-white shadow-xs hover:bg-amber-600 hover:text-white'
                : 'text-muted-foreground'
            )}
          >
            <PackageOpen className="size-3" aria-hidden="true" />
            <span>Khui hàng</span>
          </Button>
        </div>

        <Button
          size="lg"
          onClick={onNavigateToScan}
          className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-transform"
        >
          <ScanLine className="size-5" aria-hidden="true" />
          <span>BẮT ĐẦU QUÉT MÃ ĐƠN</span>
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </CardContent>
    </Card>
  );
}

function MobileCameraPill({
  onNavigateToSettings,
}: {
  onNavigateToSettings: () => void;
}) {
  const { devices, selectedDeviceId } = useCameraStore();
  const selectedDevice = devices.find((d) => d.deviceId === selectedDeviceId);
  const label = selectedDevice?.label || 'Chưa chọn camera';
  const warehouseName = useConfigStore((s) => s.warehouseName);
  const isCameraReady = !!selectedDeviceId;

  return (
    <Card className="rounded-2xl shadow-2xs">
      <CardContent className="p-3 pt-3 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Camera
            className={cn('size-4 shrink-0', isCameraReady ? 'text-emerald-500' : 'text-muted-foreground')}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <div className="font-bold text-foreground text-[11px] truncate">
              {label}
            </div>
            <div className="text-[9px] text-muted-foreground">
              {warehouseName || 'Chưa thiết lập'}
            </div>
          </div>
        </div>
        <Button
          variant="link"
          size="sm"
          onClick={onNavigateToSettings}
          className="text-[10px] font-bold text-primary shrink-0 h-auto p-0"
        >
          Đổi
        </Button>
      </CardContent>
    </Card>
  );
}
