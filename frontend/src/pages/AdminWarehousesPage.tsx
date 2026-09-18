import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Building2,
  Plus,
  X,
  Pencil,
  Trash2,
  Star,
  MapPin,
  Check,
  Search,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import type { KhoHang, KhoHangFormData } from '@/types/kho-hang';

export const AdminWarehousesPage: React.FC = () => {
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

  return (
    <div className="flex flex-col gap-3 lg:gap-3.5 w-full h-full flex-1 min-h-0">
      {/* Page Header */}
      <div className="shrink-0">
        <h2 className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
          Quản lý Kho vận
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cấu hình danh sách kho vận chuẩn và chỉ định kho mặc định cho toàn bộ trạm làm việc
        </p>
      </div>

      <div className="flex flex-col gap-3 flex-1 min-h-0">
        {/* Top Controls & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/40 shrink-0">
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
          <div className="flex-1 min-h-0 flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : warehouses.length === 0 ? (
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <Building2 className="size-10 mb-2 stroke-[1.5] text-muted-foreground/60" />
            <p className="text-sm font-semibold">Chưa có kho vận nào trong hệ thống</p>
            <p className="text-xs mt-1">Bấm "Thêm kho mới" để tạo kho đầu tiên</p>
          </div>
        ) : filteredWarehouses.length === 0 ? (
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
            <Search className="size-8 mb-2 stroke-[1.5] text-muted-foreground/60" />
            <p className="text-sm font-semibold">Không tìm thấy kho vận phù hợp</p>
            <p className="text-xs mt-1">Thử tìm kiếm với từ khóa khác</p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col gap-3">
            {/* Desktop Table List View: fixed thead, scrollable tbody, fixed pagination */}
            <div className="hidden md:flex flex-1 min-h-0 flex-col rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto relative saas-scrollbar">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm shadow-xs border-b border-border/80">
                    <tr className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                      <th className="py-3 px-4 bg-card">Tên kho vận</th>
                      <th className="py-3 px-4 bg-card">Địa chỉ chi tiết</th>
                      <th className="py-3 px-3 bg-card text-center">Trạng thái</th>
                      <th className="py-3 px-4 bg-card text-right">Thao tác</th>
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
              <div className="shrink-0 px-4 py-3 border-t border-border/70 bg-card flex items-center justify-between flex-wrap gap-3 text-xs text-muted-foreground select-none shadow-[0_-4px_15px_rgba(0,0,0,0.03)]">
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

            {/* Mobile Card List View: scrollable middle, fixed pagination */}
            <div className="flex md:hidden flex-1 min-h-0 flex-col gap-2.5">
              <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2.5 pr-0.5 saas-scrollbar">
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
              </div>

              {/* Mobile Pagination Footer */}
              <div className="shrink-0 p-3 rounded-2xl border border-border bg-card shadow-xs flex flex-col gap-2.5 select-none">
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

export default AdminWarehousesPage;
