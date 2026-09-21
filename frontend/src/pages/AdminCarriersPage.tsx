import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Truck,
  Search,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Sparkles,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Pagination,
  PaginationInfo,
  PaginationLimitSelect,
} from '@/components/ui/pagination';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
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
import { BUILT_IN_CARRIERS, BUILT_IN_CARRIER_IDS } from '@/config/constants';
import { useConfigStore } from '@/stores/config-store';
import { toast } from 'sonner';

export interface CarrierItem {
  id: string;
  label: string;
  isBuiltIn: boolean;
  hasRegex: boolean;
}

// ---------------------------------------------------------------------------
// Create Carrier Dialog
// ---------------------------------------------------------------------------
interface CreateCarrierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingIds: Set<string>;
  onSave: (id: string, label: string) => Promise<boolean>;
}

function CreateCarrierDialog({
  open,
  onOpenChange,
  existingIds,
  onSave,
}: CreateCarrierDialogProps) {
  const [id, setId] = useState('');
  const [label, setLabel] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setId('');
      setLabel('');
      setSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = id.trim().replace(/\s+/g, '');
    const cleanLabel = label.trim();

    if (!cleanId || !cleanLabel) {
      toast.error('Vui lòng nhập đầy đủ Mã ID và Tên hiển thị');
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(cleanId)) {
      toast.error('Mã ID chỉ được chứa chữ cái, số, gạch dưới (_) hoặc gạch ngang (-)');
      return;
    }

    if (existingIds.has(cleanId) || BUILT_IN_CARRIER_IDS.has(cleanId)) {
      toast.error(`Mã ID "${cleanId}" đã tồn tại trong hệ thống`);
      return;
    }

    setSubmitting(true);
    const ok = await onSave(cleanId, cleanLabel);
    setSubmitting(false);
    if (ok) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] rounded-3xl p-6 bg-card border-border shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Truck className="size-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-foreground">
              Thêm Đơn vị Vận chuyển mới
            </DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            Khai báo ĐVVC mới để nhân viên có thể chọn thủ công trong dropdown khi đóng gói / khui hàng.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-foreground">
              Mã định danh ID <span className="text-destructive">*</span>
            </label>
            <Input
              value={id}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setId(e.target.value.replace(/\s/g, ''))}
              placeholder="VD: AhaMove, GrabExpress, ShipChung"
              className="h-11 rounded-xl text-xs font-mono"
              autoFocus
              disabled={submitting}
            />
            <span className="text-[11px] text-muted-foreground">
              Không dấu, không chứa khoảng trắng. Dùng làm khóa lưu trữ dữ liệu.
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-foreground">
              Tên hiển thị <span className="text-destructive">*</span>
            </label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="VD: Aha Move, Grab Express"
              className="h-11 rounded-xl text-xs"
              disabled={submitting}
            />
            <span className="text-[11px] text-muted-foreground">
              Tên thân thiện xuất hiện trên nhãn video, dropdown và lịch sử biên bản.
            </span>
          </div>

          <DialogFooter className="mt-2 gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                className="h-10 rounded-xl text-xs cursor-pointer"
              >
                Hủy
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={submitting || !id.trim() || !label.trim()}
              className="h-10 rounded-xl text-xs font-bold gap-1.5 cursor-pointer"
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              {submitting ? 'Đang thêm...' : 'Lưu ĐVVC'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Edit Carrier Dialog
// ---------------------------------------------------------------------------
interface EditCarrierDialogProps {
  carrier: CarrierItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, newLabel: string) => Promise<boolean>;
}

