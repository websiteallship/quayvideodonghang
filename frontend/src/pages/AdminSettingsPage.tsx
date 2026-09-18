import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  HardDrive,
  Video,
  ToggleLeft,
  Truck,
  Clock,
  Archive,
  RefreshCw,
  Save,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Building2,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { apiClient } from '@/services/api-client';
import { API_ENDPOINTS } from '@/config/api';
import { useConfigStore } from '@/stores/config-store';
import { showToast } from '@/stores/toast-store';
import type { CauHinhData, CauHinhKey, DriveTestResult, RetentionStatus, RetentionRunResult } from '@/types/admin';

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------
const DEFAULT_CONFIG: CauHinhData = {
  drive_folder_id: '',
  sheet_id: '',
  do_phan_giai: '1280x720',
  bitrate_mbps: '2.5',
  auto_scan: 'false',
  quay_lien_tuc: 'false',
  watermark: 'true',
  don_vi_vc_danh_sach: 'GHN,GHTK,J&T,VTP,Ninja Van,Shopee Express,Best Express,Khác',
  retention_archive_days: '30',
  retention_delete_days: '60',
  retention_thang: '6',
};

const RESOLUTION_OPTIONS = [
  { value: '1920x1080', label: '1080p (Full HD)' },
  { value: '1280x720', label: '720p (HD)' },
  { value: '640x480', label: '480p (SD)' },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function SettingsSection({
  icon: Icon,
  iconColor,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-3xl shadow-xs">
      <CardContent className="flex flex-col gap-5 p-5 md:p-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5 text-base font-bold text-foreground">
            <Icon className={cn('size-5', iconColor)} aria-hidden="true" />
            <span>{title}</span>
          </div>
          {description && (
            <p className="text-xs text-muted-foreground ml-7.5">{description}</p>
          )}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
  id,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  id: string;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/40 last:border-0">
      <div className="min-w-0 flex-1 pr-4">
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        aria-label={title}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          checked ? 'bg-primary' : 'bg-muted'
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block size-6 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200',
            checked ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export const AdminSettingsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeTab = searchParams.get('tab') || 'drive';

  const [config, setConfig] = useState<CauHinhData>(DEFAULT_CONFIG);
  const [originalConfig, setOriginalConfig] = useState<CauHinhData>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [driveTest, setDriveTest] = useState<DriveTestResult | null>(null);
  const [testingDrive, setTestingDrive] = useState(false);

  // ─── Data Retention State ───
  const [retentionStatus, setRetentionStatus] = useState<RetentionStatus | null>(null);
  const [loadingRetention, setLoadingRetention] = useState(false);
  const [runningRetention, setRunningRetention] = useState(false);
  const [confirmRetentionOpen, setConfirmRetentionOpen] = useState(false);

  const fetchRetentionStatus = useCallback(async () => {
    setLoadingRetention(true);
    try {
      const res = await apiClient
        .get(API_ENDPOINTS.ADMIN.RETENTION.STATUS)
        .json<{ success: boolean; data: RetentionStatus }>();
      if (res.success && res.data) {
        setRetentionStatus(res.data);
      }
    } catch {
      // Non-blocking
    } finally {
      setLoadingRetention(false);
    }
  }, []);

  const handleRunRetention = useCallback(async () => {
    setRunningRetention(true);
    setConfirmRetentionOpen(false);
    try {
      const res = await apiClient
        .post(API_ENDPOINTS.ADMIN.RETENTION.RUN)
        .json<{ success: boolean; data: RetentionRunResult; error?: { message: string } }>();
      if (res.success && res.data) {
        showToast.success(
          'Dọn dẹp hoàn tất',
          `Đã lưu trữ ${res.data.archived_count} video, xoá ${res.data.deleted_count} video khỏi Drive (${res.data.execution_time_ms}ms)`
        );
        void fetchRetentionStatus();
      } else {
        showToast.error('Lỗi thực thi', res.error?.message || 'Không thể chạy dọn dẹp video');
      }
    } catch (err: unknown) {
      showToast.error('Lỗi kết nối', 'Không thể gửi yêu cầu dọn dẹp');
    } finally {
      setRunningRetention(false);
    }
  }, [fetchRetentionStatus]);

  useEffect(() => {
    void fetchRetentionStatus();
  }, [fetchRetentionStatus]);

  const handleTabChange = (val: string) => {
    setSearchParams({ tab: val });
    if (val === 'retention') {
      void fetchRetentionStatus();
    }
  };

  // Fetch config on mount
  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await apiClient
          .get(API_ENDPOINTS.ADMIN.CAU_HINH.GET)
          .json<{ success: boolean; data: CauHinhData }>();
        if (res.success && res.data) {
          const merged = { ...DEFAULT_CONFIG, ...res.data };
          setConfig(merged);
          setOriginalConfig(merged);
        }
      } catch {
        showToast.error('Lỗi tải dữ liệu', 'Không thể tải cấu hình hệ thống');
      } finally {
        setLoading(false);
      }
    }
    void fetchConfig();
  }, []);

  const isDirty = JSON.stringify(config) !== JSON.stringify(originalConfig);

  // Extract Google ID từ URL nếu user paste full URL
  const extractGoogleId = useCallback((key: CauHinhKey, value: string): string => {
    if (key === 'drive_folder_id') {
      // https://drive.google.com/drive/folders/{ID} hoặc https://drive.google.com/drive/u/0/folders/{ID}
      const m = value.match(/\/folders\/([a-zA-Z0-9_-]+)/);
      if (m) return m[1];
    }
    if (key === 'sheet_id') {
      // https://docs.google.com/spreadsheets/d/{ID}/...
      const m = value.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
      if (m) return m[1];
    }
    return value;
  }, []);

  const updateField = useCallback((key: CauHinhKey, value: string) => {
    const cleanValue = extractGoogleId(key, value.trim());
    setConfig((prev) => ({ ...prev, [key]: cleanValue }));
  }, [extractGoogleId]);

  // Save all
  const handleSaveAll = useCallback(async () => {
    setSaving(true);
    try {
      const changedKeys = (Object.keys(config) as CauHinhKey[]).filter(
        (k) => config[k] !== originalConfig[k]
      );
      if (changedKeys.length === 0) {
        showToast.info('Thông báo', 'Không có thay đổi nào để lưu');
        return;
      }
      const configs: Record<string, string> = {};
      for (const k of changedKeys) {
        configs[k] = config[k] ?? '';
      }

      const res = await apiClient
        .patch(API_ENDPOINTS.ADMIN.CAU_HINH.BATCH, { json: { configs } })
        .json<{ success: boolean }>();

      if (res.success) {
        setOriginalConfig({ ...config });
        void useConfigStore.getState().fetchSystemConfig();
        showToast.success('Đã lưu cấu hình', 'Đã lưu cấu hình hệ thống thành công');
      }
    } catch {
      showToast.error('Lỗi lưu cấu hình', 'Lỗi khi lưu cấu hình');
    } finally {
      setSaving(false);
    }
  }, [config, originalConfig]);

  // Test Drive — truyền folder_id hiện tại trên form (không chờ lưu DB)
  const handleTestDrive = useCallback(async () => {
    setTestingDrive(true);
    setDriveTest(null);
    try {
      const folderId = config.drive_folder_id?.trim();
      const res = await apiClient
        .post(API_ENDPOINTS.ADMIN.CAU_HINH.TEST_DRIVE, {
          json: folderId ? { folder_id: folderId } : {},
        })
        .json<{ success: boolean; data: DriveTestResult }>();
      if (res.success && res.data) {
        setDriveTest(res.data);
        showToast.success('Kiểm tra Google Drive', 'Kiểm tra kết nối Google Drive thành công');
      }
    } catch {
      showToast.error('Lỗi kết nối', 'Không thể kết nối Google Drive');
    } finally {
      setTestingDrive(false);
    }
  }, [config.drive_folder_id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const storagePercent =
    driveTest && driveTest.dung_luong_tong_gb > 0
      ? Math.round((driveTest.dung_luong_da_dung_gb / driveTest.dung_luong_tong_gb) * 100)
      : 0;

  return (
    <div className="flex flex-col gap-4 lg:gap-6 w-full">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
          Cấu hình Hệ thống
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Thiết lập toàn cục cho hệ thống kho vận — chỉ Quản trị viên có quyền thay đổi
        </p>
      </div>

      {/* ─── Horizontal Tabs Navigation ─── */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full flex flex-col gap-4 lg:gap-6">
        {/* Scrollable Horizontal Tabs List */}
        <div className="overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex h-12 w-full min-w-max sm:min-w-0 items-center justify-start sm:grid sm:grid-cols-5 rounded-2xl bg-muted/70 p-1 border border-border/50 gap-1 sm:gap-0">
            <TabsTrigger
              value="drive"
              className="flex items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-4 py-2 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs min-h-[40px] shrink-0"
            >
              <HardDrive className="size-4 shrink-0 text-emerald-500" aria-hidden="true" />
              <span>Google Drive</span>
            </TabsTrigger>
            <TabsTrigger
              value="video"
              className="flex items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-4 py-2 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs min-h-[40px] shrink-0"
            >
              <Video className="size-4 shrink-0 text-primary" aria-hidden="true" />
              <span>Chất lượng Video</span>
            </TabsTrigger>
            <TabsTrigger
              value="system"
              className="flex items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-4 py-2 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs min-h-[40px] shrink-0"
            >
              <ToggleLeft className="size-4 shrink-0 text-blue-500" aria-hidden="true" />
              <span>Hệ thống</span>
            </TabsTrigger>
            <TabsTrigger
              value="retention"
              className="flex items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-4 py-2 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs min-h-[40px] shrink-0"
            >
              <Archive className="size-4 shrink-0 text-violet-500" aria-hidden="true" />
              <span>Vòng đời Video</span>
            </TabsTrigger>

          </TabsList>
        </div>

        {/* ═══ Tab 1: Google Drive ═══ */}
        <TabsContent value="drive" className="mt-0 focus-visible:outline-none">
          <SettingsSection
            icon={HardDrive}
            iconColor="text-emerald-500"
            title="Kết nối Google Drive"
            description="Service Account và Shared Drive lưu trữ video"
          >
            <div className="flex flex-col gap-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                    Drive Folder ID
                  </label>
                  <Input
                    value={config.drive_folder_id ?? ''}
                    onChange={(e) => updateField('drive_folder_id', e.target.value)}
                    placeholder="1abc... (ID thư mục gốc)"
                    className="h-11 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                    Google Sheet ID (Log metadata)
                  </label>
                  <Input
                    value={config.sheet_id ?? ''}
                    onChange={(e) => updateField('sheet_id', e.target.value)}
                    placeholder="1xyz... (ID Google Sheet)"
                    className="h-11 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <Separator />

              {/* Test Drive Button + Results */}
              <div className="flex flex-col gap-3">
                <Button
                  variant="outline"
                  className="h-11 gap-2 rounded-2xl text-xs font-bold w-full sm:w-auto"
                  onClick={handleTestDrive}
                  disabled={testingDrive}
                >
                  {testingDrive ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <RefreshCw className="size-4" aria-hidden="true" />
                  )}
                  {testingDrive ? 'Đang kiểm tra...' : 'Kiểm tra kết nối Drive'}
                </Button>

                {driveTest && (
                  <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      {driveTest.ket_noi_ok ? (
                        <CheckCircle className="size-4 text-emerald-500 shrink-0" aria-hidden="true" />
                      ) : (
                        <XCircle className="size-4 text-rose-500 shrink-0" aria-hidden="true" />
                      )}
                      <span
                        className={cn(
                          'text-xs font-semibold',
                          driveTest.ket_noi_ok ? 'text-emerald-600' : 'text-rose-600'
                        )}
                      >
                        {driveTest.ket_noi_ok ? 'Kết nối thành công' : 'Kết nối thất bại'}
                      </span>
                    </div>

                    {driveTest.service_account_email && (
                      <div className="text-[11px] text-muted-foreground font-mono truncate">
                        {driveTest.service_account_email}
                      </div>
                    )}

                    {driveTest.dung_luong_tong_gb > 0 && (
                      <div>
                        <div className="mb-1.5 flex justify-between text-xs font-semibold text-muted-foreground">
                          <span>Dung lượng đã dùng</span>
                          <span className="font-mono font-bold text-foreground">
                            {driveTest.dung_luong_da_dung_gb.toFixed(1)} GB / {driveTest.dung_luong_tong_gb.toFixed(0)} GB ({storagePercent}%)
                          </span>
                        </div>
                        <Progress value={storagePercent} className="h-2.5 rounded-full" />
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          Còn lại: <strong className="text-foreground">{driveTest.dung_luong_con_lai_gb.toFixed(1)} GB</strong>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      {driveTest.file_test_ok ? (
                        <CheckCircle className="size-3.5 text-emerald-500 shrink-0" aria-hidden="true" />
                      ) : (
                        <AlertTriangle className="size-3.5 text-amber-500 shrink-0" aria-hidden="true" />
                      )}
                      <span className="text-[11px] text-muted-foreground">
                        Quyền ghi: {driveTest.file_test_ok ? 'OK' : 'Chưa xác nhận (cần cấu hình Folder ID)'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </SettingsSection>
        </TabsContent>

        {/* ═══ Tab 2: Video Quality ═══ */}
        <TabsContent value="video" className="mt-0 focus-visible:outline-none">
          <SettingsSection
            icon={Video}
            iconColor="text-primary"
            title="Chất lượng Video mặc định"
            description="Áp dụng cho tất cả trạm kho (NV có thể override cục bộ)"
          >
            <div className="flex flex-col gap-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                    Độ phân giải mặc định
                  </label>
                  <select
                    value={config.do_phan_giai ?? '1280x720'}
                    onChange={(e) => updateField('do_phan_giai', e.target.value)}
                    className="h-11 w-full rounded-xl border border-border bg-muted/40 px-3 text-xs font-medium text-foreground focus:outline-none"
                  >
                    {RESOLUTION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                    Bitrate video (Mbps)
                  </label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="10"
                    value={config.bitrate_mbps ?? '2.5'}
                    onChange={(e) => updateField('bitrate_mbps', e.target.value)}
                    className="h-11 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </SettingsSection>
        </TabsContent>

        {/* ═══ Tab 3: System Features ═══ */}
        <TabsContent value="system" className="mt-0 focus-visible:outline-none flex flex-col gap-4 lg:gap-6">
          {/* Feature Toggles */}
          <SettingsSection
            icon={ToggleLeft}
            iconColor="text-blue-500"
            title="Tính năng Hệ thống"
            description="Bật/tắt các chức năng toàn cục"
          >
            <div className="flex flex-col">
              <ToggleRow
                id="admin-auto-scan"
                title="Tự động quay sau quét (Auto Scan)"
                description="Tự động kích hoạt ghi hình sau khi nhận mã từ súng quét barcode (chỉ áp dụng cho súng quét, không áp dụng camera)"
                checked={config.auto_scan === 'true'}
                onChange={(v) => updateField('auto_scan', v ? 'true' : 'false')}
              />
              <ToggleRow
                id="admin-quay-lien-tuc"
                title="Quay liên tục (Continuous Mode)"
                description="Bắn súng quét để tự động cắt và chuyển đơn khi đang quay (chỉ áp dụng cho súng quét, không áp dụng camera tránh quét nhầm)"
                checked={config.quay_lien_tuc === 'true'}
                onChange={(v) => updateField('quay_lien_tuc', v ? 'true' : 'false')}
              />
              <ToggleRow
                id="admin-watermark"
                title="Watermark trên Video"
                description="Chèn thông tin mã đơn, thời gian và trạm kho lên khung hình video"
                checked={config.watermark === 'true'}
                onChange={(v) => updateField('watermark', v ? 'true' : 'false')}
              />
            </div>
          </SettingsSection>

          {/* Carrier List Redirection Banner */}
          <SettingsSection
            icon={Truck}
            iconColor="text-amber-500"
            title="Danh sách Đơn vị Vận chuyển"
            description="Quản lý ĐVVC đã được chuyển sang menu page riêng biệt kèm phân trang và tìm kiếm"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Truck className="size-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">Quản lý Đơn vị Vận chuyển</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Xem toàn bộ ĐVVC mặc định hệ thống, thêm/sửa/xóa ĐVVC mới, tìm kiếm và phân trang hoàn chỉnh.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin/carriers')}
                className="rounded-xl text-xs font-bold gap-1.5 h-9 shrink-0 border-amber-500/30 hover:bg-amber-500/10 cursor-pointer"
              >
                <span>Mở trang ĐVVC</span>
                <ExternalLink className="size-3.5" />
              </Button>
            </div>
          </SettingsSection>

          {/* Warehouse List Redirection Banner */}
          <SettingsSection
            icon={Building2}
            iconColor="text-amber-500"
            title="Quản lý Danh mục Kho Vận"
            description="Cấu hình kho vận đã được chuyển sang menu page riêng biệt"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Building2 className="size-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">Quản lý Kho vận</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Cấu hình danh sách kho vận chuẩn và chỉ định kho mặc định cho toàn bộ trạm làm việc.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin/warehouses')}
                className="rounded-xl text-xs font-bold gap-1.5 h-9 shrink-0 border-amber-500/30 hover:bg-amber-500/10 cursor-pointer"
              >
                <span>Mở trang Kho vận</span>
                <ExternalLink className="size-3.5" />
              </Button>
            </div>
          </SettingsSection>
        </TabsContent>

        {/* ═══ Tab 4: Video Data Retention ═══ */}
        <TabsContent value="retention" className="mt-0 focus-visible:outline-none flex flex-col gap-4 lg:gap-6">
          <SettingsSection
            icon={Archive}
            iconColor="text-violet-500"
            title="Quản lý Vòng đời & Lưu trữ Video (Data Retention)"
            description="Tự động phân loại lưu trữ (Archive) và xoá file Drive vĩnh viễn (Delete) theo số ngày"
          >
            <div className="flex flex-col gap-5">
              {/* Policy Explanation Banner */}
              <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4 text-xs flex flex-col gap-2">
                <div className="flex items-center gap-2 font-bold text-violet-700 dark:text-violet-300">
                  <Clock className="size-4 shrink-0" />
                  <span>Quy trình vòng đời video 2 giai đoạn</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-muted-foreground mt-1">
                  <div className="flex items-start gap-2 bg-background/60 p-3 rounded-xl border border-border/50">
                    <div className="size-5 rounded-full bg-violet-500/10 text-violet-600 font-bold flex items-center justify-center shrink-0 text-[10px]">
                      1
                    </div>
                    <div>
                      <span className="font-semibold text-foreground">Giai đoạn 1 — Lưu trữ (Archive):</span>
                      <p className="mt-0.5 text-[11px]">
                        Video quá hạn lưu trữ đổi trạng thái sang <span className="font-mono font-bold text-violet-600 dark:text-violet-400">Đã lưu trữ</span>. File video trên Google Drive vẫn được giữ nguyên.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 bg-background/60 p-3 rounded-xl border border-border/50">
                    <div className="size-5 rounded-full bg-rose-500/10 text-rose-600 font-bold flex items-center justify-center shrink-0 text-[10px]">
                      2
                    </div>
                    <div>
                      <span className="font-semibold text-foreground">Giai đoạn 2 — Xoá vĩnh viễn (Delete):</span>
                      <p className="mt-0.5 text-[11px]">
                        Video quá hạn xoá sẽ bị <span className="font-mono font-bold text-rose-600 dark:text-rose-400">xoá vĩnh viễn khỏi Drive</span> và xoá link video tương ứng trên Google Sheet.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2 Config Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 p-4 rounded-2xl border border-border/60 bg-muted/20">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-bold text-foreground">
                      Thời gian trước khi Lưu trữ (Archive)
                    </label>
                    <Badge variant="outline" className="text-[10px] border-violet-500/30 text-violet-600 font-mono">
                      Giữ file Drive
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Số ngày từ lúc tải lên trước khi chuyển trạng thái sang lưu trữ
                  </p>
                  <div className="flex items-center gap-2.5 mt-2">
                    <Input
                      type="number"
                      min="1"
                      max="365"
                      value={config.retention_archive_days ?? '30'}
                      onChange={(e) => updateField('retention_archive_days', e.target.value)}
                      className="h-10 w-24 rounded-xl text-xs font-mono text-center font-bold"
                    />
                    <span className="text-xs font-medium text-muted-foreground">ngày</span>
                    <span className="text-[11px] text-muted-foreground italic ml-auto">
                      (Mặc định: 30 ngày)
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 p-4 rounded-2xl border border-border/60 bg-muted/20">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-bold text-foreground">
                      Thời gian trước khi Xoá vĩnh viễn (Delete)
                    </label>
                    <Badge variant="destructive" className="text-[10px] font-mono">
                      Xoá file Drive & Sheet
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Số ngày từ lúc tải lên trước khi xóa vĩnh viễn khỏi Drive & Sheet
                  </p>
                  <div className="flex items-center gap-2.5 mt-2">
                    <Input
                      type="number"
                      min="1"
                      max="365"
                      value={config.retention_delete_days ?? '60'}
                      onChange={(e) => updateField('retention_delete_days', e.target.value)}
                      className="h-10 w-24 rounded-xl text-xs font-mono text-center font-bold"
                    />
                    <span className="text-xs font-medium text-muted-foreground">ngày</span>
                    <span className="text-[11px] text-muted-foreground italic ml-auto">
                      (Mặc định: 60 ngày)
                    </span>
                  </div>
                </div>
              </div>

              {/* Retention Metrics & Real-time Status Card */}
              <div className="p-4 rounded-2xl border border-border/70 bg-card/60 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-foreground">Trạng thái Dọn dẹp & Lưu trữ Hiện tại</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">
                      Lần chạy cuối: {retentionStatus?.last_run ? new Date(retentionStatus.last_run).toLocaleString('vi-VN') : 'Chưa chạy'}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void fetchRetentionStatus()}
                      disabled={loadingRetention}
                      className="size-7 p-0 rounded-lg cursor-pointer"
                      title="Làm mới trạng thái"
                    >
                      <RefreshCw className={cn('size-3.5', loadingRetention && 'animate-spin')} />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-2.5 rounded-xl bg-violet-500/5 border border-violet-500/10 flex flex-col">
                    <span className="text-[10px] text-muted-foreground font-medium">Chờ Lưu trữ</span>
                    <span className="text-lg font-bold font-mono text-violet-600 dark:text-violet-400 mt-0.5">
                      {retentionStatus?.pending_archive_count ?? 0}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-rose-500/5 border border-rose-500/10 flex flex-col">
                    <span className="text-[10px] text-muted-foreground font-medium">Chờ Xoá Drive</span>
                    <span className="text-lg font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5">
                      {retentionStatus?.pending_delete_count ?? 0}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 flex flex-col">
                    <span className="text-[10px] text-muted-foreground font-medium">Đã Lưu trữ</span>
                    <span className="text-lg font-bold font-mono text-foreground mt-0.5">
                      {retentionStatus?.total_archived ?? 0}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 flex flex-col">
                    <span className="text-[10px] text-muted-foreground font-medium">Đã Xoá</span>
                    <span className="text-lg font-bold font-mono text-muted-foreground mt-0.5">
                      {retentionStatus?.total_deleted ?? 0}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <p className="text-[11px] text-muted-foreground">
                    Hệ thống tự động chạy Cron Trigger mỗi ngày vào lúc <span className="font-mono font-semibold text-foreground">02:00 AM</span>.
                  </p>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => setConfirmRetentionOpen(true)}
                    disabled={runningRetention || (retentionStatus?.pending_archive_count === 0 && retentionStatus?.pending_delete_count === 0)}
                    className="h-9 px-3.5 rounded-xl text-xs font-bold gap-2 cursor-pointer shrink-0 ml-auto sm:ml-0"
                  >
                    {runningRetention ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        <span>Đang xử lý dọn dẹp...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="size-3.5" />
                        <span>Chạy dọn dẹp ngay</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </SettingsSection>
        </TabsContent>

      </Tabs>

      {/* ─── Save All Button ─── */}
      <div className="sticky bottom-4 lg:bottom-8 z-10">
        <Button
          className={cn(
            'w-full h-14 gap-2.5 rounded-2xl text-sm font-bold shadow-lg transition-all',
            isDirty
              ? 'bg-primary hover:bg-primary/90'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          )}
          onClick={handleSaveAll}
          disabled={!isDirty || saving}
        >
          {saving ? (
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="size-5" aria-hidden="true" />
          )}
          {saving ? 'Đang lưu...' : isDirty ? 'Lưu tất cả thay đổi' : 'Không có thay đổi'}
        </Button>
      </div>

      {/* ═══ Manual Retention Run Confirmation Dialog ═══ */}
      <AlertDialog open={confirmRetentionOpen} onOpenChange={setConfirmRetentionOpen}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
              <Trash2 className="size-5" />
              <span>Xác nhận chạy dọn dẹp & lưu trữ video?</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground flex flex-col gap-2 pt-2">
              <span>
                Hệ thống sẽ thực thi ngay chính sách lưu trữ:
              </span>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  Video quá <strong className="text-foreground">{config.retention_archive_days ?? '30'} ngày</strong> sẽ được chuyển sang trạng thái <strong>Đã lưu trữ</strong> (file Google Drive giữ nguyên).
                </li>
                <li>
                  Video quá <strong className="text-foreground">{config.retention_delete_days ?? '60'} ngày</strong> sẽ bị <strong className="text-rose-600">xoá vĩnh viễn khỏi Google Drive</strong> và xoá link video trên Google Sheet.
                </li>
              </ul>
              <span className="font-semibold text-rose-600 pt-1">
                Lưu ý: Thao tác xoá file trên Google Drive không thể khôi phục!
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 rounded-xl text-destructive-foreground font-semibold cursor-pointer"
              onClick={() => void handleRunRetention()}
            >
              Bắt đầu dọn dẹp
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminSettingsPage;
