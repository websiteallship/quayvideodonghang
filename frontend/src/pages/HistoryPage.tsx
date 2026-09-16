import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Search,
  Camera,
  X,
  Calendar,
  Filter,
  RefreshCw,
  Package,
  PackageOpen,
  Clock,
  HardDrive,
  User,
  Play,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Video as VideoIcon,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Copy,
  Check,
  Smartphone,
  Monitor,
  Download,
  FileVideo
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { useAuthStore } from '@/stores/auth-store';
import { useCamera } from '@/hooks/use-camera';
import { useBarcode } from '@/hooks/use-barcode';
import { useBarcodeGun } from '@/hooks/use-barcode-gun';
import { CameraPreview } from '@/components/camera/CameraPreview';
import { ScannerOverlay } from '@/components/scanner/ScannerOverlay';
import {
  fetchBienBanList,
  fetchBienBanViewUrl,
  BienBanFilterParams
} from '@/services/bien-ban-service';
import { getStoredToken, apiClient, API_BASE } from '@/services/api-client';
import { formatDateTimeVN, formatDuration, formatBytes } from '@/utils/format';
import { feedbackSuccess } from '@/utils/barcode-feedback';
import type { BienBan, BarcodeResult } from '@/types';

// Helper tạo chuỗi YYYY-MM-DD theo chuẩn giờ Hồ Chí Minh (+7)
function getVietnamDateString(offsetDays: number = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(d);
}

const CARRIERS: { label: string; value: string }[] = [
  { label: 'Tất cả ĐVVC', value: 'all' },
  { label: 'GHN', value: 'GHN' },
  { label: 'GHTK', value: 'GHTK' },
  { label: 'Viettel Post', value: 'ViettelPost' },
  { label: 'J&T Express', value: 'J&T' },
  { label: 'Shopee Xpress', value: 'ShopeeXpress' },
  { label: 'Khác', value: 'Khac' }
];

const STATUS_LIST: { label: string; value: string }[] = [
  { label: 'Tất cả trạng thái', value: 'all' },
  { label: 'Đã lưu (Drive)', value: 'da_upload' },
  { label: 'Chờ tải lên', value: 'cho_upload' },
  { label: 'Đang tải lên', value: 'dang_upload' },
  { label: 'Lỗi tải lên', value: 'loi' }
];

const WORK_MODES: { label: string; value: string }[] = [
  { label: 'Tất cả loại', value: 'all' },
  { label: 'Đóng gói', value: 'dong_goi' },
  { label: 'Khui hàng', value: 'khui_hang' }
];

