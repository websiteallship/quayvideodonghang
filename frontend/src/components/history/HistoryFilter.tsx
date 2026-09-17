import React from 'react';
import {
  SlidersHorizontal,
  Calendar,
  Truck,
  HardDrive,
  User,
  X,
  RotateCcw,
  Check,
  ExternalLink
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { DON_VI_VAN_CHUYEN_LIST } from '@/config/constants';

const CARRIERS = [
  { label: 'Tất cả ĐVVC', value: 'all' },
  ...DON_VI_VAN_CHUYEN_LIST.map((c) => ({ label: c.label, value: c.id }))
];

const STATUS_LIST = [
  { label: 'Tất cả trạng thái', value: 'all', colorDot: 'bg-muted-foreground/40' },
  { label: 'Đã lưu (Drive)', value: 'da_upload', colorDot: 'bg-emerald-500' },
  { label: 'Chờ tải lên', value: 'cho_upload', colorDot: 'bg-amber-500' },
  { label: 'Đang tải lên', value: 'dang_upload', colorDot: 'bg-sky-500' },
  { label: 'Lỗi tải lên', value: 'loi', colorDot: 'bg-rose-500' }
];

export interface HistoryFilterProps {
  isAdmin: boolean;
  nhanVienList: { ma: string; ten: string }[];
  datePreset: 'today' | '7days' | '30days' | 'all' | 'custom';
  handleDatePreset: (val: 'today' | '7days' | '30days' | 'all' | 'custom') => void;
  ngayTu: string;
  setNgayTu: (val: string) => void;
  ngayDen: string;
  setNgayDen: (val: string) => void;
  carrier: string;
  setCarrier: (val: string) => void;
  trangThai: string;
  setTrangThai: (val: string) => void;
  maNhanVien: string;
  setMaNhanVien: (val: string) => void;
  setPage: (val: number) => void;
  showFilters: boolean;
  setShowFilters: (val: boolean) => void;
  showFilterModal: boolean;
  setShowFilterModal: (val: boolean) => void;
  activeFiltersCount: number;
  totalItems: number;
  debouncedSearch: string;
  handleResetFilters: () => void;
}

export const HistoryFilter: React.FC<HistoryFilterProps> = ({
  isAdmin,
  nhanVienList,
  datePreset,
  handleDatePreset,
  ngayTu,
  setNgayTu,
  ngayDen,
  setNgayDen,
  carrier,
  setCarrier,
  trangThai,
  setTrangThai,
  maNhanVien,
  setMaNhanVien,
  setPage,
  showFilters,
  setShowFilters,
  showFilterModal,
  setShowFilterModal,
  activeFiltersCount,
  totalItems,
  debouncedSearch,
  handleResetFilters,
}) => {
  return (
    <>
      {/* Inline Expandable Filter Panel (Desktop) */}
      {showFilters && (
        <div className="hidden lg:flex flex-col p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-card shadow-sm gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Filter Panel Top Row */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <SlidersHorizontal size={15} />
              </div>
              <span className="font-bold text-xs uppercase tracking-tight text-foreground">
                Bộ Lọc Lịch Sử Nâng Cao
              </span>
              {activeFiltersCount > 0 && (
                <Badge className="bg-blue-600 hover:bg-blue-600 text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-full shadow-none">
                  {activeFiltersCount} đang chọn
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowFilterModal(true)}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <ExternalLink size={13} />
                <span>Mở dạng Modal Popup</span>
              </button>
              <button
                type="button"
                onClick={() => setShowFilters(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 cursor-pointer transition-colors"
                aria-label="Đóng bảng bộ lọc"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* 4 Filters Grid */}
          <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs", isAdmin ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
            {/* 1. Khoảng thời gian */}
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                <Calendar size={14} className="text-blue-600 dark:text-blue-400" />
                <span>Khoảng thời gian</span>
              </label>
              <Select value={datePreset} onValueChange={(val: any) => handleDatePreset(val)}>
                <SelectTrigger className="w-full h-10 px-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-card text-foreground font-medium text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs hover:bg-muted/40 transition-all cursor-pointer">
                  <SelectValue placeholder="Khoảng thời gian" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl shadow-xl border-slate-100 dark:border-slate-800">
                  <SelectItem value="today">Hôm nay</SelectItem>
                  <SelectItem value="7days">7 ngày qua</SelectItem>
                  <SelectItem value="30days">30 ngày qua</SelectItem>
                  <SelectItem value="all">Tất cả thời gian</SelectItem>
                  <SelectItem value="custom">Tùy chỉnh khoảng ngày...</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 2. Đơn vị VC */}
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                <Truck size={14} className="text-blue-600 dark:text-blue-400" />
                <span>Đơn vị vận chuyển</span>
              </label>
              <Select value={carrier} onValueChange={(val) => { setCarrier(val); setPage(1); }}>
                <SelectTrigger className="w-full h-10 px-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-card text-foreground font-medium text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs hover:bg-muted/40 transition-all cursor-pointer">
                  <SelectValue placeholder="Chọn ĐVVC" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl shadow-xl border-slate-100 dark:border-slate-800">
                  <SelectItem value="all">Tất cả ĐVVC</SelectItem>
                  {CARRIERS.map((c) => (
                    c.value !== 'all' && (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    )
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 3. Trạng thái */}
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                <HardDrive size={14} className="text-blue-600 dark:text-blue-400" />
                <span>Trạng thái lưu trữ</span>
              </label>
              <Select value={trangThai} onValueChange={(val) => { setTrangThai(val); setPage(1); }}>
                <SelectTrigger className="w-full h-10 px-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-card text-foreground font-medium text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs hover:bg-muted/40 transition-all cursor-pointer">
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl shadow-xl border-slate-100 dark:border-slate-800">
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  {STATUS_LIST.map((s) => (
                    s.value !== 'all' && (
                      <SelectItem key={s.value} value={s.value}>
                        <div className="flex items-center gap-2">
                          <span className={cn("size-2 rounded-full shrink-0", s.colorDot)} />
                          <span>{s.label}</span>
                        </div>
                      </SelectItem>
                    )
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 4. Nhân viên */}
            {isAdmin && (
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                  <User size={14} className="text-blue-600 dark:text-blue-400" />
                  <span>Nhân viên thực hiện</span>
                </label>
                <Select value={maNhanVien || "all"} onValueChange={(val) => { setMaNhanVien(val === "all" ? "" : val); setPage(1); }}>
                  <SelectTrigger className="w-full h-10 px-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-card text-foreground font-medium text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs hover:bg-muted/40 transition-all cursor-pointer">
                    <SelectValue placeholder="Tất cả nhân viên" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl shadow-xl border-slate-100 dark:border-slate-800 max-h-64">
                    <SelectItem value="all">Tất cả nhân viên</SelectItem>
                    {nhanVienList.map((nv) => (
                      <SelectItem key={nv.ma} value={nv.ma}>
                        {nv.ma} - {nv.ten}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Custom Date Range Picker */}
          {datePreset === 'custom' && (
            <div className="flex items-center gap-3 px-4 py-3 bg-slate-50/90 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs sm:text-sm flex-wrap animate-in fade-in slide-in-from-top-1 duration-200">
              <span className="font-medium text-slate-600 dark:text-slate-400 shrink-0">Khoảng ngày tùy chọn:</span>
              <Input
                type="date"
                value={ngayTu}
                onChange={(e) => { setNgayTu(e.target.value); setPage(1); }}
                className="h-9 w-auto min-w-[150px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-medium shadow-2xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <span className="text-slate-400 font-medium px-1">→</span>
              <Input
                type="date"
                value={ngayDen}
                onChange={(e) => { setNgayDen(e.target.value); setPage(1); }}
                className="h-9 w-auto min-w-[150px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-medium shadow-2xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          )}

          {/* Filter Panel Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 flex-wrap gap-2">
            <div className="text-xs text-muted-foreground flex items-center gap-2 font-medium">
              <span className="size-2 rounded-full bg-emerald-500 shrink-0"></span>
              <span>Tìm thấy <strong className="text-foreground font-bold">{totalItems}</strong> biên bản phù hợp</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                disabled={activeFiltersCount === 0 && datePreset === '7days' && !debouncedSearch}
                className="h-9 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-card hover:bg-muted/80 text-xs font-semibold text-foreground flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
              >
                <RotateCcw size={13} />
                <span>Đặt lại</span>
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setShowFilters(false)}
                className="h-9 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-blue-500/20 cursor-pointer transition-all"
              >
                <Check size={14} />
                <span>Áp dụng</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile / Advanced Filter Modal Dialog */}
      <Dialog open={showFilterModal} onOpenChange={setShowFilterModal}>
        <DialogContent className="w-[96vw] max-w-[96vw] sm:max-w-2xl sm:w-full p-0 rounded-3xl overflow-hidden border-border bg-card max-h-[90vh] flex flex-col sm:zoom-in-95 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
          {/* Modal Header */}
          <DialogHeader className="px-5 py-4 sm:px-6 sm:py-5 border-b border-border bg-muted/20 flex flex-row items-center justify-between space-y-0 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs">
                <SlidersHorizontal className="size-5" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-sm sm:text-base font-bold tracking-tight text-foreground uppercase">
                    Bộ Lọc Nâng Cao Lịch Sử
                  </DialogTitle>
                  {activeFiltersCount > 0 && (
                    <Badge className="text-[10px] sm:text-[11px] h-5 px-2 font-bold bg-blue-600 hover:bg-blue-600 text-white rounded-full">
                      {activeFiltersCount} đang chọn
                    </Badge>
                  )}
                </div>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Tùy chỉnh tiêu chí tra cứu và đối soát biên bản đóng gói &amp; khui hàng
                </DialogDescription>
              </div>
            </div>
            <DialogTitle className="sr-only">Bộ Lọc Lịch Sử</DialogTitle>
          </DialogHeader>

          {/* Modal Body */}
          <div className="p-4 sm:p-6 overflow-y-auto flex flex-col gap-5 text-xs">
            {/* 1. Khoảng thời gian */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <label className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                  <Calendar size={15} className="text-blue-600 dark:text-blue-400" />
                  <span>Khoảng thời gian</span>
                </label>
                <span className="text-[11px] text-muted-foreground font-medium">
                  {datePreset === 'today' && 'Hôm nay'}
                  {datePreset === '7days' && '7 ngày gần nhất'}
                  {datePreset === '30days' && '30 ngày gần nhất'}
                  {datePreset === 'all' && 'Toàn bộ thời gian'}
                  {datePreset === 'custom' && `${ngayTu || '...'} → ${ngayDen || '...'}`}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1 bg-muted/40 rounded-2xl border border-border/60">
                {[
                  { id: 'today', label: 'Hôm nay' },
                  { id: '7days', label: '7 ngày qua' },
                  { id: '30days', label: '30 ngày qua' },
                  { id: 'all', label: 'Tất cả' },
                  { id: 'custom', label: 'Tùy chỉnh' }
                ].map((p) => {
                  const isActive = datePreset === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={cn(
                        "w-full py-2 px-1 text-center rounded-xl font-semibold text-xs transition-all cursor-pointer truncate",
                        isActive
                          ? "bg-blue-600 text-white shadow-xs font-bold"
                          : "text-muted-foreground hover:text-foreground hover:bg-card"
                      )}
                      onClick={() => handleDatePreset(p.id as typeof datePreset)}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>

              {datePreset === 'custom' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50/90 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 mt-1 animate-in fade-in duration-150">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-muted-foreground block">Từ ngày</label>
                    <Input
                      type="date"
                      value={ngayTu}
                      onChange={(e) => { setNgayTu(e.target.value); setPage(1); }}
                      className="w-full h-9 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium shadow-2xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-muted-foreground block">Đến ngày</label>
                    <Input
                      type="date"
                      value={ngayDen}
                      onChange={(e) => { setNgayDen(e.target.value); setPage(1); }}
                      className="w-full h-9 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium shadow-2xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            <Separator className="opacity-60" />

            {/* 2. Đơn vị vận chuyển */}
            <div className="flex flex-col gap-2.5">
              <label className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                <Truck size={15} className="text-blue-600 dark:text-blue-400" />
                <span>Đơn vị vận chuyển (ĐVVC)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {CARRIERS.map((c) => {
                  const isSelected = carrier === c.value;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => { setCarrier(c.value); setPage(1); }}
                      className={cn(
                        "px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-none",
                        isSelected
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20"
                          : "bg-card border-border text-foreground hover:bg-muted/80"
                      )}
                    >
                      <span>{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator className="opacity-60" />

            {/* 3. Trạng thái lưu trữ Google Drive */}
            <div className="flex flex-col gap-2.5">
              <label className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                <HardDrive size={15} className="text-blue-600 dark:text-blue-400" />
                <span>Trạng thái lưu trữ Google Drive</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {STATUS_LIST.map((s) => {
                  const isSelected = trangThai === s.value;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => { setTrangThai(s.value); setPage(1); }}
                      className={cn(
                        "p-3 rounded-2xl border text-xs font-semibold text-left flex items-center gap-2.5 transition-all cursor-pointer shadow-none",
                        isSelected
                          ? "bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-600 dark:text-blue-400 shadow-2xs"
                          : "bg-card border-border text-foreground hover:bg-muted/80"
                      )}
                    >
                      <span className={cn("size-2.5 rounded-full shrink-0", s.colorDot)}></span>
                      <span>{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Nhân viên & Thiết bị */}
            {isAdmin && (
              <>
                <Separator className="opacity-60" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                      <User size={15} className="text-blue-600 dark:text-blue-400" />
                      <span>Nhân viên thực hiện (Admin)</span>
                    </label>
                    <Select value={maNhanVien || "all"} onValueChange={(val) => { setMaNhanVien(val === "all" ? "" : val); setPage(1); }}>
                      <SelectTrigger className="w-full h-10 px-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-card text-foreground font-medium text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs">
                        <SelectValue placeholder="Tất cả nhân viên" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl shadow-xl border-slate-100 dark:border-slate-800 max-h-64">
                        <SelectItem value="all">Tất cả nhân viên</SelectItem>
                        {nhanVienList.map((nv) => (
                          <SelectItem key={nv.ma} value={nv.ma}>
                            {nv.ma} - {nv.ten}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-between flex-wrap gap-3 shrink-0">
            <div className="text-xs text-muted-foreground font-medium flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-500 shrink-0"></span>
              <span>Tìm thấy <strong className="text-foreground font-bold">{totalItems}</strong> biên bản thỏa mãn</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="h-9 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-card hover:bg-muted text-xs font-semibold text-foreground flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <RotateCcw size={13} />
                <span>Đặt lại</span>
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setShowFilterModal(false)}
                className="h-9 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-blue-500/20 cursor-pointer"
              >
                <Check size={14} />
                <span>Áp dụng bộ lọc</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
