import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Pencil,
  KeyRound,
  Trash2,
  ShieldCheck,
  ShieldOff,
  Loader2,
  UserPlus,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Pagination, PaginationInfo, PaginationLimitSelect } from '@/components/ui/pagination';
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
import { toast } from 'sonner';
import type {
  NhanVienAdmin,
  NhanVienCreateDTO,
  NhanVienUpdateDTO,
  VaiTro,
} from '@/types';

// ---------------------------------------------------------------------------
// Status Badge
// ---------------------------------------------------------------------------
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    hoat_dong: {
      label: 'Hoạt động',
      className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600',
    },
    vo_hieu_hoa: {
      label: 'Vô hiệu hóa',
      className: 'border-amber-500/30 bg-amber-500/10 text-amber-600',
    },
    da_xoa: {
      label: 'Đã xóa',
      className: 'border-rose-500/30 bg-rose-500/10 text-rose-600',
    },
  };
  const info = map[status] ?? { label: status, className: '' };
  return (
    <Badge variant="outline" className={cn('text-[10px] font-bold', info.className)}>
      {info.label}
    </Badge>
  );
}

function RoleBadge({ role }: { role: VaiTro }) {
  return role === 'admin' ? (
    <Badge variant="outline" className="text-[10px] font-bold border-violet-500/30 bg-violet-500/10 text-violet-600 gap-1">
      <ShieldCheck className="size-3" aria-hidden="true" />
      Admin
    </Badge>
  ) : (
    <Badge variant="secondary" className="text-[10px] font-bold">
      Nhân viên
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Create Dialog
// ---------------------------------------------------------------------------
function CreateEmployeeDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState<NhanVienCreateDTO>({
    ma: '',
    ten: '',
    pin: '',
    vai_tro: 'nhan_vien',
  });
  const [submitting, setSubmitting] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const handleSubmit = async () => {
    if (!form.ma.trim() || !form.ten.trim() || form.pin.length !== 4) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiClient
        .post(API_ENDPOINTS.ADMIN.NHAN_VIEN.CREATE, { json: form })
        .json<{ success: boolean; error?: { message: string } }>();
      if (res.success) {
        toast.success(`Đã tạo nhân viên ${form.ma.toUpperCase()}`);
        onCreated();
        onOpenChange(false);
        setForm({ ma: '', ten: '', pin: '', vai_tro: 'nhan_vien' });
      } else {
        toast.error(res.error?.message ?? 'Lỗi tạo nhân viên');
      }
    } catch {
      toast.error('Lỗi kết nối server');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-5 text-primary" aria-hidden="true" />
            Thêm Nhân viên mới
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              Mã nhân viên
            </label>
            <Input
              value={form.ma}
              onChange={(e) => setForm({ ...form, ma: e.target.value })}
              placeholder="VD: NV007"
              className="h-11 rounded-xl text-xs font-mono uppercase"
              maxLength={20}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              Họ và tên
            </label>
            <Input
              value={form.ten}
              onChange={(e) => setForm({ ...form, ten: e.target.value })}
              placeholder="VD: Nguyễn Văn A"
              className="h-11 rounded-xl text-xs"
              maxLength={100}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              Mã PIN (4 chữ số)
            </label>
            <div className="relative">
              <Input
                type={showPin ? 'text' : 'password'}
                value={form.pin}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setForm({ ...form, pin: v });
                }}
                placeholder="••••"
                className="h-11 rounded-xl text-xs font-mono pr-10"
                maxLength={4}
                inputMode="numeric"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label={showPin ? 'Ẩn PIN' : 'Hiện PIN'}
              >
                {showPin ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              Vai trò
            </label>
            <select
              value={form.vai_tro}
              onChange={(e) => setForm({ ...form, vai_tro: e.target.value as VaiTro })}
              className="h-11 w-full rounded-xl border border-border bg-muted/40 px-3 text-xs font-medium text-foreground focus:outline-none"
            >
              <option value="nhan_vien">Nhân viên</option>
              <option value="admin">Quản trị viên (Admin)</option>
            </select>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button variant="outline" className="h-11 rounded-xl text-xs">Hủy</Button>
          </DialogClose>
          <Button
            className="h-11 rounded-xl text-xs font-bold gap-2"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            Tạo nhân viên
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Edit Dialog
// ---------------------------------------------------------------------------
function EditEmployeeDialog({
  employee,
  open,
  onOpenChange,
  onUpdated,
}: {
  employee: NhanVienAdmin | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUpdated: () => void;
}) {
  const [form, setForm] = useState<NhanVienUpdateDTO>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (employee) {
      setForm({ ten: employee.ten, vai_tro: employee.vai_tro });
    }
  }, [employee]);

  const handleSubmit = async () => {
    if (!employee) return;
    setSubmitting(true);
    try {
      const res = await apiClient
        .put(API_ENDPOINTS.ADMIN.NHAN_VIEN.UPDATE(employee.ma), { json: form })
        .json<{ success: boolean; error?: { code: string; message: string } }>();
      if (res.success) {
        toast.success(`Đã cập nhật ${employee.ma}`);
        onUpdated();
        onOpenChange(false);
      } else {
        toast.error(res.error?.message ?? 'Lỗi cập nhật');
      }
    } catch {
      toast.error('Lỗi kết nối server');
    } finally {
      setSubmitting(false);
    }
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="size-5 text-primary" aria-hidden="true" />
            Chỉnh sửa {employee.ma}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              Họ và tên
            </label>
            <Input
              value={form.ten ?? ''}
              onChange={(e) => setForm({ ...form, ten: e.target.value })}
              className="h-11 rounded-xl text-xs"
              maxLength={100}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              Vai trò
            </label>
            <select
              value={form.vai_tro ?? 'nhan_vien'}
              onChange={(e) => setForm({ ...form, vai_tro: e.target.value as VaiTro })}
              className="h-11 w-full rounded-xl border border-border bg-muted/40 px-3 text-xs font-medium text-foreground focus:outline-none"
            >
              <option value="nhan_vien">Nhân viên</option>
              <option value="admin">Quản trị viên (Admin)</option>
            </select>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button variant="outline" className="h-11 rounded-xl text-xs">Hủy</Button>
          </DialogClose>
          <Button
            className="h-11 rounded-xl text-xs font-bold gap-2"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            Lưu thay đổi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Reset PIN Dialog
// ---------------------------------------------------------------------------
function ResetPinDialog({
  employee,
  open,
  onOpenChange,
  onReset,
}: {
  employee: NhanVienAdmin | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onReset: () => void;
}) {
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const handleSubmit = async () => {
    if (!employee || pin.length !== 4) return;
    setSubmitting(true);
    try {
      const res = await apiClient
        .put(API_ENDPOINTS.ADMIN.NHAN_VIEN.RESET_PIN(employee.ma), {
          json: { pin_moi: pin },
        })
        .json<{ success: boolean; error?: { message: string } }>();
      if (res.success) {
        toast.success(`Đã đặt lại PIN cho ${employee.ma}`);
        onReset();
        onOpenChange(false);
        setPin('');
      } else {
        toast.error(res.error?.message ?? 'Lỗi đặt lại PIN');
      }
    } catch {
      toast.error('Lỗi kết nối server');
    } finally {
      setSubmitting(false);
    }
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-5 text-amber-500" aria-hidden="true" />
            Đặt lại PIN — {employee.ma}
          </DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
            PIN mới (4 chữ số)
          </label>
          <div className="relative">
            <Input
              type={showPin ? 'text' : 'password'}
              value={pin}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                setPin(v);
              }}
              placeholder="••••"
              className="h-11 rounded-xl text-xs font-mono pr-10"
              maxLength={4}
              inputMode="numeric"
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label={showPin ? 'Ẩn PIN' : 'Hiện PIN'}
            >
              {showPin ? (
                <EyeOff className="size-4" aria-hidden="true" />
              ) : (
                <Eye className="size-4" aria-hidden="true" />
              )}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Nhân viên sẽ bị đăng xuất khỏi tất cả phiên và phải đăng nhập lại bằng PIN mới.
          </p>
        </div>
        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button variant="outline" className="h-11 rounded-xl text-xs">Hủy</Button>
          </DialogClose>
          <Button
            className="h-11 rounded-xl text-xs font-bold gap-2"
            onClick={handleSubmit}
            disabled={submitting || pin.length !== 4}
          >
            {submitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            Xác nhận đặt PIN
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export const AdminEmployeesPage: React.FC = () => {
  const [employees, setEmployees] = useState<NhanVienAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<NhanVienAdmin | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [resetPinTarget, setResetPinTarget] = useState<NhanVienAdmin | null>(null);
  const [resetPinOpen, setResetPinOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<NhanVienAdmin | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toggleTarget, setToggleTarget] = useState<NhanVienAdmin | null>(null);
  const [toggleOpen, setToggleOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const totalEmployees = employees.length;
  const totalPages = Math.max(1, Math.ceil(totalEmployees / limit));
  const startIndex = totalEmployees === 0 ? 0 : (page - 1) * limit + 1;
  const endIndex = Math.min(page * limit, totalEmployees);
  const paginatedEmployees = useMemo(() => {
    const start = (page - 1) * limit;
    return employees.slice(start, start + limit);
  }, [employees, page, limit]);

  const fetchEmployees = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('trang_thai', filterStatus);
      if (search.trim()) params.set('search', search.trim());

      const url = `${API_ENDPOINTS.ADMIN.NHAN_VIEN.LIST}?${params.toString()}`;
      const res = await apiClient
        .get(url)
        .json<{ success: boolean; data: { items: NhanVienAdmin[]; total: number } }>();
      if (res.success) {
        setEmployees(res.data.items);
      }
    } catch {
      toast.error('Không thể tải danh sách nhân viên');
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus]);

  useEffect(() => {
    void fetchEmployees();
  }, [fetchEmployees]);

  // Delete handler
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      const res = await apiClient
        .delete(API_ENDPOINTS.ADMIN.NHAN_VIEN.DELETE(deleteTarget.ma))
        .json<{ success: boolean; error?: { code: string; message: string } }>();
      if (res.success) {
        toast.success(`Đã xóa ${deleteTarget.ma}`);
        void fetchEmployees();
      } else {
        toast.error(res.error?.message ?? 'Lỗi xóa nhân viên');
      }
    } catch {
      toast.error('Lỗi kết nối server');
    } finally {
      setActionLoading(false);
      setDeleteOpen(false);
    }
  };

  // Toggle enable/disable handler
  const handleToggle = async () => {
    if (!toggleTarget) return;
    const newStatus = toggleTarget.trang_thai === 'hoat_dong' ? 'vo_hieu_hoa' : 'hoat_dong';
    setActionLoading(true);
    try {
      const res = await apiClient
        .put(API_ENDPOINTS.ADMIN.NHAN_VIEN.UPDATE(toggleTarget.ma), {
          json: { trang_thai: newStatus } as NhanVienUpdateDTO,
        })
        .json<{ success: boolean; error?: { code: string; message: string } }>();
      if (res.success) {
        toast.success(
          newStatus === 'vo_hieu_hoa'
            ? `Đã vô hiệu hóa ${toggleTarget.ma}`
            : `Đã kích hoạt lại ${toggleTarget.ma}`
        );
        void fetchEmployees();
      } else {
        toast.error(res.error?.message ?? 'Lỗi cập nhật trạng thái');
      }
    } catch {
      toast.error('Lỗi kết nối server');
    } finally {
      setActionLoading(false);
      setToggleOpen(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 lg:gap-6 w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
            Quản lý Nhân viên
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Thêm, sửa, vô hiệu hóa và đặt lại PIN cho nhân viên kho
          </p>
        </div>
        <Button
          className="h-11 gap-2 rounded-2xl text-xs font-bold shrink-0 px-5"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="size-4" aria-hidden="true" />
          Thêm nhân viên
        </Button>
      </div>

      {/* Search & Filter */}
      <Card className="rounded-3xl shadow-xs">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" aria-hidden="true" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm theo mã hoặc tên nhân viên..."
              className="h-11 rounded-xl text-xs pl-10"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(1);
            }}
            className="h-11 rounded-xl border border-border bg-muted/40 px-3 text-xs font-medium text-foreground focus:outline-none shrink-0 w-full sm:w-48 cursor-pointer"
          >
            <option value="">Tất cả (trừ đã xóa)</option>
            <option value="hoat_dong">Hoạt động</option>
            <option value="vo_hieu_hoa">Vô hiệu hóa</option>
            <option value="da_xoa">Đã xóa</option>
          </select>
        </CardContent>
      </Card>

      {/* Employee List */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : employees.length === 0 ? (
        <Card className="rounded-3xl shadow-xs">
          <CardContent className="flex flex-col items-center justify-center gap-3 p-12">
            <Users className="size-12 text-muted-foreground/40" aria-hidden="true" />
            <p className="text-sm font-semibold text-muted-foreground">
              Không tìm thấy nhân viên nào
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Desktop Table List View */}
          <div className="hidden md:block rounded-2xl border border-border bg-card overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/40 text-[11px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                    <th className="py-3.5 px-4">Nhân viên</th>
                    <th className="py-3.5 px-3 text-center">Vai trò</th>
                    <th className="py-3.5 px-3 text-center">Trạng thái</th>
                    <th className="py-3.5 px-4 text-center">Video hôm nay</th>
                    <th className="py-3.5 px-4 text-center">Đăng nhập cuối</th>
                    <th className="py-3.5 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {paginatedEmployees.map((emp) => (
                    <tr
                      key={emp.ma}
                      className={cn(
                        'hover:bg-muted/30 transition-colors group',
                        emp.trang_thai === 'vo_hieu_hoa' && 'bg-amber-500/[0.02]',
                        emp.trang_thai === 'da_xoa' && 'opacity-60 bg-muted/20'
                      )}
                    >
                      {/* Nhân viên info */}
                      <td className="py-3 px-4 font-medium text-foreground">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'flex size-9 shrink-0 items-center justify-center rounded-xl text-xs font-black text-white shadow-2xs',
                              emp.vai_tro === 'admin'
                                ? 'bg-gradient-to-br from-violet-500 to-purple-600'
                                : 'bg-gradient-to-br from-sky-500 to-blue-600'
                            )}
                          >
                            {emp.ten
                              .split(/\s+/)
                              .map((w) => w.charAt(0))
                              .join('')
                              .toUpperCase()
                              .slice(0, 2)}
                          </div>
                          <div className="min-w-0 flex flex-col">
                            <span className="text-xs font-bold text-foreground font-mono">
                              {emp.ma}
                            </span>
                            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {emp.ten}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Vai trò */}
                      <td className="py-3 px-3 text-center">
                        <RoleBadge role={emp.vai_tro} />
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3 px-3 text-center">
                        <StatusBadge status={emp.trang_thai} />
                      </td>

                      {/* Video hôm nay */}
                      <td className="py-3 px-4 text-center font-mono font-bold text-xs text-foreground">
                        {emp.so_video_hom_nay ?? 0}
                      </td>

                      {/* Đăng nhập cuối */}
                      <td className="py-3 px-4 text-center font-mono text-[11px] text-muted-foreground">
                        {emp.dang_nhap_cuoi
                          ? new Date(emp.dang_nhap_cuoi).toLocaleString('vi-VN', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>

                      {/* Thao tác */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-lg cursor-pointer hover:bg-muted"
                            title="Chỉnh sửa"
                            onClick={() => {
                              setEditTarget(emp);
                              setEditOpen(true);
                            }}
                          >
                            <Pencil className="size-3.5" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-lg cursor-pointer hover:bg-muted"
                            title={emp.trang_thai === 'hoat_dong' ? 'Vô hiệu hóa' : 'Kích hoạt lại'}
                            onClick={() => {
                              setToggleTarget(emp);
                              setToggleOpen(true);
                            }}
                            disabled={emp.trang_thai === 'da_xoa'}
                          >
                            {emp.trang_thai === 'hoat_dong' ? (
                              <ShieldOff className="size-3.5 text-amber-500" aria-hidden="true" />
                            ) : (
                              <ShieldCheck className="size-3.5 text-emerald-500" aria-hidden="true" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-lg cursor-pointer hover:bg-muted"
                            title="Đặt lại PIN"
                            onClick={() => {
                              setResetPinTarget(emp);
                              setResetPinOpen(true);
                            }}
                            disabled={emp.trang_thai !== 'hoat_dong'}
                          >
                            <KeyRound className="size-3.5 text-amber-500" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-lg text-destructive hover:bg-destructive/10 cursor-pointer"
                            title="Xóa"
                            onClick={() => {
                              setDeleteTarget(emp);
                              setDeleteOpen(true);
                            }}
                            disabled={emp.trang_thai === 'da_xoa'}
                          >
                            <Trash2 className="size-3.5" aria-hidden="true" />
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
                  startIndex={startIndex}
                  endIndex={endIndex}
                  totalItems={totalEmployees}
                  label="nhân viên"
                />
                <PaginationLimitSelect
                  limit={limit}
                  onLimitChange={(val) => {
                    setLimit(val);
                    setPage(1);
                  }}
                  options={[10, 20, 50]}
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

          {/* Mobile Card List View */}
          <div className="flex flex-col gap-2.5 md:hidden">
            {paginatedEmployees.map((emp) => (
              <div
                key={emp.ma}
                className={cn(
                  'rounded-2xl border p-3.5 bg-card flex flex-col gap-2.5 shadow-2xs transition-all',
                  emp.trang_thai === 'vo_hieu_hoa' && 'bg-amber-500/[0.02] border-amber-500/30',
                  emp.trang_thai === 'da_xoa' && 'opacity-60 border-border/50'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-xl text-xs font-black text-white shadow-2xs',
                        emp.vai_tro === 'admin'
                          ? 'bg-gradient-to-br from-violet-500 to-purple-600'
                          : 'bg-gradient-to-br from-sky-500 to-blue-600'
                      )}
                    >
                      {emp.ten
                        .split(/\s+/)
                        .map((w) => w.charAt(0))
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex flex-col">
                      <span className="text-xs font-bold text-foreground font-mono">
                        {emp.ma}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {emp.ten}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <RoleBadge role={emp.vai_tro} />
                    <StatusBadge status={emp.trang_thai} />
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-muted/40 text-[11px] text-muted-foreground">
                  <div>
                    Video hôm nay:{' '}
                    <strong className="text-foreground font-mono font-bold">
                      {emp.so_video_hom_nay ?? 0}
                    </strong>
                  </div>
                  <div>
                    Đăng nhập:{' '}
                    <span className="text-foreground font-mono">
                      {emp.dang_nhap_cuoi
                        ? new Date(emp.dang_nhap_cuoi).toLocaleString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1 pt-2 border-t border-border/40">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2.5 rounded-lg text-xs gap-1 cursor-pointer"
                    onClick={() => {
                      setEditTarget(emp);
                      setEditOpen(true);
                    }}
                  >
                    <Pencil className="size-3.5" aria-hidden="true" />
                    <span>Sửa</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 rounded-lg text-xs gap-1 cursor-pointer"
                    title={emp.trang_thai === 'hoat_dong' ? 'Vô hiệu hóa' : 'Kích hoạt lại'}
                    onClick={() => {
                      setToggleTarget(emp);
                      setToggleOpen(true);
                    }}
                    disabled={emp.trang_thai === 'da_xoa'}
                  >
                    {emp.trang_thai === 'hoat_dong' ? (
                      <>
                        <ShieldOff className="size-3.5 text-amber-500" aria-hidden="true" />
                        <span className="text-amber-600">Khóa</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="size-3.5 text-emerald-500" aria-hidden="true" />
                        <span className="text-emerald-600">Mở</span>
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 rounded-lg text-xs gap-1 text-amber-600 cursor-pointer"
                    title="Đặt lại PIN"
                    onClick={() => {
                      setResetPinTarget(emp);
                      setResetPinOpen(true);
                    }}
                    disabled={emp.trang_thai !== 'hoat_dong'}
                  >
                    <KeyRound className="size-3.5" aria-hidden="true" />
                    <span>PIN</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 rounded-lg text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
                    title="Xóa"
                    onClick={() => {
                      setDeleteTarget(emp);
                      setDeleteOpen(true);
                    }}
                    disabled={emp.trang_thai === 'da_xoa'}
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Mobile Pagination Footer */}
            <div className="p-3.5 rounded-2xl border border-border bg-card shadow-2xs flex flex-col gap-3 select-none">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <PaginationInfo
                  startIndex={startIndex}
                  endIndex={endIndex}
                  totalItems={totalEmployees}
                  label="nhân viên"
                />
                <PaginationLimitSelect
                  limit={limit}
                  onLimitChange={(val) => {
                    setLimit(val);
                    setPage(1);
                  }}
                  options={[10, 20, 50]}
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/70">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  className="h-8 px-3 rounded-lg text-xs cursor-pointer"
                >
                  Trước
                </Button>
                <span className="text-xs font-bold text-foreground">
                  Trang {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page >= totalPages}
                  className="h-8 px-3 rounded-lg text-xs cursor-pointer"
                >
                  Tiếp
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Dialogs ─── */}
      <CreateEmployeeDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => void fetchEmployees()}
      />

      <EditEmployeeDialog
        employee={editTarget}
        open={editOpen}
        onOpenChange={setEditOpen}
        onUpdated={() => void fetchEmployees()}
      />

      <ResetPinDialog
        employee={resetPinTarget}
        open={resetPinOpen}
        onOpenChange={setResetPinOpen}
        onReset={() => void fetchEmployees()}
      />

      {/* Delete Confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="size-5 text-destructive" aria-hidden="true" />
              Xóa nhân viên {deleteTarget?.ma}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Nhân viên sẽ bị đánh dấu &quot;Đã xóa&quot; và không thể đăng nhập. Hành động này
              không thể hoàn tác từ giao diện.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
              onClick={handleDelete}
              disabled={actionLoading}
            >
              {actionLoading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Xác nhận xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Toggle Enable/Disable Confirm */}
      <AlertDialog open={toggleOpen} onOpenChange={setToggleOpen}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {toggleTarget?.trang_thai === 'hoat_dong' ? (
                <ShieldOff className="size-5 text-amber-500" aria-hidden="true" />
              ) : (
                <ShieldCheck className="size-5 text-emerald-500" aria-hidden="true" />
              )}
              {toggleTarget?.trang_thai === 'hoat_dong'
                ? `Vô hiệu hóa ${toggleTarget?.ma}?`
                : `Kích hoạt lại ${toggleTarget?.ma}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleTarget?.trang_thai === 'hoat_dong'
                ? 'Nhân viên sẽ bị đăng xuất khỏi tất cả phiên và không thể đăng nhập cho đến khi được kích hoạt lại.'
                : 'Nhân viên sẽ có thể đăng nhập lại bình thường.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Hủy</AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                'rounded-xl gap-2',
                toggleTarget?.trang_thai === 'hoat_dong'
                  ? 'bg-amber-500 text-white hover:bg-amber-600'
                  : 'bg-emerald-500 text-white hover:bg-emerald-600'
              )}
              onClick={handleToggle}
              disabled={actionLoading}
            >
              {actionLoading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Xác nhận
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminEmployeesPage;