export const HistoryPage: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.vai_tro === 'admin';

  // 1. Search state & Debounce (300ms)
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // 2. Filter states (Default date: Today theo chuẩn Hồ Chí Minh +7)
  const todayStr = useMemo(() => getVietnamDateString(0), []);
  const [datePreset, setDatePreset] = useState<'today' | '7days' | 'all' | 'custom'>('today');
  const [ngayTu, setNgayTu] = useState<string>(todayStr);
  const [ngayDen, setNgayDen] = useState<string>(todayStr);
  const [carrier, setCarrier] = useState('all');
  const [loaiBienBan, setLoaiBienBan] = useState('all');
  const [trangThai, setTrangThai] = useState('all');
  const [maNhanVien, setMaNhanVien] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [nhanVienList, setNhanVienList] = useState<{ma: string; ten: string}[]>([]);

  useEffect(() => {
    if (isAdmin) {
      apiClient.get(`${API_BASE}/admin/nhan-vien`).json<{success: boolean; data: any[]}>()
        .then(res => {
          if (res.success && res.data) {
            setNhanVienList(res.data);
          }
        })
        .catch(err => console.error('Lỗi tải danh sách nhân viên', err));
    }
  }, [isAdmin]);

  // 3. Pagination & Data
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [items, setItems] = useState<Array<BienBan & { ten_nhan_vien?: string }>>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 4. Expandable card state & Copy state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 5. Video View Modal & Orientation (Dọc 9:16 hoặc Ngang 16:9)
  const [videoModalItem, setVideoModalItem] = useState<(BienBan & { ten_nhan_vien?: string }) | null>(null);
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [videoMode, setVideoMode] = useState<'native' | 'iframe'>('native');
  const [videoOrientation, setVideoOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Copy text helper with feedback
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
    stopCamera: stopScannerCamera
  } = useCamera();

  const handleBarcodeDetected = useCallback((result: BarcodeResult) => {
    if (result?.rawValue) {
      feedbackSuccess();
      setSearchInput(result.rawValue);
      setDebouncedSearch(result.rawValue);
      setPage(1);
      setIsScannerOpen(false);
      stopScannerCamera();
    }
  }, [stopScannerCamera]);

  const {
    startScanning: startBarcodeScanning,
    stopScanning: stopBarcodeScanning,
    reset: resetBarcode
  } = useBarcode(scannerVideoRef, handleBarcodeDetected);

  // 7. USB Barcode gun listener
  useBarcodeGun(
    useCallback((code: string) => {
      if (!isScannerOpen) {
        feedbackSuccess();
        setSearchInput(code);
        setDebouncedSearch(code);
        setPage(1);
      }
    }, [isScannerOpen]),
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

  // Handle date preset change
  const handleDatePreset = (preset: 'today' | '7days' | 'all' | 'custom') => {
    setDatePreset(preset);
    setPage(1);
    if (preset === 'today') {
      setNgayTu(todayStr);
      setNgayDen(todayStr);
    } else if (preset === '7days') {
      setNgayTu(getVietnamDateString(7));
      setNgayDen(todayStr);
    } else if (preset === 'all') {
      setNgayTu('');
      setNgayDen('');
    }
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setDatePreset('today');
    setNgayTu(todayStr);
    setNgayDen(todayStr);
    setCarrier('all');
    setLoaiBienBan('all');
    setTrangThai('all');
    setMaNhanVien('');
    setPage(1);
  };

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (datePreset !== 'today') count++;
    if (carrier !== 'all') count++;
    if (loaiBienBan !== 'all') count++;
    if (trangThai !== 'all') count++;
    if (maNhanVien.trim()) count++;
    return count;
  }, [datePreset, carrier, loaiBienBan, trangThai, maNhanVien]);

  // Fetch list
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    const params: BienBanFilterParams = {
      page,
      limit,
      search: debouncedSearch.trim() || undefined,
      ngay_tu: ngayTu || undefined,
      ngay_den: ngayDen || undefined,
      don_vi_vc: carrier !== 'all' ? carrier : undefined,
      loai_bien_ban: loaiBienBan !== 'all' ? loaiBienBan : undefined,
      trang_thai: trangThai !== 'all' ? trangThai : undefined,
      ma_nhan_vien: isAdmin && maNhanVien.trim() ? maNhanVien.trim() : undefined
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
  }, [page, limit, debouncedSearch, ngayTu, ngayDen, carrier, loaiBienBan, trangThai, maNhanVien, isAdmin]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Open Video Modal
  const handleOpenVideo = async (item: BienBan & { ten_nhan_vien?: string }) => {
    setVideoModalItem(item);
    setViewUrl(null);
    setStreamUrl(null);
    setVideoError(null);
    setVideoMode('native');
    setIsVideoLoading(true);

    // Tự động chọn hướng video tối ưu (mobile: Dọc 9:16, desktop/tablet: Ngang 16:9)
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      setVideoOrientation('portrait');
    } else {
      setVideoOrientation('landscape');
    }

    const res = await fetchBienBanViewUrl(item.id);

    if (res.success && res.data?.view_url) {
      setViewUrl(res.data.view_url);

      // Build authenticated stream URL for native <video> playback
      // <video src> không gửi được Authorization header → dùng ?token= query param
      if (res.data.stream_url) {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
        const token = getStoredToken();
        const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
        setStreamUrl(`${baseUrl}${res.data.stream_url}${tokenParam}`);
      }
    } else {
      setVideoError(res.error?.message || 'Không thể tải đường dẫn xem video.');
    }
    setIsVideoLoading(false);
  };

  // Scanner modal toggler
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

  return (
    <div className="page-stack" style={{ paddingBottom: 'var(--space-8)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Lịch sử biên bản
          </h2>
          <p className="text-xs-secondary">
            Tra cứu và xem lại video quy trình đóng gói & khui hàng đã lưu
          </p>
        </div>

        <Button
          variant="secondary"
          size="default"
          onClick={() => void loadData()}
          disabled={isLoading}
          leftIcon={<RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />}
          style={{ minHeight: '40px', height: '40px' }}
        >
          Làm mới
        </Button>
      </div>

      {/* Search & Action Bar */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="text"
            className="input-field"
            placeholder="Tìm theo mã vận đơn..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{
              width: '100%',
              height: '48px',
              paddingLeft: '40px',
              paddingRight: searchInput ? '40px' : '14px',
              fontFamily: 'monospace',
              fontSize: 'var(--text-sm)'
            }}
          />
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-muted)',
              pointerEvents: 'none'
            }}
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => { setSearchInput(''); setDebouncedSearch(''); }}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-muted)',
                padding: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              aria-label="Xóa tìm kiếm"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Scan Barcode to Search Button */}
        <Button
          variant="secondary"
          size="large"
          onClick={handleOpenScanner}
          aria-label="Quét mã barcode để tìm kiếm"
          style={{
            minWidth: '48px',
            width: '48px',
            height: '48px',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
          title="Bật camera quét mã để tìm"
        >
          <Camera size={22} />
        </Button>

        {/* Toggle Filters Button */}
        <Button
          variant={showFilters || activeFiltersCount > 0 ? 'primary' : 'secondary'}
          size="large"
          onClick={() => setShowFilters(!showFilters)}
          style={{
            minWidth: '48px',
            height: '48px',
            padding: '0 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flexShrink: 0
          }}
        >
          <Filter size={18} />
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'bold' }}>
            Lọc {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}
          </span>
        </Button>
      </div>

      {/* Filter Expandable Panel */}
      {showFilters && (
        <div
          className="glass-panel animate-fade-in"
          style={{
            padding: 'var(--space-4)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
            border: '1px solid var(--color-border)'
          }}
        >
          {/* Quick Date Presets */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span className="text-xs-secondary" style={{ fontWeight: 'bold' }}>
              Khoảng thời gian
            </span>
            <div className="flex-wrap-gap">
              {[
                { id: 'today', label: 'Hôm nay' },
                { id: '7days', label: '7 ngày qua' },
                { id: 'all', label: 'Tất cả' },
                { id: 'custom', label: 'Tùy chỉnh' }
              ].map((p) => (
                <button
                  key={p.id}
                  className={`btn ${datePreset === p.id ? 'btn-primary' : 'btn-secondary'} btn-compact`}
                  onClick={() => handleDatePreset(p.id as typeof datePreset)}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom Date Inputs */}
            {datePreset === 'custom' && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '130px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Từ ngày</label>
                  <input
                    type="date"
                    className="input-field"
                    value={ngayTu}
                    onChange={(e) => { setNgayTu(e.target.value); setPage(1); }}
                    style={{ width: '100%', height: '36px', fontSize: 'var(--text-xs)' }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: '130px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Đến ngày</label>
                  <input
                    type="date"
                    className="input-field"
                    value={ngayDen}
                    onChange={(e) => { setNgayDen(e.target.value); setPage(1); }}
                    style={{ width: '100%', height: '36px', fontSize: 'var(--text-xs)' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Carrier, Mode & Status Selectors */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
            {/* Đơn vị VC */}
            <div>
              <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                Đơn vị vận chuyển
              </label>
              <select
                className="input-field"
                value={carrier}
                onChange={(e) => { setCarrier(e.target.value); setPage(1); }}
                style={{ width: '100%', height: '38px', fontSize: 'var(--text-xs)' }}
              >
                {CARRIERS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Loại biên bản */}
            <div>
              <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                Loại biên bản
              </label>
              <select
                className="input-field"
                value={loaiBienBan}
                onChange={(e) => { setLoaiBienBan(e.target.value); setPage(1); }}
                style={{ width: '100%', height: '38px', fontSize: 'var(--text-xs)' }}
              >
                {WORK_MODES.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Trạng thái */}
            <div>
              <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                Trạng thái lưu trữ
              </label>
              <select
                className="input-field"
                value={trangThai}
                onChange={(e) => { setTrangThai(e.target.value); setPage(1); }}
                style={{ width: '100%', height: '38px', fontSize: 'var(--text-xs)' }}
              >
                {STATUS_LIST.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Admin Filter: Mã nhân viên */}
            {isAdmin && (
              <div>
                <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Lọc theo Mã NV (Admin)
                </label>
                <select
                  className="input-field"
                  value={maNhanVien}
                  onChange={(e) => { setMaNhanVien(e.target.value); setPage(1); }}
                  style={{ width: '100%', height: '38px', fontSize: 'var(--text-xs)', appearance: 'none', background: 'var(--color-bg) url("data:image/svg+xml;utf8,<svg fill=\'%23999\' height=\'20\' viewBox=\'0 0 24 24\' width=\'20\' xmlns=\'http://www.w3.org/2000/svg\'><path d=\'M7 10l5 5 5-5z\'/></svg>") no-repeat right 8px center' }}
                >
                  <option value="">Tất cả nhân viên</option>
                  {nhanVienList.map(nv => (
                    <option key={nv.ma} value={nv.ma}>
                      {nv.ma} - {nv.ten}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Reset button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' }}>
            <Button
              variant="secondary"
              size="default"
              onClick={handleResetFilters}
              leftIcon={<RotateCcw size={14} />}
              style={{ minHeight: '36px', height: '36px', padding: '0 12px', fontSize: 'var(--text-xs)' }}
            >
              Đặt lại bộ lọc
            </Button>
          </div>
        </div>
      )}

      {/* Status / Count Summary */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', padding: '0 4px' }}>
        <span>
          {isLoading ? (
            'Đang tải danh sách...'
          ) : (
            <>Tìm thấy <strong style={{ color: 'var(--color-text-primary)' }}>{totalItems}</strong> biên bản</>
          )}
        </span>
        {totalItems > 0 && (
          <span>
            Trang {page} / {totalPages}
          </span>
        )}
      </div>

      {/* Error Message */}
      {loadError && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--color-error)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-error)',
            fontSize: 'var(--text-xs)'
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{loadError}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && items.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', padding: 'var(--space-8)' }}>
          <Spinner size={32} />
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
            Đang tải dữ liệu biên bản...
          </span>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && items.length === 0 && (
        <EmptyState
          icon={VideoIcon}
          title="Không tìm thấy biên bản nào"
          description={
            debouncedSearch || activeFiltersCount > 0
              ? 'Không có kết quả khớp với điều kiện tìm kiếm hoặc bộ lọc hiện tại.'
              : 'Chưa có biên bản video nào được ghi nhận trên hệ thống.'
          }
          action={
            debouncedSearch || activeFiltersCount > 0 ? (
              <Button variant="secondary" size="default" onClick={handleResetFilters}>
                Xóa bộ lọc
              </Button>
            ) : undefined
          }
        />
      )}

      {/* Results List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {items.map((item) => {
          const isExpanded = expandedId === item.id;
          const isDongGoi = item.loai_bien_ban === 'dong_goi';
          const hasDriveVideo = Boolean(item.drive_file_id || item.trang_thai === 'da_upload');

          return (
            <div
              key={item.id}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 'var(--radius-lg)',
                border: isExpanded ? '1px solid var(--color-primary-500)' : '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg-card)',
                boxShadow: 'var(--shadow-sm)',
                overflow: 'hidden',
                transition: 'all 0.2s ease'
              }}
            >
              {/* Left Accent Bar */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: '4px',
                  backgroundColor: isDongGoi ? 'var(--color-primary-500)' : '#f59e0b'
                }}
              />

              {/* Main Card Content */}
              <div
                style={{
                  padding: '14px 16px 14px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                {/* Row 1: Tracking Code + Copy + Carrier + Badges */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono, monospace)',
                        fontWeight: 700,
                        fontSize: '15px',
                        color: 'var(--color-text-primary)',
                        letterSpacing: '0.5px'
                      }}
                    >
                      {item.ma_van_don}
                    </span>

                    {/* Copy button */}
                    <button
                      type="button"
                      onClick={(e) => handleCopyText(e, item.ma_van_don, `track-${item.id}`)}
                      title="Sao chép mã vận đơn"
                      aria-label="Sao chép mã vận đơn"
                      style={{
                        background: 'var(--color-bg-elevated)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        padding: '3px 7px',
                        color: copiedId === `track-${item.id}` ? 'var(--color-success)' : 'var(--color-text-muted)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {copiedId === `track-${item.id}` ? (
                        <>
                          <Check size={12} />
                          <span style={{ fontWeight: 600 }}>Đã chép</span>
                        </>
                      ) : (
                        <Copy size={12} />
                      )}
                    </button>

                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--color-bg-elevated)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-secondary)',
                        fontWeight: 600
                      }}
                    >
                      {item.don_vi_vc}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {/* Work Mode Tag */}
                    <span className={`tag-chip ${isDongGoi ? 'tag-chip--dong-goi' : 'tag-chip--khui-hang'}`}>
                      {isDongGoi ? <Package size={12} /> : <PackageOpen size={12} />}
                      {isDongGoi ? 'Đóng gói' : 'Khui hàng'}
                    </span>

                    {/* Status Badge */}
                    <Badge status={item.trang_thai} />
                  </div>
                </div>

                {/* Row 2: Metadata & Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      flexWrap: 'wrap',
                      fontSize: '12px',
                      color: 'var(--color-text-secondary)'
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <User size={13} style={{ color: 'var(--color-text-muted)' }} />
                      {item.ten_nhan_vien || item.ma_nhan_vien}
                    </span>

                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={13} style={{ color: 'var(--color-text-muted)' }} />
                      {formatDateTimeVN(item.thoi_gian_tao)}
                    </span>

                    {item.thoi_luong_video > 0 && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={13} style={{ color: 'var(--color-text-muted)' }} />
                        {formatDuration(item.thoi_luong_video)}
                      </span>
                    )}

                    {item.kich_thuoc_bytes > 0 && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <HardDrive size={13} style={{ color: 'var(--color-text-muted)' }} />
                        {formatBytes(item.kich_thuoc_bytes)}
                      </span>
                    )}
                  </div>

                  {/* Actions: Direct Play Video + Expand Chevron */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {hasDriveVideo && (
                      <Button
                        variant="primary"
                        size="default"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleOpenVideo(item);
                        }}
                        leftIcon={<Play size={13} fill="currentColor" />}
                        className="btn-sm"
                      >
                        Xem video
                      </Button>
                    )}

                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      aria-label={isExpanded ? 'Thu gọn chi tiết' : 'Xem chi tiết'}
                      title={isExpanded ? 'Thu gọn chi tiết' : 'Xem chi tiết'}
                      style={{
                        background: 'var(--color-bg-elevated)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        color: 'var(--color-text-secondary)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '32px',
                        minHeight: '32px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Expandable Clean SaaS Details Drawer */}
              {isExpanded && (
                <div className="expanded-drawer">
                  {/* Clean Property Cards Grid */}
                  <div className="expanded-drawer__grid">
                    {/* ID Biên bản Card */}
                    <div className="property-tile">
                      <div className="property-tile__label">
                        ID biên bản
                      </div>
                      <div className="property-tile__value">
                        <span className="text-mono-code" title={item.id}>
                          {item.id}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleCopyText(e, item.id, `id-${item.id}`)}
                          title="Sao chép ID"
                          aria-label="Sao chép ID"
                          className={`copy-btn-ghost ${copiedId === `id-${item.id}` ? 'copy-btn-ghost--success' : ''}`}
                        >
                          {copiedId === `id-${item.id}` ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>

                    {/* Thiết bị Card */}
                    <div className="property-tile">
                      <div className="property-tile__label">
                        Thiết bị ghi hình
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-text-primary)', fontWeight: 500 }}>
                        {item.thiet_bi?.toLowerCase().includes('webcam') || item.thiet_bi?.toLowerCase().includes('pc') ? (
                          <Monitor size={14} style={{ color: 'var(--color-accent-500)' }} />
                        ) : (
                          <Smartphone size={14} style={{ color: 'var(--color-accent-500)' }} />
                        )}
                        <span>{item.thiet_bi || 'mobile'}</span>
                      </div>
                    </div>

                    {/* Tên tệp Google Drive (Full Width) */}
                    {item.drive_file_name && (
                      <div className="property-tile property-tile--full">
                        <div className="property-tile__label icon-text-row">
                          <FileVideo size={12} />
                          <span>Tên tệp Google Drive</span>
                        </div>
                        <div className="property-tile__value">
                          <span className="text-mono-code" title={item.drive_file_name}>
                            {item.drive_file_name}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleCopyText(e, item.drive_file_name || '', `file-${item.id}`)}
                            title="Sao chép tên tệp"
                            aria-label="Sao chép tên tệp"
                            className={`copy-btn-ghost ${copiedId === `file-${item.id}` ? 'copy-btn-ghost--success' : ''}`}
                          >
                            {copiedId === `file-${item.id}` ? <Check size={12} /> : <Copy size={12} />}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Drive File ID (Full Width) */}
                    {item.drive_file_id && (
                      <div className="property-tile property-tile--full">
                        <div className="property-tile__label">
                          Google Drive File ID
                        </div>
                        <div className="property-tile__value">
                          <span className="text-mono-code" title={item.drive_file_id}>
                            {item.drive_file_id}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleCopyText(e, item.drive_file_id || '', `drive-${item.id}`)}
                            title="Sao chép File ID"
                            aria-label="Sao chép File ID"
                            className={`copy-btn-ghost ${copiedId === `drive-${item.id}` ? 'copy-btn-ghost--success' : ''}`}
                          >
                            {copiedId === `drive-${item.id}` ? <Check size={12} /> : <Copy size={12} />}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Chi tiết lỗi */}
                    {item.loi_message && item.trang_thai === 'loi' && (
                      <div className="property-tile property-tile--full property-tile--error">
                        <AlertCircle size={14} style={{ flexShrink: 0 }} />
                        <div>
                          <strong>Chi tiết lỗi:</strong> {item.loi_message}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions row in expanded drawer */}
                  <div className="expanded-drawer__actions">
                    {hasDriveVideo ? (
                      <>
                        <Button
                          variant="secondary"
                          size="default"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`https://drive.google.com/uc?export=download&id=${item.drive_file_id}`, '_blank');
                          }}
                          leftIcon={<Download size={14} />}
                          className="btn-md"
                        >
                          Tải video
                        </Button>
                        <Button
                          variant="primary"
                          size="default"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleOpenVideo(item);
                          }}
                          leftIcon={<Play size={14} fill="currentColor" />}
                          className="btn-md"
                        >
                          Phát video Drive
                        </Button>
                      </>
                    ) : (
                      <span className="text-xs-muted" style={{ fontStyle: 'italic', alignSelf: 'center' }}>
                        Chưa có video trên Google Drive
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 'var(--space-4)',
            borderTop: '1px solid var(--color-border)',
            flexWrap: 'wrap',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
              Hiển thị
            </span>
            <select
              className="input-field"
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              style={{ height: '36px', fontSize: 'var(--text-xs)', padding: '0 8px' }}
            >
              <option value={10}>10 / trang</option>
              <option value={20}>20 / trang</option>
              <option value={50}>50 / trang</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Button
              variant="secondary"
              size="default"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              leftIcon={<ChevronLeft size={16} />}
              style={{ minHeight: '36px', height: '36px', padding: '0 12px' }}
            >
              Trước
            </Button>

            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'bold' }}>
              {page} / {totalPages}
            </span>

            <Button
              variant="secondary"
              size="default"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
              rightIcon={<ChevronRight size={16} />}
              style={{ minHeight: '36px', height: '36px', padding: '0 12px' }}
            >
              Sau
            </Button>
          </div>
        </div>
      )}

      {/* Video Playback Modal */}
      <Modal
        isOpen={Boolean(videoModalItem)}
        onClose={() => setVideoModalItem(null)}
        title={`Video: ${videoModalItem?.ma_van_don || ''}`}
        maxWidth="680px"
        contentPadding="14px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Top Control Bar: Mode switch, Orientation, External link */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px',
              paddingBottom: '8px',
              borderBottom: '1px solid var(--color-border)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* Video Mode Toggle: Native / Iframe */}
              <div
                style={{
                  display: 'inline-flex',
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  borderRadius: 'var(--radius-md)',
                  padding: '2px',
                  gap: '2px'
                }}
              >
                <button
                  type="button"
                  onClick={() => setVideoMode('native')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: videoMode === 'native' ? 700 : 500,
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: videoMode === 'native' ? 'var(--color-primary-500)' : 'transparent',
                    color: videoMode === 'native' ? '#fff' : 'var(--color-text-secondary)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Play size={11} fill="currentColor" />
                  <span>Video</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVideoMode('iframe')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: videoMode === 'iframe' ? 700 : 500,
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: videoMode === 'iframe' ? 'var(--color-primary-500)' : 'transparent',
                    color: videoMode === 'iframe' ? '#fff' : 'var(--color-text-secondary)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <ExternalLink size={11} />
                  <span>Drive</span>
                </button>
              </div>

              {/* Orientation Toggle */}
              <div
                style={{
                  display: 'inline-flex',
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  borderRadius: 'var(--radius-md)',
                  padding: '2px',
                  gap: '2px'
                }}
              >
                <button
                  type="button"
                  onClick={() => setVideoOrientation('portrait')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: videoOrientation === 'portrait' ? 700 : 500,
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: videoOrientation === 'portrait' ? 'var(--color-primary-500)' : 'transparent',
                    color: videoOrientation === 'portrait' ? '#fff' : 'var(--color-text-secondary)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Smartphone size={12} />
                  <span>9:16</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVideoOrientation('landscape')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: videoOrientation === 'landscape' ? 700 : 500,
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: videoOrientation === 'landscape' ? 'var(--color-primary-500)' : 'transparent',
                    color: videoOrientation === 'landscape' ? '#fff' : 'var(--color-text-secondary)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Monitor size={12} />
                  <span>16:9</span>
                </button>
              </div>
            </div>

            {viewUrl && (
              <a
                href={viewUrl.replace('/preview', '/view')}
                target="_blank"
                rel="noreferrer noopener"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: 'var(--color-primary-500)',
                  fontSize: '12px',
                  fontWeight: 600,
                  textDecoration: 'none'
                }}
              >
                <ExternalLink size={13} /> Mở tab riêng
              </a>
            )}
          </div>

          {isVideoLoading && (
            <div style={{ height: '320px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Spinner size={32} />
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                Đang lấy liên kết phát video từ Google Drive...
              </span>
            </div>
          )}

          {videoError && !isVideoLoading && (
            <div
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--color-error)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                textAlign: 'center'
              }}
            >
              <AlertCircle size={24} style={{ margin: '0 auto' }} />
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold' }}>Không thể xem video</span>
              <span style={{ fontSize: 'var(--text-xs)' }}>{videoError}</span>
            </div>
          )}

          {/* Video Player Container - Dynamic Aspect Ratio */}
          {(viewUrl || streamUrl) && !isVideoLoading && (
            <div
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: videoOrientation === 'portrait' ? '350px' : '100%',
                margin: '0 auto',
                aspectRatio: videoOrientation === 'portrait' ? '9 / 16' : '16 / 9',
                maxHeight: videoOrientation === 'portrait' ? '70vh' : '62vh',
                backgroundColor: '#000',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)'
              }}
            >
              {videoMode === 'native' && streamUrl ? (
                <video
                  key={streamUrl}
                  src={streamUrl}
                  controls
                  playsInline
                  autoPlay
                  preload="metadata"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    backgroundColor: '#000'
                  }}
                  onError={() => {
                    // Fallback sang iframe nếu native stream lỗi
                    setVideoMode('iframe');
                  }}
                >
                  Trình duyệt không hỗ trợ thẻ video.
                </video>
              ) : viewUrl ? (
                <iframe
                  src={viewUrl}
                  title={`Google Drive Preview ${videoModalItem?.ma_van_don}`}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  allow="autoplay; fullscreen"
                />
              ) : null}
            </div>
          )}

          {/* Details & Direct Link */}
          {videoModalItem && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-secondary)',
                flexWrap: 'wrap',
                gap: '8px',
                paddingTop: '4px',
                borderTop: '1px solid var(--color-border)'
              }}
            >
              <div>
                <strong>Người tạo:</strong> {videoModalItem.ten_nhan_vien || videoModalItem.ma_nhan_vien} &bull;{' '}
                <strong>Thời gian:</strong> {formatDateTimeVN(videoModalItem.thoi_gian_tao)}
              </div>

              <div>
                <strong>ĐVVC:</strong> {videoModalItem.don_vi_vc}
                {videoModalItem.kich_thuoc_bytes > 0 && ` • ${formatBytes(videoModalItem.kich_thuoc_bytes)}`}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Barcode Scanner Modal */}
      <Modal
        isOpen={isScannerOpen}
        onClose={handleCloseScanner}
        title="Quét mã barcode tra cứu"
        maxWidth="440px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', alignItems: 'center' }}>
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '280px',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              backgroundColor: '#000'
            }}
          >
            <CameraPreview
              stream={scannerStream}
              isLoading={isScannerCameraLoading}
              videoRef={scannerVideoRef}
            />
            <ScannerOverlay isScanning={isScannerOpen} />
          </div>

          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
            Hướng camera vào mã vạch trên kiện hàng để tra cứu ngay lập tức
          </p>

          <Button variant="secondary" size="large" onClick={handleCloseScanner} style={{ width: '100%' }}>
            Đóng camera
          </Button>
        </div>
      </Modal>
    </div>
  );
};
