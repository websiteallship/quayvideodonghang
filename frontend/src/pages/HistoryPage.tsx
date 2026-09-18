import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  RefreshCw,
  Package,
  PackageOpen,
  Clock,
  HardDrive,
  User,
  Play,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Copy,
  Check,
  Scan,
  FileVideo,
  SlidersHorizontal,
} from 'lucide-react';
import { Pagination, PaginationInfo, PaginationLimitSelect } from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useCamera } from '@/hooks/use-camera';
import { useBarcode } from '@/hooks/use-barcode';
import { useBarcodeGun } from '@/hooks/use-barcode-gun';
import { CameraPreview } from '@/components/camera/CameraPreview';
import { ScannerOverlay } from '@/components/scanner/ScannerOverlay';
import { HistoryFilter } from '@/components/history/HistoryFilter';
import { DateRange } from 'react-day-picker';
import { subDays, format } from 'date-fns';
import {
  fetchBienBanList,
  type BienBanFilterParams,
} from '@/services/bien-ban-service';
import { apiClient, API_BASE } from '@/services/api-client';
import { formatDateTimeVN, formatDuration, formatBytes } from '@/utils/format';
import { feedbackSuccess } from '@/utils/barcode-feedback';
import { DON_VI_VAN_CHUYEN_LIST } from '@/config/constants';
import type { BienBan, BarcodeResult } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------


/** Carrier badge color mapping */
function getCarrierColor(donViVc: string): string {
  const map: Record<string, string> = {
    ShopeeXpress: 'bg-orange-500/10 text-orange-600 border-orange-500/25 dark:text-orange-400',
    GHN: 'bg-amber-500/10 text-amber-600 border-amber-500/25 dark:text-amber-400',
    'J&T': 'bg-rose-500/10 text-rose-600 border-rose-500/25 dark:text-rose-400',
    ViettelPost: 'bg-teal-500/10 text-teal-600 border-teal-500/25 dark:text-teal-400',
    GHTK: 'bg-sky-500/10 text-sky-600 border-sky-500/25 dark:text-sky-400',
    BestExpress: 'bg-violet-500/10 text-violet-600 border-violet-500/25 dark:text-violet-400',
    VNPost: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/25 dark:text-indigo-400',
    NhatTin: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/25 dark:text-cyan-400',
    LazadaExpress: 'bg-blue-500/10 text-blue-600 border-blue-500/25 dark:text-blue-400',
  };
  return map[donViVc] ?? 'bg-slate-500/10 text-slate-600 border-slate-500/25 dark:text-slate-400';
}

function getCarrierBarColor(donViVc: string): string {
  const map: Record<string, string> = {
    ShopeeXpress: 'bg-orange-500',
    GHN: 'bg-amber-500',
    'J&T': 'bg-rose-500',
    ViettelPost: 'bg-teal-500',
    GHTK: 'bg-sky-500',
    BestExpress: 'bg-violet-500',
  };
  return map[donViVc] ?? 'bg-blue-500';
}

function getCarrierLabel(donViVc: string): string {
  const found = DON_VI_VAN_CHUYEN_LIST.find((c) => c.id === donViVc);
  return found?.label ?? donViVc;
}

