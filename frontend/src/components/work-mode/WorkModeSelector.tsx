// ---------------------------------------------------------------------------
// WorkModeSelector — Segmented Control / Card selector for Work Mode
// Tham chiếu: docs/03-uiux-flow.md (Mục 2), docs/11-ui-design-system.md (Mục 3.2)
// Rules: .agents/rules/01-ui-ux.md (Cấm emoji, touch targets >= 48px, lucide-react)
// ---------------------------------------------------------------------------

import { Package, PackageOpen, CheckCircle2, AlertCircle } from 'lucide-react';
import type { LoaiBienBan } from '../../types';

interface WorkModeSelectorProps {
  /** Selected work mode ('dong_goi' | 'khui_hang' | null) */
  selectedMode: LoaiBienBan | null;
  /** Callback when user selects a mode */
  onSelectMode: (mode: LoaiBienBan) => void;
  /** Error message if user tried to proceed without selecting a mode */
  errorMessage?: string | null;
  /** Optional custom className */
  className?: string;
}

export function WorkModeSelector({
  selectedMode,
  onSelectMode,
  errorMessage,
  className = '',
}: WorkModeSelectorProps) {
  return (
    <div className={`work-mode-selector-wrapper ${className}`.trim()}>
      <div className="work-mode-selector-header">
        <span className="work-mode-selector-title">
          Chế độ làm việc <span className="text-error" aria-hidden="true">*</span>
        </span>
        {selectedMode ? (
          <span className="work-mode-status-badge work-mode-status-badge--ready">
            <CheckCircle2 size={13} aria-hidden="true" />
            <span>Đã chọn: {selectedMode === 'dong_goi' ? 'Đóng gói' : 'Khui hàng'}</span>
          </span>
        ) : (
          <span className="work-mode-status-badge work-mode-status-badge--required">
            <AlertCircle size={13} aria-hidden="true" />
            <span>Bắt buộc chọn trước khi quét</span>
          </span>
        )}
      </div>

      <div
        className="work-mode-selector-grid"
        role="radiogroup"
        aria-label="Chọn chế độ làm việc"
        aria-required="true"
      >
        {/* Option 1: Đóng gói hàng */}
        <button
          type="button"
          role="radio"
          aria-checked={selectedMode === 'dong_goi'}
          className={`work-mode-card work-mode-card--dong-goi ${
            selectedMode === 'dong_goi' ? 'work-mode-card--active' : ''
          }`}
          onClick={() => onSelectMode('dong_goi')}
        >
          <div className="work-mode-card__icon-wrap">
            <Package size={26} aria-hidden="true" />
          </div>
          <div className="work-mode-card__content">
            <div className="work-mode-card__title">Đóng gói hàng</div>
            <div className="work-mode-card__desc">Xuất kho, dán nhãn & đóng đơn mới</div>
          </div>
          <div className="work-mode-card__radio-indicator" aria-hidden="true">
            {selectedMode === 'dong_goi' && <CheckCircle2 size={18} />}
          </div>
        </button>

        {/* Option 2: Khui hàng / Trả hàng */}
        <button
          type="button"
          role="radio"
          aria-checked={selectedMode === 'khui_hang'}
          className={`work-mode-card work-mode-card--khui-hang ${
            selectedMode === 'khui_hang' ? 'work-mode-card--active' : ''
          }`}
          onClick={() => onSelectMode('khui_hang')}
        >
          <div className="work-mode-card__icon-wrap">
            <PackageOpen size={26} aria-hidden="true" />
          </div>
          <div className="work-mode-card__content">
            <div className="work-mode-card__title">Khui hàng / Hoàn trả</div>
            <div className="work-mode-card__desc">Bóc kiểm kiện hàng hoàn, kiểm định lỗi</div>
          </div>
          <div className="work-mode-card__radio-indicator" aria-hidden="true">
            {selectedMode === 'khui_hang' && <CheckCircle2 size={18} />}
          </div>
        </button>
      </div>

      {/* Validation feedback if user tried to scan without picking a mode */}
      {errorMessage && (
        <div className="work-mode-error-message" role="alert">
          <AlertCircle size={15} aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