function EditCarrierDialog({
  carrier,
  open,
  onOpenChange,
  onSave,
}: EditCarrierDialogProps) {
  const [label, setLabel] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (carrier) {
      setLabel(carrier.label);
      setSubmitting(false);
    }
  }, [carrier]);

  if (!carrier) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLabel = label.trim();
    if (!cleanLabel) {
      toast.error('Vui lòng nhập tên hiển thị');
      return;
    }

    setSubmitting(true);
    const ok = await onSave(carrier.id, cleanLabel);
    setSubmitting(false);
    if (ok) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] rounded-3xl p-6 bg-card border-border shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="size-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
              <Pencil className="size-4" />
            </div>
            <DialogTitle className="text-lg font-bold text-foreground">
              Sửa Đơn vị Vận chuyển
            </DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            Cập nhật tên hiển thị cho ĐVVC <span className="font-mono font-bold text-foreground">"{carrier.id}"</span>.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-foreground">Mã ID (Cố định)</label>
            <Input
              value={carrier.id}
              disabled
              className="h-11 rounded-xl text-xs font-mono bg-muted/60 text-muted-foreground cursor-not-allowed"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-foreground">
              Tên hiển thị mới <span className="text-destructive">*</span>
            </label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="h-11 rounded-xl text-xs"
              autoFocus
              disabled={submitting}
            />
          </div>

          <DialogFooter className="mt-2 gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                className="h-10 rounded-xl text-xs cursor-pointer"
              >
                Hủy
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={submitting || !label.trim()}
              className="h-10 rounded-xl text-xs font-bold gap-1.5 cursor-pointer"
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main AdminCarriersPage
// ---------------------------------------------------------------------------
export const AdminCarriersPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [rawDbCarriers, setRawDbCarriers] = useState<string[]>([]);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'builtin' | 'custom'>('all');

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CarrierItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CarrierItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch current carriers config
  const fetchCarriers = useCallback(async () => {
    try {
      const res = await apiClient
        .get(API_ENDPOINTS.ADMIN.CAU_HINH.GET)
        .json<{ success: boolean; data: Record<string, string> }>();
      if (res.success && res.data) {
        const raw = res.data.don_vi_vc_danh_sach || '';
        const list = raw.split(',').map((s) => s.trim()).filter(Boolean);
        setRawDbCarriers(list);
      }
    } catch {
      toast.error('Không thể tải danh sách đơn vị vận chuyển từ server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCarriers();
  }, [fetchCarriers]);

  // Parse all carriers: Built-in + Admin-added
  const allCarriers = useMemo<CarrierItem[]>(() => {
    const list: CarrierItem[] = [];
    const seenIds = new Set<string>();

    // 1. Built-in carriers (trừ Khac cho xuống cuối)
    for (const c of BUILT_IN_CARRIERS) {
      if (c.id === 'Khac') continue;
      list.push({
        id: c.id,
        label: c.label,
        isBuiltIn: true,
        hasRegex: true,
      });
      seenIds.add(c.id);
    }

    // 2. Admin-added entries từ DB
    for (const entry of rawDbCarriers) {
      const colonIdx = entry.indexOf(':');
      const entryId = colonIdx > 0 ? entry.slice(0, colonIdx).trim() : entry.trim();
      const entryLabel = colonIdx > 0 ? entry.slice(colonIdx + 1).trim() : '';
      if (!entryId || seenIds.has(entryId) || BUILT_IN_CARRIER_IDS.has(entryId)) continue;
      list.push({
        id: entryId,
        label: entryLabel || entryId,
        isBuiltIn: false,
        hasRegex: false,
      });
      seenIds.add(entryId);
    }

    // 3. 'Khac' cuối cùng
    const khac = BUILT_IN_CARRIERS.find((c) => c.id === 'Khac');
    if (khac) {
      list.push({
        id: khac.id,
        label: khac.label,
        isBuiltIn: true,
        hasRegex: false,
      });
    }

    return list;
  }, [rawDbCarriers]);

  // Set of all active IDs for quick collision checks
  const existingIds = useMemo(() => new Set(allCarriers.map((c) => c.id)), [allCarriers]);

  // Filtered carriers based on search and filterType
  const filteredCarriers = useMemo(() => {
    let result = allCarriers;

    // Filter by type
    if (filterType === 'builtin') {
      result = result.filter((c) => c.isBuiltIn);
    } else if (filterType === 'custom') {
      result = result.filter((c) => !c.isBuiltIn);
    }

    // Filter by search query
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (c) => c.label.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
      );
    }

    return result;
  }, [allCarriers, filterType, search]);

  // Pagination calculation
  const totalItems = filteredCarriers.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const startIndex = totalItems === 0 ? 0 : (page - 1) * limit + 1;
  const endIndex = Math.min(page * limit, totalItems);

  const paginatedCarriers = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredCarriers.slice(start, start + limit);
  }, [filteredCarriers, page, limit]);

  // Reset page when filter or search changes
  useEffect(() => {
    setPage(1);
  }, [search, filterType]);

  // Save new carrier to backend
  const handleCreateCarrier = async (id: string, label: string): Promise<boolean> => {
    try {
      const adminEntries = rawDbCarriers.filter((e) => {
        const colonIdx = e.indexOf(':');
        const eId = colonIdx > 0 ? e.slice(0, colonIdx).trim() : e.trim();
        return !BUILT_IN_CARRIER_IDS.has(eId) && eId !== id;
      });
      adminEntries.push(`${id}:${label}`);

      const res = await apiClient
        .put(API_ENDPOINTS.ADMIN.CAU_HINH.UPDATE, {
          json: {
            khoa: 'don_vi_vc_danh_sach',
            gia_tri: adminEntries.join(','),
          },
        })
        .json<{ success: boolean; error?: { message: string } }>();

      if (res.success) {
        toast.success(`Đã thêm ĐVVC "${label}" (${id})`);
        setRawDbCarriers(adminEntries);
        void useConfigStore.getState().fetchSystemConfig();
        return true;
      } else {
        toast.error(res.error?.message || 'Lỗi lưu cấu hình');
        return false;
      }
    } catch {
      toast.error('Lỗi kết nối khi cập nhật đơn vị vận chuyển');
      return false;
    }
  };

  // Edit carrier display name
  const handleEditCarrier = async (id: string, newLabel: string): Promise<boolean> => {
    try {
      const adminEntries = rawDbCarriers.map((e) => {
        const colonIdx = e.indexOf(':');
        const eId = colonIdx > 0 ? e.slice(0, colonIdx).trim() : e.trim();
        if (eId === id) {
          return `${id}:${newLabel}`;
        }
        return e;
      });

      const res = await apiClient
        .put(API_ENDPOINTS.ADMIN.CAU_HINH.UPDATE, {
          json: {
            khoa: 'don_vi_vc_danh_sach',
            gia_tri: adminEntries.join(','),
          },
        })
        .json<{ success: boolean; error?: { message: string } }>();

      if (res.success) {
        toast.success(`Đã cập nhật ĐVVC "${newLabel}"`);
        setRawDbCarriers(adminEntries);
        void useConfigStore.getState().fetchSystemConfig();
        return true;
      } else {
        toast.error(res.error?.message || 'Lỗi lưu cấu hình');
        return false;
      }
    } catch {
      toast.error('Lỗi kết nối khi cập nhật');
      return false;
    }
  };

  // Delete carrier
  const handleDeleteCarrier = async () => {
    if (!deleteTarget || deleteTarget.isBuiltIn) return;
    setDeleting(true);
    try {
      const adminEntries = rawDbCarriers.filter((e) => {
        const colonIdx = e.indexOf(':');
        const eId = colonIdx > 0 ? e.slice(0, colonIdx).trim() : e.trim();
        return eId !== deleteTarget.id && !BUILT_IN_CARRIER_IDS.has(eId);
      });

      const res = await apiClient
        .put(API_ENDPOINTS.ADMIN.CAU_HINH.UPDATE, {
          json: {
            khoa: 'don_vi_vc_danh_sach',
            gia_tri: adminEntries.join(','),
          },
        })
        .json<{ success: boolean; error?: { message: string } }>();

      if (res.success) {
        toast.success(`Đã xóa ĐVVC "${deleteTarget.label}" (${deleteTarget.id})`);
        setRawDbCarriers(adminEntries);
        setDeleteTarget(null);
        void useConfigStore.getState().fetchSystemConfig();
      } else {
        toast.error(res.error?.message || 'Không thể xóa ĐVVC');
      }
    } catch {
      toast.error('Lỗi kết nối khi xóa ĐVVC');
    } finally {
      setDeleting(false);
    }
  };

  // Count summaries
  const builtInCount = useMemo(() => allCarriers.filter((c) => c.isBuiltIn).length, [allCarriers]);
  const customCount = useMemo(() => allCarriers.filter((c) => !c.isBuiltIn).length, [allCarriers]);

  return (
    <div className="flex flex-col gap-2.5 sm:gap-3 lg:gap-3.5 w-full h-full flex-1 min-h-0">
      {/* ─── Page Header ─── */}
      <div className="flex items-center justify-between gap-2 sm:gap-3 shrink-0">
        <div>
          <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-foreground lg:text-3xl flex items-center gap-2">
            <span>Đơn vị Vận chuyển</span>
            <Badge variant="secondary" className="text-[11px] sm:text-xs font-mono font-bold px-1.5 sm:px-2 py-0.5">
              {allCarriers.length} ĐVVC
            </Badge>
          </h2>
          <p className="hidden sm:block mt-0.5 sm:mt-1 text-xs sm:text-sm text-muted-foreground">
            Quản lý danh mục ĐVVC, cấu hình nhận diện mã vận đơn và phân loại đóng gói / khui hàng
          </p>
        </div>
        <Button
          size="sm"
          className="h-8 sm:h-11 gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl text-xs font-bold shrink-0 px-3 sm:px-5 shadow-xs cursor-pointer"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="size-3.5 sm:size-4" aria-hidden="true" />
          <span>Thêm ĐVVC</span>
        </Button>
      </div>

      {/* ─── Metric Summary Cards (3 cols on mobile to save vertical space) ─── */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 shrink-0">
        {/* Total */}
        <Card className="rounded-xl sm:rounded-2xl border-border bg-card/60 shadow-2xs">
          <CardContent className="p-2 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-1.5 sm:gap-3.5">
            <div className="size-7 sm:size-10 rounded-lg sm:rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Truck className="size-3.5 sm:size-5" />
            </div>
            <div className="min-w-0 w-full">
              <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground block truncate">
                <span className="sm:hidden">Tổng ĐVVC</span>
                <span className="hidden sm:inline">Tổng đơn vị cấu hình</span>
              </span>
              <span className="text-sm sm:text-xl font-bold font-mono text-foreground block">
                {allCarriers.length}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Built-in */}
        <Card className="rounded-xl sm:rounded-2xl border-border bg-card/60 shadow-2xs">
          <CardContent className="p-2 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-1.5 sm:gap-3.5">
            <div className="size-7 sm:size-10 rounded-lg sm:rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Sparkles className="size-3.5 sm:size-5" />
            </div>
            <div className="min-w-0 w-full">
              <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground block truncate">
                <span className="sm:hidden">Mặc định</span>
                <span className="hidden sm:inline">Mặc định hệ thống (Regex)</span>
              </span>
              <span className="text-sm sm:text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 block">
                {builtInCount}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Custom */}
        <Card className="rounded-xl sm:rounded-2xl border-border bg-card/60 shadow-2xs">
          <CardContent className="p-2 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-1.5 sm:gap-3.5">
            <div className="size-7 sm:size-10 rounded-lg sm:rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Layers className="size-3.5 sm:size-5" />
            </div>
            <div className="min-w-0 w-full">
              <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground block truncate">
                <span className="sm:hidden">Admin tạo</span>
                <span className="hidden sm:inline">Do Admin thêm</span>
              </span>
              <span className="text-sm sm:text-xl font-bold font-mono text-amber-600 dark:text-amber-400 block">
                {customCount}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Search & Filter Toolbar (Compact single row on mobile) ─── */}
      <Card className="rounded-xl sm:rounded-2xl shadow-2xs border-border shrink-0">
        <CardContent className="p-2 sm:p-3.5 flex flex-row gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 sm:size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo mã ID hoặc tên ĐVVC..."
              className="h-9 sm:h-10 rounded-lg sm:rounded-xl text-xs pl-8 sm:pl-10"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | 'builtin' | 'custom')}
            className="h-9 sm:h-10 rounded-lg sm:rounded-xl border border-border bg-muted/40 px-2 sm:px-3 text-xs font-medium text-foreground focus:outline-none shrink-0 w-28 sm:w-56 cursor-pointer"
          >
            <option value="all">Tất cả ({allCarriers.length})</option>
            <option value="builtin">Mặc định ({builtInCount})</option>
            <option value="custom">Admin ({customCount})</option>
          </select>
        </CardContent>
      </Card>

      {/* ─── Carriers List View ─── */}
      {loading ? (
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : paginatedCarriers.length === 0 ? (
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <Card className="rounded-3xl shadow-xs max-w-md w-full">
            <CardContent className="flex flex-col items-center justify-center gap-3 p-8 sm:p-12 text-center">
              <Truck className="size-10 sm:size-12 text-muted-foreground/40" aria-hidden="true" />
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-foreground">
                  Không tìm thấy đơn vị vận chuyển nào
                </p>
                <p className="text-xs text-muted-foreground">
                  {search ? 'Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc' : 'Bấm "Thêm ĐVVC" để tạo đơn vị vận chuyển đầu tiên'}
                </p>
              </div>
              {search && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch('');
                    setFilterType('all');
                  }}
                  className="mt-2 text-xs rounded-xl cursor-pointer"
                >
                  Xóa bộ lọc
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col gap-2.5 sm:gap-3">
          {/* ══ Desktop Table ListView ══ */}
          <div className="hidden md:flex flex-1 min-h-0 flex-col rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto relative saas-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm shadow-xs border-b border-border/80 select-none">
                  <tr className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                    <th className="py-3 px-4 bg-card">Đơn vị vận chuyển</th>
                    <th className="py-3 px-4 bg-card">Mã định danh (Key)</th>
                    <th className="py-3 px-3 bg-card text-center">Phân loại</th>
                    <th className="py-3 px-3 bg-card text-center">Cơ chế nhận diện</th>
                    <th className="py-3 px-4 bg-card text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {paginatedCarriers.map((item) => (
                    <tr
                      key={item.id}
                      className={cn(
                        'hover:bg-muted/30 transition-colors group',
                        !item.isBuiltIn && 'bg-amber-500/[0.02]'
                      )}
                    >
                      {/* Đơn vị vận chuyển */}
                      <td className="py-3 px-4 font-medium text-foreground">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'size-9 rounded-xl flex items-center justify-center shrink-0 border text-xs font-black shadow-2xs',
                              item.isBuiltIn
                                ? 'bg-muted/50 border-border text-foreground'
                                : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                            )}
                          >
                            {item.label.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-xs text-foreground truncate">
                              {item.label}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono truncate">
                              ID: {item.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Mã định danh */}
                      <td className="py-3 px-4">
                        <code className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-lg bg-muted text-foreground border border-border/60">
                          {item.id}
                        </code>
                      </td>

                      {/* Phân loại */}
                      <td className="py-3 px-3 text-center">
                        {item.isBuiltIn ? (
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-bold px-2 py-0.5 border"
                          >
                            Mặc định
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-bold px-2 py-0.5 border-amber-500/30 bg-amber-500/10 text-amber-600"
                          >
                            Admin
                          </Badge>
                        )}
                      </td>

                      {/* Cơ chế nhận diện */}
                      <td className="py-3 px-3 text-center">
                        {item.hasRegex ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-semibold border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 gap-1 px-2 py-0.5"
                          >
                            <Sparkles className="size-2.5" />
                            Tự động (Regex)
                          </Badge>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">
                            Chọn thủ công
                          </span>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {item.isBuiltIn ? (
                            <span
                              className="text-[10px] text-muted-foreground/60 italic px-2"
                              title="ĐVVC mặc định của hệ thống không thể chỉnh sửa trực tiếp"
                            >
                              Hệ thống khóa
                            </span>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditTarget(item)}
                                className="h-8 text-xs font-semibold gap-1 px-2.5 hover:bg-muted text-foreground cursor-pointer"
                                title="Chỉnh sửa cấu hình"
                              >
                                <Pencil className="size-3.5 text-muted-foreground group-hover:text-foreground" />
                                <span>Sửa</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteTarget(item)}
                                className="h-8 text-xs font-semibold gap-1 px-2 text-destructive hover:bg-destructive/10 cursor-pointer"
                                title="Xóa ĐVVC"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </>
                          )}
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
                  startIndex={startIndex}
                  endIndex={endIndex}
                  totalItems={totalItems}
                  label="đơn vị vận chuyển"
                />
                <PaginationLimitSelect
                  limit={limit}
                  onLimitChange={(val) => {
                    setLimit(val);
                    setPage(1);
                  }}
                  options={[5, 10, 20]}
                />
              </div>

              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                showFirstLast
              />
            </div>
          </div>

          {/* ══ Mobile Cards ListView (Ultra-compact & space efficient) ══ */}
          <div className="flex md:hidden flex-1 min-h-0 flex-col gap-2">
            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 pr-0.5 saas-scrollbar">
              {paginatedCarriers.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    'shrink-0 rounded-xl border border-border/80 p-2.5 bg-card flex flex-col gap-1.5 shadow-2xs transition-all',
                    !item.isBuiltIn && 'border-amber-500/30 bg-amber-500/[0.02]'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={cn(
                          'size-8 rounded-lg flex items-center justify-center shrink-0 border text-[11px] font-black shadow-2xs',
                          item.isBuiltIn
                            ? 'bg-muted/50 border-border text-foreground'
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                        )}
                      >
                        {item.label.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-xs text-foreground truncate">
                          {item.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono truncate">
                          Key: {item.id}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {item.hasRegex ? (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-md">
                          <Sparkles className="size-2.5" /> Regex
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/70">Thủ công</span>
                      )}

                      {item.isBuiltIn ? (
                        <Badge
                          variant="secondary"
                          className="text-[9px] font-bold px-1.5 py-0 border"
                        >
                          Mặc định
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[9px] font-bold px-1.5 py-0 border-amber-500/30 bg-amber-500/10 text-amber-600"
                        >
                          Admin
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Mobile Actions for Custom Carriers */}
                  {!item.isBuiltIn && (
                    <div className="flex items-center justify-end gap-1 pt-1.5 border-t border-border/40">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditTarget(item)}
                        className="h-7 text-[11px] font-semibold gap-1 px-2.5 cursor-pointer"
                      >
                        <Pencil className="size-3" />
                        <span>Sửa</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(item)}
                        className="h-7 text-[11px] font-semibold gap-1 px-2 text-destructive hover:bg-destructive/10 cursor-pointer"
                      >
                        <Trash2 className="size-3" />
                        <span>Xóa</span>
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Mobile Pagination Footer - Compact single row */}
            <div className="shrink-0 px-3 py-2 rounded-xl border border-border bg-card/95 shadow-2xs flex items-center justify-between gap-2 select-none">
              {/* Left: Range & Limit select */}
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground min-w-0">
                <span className="font-mono font-medium truncate">
                  {totalItems === 0 ? '0' : `${startIndex}-${endIndex}`}/{totalItems}
                </span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="h-7 rounded-lg border border-border/80 bg-muted/40 px-1.5 text-[11px] font-medium text-foreground focus:outline-none cursor-pointer"
                >
                  {[5, 10, 20].map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}/trang
                    </option>
                  ))}
                </select>
              </div>

              {/* Right: Prev, Page info, Next */}
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  className="h-7 px-2 rounded-lg text-xs font-semibold gap-1 cursor-pointer disabled:opacity-30 shadow-none"
                >
                  <ChevronLeft size={13} />
                  <span className="text-[11px]">Trước</span>
                </Button>

                <div className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted/70 text-[11px] font-mono font-semibold text-foreground">
                  {page}/{totalPages}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page >= totalPages}
                  className="h-7 px-2 rounded-lg text-xs font-semibold gap-1 cursor-pointer disabled:opacity-30 shadow-none"
                >
                  <span className="text-[11px]">Sau</span>
                  <ChevronRight size={13} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Dialogs ─── */}
      <CreateCarrierDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        existingIds={existingIds}
        onSave={handleCreateCarrier}
      />

      <EditCarrierDialog
        carrier={editTarget}
        open={Boolean(editTarget)}
        onOpenChange={(open) => !open && setEditTarget(null)}
        onSave={handleEditCarrier}
      />

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-3xl p-6 bg-card border-border shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-foreground">
              Xác nhận xóa Đơn vị Vận chuyển?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Bạn đang xóa ĐVVC{' '}
              <strong className="text-foreground">
                "{deleteTarget?.label}" ({deleteTarget?.id})
              </strong>{' '}
              khỏi cấu hình. Nhân viên sẽ không còn thấy ĐVVC này trong danh sách chọn. Các biên bản video cũ đã gán ĐVVC này vẫn giữ nguyên mã.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2 gap-2 sm:gap-0">
            <AlertDialogCancel disabled={deleting} className="h-10 rounded-xl text-xs cursor-pointer">
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={handleDeleteCarrier}
              className="h-10 rounded-xl text-xs font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5 cursor-pointer"
            >
              {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              {deleting ? 'Đang xóa...' : 'Xóa ĐVVC'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminCarriersPage;
