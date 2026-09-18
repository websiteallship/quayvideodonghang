// ---------------------------------------------------------------------------
// ScanResult — Popup displaying scanned barcode with carrier selection & action
// Tham chiếu: docs/08-frontend-architecture.md, docs/03-uiux-flow.md
// Rules: 01-ui-ux.md (no emoji, 48px+ touch targets, lucide-react)
// ---------------------------------------------------------------------------

import { useState, useMemo, useCallback } from 'react';
import { Package, PackageOpen, Video, RotateCcw, ChevronDown, AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import type { BarcodeResult, DonViVanChuyen, LoaiBienBan } from '../../types';
import { detectCarrier, getCarrierLabel, getMergedCarrierList } from '../../utils/detect-carrier';
import { useConfigStore } from '../../stores/config-store';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScanResultProps {
  /** The scanned barcode result */
  result: BarcodeResult;
  /** Whether a video already exists for this code */
  isDuplicate?: boolean;
  /** Details of existing video if duplicate */
  duplicateInfo?: {
    nhanVien: string;
    thoiGian: string;
    soLuong: number;
    source?: 'local' | 'remote' | 'both';
  };
  /** Whether check API is currently running */
  isChecking?: boolean;
  /** Error from duplicate check API if any */
  error?: string | null;
  /** Initial or pre-selected work mode (defaults to 'dong_goi') */
  initialLoaiBienBan?: LoaiBienBan;
  /** Called when user confirms and wants to start recording */
  onStartRecording: (data: {
    maVanDon: string;
    donViVc: DonViVanChuyen;
    loaiBienBan: LoaiBienBan;
    overwrite?: boolean;
  }) => void;
  /** Called when user wants to scan a different code */
  onRescan: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ScanResult({
  result,
  isDuplicate = false,
  duplicateInfo,
  isChecking = false,
  error = null,
  initialLoaiBienBan = 'dong_goi',
  onStartRecording,
  onRescan,
}: ScanResultProps) {
  // Lấy danh sách ĐVVC từ server config (đã đồng bộ)
  const serverCarrierList = useConfigStore((s) => s.systemConfig.don_vi_vc);
  const mergedCarriers = useMemo(() => getMergedCarrierList(serverCarrierList), [serverCarrierList]);

  // Auto-detect carrier from scanned code (hoặc dùng ĐVVC người dùng đã chọn trước nếu có)
  const detectedCarrier = useMemo(
    () => (result.carrier ? result.carrier : detectCarrier(result.rawValue)),
    [result.rawValue, result.carrier]
  );

  const [selectedCarrier, setSelectedCarrier] = useState<DonViVanChuyen>(detectedCarrier);
  // Cố định theo chế độ làm việc đã chọn trước khi quét (Mode-First, tránh bypass check trùng)
  const loaiBienBan: LoaiBienBan = initialLoaiBienBan;

  const handleStartRecording = useCallback((overwrite?: boolean) => {
    onStartRecording({
      maVanDon: result.rawValue,
      donViVc: selectedCarrier,
      loaiBienBan,
      overwrite,
    });
  }, [result.rawValue, selectedCarrier, loaiBienBan, onStartRecording]);

  const duplicateSourceLabel = useMemo(() => {
    if (!duplicateInfo?.source) return '';
    switch (duplicateInfo.source) {
      case 'local': return 'Trong hàng đợi';
      case 'remote': return 'Đã lưu trên cloud';
      case 'both': return 'Hàng đợi + Cloud';
    }
  }, [duplicateInfo?.source]);

  return (
    <div className="scan-result" role="dialog" aria-label="Kết quả quét mã">
      {/* Scanned code display */}
      <div className="scan-result__code-section">
        <span className="scan-result__label">Mã vận đơn</span>
        <span className="scan-result__code">{result.rawValue}</span>
        <span className="scan-result__format">
          {result.format.replace('_', ' ').toUpperCase()} &middot; {result.source === 'camera' ? 'Camera' : result.source === 'gun' ? 'Súng quét' : 'Nhập tay'}
        </span>
      </div>

      {/* API Error Banner */}
      {error && !isChecking && (
        <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg flex items-start gap-2 mb-4">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div className="flex flex-col">
            <span className="font-bold">Lỗi kiểm tra trùng đơn</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Duplicate warning or Checking status */}
      {isChecking && (
        <div className="scan-result__checking-status" aria-live="polite">
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          <span>Đang kiểm tra mã trùng...</span>
        </div>
      )}

      {!isChecking && isDuplicate && duplicateInfo && (
        <div className="scan-result__duplicate-warning" role="alert">
          <div className="scan-result__duplicate-title">
            <AlertTriangle size={16} aria-hidden="true" />
            <span>Mã đã có video {loaiBienBan === 'dong_goi' ? 'ĐÓNG GÓI' : 'KHUI HÀNG'} ({duplicateInfo.soLuong} lần)</span>
          </div>
          <div className="scan-result__duplicate-detail">
            Người quay: <strong>{duplicateInfo.nhanVien}</strong> &middot; {duplicateInfo.thoiGian}
          </div>
          {duplicateSourceLabel && (
            <div className="scan-result__duplicate-detail mt-1 opacity-80">
              Nguồn: {duplicateSourceLabel}
            </div>
          )}
          <div className="mt-2 px-3 py-2 bg-destructive/10 rounded-md text-xs text-amber-600 dark:text-amber-400 font-medium">
            Bạn muốn ghi đè video cũ không?
          </div>
        </div>
      )}

      {/* Carrier selection */}
      <div className="scan-result__field">
        <label className="scan-result__field-label" htmlFor="carrier-select">
          Đơn vị vận chuyển
        </label>
        <div className="scan-result__select-wrapper">
          <select
            id="carrier-select"
            className="scan-result__select"
            value={selectedCarrier}
            onChange={(e) => setSelectedCarrier(e.target.value as DonViVanChuyen)}
          >
            {mergedCarriers.map((carrier) => (
              <option key={carrier.id} value={carrier.id}>
                {carrier.label}
              </option>
            ))}
          </select>
          <ChevronDown size={18} className="scan-result__select-icon" aria-hidden="true" />
        </div>
        {detectedCarrier !== 'Khac' && detectedCarrier === selectedCarrier && (
          <span className="scan-result__auto-detected">
            Tự động nhận diện: {getCarrierLabel(detectedCarrier, serverCarrierList)}
          </span>
        )}
      </div>

      {/* Loại biên bản — Cố định theo chế độ làm việc đã chọn trước khi quét (Mode-First) */}
      <div className="scan-result__field">
        <div className="flex items-center justify-between mb-1.5">
          <span className="scan-result__field-label mb-0">Loại biên bản</span>
          <span className="text-xs text-primary font-medium">
            Đã gán theo chế độ làm việc
          </span>
        </div>
        <div
          className={`scan-result__mode-badge scan-result__mode-badge--${loaiBienBan}`}
          role="status"
          aria-label={`Loại biên bản: ${loaiBienBan === 'dong_goi' ? 'Đóng gói' : 'Khui hàng'}`}
        >
          {loaiBienBan === 'dong_goi' ? (
            <>
              <Package size={20} aria-hidden="true" />
              <span>Đóng gói</span>
            </>
          ) : (
            <>
              <PackageOpen size={20} aria-hidden="true" />
              <span>Khui hàng</span>
            </>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="scan-result__actions">
        {isDuplicate ? (
          <>
            {/* Ghi đè: xóa video cũ + quay mới */}
            <button
              type="button"
              className="scan-result__btn-primary scan-result__btn-primary--warning"
              onClick={() => handleStartRecording(true)}
              disabled={isChecking}
            >
              <Trash2 size={20} aria-hidden="true" />
              <span>Ghi đè video cũ</span>
            </button>
            {/* Quay thêm: giữ video cũ + quay thêm */}
            <button
              type="button"
              className="scan-result__btn-primary mt-1.5"
              onClick={() => handleStartRecording(false)}
              disabled={isChecking}
            >
              <Video size={20} aria-hidden="true" />
              <span>Quay thêm video mới</span>
            </button>
          </>
        ) : (
          <button
            type="button"
            className="scan-result__btn-primary"
            onClick={() => handleStartRecording(false)}
            disabled={isChecking}
          >
            <Video size={22} aria-hidden="true" />
            <span>Bắt đầu quay</span>
          </button>
        )}
        <button
          type="button"
          className="scan-result__btn-secondary"
          onClick={onRescan}
        >
          <RotateCcw size={18} aria-hidden="true" />
          <span>Quét lại</span>
        </button>
      </div>
    </div>
  );
}