function getStatusBadge(trangThai: string) {
  switch (trangThai) {
    case 'da_upload':
      return (
        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/25 dark:text-emerald-400 hover:bg-emerald-500/15 text-[10px] font-bold uppercase tracking-wider rounded-full shadow-none">
          ĐÃ LƯU
        </Badge>
      );
    case 'cho_upload':
      return (
        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/25 dark:text-amber-400 hover:bg-amber-500/15 text-[10px] font-bold uppercase tracking-wider rounded-full shadow-none">
          CHỜ TẢI
        </Badge>
      );
    case 'dang_upload':
      return (
        <Badge className="bg-sky-500/10 text-sky-600 border-sky-500/25 dark:text-sky-400 hover:bg-sky-500/15 text-[10px] font-bold uppercase tracking-wider rounded-full shadow-none">
          ĐANG TẢI
        </Badge>
      );
    case 'loi':
      return (
        <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/25 dark:text-rose-400 hover:bg-rose-500/15 text-[10px] font-bold uppercase tracking-wider rounded-full shadow-none">
          LỖI
        </Badge>
      );
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------


type BienBanItem = BienBan & { ten_nhan_vien?: string };

// ---------------------------------------------------------------------------
// HistoryPage
// ---------------------------------------------------------------------------

export const HistoryPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.vai_tro === 'admin';
  const navigate = useNavigate();

  // 1. Search state & Debounce (300ms)
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // 2. Filter states (Default date: 7 days ago)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 6),
    to: new Date()
  });
  const [carrier, setCarrier] = useState('all');
  const [loaiBienBan, setLoaiBienBan] = useState('all');
  const [trangThai, setTrangThai] = useState('all');
  const [maNhanVien, setMaNhanVien] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [nhanVienList, setNhanVienList] = useState<{ ma: string; ten: string }[]>([]);

  // Fetch nhan vien list for admin
  useEffect(() => {
    if (isAdmin) {
      apiClient
        .get(`${API_BASE}/admin/nhan-vien`)
        .json<{ success: boolean; data: { ma: string; ten: string }[] }>()
        .then((res) => {
          if (res.success && Array.isArray(res.data)) {
            setNhanVienList(res.data);
          }
        })
        .catch((err) => console.error('Lỗi tải danh sách nhân viên', err));
    }
  }, [isAdmin]);

  // 3. Pagination & Data
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [items, setItems] = useState<BienBanItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 4. Copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);



  // Copy text helper
  const handleCopyText = (e: React.MouseEvent, text: string, id: string) => {
    e.stopPropagation();
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId((prev) => (prev === id ? null : prev));
    }, 2000);
  };

  // 6. Barcode Scanner Modal
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const scannerVideoRef = useRef<HTMLVideoElement | null>(null);
  const {
    stream: scannerStream,
    isLoading: isScannerCameraLoading,
    startCamera: startScannerCamera,
    stopCamera: stopScannerCamera,
  } = useCamera();

  const handleBarcodeDetected = useCallback(
    (result: BarcodeResult) => {
      if (result?.rawValue) {
        feedbackSuccess();
        setSearchInput(result.rawValue);
        setDebouncedSearch(result.rawValue);
        setPage(1);
        setIsScannerOpen(false);
        stopScannerCamera();
      }
    },
    [stopScannerCamera]
  );

  const {
    startScanning: startBarcodeScanning,
    stopScanning: stopBarcodeScanning,
    reset: resetBarcode,
  } = useBarcode(scannerVideoRef, handleBarcodeDetected);

  // 7. USB Barcode gun listener
  useBarcodeGun(
    useCallback(
      (code: string) => {
        if (!isScannerOpen) {
          feedbackSuccess();
          setSearchInput(code);
          setDebouncedSearch(code);
          setPage(1);
        }
      },
      [isScannerOpen]
    ),
    true
  );

  // Debounce search input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setDateRange({
      from: subDays(new Date(), 6),
      to: new Date()
    });
    setCarrier('all');
    setLoaiBienBan('all');
    setTrangThai('all');
    setMaNhanVien('');
    setPage(1);
  };

  // Check if date range is default (last 7 days)
  const isDefaultDate = dateRange?.from && dateRange?.to && 
    format(dateRange.from, 'yyyy-MM-dd') === format(subDays(new Date(), 6), 'yyyy-MM-dd') &&
    format(dateRange.to, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (!isDefaultDate) count++;
    if (carrier !== 'all') count++;
    if (loaiBienBan !== 'all') count++;
    if (trangThai !== 'all') count++;
    if (maNhanVien !== '') count++;
    return count;
  }, [isDefaultDate, carrier, loaiBienBan, trangThai, maNhanVien]);

  // Fetch list
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    const params: BienBanFilterParams = {
      page,
      limit,
      search: debouncedSearch.trim() || undefined,
      ngay_tu: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
      ngay_den: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
      don_vi_vc: carrier !== 'all' ? carrier : undefined,
      loai_bien_ban: loaiBienBan !== 'all' ? loaiBienBan : undefined,
      trang_thai: trangThai !== 'all' ? trangThai : undefined,
      ma_nhan_vien: isAdmin && maNhanVien.trim() ? maNhanVien.trim() : undefined,
    };

    const res = await fetchBienBanList(params);

    if (res.success && res.data) {
      setItems(res.data.items || []);
      const total = res.data.pagination?.total ?? res.data.total ?? 0;
      const tPages = res.data.pagination?.total_pages ?? res.data.total_pages ?? 1;
      setTotalItems(total);
      setTotalPages(Math.max(1, tPages));
    } else {
      setLoadError(res.error?.message || 'Không thể kết nối đến máy chủ để tải lịch sử.');
      setItems([]);
    }

    setIsLoading(false);
  }, [page, limit, debouncedSearch, dateRange, carrier, loaiBienBan, trangThai, maNhanVien, isAdmin]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Navigate to video detail page
  const handleOpenVideo = (item: BienBanItem) => {
    navigate(`/history/${item.id}`);
  };

  // Scanner modal
  const handleOpenScanner = async () => {
    setIsScannerOpen(true);
    resetBarcode();
    await startScannerCamera();
    startBarcodeScanning();
  };

  const handleCloseScanner = () => {
    setIsScannerOpen(false);
    stopBarcodeScanning();
    stopScannerCamera();
  };

  // Tab counts for loaiBienBan
  const counts = useMemo(
    () => ({
      all: totalItems,
      dong_goi: items.filter((i) => i.loai_bien_ban === 'dong_goi').length,
      khui_hang: items.filter((i) => i.loai_bien_ban === 'khui_hang').length,
    }),
    [items, totalItems]
  );

  const startIndex = (page - 1) * limit + 1;
  const endIndex = Math.min(page * limit, totalItems);

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div className="flex flex-col gap-4 lg:gap-5 pb-6 w-full">
      {/* ------------------------------------------------------------------ */}
      {/* Page Header */}
      {/* ------------------------------------------------------------------ */}
      <div className="hidden lg:flex justify-between items-start">
        <div>
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
            Lịch sử biên bản
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Tra cứu và quản lý video quy trình đóng gói &amp; khui hàng đã lưu
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => void loadData()}
          disabled={isLoading}
          className="h-10 px-4 rounded-xl border border-border bg-card hover:bg-muted text-sm font-semibold gap-2 shadow-xs cursor-pointer"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          <span>Làm mới</span>
        </Button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Top Controls Box: Tabs + Search + Filter */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col gap-3">
        {/* Mobile Pill Segmented Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-muted/60 p-1 rounded-xl border border-border/60 lg:hidden">
          {[
            { id: 'all', label: 'Tất cả', count: counts.all },
            { id: 'dong_goi', label: 'Đóng gói', count: counts.dong_goi },
            { id: 'khui_hang', label: 'Khui hàng', count: counts.khui_hang },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => { setLoaiBienBan(tab.id); setPage(1); }}
              className={cn(
                'py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer',
                loaiBienBan === tab.id
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground'
              )}
            >
              <span>{tab.label}</span>
              <span className="text-[10px]">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Desktop Controls Bar */}
        <div className="hidden lg:flex p-1.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-card shadow-xs items-center justify-between gap-3 flex-wrap">
          {/* Segmented Pill Tabs */}
          <div className="inline-flex bg-muted/60 p-1 rounded-xl border border-border/60">
            {[
              { id: 'all', label: 'Tất cả', count: counts.all, icon: null },
              { id: 'dong_goi', label: 'Đóng gói', count: counts.dong_goi, icon: <Package size={14} className="text-blue-500" /> },
              { id: 'khui_hang', label: 'Khui hàng', count: counts.khui_hang, icon: <PackageOpen size={14} className="text-amber-500" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => { setLoaiBienBan(tab.id); setPage(1); }}
                className={cn(
                  'px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer',
                  loaiBienBan === tab.id
                    ? 'bg-card text-foreground shadow-xs border border-border/70'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.icon}
                <span>{tab.label}</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-muted font-bold text-foreground">
                  ({tab.count})
                </span>
              </button>
            ))}
          </div>

          {/* Search + Actions */}
          <div className="flex items-center gap-2 flex-1 max-w-md ml-auto">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Tìm theo mã vận đơn..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full h-10 pl-9 pr-8 text-xs font-mono bg-muted/30 border border-border rounded-xl focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => { setSearchInput(''); setDebouncedSearch(''); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={handleOpenScanner}
              title="Quét barcode bằng Camera"
              className="size-10 rounded-xl border border-border bg-card hover:bg-muted shadow-xs cursor-pointer shrink-0"
            >
              <Scan size={16} className="text-blue-600 dark:text-blue-400" />
            </Button>

            <Button
              variant={showFilters || activeFiltersCount > 0 ? 'default' : 'outline'}
              onClick={() => setShowFilters(!showFilters)}
              title="Bật / tắt bảng bộ lọc nâng cao"
              className={cn(
                'h-10 px-3.5 rounded-xl text-xs font-semibold gap-1.5 shrink-0 shadow-xs cursor-pointer transition-all',
                showFilters || activeFiltersCount > 0
                  ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-sm shadow-blue-500/20'
                  : 'bg-card border-border hover:bg-muted text-foreground'
              )}
            >
              <SlidersHorizontal size={14} />
              <span>Lọc {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}</span>
            </Button>
          </div>
        </div>

        {/* Mobile Search & Actions */}
        <div className="flex items-center gap-2 lg:hidden">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Tìm theo mã vận đơn..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full h-10 pl-9 pr-8 text-xs font-mono bg-muted/30 border border-border rounded-xl"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => { setSearchInput(''); setDebouncedSearch(''); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={handleOpenScanner}
            title="Quét Barcode"
            className="size-10 rounded-xl border border-border bg-card shadow-xs shrink-0 cursor-pointer active:scale-95 transition-all"
          >
            <Scan size={16} className="text-blue-600 dark:text-blue-400" />
          </Button>

          <button
            type="button"
            onClick={() => setShowFilterModal(true)}
            className={cn(
              'relative size-10 rounded-xl border flex items-center justify-center shrink-0 shadow-xs active:scale-95 transition-all cursor-pointer',
              activeFiltersCount > 0
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400 font-bold'
                : 'border-border bg-card text-foreground hover:bg-muted'
            )}
            title="Mở Bộ Lọc"
          >
            <SlidersHorizontal size={16} />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 size-4 bg-amber-500 text-white rounded-full text-[9px] font-extrabold flex items-center justify-center shadow-xs">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* HistoryFilter (Inline Desktop + Modal) */}
      {/* ------------------------------------------------------------------ */}
      <HistoryFilter
        isAdmin={isAdmin}
        nhanVienList={nhanVienList}
        dateRange={dateRange}
        setDateRange={setDateRange}
        carrier={carrier}
        setCarrier={setCarrier}
        trangThai={trangThai}
        setTrangThai={setTrangThai}
        maNhanVien={maNhanVien}
        setMaNhanVien={setMaNhanVien}
        setPage={setPage}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        showFilterModal={showFilterModal}
        setShowFilterModal={setShowFilterModal}
        activeFiltersCount={activeFiltersCount}
        totalItems={totalItems}
        debouncedSearch={debouncedSearch}
        handleResetFilters={handleResetFilters}
      />

      {/* ------------------------------------------------------------------ */}
      {/* Active Filters Chips Row */}
      {/* ------------------------------------------------------------------ */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-1.5 lg:gap-2 overflow-x-auto pb-1 text-xs lg:text-xs">
          <span className="text-[10px] lg:text-xs font-semibold text-muted-foreground shrink-0">Đang lọc:</span>

          {!isDefaultDate && (
            <span className="inline-flex items-center gap-1 px-2 lg:px-2.5 py-0.5 lg:py-1 rounded-lg bg-muted border border-border text-foreground font-medium shrink-0">
              <span>
                {dateRange?.from && dateRange?.to ? `${format(dateRange.from, 'dd/MM/yyyy')} → ${format(dateRange.to, 'dd/MM/yyyy')}` : ''}
              </span>
              <button type="button" onClick={() => setDateRange({ from: subDays(new Date(), 6), to: new Date() })} className="text-muted-foreground hover:text-foreground ml-0.5 cursor-pointer">
                <X size={12} />
              </button>
            </span>
          )}

          {carrier !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 lg:px-2.5 py-0.5 lg:py-1 rounded-lg bg-blue-500/10 text-blue-600 border border-blue-500/20 shrink-0 font-medium">
              ĐVVC: {getCarrierLabel(carrier)}
              <button type="button" onClick={() => { setCarrier('all'); setPage(1); }} className="hover:opacity-70 cursor-pointer">
                <X size={12} />
              </button>
            </span>
          )}

          {trangThai !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 lg:px-2.5 py-0.5 lg:py-1 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shrink-0 font-medium">
              {trangThai === 'da_upload' ? 'Đã lưu' : trangThai === 'cho_upload' ? 'Chờ tải' : trangThai === 'dang_upload' ? 'Đang tải' : 'Lỗi'}
              <button type="button" onClick={() => { setTrangThai('all'); setPage(1); }} className="hover:opacity-70 cursor-pointer">
                <X size={12} />
              </button>
            </span>
          )}

          {loaiBienBan !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 lg:px-2.5 py-0.5 lg:py-1 rounded-lg bg-violet-500/10 text-violet-600 border border-violet-500/20 shrink-0 font-medium">
              {loaiBienBan === 'dong_goi' ? 'Đóng gói' : 'Khui hàng'}
              <button type="button" onClick={() => { setLoaiBienBan('all'); setPage(1); }} className="hover:opacity-70 cursor-pointer">
                <X size={12} />
              </button>
            </span>
          )}

          {maNhanVien && (
            <span className="inline-flex items-center gap-1 px-2 lg:px-2.5 py-0.5 lg:py-1 rounded-lg bg-purple-500/10 text-purple-600 border border-purple-500/20 shrink-0 font-medium">
              NV: {maNhanVien}
              <button type="button" onClick={() => { setMaNhanVien(''); setPage(1); }} className="hover:opacity-70 cursor-pointer">
                <X size={12} />
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={handleResetFilters}
            className="text-xs text-destructive hover:underline font-semibold shrink-0 ml-auto cursor-pointer flex items-center gap-1"
          >
            <RefreshCw size={12} />
            <span>Xoá tất cả</span>
          </button>

          <span className="hidden lg:inline ml-auto text-xs text-muted-foreground shrink-0">
            Tìm thấy <strong className="text-foreground font-bold">{totalItems}</strong> biên bản
          </span>
        </div>
      )}

      {/* Mobile result count */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium lg:hidden">
        <span>
          Tìm thấy <strong className="text-foreground">{totalItems}</strong> biên bản
        </span>
        {activeFiltersCount > 0 && (
          <span className="text-amber-600 dark:text-amber-400 font-medium">({activeFiltersCount} tiêu chí)</span>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Loading State */}
      {/* ------------------------------------------------------------------ */}
      {isLoading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-5 w-24 rounded" />
                <Skeleton className="h-5 w-20 rounded" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Error State */}
      {/* ------------------------------------------------------------------ */}
      {!isLoading && loadError && (
        <div className="rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 p-6 flex flex-col items-center gap-3 text-center">
          <div className="size-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
            <AlertCircle size={24} />
          </div>
          <p className="text-sm font-semibold text-foreground">Lỗi tải dữ liệu</p>
          <p className="text-xs text-muted-foreground max-w-sm">{loadError}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadData()}
            className="h-9 px-4 rounded-xl gap-1.5 cursor-pointer"
          >
            <RefreshCw size={14} />
            <span>Thử lại</span>
          </Button>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Empty State */}
      {/* ------------------------------------------------------------------ */}
      {!isLoading && !loadError && items.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-8 lg:p-12 flex flex-col items-center gap-4 text-center">
          <div className="size-14 rounded-2xl bg-muted flex items-center justify-center">
            <FileVideo size={28} className="text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Không tìm thấy biên bản nào</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              {debouncedSearch || activeFiltersCount > 0
                ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm'
                : 'Chưa có biên bản nào được tạo. Hãy quét mã và quay video để bắt đầu.'}
            </p>
          </div>
          {(debouncedSearch || activeFiltersCount > 0) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="h-9 px-4 rounded-xl gap-1.5 cursor-pointer"
            >
              <RefreshCw size={14} />
              <span>Đặt lại bộ lọc</span>
            </Button>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Desktop Table View */}
      {/* ------------------------------------------------------------------ */}
      {!isLoading && !loadError && items.length > 0 && (
        <>
          <div className="hidden lg:block rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-card shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-muted/30 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3.5 px-4">Mã vận đơn</th>
                  <th className="py-3.5 px-3">Loại</th>
                  <th className="py-3.5 px-3">Người tạo</th>
                  <th className="py-3.5 px-3">Thời gian</th>
                  <th className="py-3.5 px-3">File</th>
                  <th className="py-3.5 px-3">Trạng thái</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs">
                {items.map((item) => {
                  const isDongGoi = item.loai_bien_ban === 'dong_goi';
                  return (
                    <tr key={item.id} className="hover:bg-muted/40 transition-colors group">
                      {/* Mã vận đơn + Carrier */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className={cn('w-1 h-8 rounded-full shrink-0', getCarrierBarColor(item.don_vi_vc))} />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-xs text-foreground tracking-wide">
                                {item.ma_van_don}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleCopyText(e, item.ma_van_don, item.id)}
                                className="text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer"
                                title="Sao chép mã đơn"
                              >
                                {copiedId === item.id ? (
                                  <Check size={12} className="text-emerald-500" />
                                ) : (
                                  <Copy size={12} className="text-muted-foreground" />
                                )}
                              </button>
                            </div>
                            <div className="mt-1">
                              <span className={cn('inline-block text-[10px] font-semibold px-2 py-0.5 rounded border', getCarrierColor(item.don_vi_vc))}>
                                {getCarrierLabel(item.don_vi_vc)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Loại biên bản */}
                      <td className="py-3.5 px-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border',
                            isDongGoi
                              ? 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400'
                              : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400'
                          )}
                        >
                          {isDongGoi ? <Package size={12} /> : <PackageOpen size={12} />}
                          <span>{isDongGoi ? 'Đóng gói' : 'Khui hàng'}</span>
                        </span>
                      </td>

                      {/* Người tạo */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2 text-foreground font-medium">
                          <div className="size-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-200 shrink-0">
                            {(item.ten_nhan_vien || item.ma_nhan_vien || '').slice(0, 2).toUpperCase() || 'NV'}
                          </div>
                          <span className="truncate max-w-[120px]">
                            {item.ten_nhan_vien || item.ma_nhan_vien}
                          </span>
                        </div>
                      </td>

                      {/* Thời gian */}
                      <td className="py-3.5 px-3 text-muted-foreground font-mono text-[11px]">
                        {formatDateTimeVN(item.thoi_gian_tao)}
                      </td>

                      {/* File Video Info */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5 text-muted-foreground font-medium text-[11px]">
                          <Clock size={12} />
                          <span>{formatDuration(item.thoi_luong_video)}</span>
                          <span className="text-muted-foreground/40">·</span>
                          <HardDrive size={12} />
                          <span>{formatBytes(item.kich_thuoc_bytes)}</span>
                        </div>
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3.5 px-3">
                        {getStatusBadge(item.trang_thai)}
                      </td>

                      {/* Thao tác */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => void handleOpenVideo(item)}
                          className="h-8 px-4 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm shadow-orange-500/20 hover:scale-[1.02] transition-transform cursor-pointer"
                        >
                          <Play size={12} className="fill-current" />
                          <span>Xem</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Desktop Pagination Footer */}
            <div className="px-5 py-3.5 border-t border-border/80 bg-muted/10 flex items-center justify-between flex-wrap gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-4 flex-wrap">
                <PaginationInfo startIndex={startIndex} endIndex={endIndex} totalItems={totalItems} />
                <PaginationLimitSelect 
                  limit={limit} 
                  onLimitChange={(val) => { setLimit(val); setPage(1); }} 
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

          {/* ---------------------------------------------------------------- */}
          {/* Mobile Card View */}
          {/* ---------------------------------------------------------------- */}
          <div className="flex flex-col gap-3 lg:hidden">
            {items.map((item) => {
              const isDongGoi = item.loai_bien_ban === 'dong_goi';
              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-border bg-card p-4 shadow-xs flex flex-col gap-3 relative overflow-hidden"
                >
                  {/* Top Row: Tracking Code + Copy + Status Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-sm text-foreground">
                        {item.ma_van_don}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleCopyText(e, item.ma_van_don, item.id)}
                        className="text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                      >
                        {copiedId === item.id ? (
                          <Check size={14} className="text-emerald-500" />
                        ) : (
                          <Copy size={14} className="text-muted-foreground" />
                        )}
                      </button>
                    </div>
                    {getStatusBadge(item.trang_thai)}
                  </div>

                  {/* Carrier & Work Mode Badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded border', getCarrierColor(item.don_vi_vc))}>
                      {getCarrierLabel(item.don_vi_vc)}
                    </span>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded border',
                        isDongGoi
                          ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                          : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                      )}
                    >
                      {isDongGoi ? <Package size={12} /> : <PackageOpen size={12} />}
                      <span>{isDongGoi ? 'Đóng gói' : 'Khui hàng'}</span>
                    </span>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground border-y border-border/60 py-2.5">
                    <div className="flex items-center gap-1.5 truncate">
                      <User size={14} className="text-muted-foreground shrink-0" />
                      <span className="truncate">{item.ten_nhan_vien || item.ma_nhan_vien}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} className="text-muted-foreground shrink-0" />
                      <span>{formatDateTimeVN(item.thoi_gian_tao).split(' ')[0]}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Play size={14} className="text-muted-foreground shrink-0" />
                      <span>{formatDuration(item.thoi_luong_video)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <HardDrive size={14} className="text-muted-foreground shrink-0" />
                      <span>{formatBytes(item.kich_thuoc_bytes)}</span>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <button
                    type="button"
                    onClick={() => void handleOpenVideo(item)}
                    className="w-full h-10 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm shadow-orange-500/20 active:scale-[0.98] transition-transform cursor-pointer"
                  >
                    <Play size={14} className="fill-current" />
                    <span>Xem video biên bản</span>
                  </button>
                </div>
              );
            })}
          </div>

          <div className="lg:hidden mt-2 p-3.5 rounded-2xl border border-border bg-card shadow-xs flex flex-col gap-3 select-none">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <PaginationInfo 
                startIndex={startIndex} 
                endIndex={endIndex} 
                totalItems={totalItems} 
                label="" 
              />
              <PaginationLimitSelect 
                limit={limit} 
                onLimitChange={(val) => { setLimit(val); setPage(1); }} 
                options={[10, 20, 50]} 
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/70">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="h-9 px-3.5 rounded-xl border border-border bg-muted/30 hover:bg-muted font-semibold text-xs flex items-center gap-1.5 text-foreground disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer shadow-2xs"
              >
                <ChevronLeft size={14} />
                <span>Trước</span>
              </button>

              <div className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground">
                <span className="font-bold text-foreground px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  Trang {page}
                </span>
                <span>/</span>
                <span>{totalPages}</span>
              </div>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                className="h-9 px-3.5 rounded-xl border border-border bg-muted/30 hover:bg-muted font-semibold text-xs flex items-center gap-1.5 text-foreground disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer shadow-2xs"
              >
                <span>Sau</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}



      {/* ================================================================== */}
      {/* Barcode Scanner Dialog */}
      {/* ================================================================== */}
      <Dialog open={isScannerOpen} onOpenChange={(open) => { if (!open) handleCloseScanner(); }}>
        <DialogContent
          showCloseButton={false}
          className="w-[96vw] max-w-[96vw] sm:max-w-md sm:w-full p-0 rounded-2xl overflow-hidden border-border bg-card"
        >
          <DialogHeader className="px-5 py-4 border-b border-border flex flex-row items-center justify-between space-y-0 shrink-0">
            <div>
              <DialogTitle className="text-sm font-bold text-foreground">
                Quét mã vận đơn
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Đưa mã barcode vào khung hình để quét tự động
              </DialogDescription>
            </div>
            <button
              type="button"
              onClick={handleCloseScanner}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted cursor-pointer"
            >
              <X size={20} />
            </button>
          </DialogHeader>

          <div className="p-4">
            <div className="relative w-full aspect-[4/3] bg-black rounded-xl overflow-hidden">
              <CameraPreview
                videoRef={scannerVideoRef}
                stream={scannerStream}
                isLoading={isScannerCameraLoading}
              />
              <ScannerOverlay isScanning={isScannerOpen} />

              {isScannerCameraLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <RefreshCw size={24} className="text-white animate-spin" />
                </div>
              )}
            </div>

            <div className="mt-3 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCloseScanner}
                className="h-9 px-4 rounded-xl gap-1.5 cursor-pointer"
              >
                <X size={14} />
                <span>Đóng</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
