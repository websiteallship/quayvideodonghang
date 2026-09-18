import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  HardDrive,
  Video,
  ToggleLeft,
  Truck,
  Clock,
  RefreshCw,
  Save,
  CheckCircle,
  XCircle,
  Loader2,
  Plus,
  X,
  AlertTriangle,
  Building2,
  Pencil,
  Trash2,
  Star,
  MapPin,
  Check,
  Search,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Pagination, PaginationInfo, PaginationLimitSelect } from '@/components/ui/pagination';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import type { CauHinhData, CauHinhKey, DriveTestResult } from '@/types/admin';
import type { KhoHang, KhoHangFormData } from '@/types/kho-hang';

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

  // ─── Warehouse Management State ───
  const [warehouses, setWarehouses] = useState<KhoHang[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [createWarehouseOpen, setCreateWarehouseOpen] = useState(false);
  const [editWarehouse, setEditWarehouse] = useState<KhoHang | null>(null);
  const [deleteWarehouse, setDeleteWarehouse] = useState<KhoHang | null>(null);

  const [warehouseForm, setWarehouseForm] = useState<KhoHangFormData>({
    ten: '',
    dia_chi: '',
    la_mac_dinh: false,
    trang_thai: 'hoat_dong',
  });
  const [submittingWarehouse, setSubmittingWarehouse] = useState(false);

  // ─── Warehouse Pagination & Filter State ───
  const [warehousePage, setWarehousePage] = useState(1);
  const [warehouseLimit, setWarehouseLimit] = useState(10);
  const [warehouseSearch, setWarehouseSearch] = useState('');

  const filteredWarehouses = useMemo(() => {
    if (!warehouseSearch.trim()) return warehouses;
    const q = warehouseSearch.trim().toLowerCase();
    return warehouses.filter(
      (k) =>
        k.ten.toLowerCase().includes(q) ||
        (k.dia_chi && k.dia_chi.toLowerCase().includes(q))
    );
  }, [warehouses, warehouseSearch]);

  const totalWarehouseItems = filteredWarehouses.length;
  const warehouseTotalPages = Math.max(1, Math.ceil(totalWarehouseItems / warehouseLimit));
  const warehouseStartIndex = totalWarehouseItems === 0 ? 0 : (warehousePage - 1) * warehouseLimit + 1;
  const warehouseEndIndex = Math.min(warehousePage * warehouseLimit, totalWarehouseItems);
  const paginatedWarehouses = useMemo(() => {
    const start = (warehousePage - 1) * warehouseLimit;
    return filteredWarehouses.slice(start, start + warehouseLimit);
  }, [filteredWarehouses, warehousePage, warehouseLimit]);

  // Fetch admin warehouses
  const fetchWarehouses = useCallback(async () => {
    setLoadingWarehouses(true);
    try {
      const res = await apiClient
        .get(API_ENDPOINTS.ADMIN.KHO_HANG.LIST)
        .json<{ success: boolean; data: { items: KhoHang[] } }>();
      if (res.success && res.data) {
        setWarehouses(res.data.items || []);
      }
    } catch {
      showToast.error('Lỗi tải dữ liệu', 'Không thể tải danh sách kho');
    } finally {
      setLoadingWarehouses(false);
    }
  }, []);

  const handleCreateWarehouse = useCallback(async () => {
    const trimmedTen = warehouseForm.ten.trim();
    if (!trimmedTen) {
      showToast.error('Thiếu thông tin', 'Vui lòng nhập tên kho');
      return;
    }
    setSubmittingWarehouse(true);
    try {
      const payload = {
        ten: trimmedTen,
        dia_chi: warehouseForm.dia_chi?.trim() || '',
        la_mac_dinh: Boolean(warehouseForm.la_mac_dinh),
      };

      const res = await apiClient
        .post(API_ENDPOINTS.ADMIN.KHO_HANG.CREATE, {
          json: payload,
        })
        .json<{ success: boolean; data?: KhoHang; error?: { message: string } }>();

      if (res.success) {
        showToast.success('Đã lưu kho vận', `Đã tạo kho "${trimmedTen}" thành công`);
        setCreateWarehouseOpen(false);
        setWarehouseForm({
          ten: '',
          dia_chi: '',
          la_mac_dinh: false,
          trang_thai: 'hoat_dong',
        });
        void fetchWarehouses();
        void useConfigStore.getState().fetchWarehouses();
      } else {
        showToast.error('Lỗi khi tạo kho', res.error?.message || 'Không thể tạo kho');
      }
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        try {
          const errorJson = await (err as any).response.json();
          showToast.error('Lỗi khi tạo kho', errorJson.error?.message || 'Không thể tạo kho');
          return;
        } catch {
          // ignore
        }
      }
      showToast.error('Lỗi kết nối', 'Lỗi khi gửi yêu cầu tạo kho');
    } finally {
      setSubmittingWarehouse(false);
    }
  }, [warehouseForm, fetchWarehouses]);

  const handleUpdateWarehouse = useCallback(async () => {
    if (!editWarehouse) return;
    const trimmedTen = warehouseForm.ten.trim();
    if (!trimmedTen) {
      showToast.error('Thiếu thông tin', 'Vui lòng nhập tên kho');
      return;
    }
    setSubmittingWarehouse(true);
    try {
      const payload = {
        ten: trimmedTen,
        dia_chi: warehouseForm.dia_chi?.trim() || '',
        la_mac_dinh: Boolean(warehouseForm.la_mac_dinh),
        trang_thai: warehouseForm.trang_thai || 'hoat_dong',
      };

      const res = await apiClient
        .put(API_ENDPOINTS.ADMIN.KHO_HANG.UPDATE(editWarehouse.id), {
          json: payload,
        })
        .json<{ success: boolean; error?: { message: string } }>();

      if (res.success) {
        showToast.success('Đã lưu kho vận', `Đã cập nhật kho "${trimmedTen}" thành công`);
        setEditWarehouse(null);
        void fetchWarehouses();
        void useConfigStore.getState().fetchWarehouses();
      } else {
        showToast.error('Lỗi khi cập nhật kho', res.error?.message || 'Không thể cập nhật kho');
      }
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        try {
          const errorJson = await (err as any).response.json();
          showToast.error('Lỗi khi cập nhật kho', errorJson.error?.message || 'Không thể cập nhật kho');
          return;
        } catch {
          // ignore
        }
      }
      showToast.error('Lỗi kết nối', 'Lỗi khi cập nhật kho');
    } finally {
      setSubmittingWarehouse(false);
    }
  }, [editWarehouse, warehouseForm, fetchWarehouses]);

  useEffect(() => {
    void fetchWarehouses();
  }, [fetchWarehouses]);

  const handleTabChange = (val: string) => {
    setSearchParams({ tab: val });
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
          <TabsList className="inline-flex h-12 w-full min-w-max sm:min-w-0 items-center justify-start sm:grid sm:grid-cols-4 rounded-2xl bg-muted/70 p-1 border border-border/50 gap-1 sm:gap-0">
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
              <ToggleLeft className="size-4 shrink-0 text-violet-500" aria-hidden="true" />
              <span>Hệ thống</span>
            </TabsTrigger>
            <TabsTrigger
              value="warehouses"
              className="flex items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-4 py-2 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs min-h-[40px] shrink-0"
            >
              <Building2 className="size-4 shrink-0 text-amber-500" aria-hidden="true" />
              <span>Quản lý Kho</span>
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

          {/* Data Retention */}
          <SettingsSection
            icon={Clock}
            iconColor="text-violet-500"
            title="Thời gian lưu trữ Video"
            description="Video cũ hơn sẽ được đánh dấu để dọn dẹp"
          >
            <div className="flex items-center gap-3 text-xs">
              <label className="text-sm font-semibold text-muted-foreground shrink-0">
                Giữ video trong
              </label>
              <Input
                type="number"
                min="1"
                max="60"
                value={config.retention_thang ?? '6'}
                onChange={(e) => updateField('retention_thang', e.target.value)}
                className="h-10 w-20 rounded-xl text-xs font-mono text-center"
              />
              <span className="text-sm text-muted-foreground">tháng</span>
            </div>
          </SettingsSection>
        </TabsContent>

        {/* ═══ Tab 4: Warehouse Management ═══ */}
        <TabsContent value="warehouses" className="mt-0 focus-visible:outline-none flex flex-col gap-4">
          <SettingsSection
            icon={Building2}
            iconColor="text-amber-500"
            title="Quản lý Danh mục Kho Vận"
            description="Cấu hình danh sách kho vận chuẩn và chỉ định kho mặc định cho toàn bộ trạm làm việc"
          >
            <div className="flex flex-col gap-4">
              {/* Top Controls & Search Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/40">
                <div className="flex items-center gap-2.5 flex-1 max-w-sm">
                  <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="text"
                      placeholder="Tìm kiếm kho theo tên, địa chỉ..."
                      value={warehouseSearch}
                      onChange={(e) => {
                        setWarehouseSearch(e.target.value);
                        setWarehousePage(1);
                      }}
                      className="h-9.5 pl-9 pr-8 text-xs rounded-xl bg-muted/30 border-border/70 focus-visible:ring-1"
                    />
                    {warehouseSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setWarehouseSearch('');
                          setWarehousePage(1);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Xóa tìm kiếm"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>Tổng:</span>
                    <Badge variant="secondary" className="font-mono text-xs px-2 py-0.5">
                      {totalWarehouseItems}
                    </Badge>
                  </div>
                  <Button
                    onClick={() => {
                      setWarehouseForm({
                        ten: '',
                        dia_chi: '',
                        la_mac_dinh: false,
                        trang_thai: 'hoat_dong',
                      });
                      setCreateWarehouseOpen(true);
                    }}
                    className="h-9.5 gap-1.5 rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
                  >
                    <Plus className="size-4" aria-hidden="true" />
                    Thêm kho mới
                  </Button>
                </div>
              </div>

              {/* Warehouse List */}
              {loadingWarehouses ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : warehouses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <Building2 className="size-10 mb-2 stroke-[1.5] text-muted-foreground/60" />
                  <p className="text-sm font-semibold">Chưa có kho vận nào trong hệ thống</p>
                  <p className="text-xs mt-1">Bấm "Thêm kho mới" để tạo kho đầu tiên</p>
                </div>
              ) : filteredWarehouses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                  <Search className="size-8 mb-2 stroke-[1.5] text-muted-foreground/60" />
                  <p className="text-sm font-semibold">Không tìm thấy kho vận phù hợp</p>
                  <p className="text-xs mt-1">Thử tìm kiếm với từ khóa khác</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {/* Desktop Table List View */}
                  <div className="hidden md:block rounded-2xl border border-border bg-card overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-border/80 bg-muted/40 text-[11px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                            <th className="py-3 px-4">Tên kho vận</th>
                            <th className="py-3 px-4">Địa chỉ chi tiết</th>
                            <th className="py-3 px-3 text-center">Trạng thái</th>
                            <th className="py-3 px-4 text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {paginatedWarehouses.map((k) => (
                            <tr
                              key={k.id}
                              className={cn(
                                'hover:bg-muted/30 transition-colors group',
                                k.la_mac_dinh && 'bg-amber-500/[0.03]'
                              )}
                            >
                              {/* Tên kho */}
                              <td className="py-3.5 px-4 font-medium text-foreground">
                                <div className="flex items-center gap-2.5">
                                  <div
                                    className={cn(
                                      'size-8 rounded-xl flex items-center justify-center shrink-0 border',
                                      k.la_mac_dinh
                                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                                        : 'bg-muted/40 border-border/60 text-muted-foreground'
                                    )}
                                  >
                                    <Building2 className="size-4" />
                                  </div>
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="font-bold text-xs text-foreground truncate max-w-[200px]">
                                      {k.ten}
                                    </span>
                                    {k.la_mac_dinh && (
                                      <Badge
                                        variant="secondary"
                                        className="gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30 px-1.5 py-0"
                                      >
                                        <Star className="size-2.5 fill-amber-500 text-amber-500" />
                                        Mặc định
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Địa chỉ */}
                              <td className="py-3.5 px-4 text-muted-foreground max-w-[280px]">
                                <div className="flex items-center gap-1.5">
                                  <MapPin className="size-3.5 shrink-0 text-muted-foreground/60" />
                                  <span className="truncate" title={k.dia_chi || ''}>
                                    {k.dia_chi || 'Chưa có thông tin địa chỉ'}
                                  </span>
                                </div>
                              </td>

                              {/* Trạng thái */}
                              <td className="py-3.5 px-3 text-center">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'text-[10px] font-bold',
                                    k.trang_thai === 'hoat_dong'
                                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
                                      : 'border-muted bg-muted/60 text-muted-foreground'
                                  )}
                                >
                                  {k.trang_thai === 'hoat_dong' ? 'Hoạt động' : 'Tạm dừng'}
                                </Badge>
                              </td>

                              {/* Thao tác */}
                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {!k.la_mac_dinh && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={async () => {
                                        try {
                                          const res = await apiClient
                                            .put(API_ENDPOINTS.ADMIN.KHO_HANG.SET_DEFAULT(k.id))
                                            .json<{ success: boolean }>();
                                          if (res.success) {
                                            showToast.success('Đã lưu cấu hình', `Đã đặt "${k.ten}" làm kho mặc định`);
                                            void fetchWarehouses();
                                            void useConfigStore.getState().fetchWarehouses();
                                          }
                                        } catch {
                                          showToast.error('Lỗi khi đổi kho mặc định');
                                        }
                                      }}
                                      className="h-8 text-xs font-semibold gap-1 text-muted-foreground hover:text-amber-600 px-2 cursor-pointer"
                                      title="Đặt làm kho mặc định"
                                    >
                                      <Star className="size-3.5" />
                                      <span className="hidden xl:inline">Mặc định</span>
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setWarehouseForm({
                                        ten: k.ten,
                                        dia_chi: k.dia_chi || '',
                                        la_mac_dinh: k.la_mac_dinh,
                                        trang_thai: k.trang_thai,
                                      });
                                      setEditWarehouse(k);
                                    }}
                                    className="h-8 text-xs font-semibold gap-1 px-2.5 hover:bg-muted text-foreground cursor-pointer"
                                    title="Chỉnh sửa kho"
                                  >
                                    <Pencil className="size-3.5 text-muted-foreground group-hover:text-foreground" />
                                    <span>Sửa</span>
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDeleteWarehouse(k)}
                                    className="h-8 text-xs font-semibold gap-1 px-2 text-destructive hover:bg-destructive/10 cursor-pointer"
                                    title="Xóa kho"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Desktop Pagination Footer */}
                    <div className="px-4 py-3 border-t border-border/70 bg-muted/10 flex items-center justify-between flex-wrap gap-3 text-xs text-muted-foreground select-none">
                      <div className="flex items-center gap-3 flex-wrap">
                        <PaginationInfo
                          startIndex={warehouseStartIndex}
                          endIndex={warehouseEndIndex}
                          totalItems={totalWarehouseItems}
                          label="kho"
                        />
                        <PaginationLimitSelect
                          limit={warehouseLimit}
                          onLimitChange={(val) => {
                            setWarehouseLimit(val);
                            setWarehousePage(1);
                          }}
                          options={[5, 10, 20]}
                        />
                      </div>

                      <Pagination
                        currentPage={warehousePage}
                        totalPages={warehouseTotalPages}
                        onPageChange={setWarehousePage}
                        showFirstLast
                      />
                    </div>
                  </div>

                  {/* Mobile Card List View */}
                  <div className="flex flex-col gap-2.5 md:hidden">
                    {paginatedWarehouses.map((k) => (
                      <div
                        key={k.id}
                        className={cn(
                          'rounded-2xl border p-3.5 bg-card flex flex-col gap-2.5 shadow-2xs transition-all',
                          k.la_mac_dinh
                            ? 'border-amber-500/40 bg-amber-500/[0.02]'
                            : 'border-border/70'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={cn(
                                'size-8 rounded-xl flex items-center justify-center shrink-0 border',
                                k.la_mac_dinh
                                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                                  : 'bg-muted/40 border-border/60 text-muted-foreground'
                              )}
                            >
                              <Building2 className="size-4" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-xs text-foreground truncate">
                                {k.ten}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {k.la_mac_dinh && (
                                  <Badge
                                    variant="secondary"
                                    className="gap-1 text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30 px-1.5 py-0"
                                  >
                                    <Star className="size-2.5 fill-amber-500 text-amber-500" />
                                    Mặc định
                                  </Badge>
                                )}
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'text-[9px] font-bold px-1.5 py-0',
                                    k.trang_thai === 'hoat_dong'
                                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
                                      : 'border-muted bg-muted/60 text-muted-foreground'
                                  )}
                                >
                                  {k.trang_thai === 'hoat_dong' ? 'Hoạt động' : 'Tạm dừng'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start gap-1.5 text-xs text-muted-foreground pl-1">
                          <MapPin className="size-3.5 shrink-0 mt-0.5 text-muted-foreground/60" />
                          <span className="line-clamp-2">
                            {k.dia_chi || 'Chưa có thông tin địa chỉ'}
                          </span>
                        </div>

                        <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-border/40">
                          {!k.la_mac_dinh && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                try {
                                  const res = await apiClient
                                    .put(API_ENDPOINTS.ADMIN.KHO_HANG.SET_DEFAULT(k.id))
                                    .json<{ success: boolean }>();
                                  if (res.success) {
                                    showToast.success('Đã lưu cấu hình', `Đã đặt "${k.ten}" làm kho mặc định`);
                                    void fetchWarehouses();
                                    void useConfigStore.getState().fetchWarehouses();
                                  }
                                } catch {
                                  showToast.error('Lỗi khi đổi kho mặc định');
                                }
                              }}
                              className="h-8 text-xs font-semibold gap-1 text-muted-foreground hover:text-amber-600 px-2 cursor-pointer"
                            >
                              <Star className="size-3.5" />
                              <span>Đặt mặc định</span>
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setWarehouseForm({
                                ten: k.ten,
                                dia_chi: k.dia_chi || '',
                                la_mac_dinh: k.la_mac_dinh,
                                trang_thai: k.trang_thai,
                              });
                              setEditWarehouse(k);
                            }}
                            className="h-8 text-xs font-semibold gap-1 px-2.5 cursor-pointer"
                          >
                            <Pencil className="size-3.5" />
                            <span>Sửa</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteWarehouse(k)}
                            className="h-8 text-xs font-semibold gap-1 px-2 text-destructive hover:bg-destructive/10 cursor-pointer"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {/* Mobile Pagination Footer */}
                    <div className="p-3.5 rounded-2xl border border-border bg-card shadow-2xs flex flex-col gap-3 select-none">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <PaginationInfo
                          startIndex={warehouseStartIndex}
                          endIndex={warehouseEndIndex}
                          totalItems={totalWarehouseItems}
                          label="kho"
                        />
                        <PaginationLimitSelect
                          limit={warehouseLimit}
                          onLimitChange={(val) => {
                            setWarehouseLimit(val);
                            setWarehousePage(1);
                          }}
                          options={[5, 10, 20]}
                        />
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/70">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setWarehousePage((p) => Math.max(p - 1, 1))}
                          disabled={warehousePage === 1}
                          className="h-8 px-3 rounded-lg text-xs cursor-pointer"
                        >
                          Trước
                        </Button>
                        <span className="text-xs font-bold text-foreground">
                          Trang {warehousePage} / {warehouseTotalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setWarehousePage((p) => Math.min(p + 1, warehouseTotalPages))}
                          disabled={warehousePage >= warehouseTotalPages}
                          className="h-8 px-3 rounded-lg text-xs cursor-pointer"
                        >
                          Tiếp
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </SettingsSection>
        </TabsContent>
      </Tabs>

      {/* ─── Save All Button (Chỉ hiển thị cho 3 tabs cấu hình hệ thống) ─── */}
      {activeTab !== 'warehouses' && (
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
      )}

      {/* ═══ Create Warehouse Dialog ═══ */}
      <Dialog open={createWarehouseOpen} onOpenChange={setCreateWarehouseOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Building2 className="size-5 text-amber-500" aria-hidden="true" />
              Thêm Kho Vận Mới
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                Tên chi nhánh kho <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="VD: Kho Quận 7 - HCM"
                value={warehouseForm.ten}
                onChange={(e) => setWarehouseForm((prev) => ({ ...prev, ten: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleCreateWarehouse();
                }}
                className="h-10 text-xs rounded-xl"
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                Địa chỉ chi tiết
              </label>
              <Input
                placeholder="VD: 105 Nguyễn Thị Thập, P. Tân Hưng, Q.7"
                value={warehouseForm.dia_chi}
                onChange={(e) => setWarehouseForm((prev) => ({ ...prev, dia_chi: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleCreateWarehouse();
                }}
                className="h-10 text-xs rounded-xl"
              />
            </div>
            <div className="flex items-center justify-between py-2 border-t border-border/40">
              <div>
                <div className="text-xs font-semibold text-foreground">Đặt làm kho mặc định</div>
                <div className="text-[11px] text-muted-foreground">
                  Trạm mới chưa cấu hình sẽ tự động chọn kho này
                </div>
              </div>
              <input
                type="checkbox"
                checked={Boolean(warehouseForm.la_mac_dinh)}
                onChange={(e) =>
                  setWarehouseForm((prev) => ({ ...prev, la_mac_dinh: e.target.checked }))
                }
                className="size-5 accent-primary cursor-pointer shrink-0"
              />
            </div>
          </div>
          <div className="flex flex-row items-center justify-end gap-3 pt-3 border-t border-border/40 mt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateWarehouseOpen(false)}
              className="h-10 px-5 rounded-xl text-xs font-semibold hover:bg-muted/80"
            >
              Hủy
            </Button>
            <Button
              type="button"
              disabled={submittingWarehouse || !warehouseForm.ten.trim()}
              onClick={handleCreateWarehouse}
              className="h-10 px-6 rounded-xl text-xs font-bold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
            >
              {submittingWarehouse ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Plus className="size-4" aria-hidden="true" />
              )}
              Tạo kho
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Edit Warehouse Dialog ═══ */}
      <Dialog open={!!editWarehouse} onOpenChange={(open) => !open && setEditWarehouse(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Building2 className="size-5 text-amber-500" aria-hidden="true" />
              Chỉnh Sửa Kho Vận
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                Tên chi nhánh kho <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="VD: Kho Quận 7 - HCM"
                value={warehouseForm.ten}
                onChange={(e) => setWarehouseForm((prev) => ({ ...prev, ten: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleUpdateWarehouse();
                }}
                className="h-10 text-xs rounded-xl"
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                Địa chỉ chi tiết
              </label>
              <Input
                placeholder="VD: 105 Nguyễn Thị Thập, P. Tân Hưng, Q.7"
                value={warehouseForm.dia_chi}
                onChange={(e) => setWarehouseForm((prev) => ({ ...prev, dia_chi: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleUpdateWarehouse();
                }}
                className="h-10 text-xs rounded-xl"
              />
            </div>
            <div className="flex items-center justify-between py-2 border-t border-border/40">
              <div>
                <div className="text-xs font-semibold text-foreground">Trạng thái hoạt động</div>
                <div className="text-[11px] text-muted-foreground">
                  Tạm dừng sẽ ẩn kho khỏi dropdown chọn của nhân viên
                </div>
              </div>
              <Button
                type="button"
                variant={warehouseForm.trang_thai === 'hoat_dong' ? 'outline' : 'secondary'}
                size="sm"
                onClick={() =>
                  setWarehouseForm((prev) => ({
                    ...prev,
                    trang_thai: prev.trang_thai === 'hoat_dong' ? 'ngung_hoat_dong' : 'hoat_dong',
                  }))
                }
                className="h-8 text-xs font-semibold rounded-lg px-3"
              >
                {warehouseForm.trang_thai === 'hoat_dong' ? 'Hoạt động' : 'Tạm dừng'}
              </Button>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-border/40">
              <div>
                <div className="text-xs font-semibold text-foreground">Đặt làm kho mặc định</div>
                <div className="text-[11px] text-muted-foreground">
                  Kho này sẽ tự động được gán cho các bàn mới
                </div>
              </div>
              <input
                type="checkbox"
                checked={Boolean(warehouseForm.la_mac_dinh)}
                onChange={(e) =>
                  setWarehouseForm((prev) => ({ ...prev, la_mac_dinh: e.target.checked }))
                }
                className="size-5 accent-primary cursor-pointer shrink-0"
              />
            </div>
          </div>
          <div className="flex flex-row items-center justify-end gap-3 pt-3 border-t border-border/40 mt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditWarehouse(null)}
              className="h-10 px-5 rounded-xl text-xs font-semibold hover:bg-muted/80"
            >
              Hủy
            </Button>
            <Button
              type="button"
              disabled={submittingWarehouse || !warehouseForm.ten.trim()}
              onClick={handleUpdateWarehouse}
              className="h-10 px-6 rounded-xl text-xs font-bold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
            >
              {submittingWarehouse ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Check className="size-4" aria-hidden="true" />
              )}
              Lưu thay đổi
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Delete Warehouse Alert Dialog ═══ */}
      <AlertDialog open={!!deleteWarehouse} onOpenChange={(open) => !open && setDeleteWarehouse(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa kho vận</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa kho{' '}
              <strong className="text-foreground">{deleteWarehouse?.ten}</strong>? Kho bị xóa sẽ
              không hiển thị trong danh mục lựa chọn của trạm nữa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 rounded-xl text-destructive-foreground font-semibold"
              onClick={async () => {
                if (!deleteWarehouse) return;
                try {
                  const res = await apiClient
                    .delete(API_ENDPOINTS.ADMIN.KHO_HANG.DELETE(deleteWarehouse.id))
                    .json<{ success: boolean }>();

                  if (res.success) {
                    showToast.success('Đã lưu thay đổi', `Đã xóa kho "${deleteWarehouse.ten}"`);
                    setDeleteWarehouse(null);
                    void fetchWarehouses();
                    void useConfigStore.getState().fetchWarehouses();
                  }
                } catch {
                  showToast.error('Lỗi', 'Lỗi khi xóa kho');
                }
              }}
            >
              Xác nhận xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminSettingsPage;
