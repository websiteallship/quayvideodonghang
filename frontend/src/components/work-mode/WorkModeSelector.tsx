// ---------------------------------------------------------------------------
// WorkModeSelector — Segmented Control / Card selector for Work Mode
// Tham chiếu: docs/03-uiux-flow.md (Mục 2), docs/11-ui-design-system.md (Mục 3.2)
// Rules: .agents/rules/01-ui-ux.md (Cấm emoji, touch targets >= 48px, lucide-react)
// ---------------------------------------------------------------------------

import { Package, PackageOpen, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
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
  /** Hide the top header & requirement badge (useful inside modals) */
  hideHeader?: boolean;
  /** Layout variant: 'cards' (responsive grid) or 'list' (stacked full-width) */
  variant?: 'cards' | 'list';
}

export function WorkModeSelector({
  selectedMode,
  onSelectMode,
  errorMessage,
  className = '',
  hideHeader = false,
  variant = 'cards',
}: WorkModeSelectorProps) {
  const isList = variant === 'list';

  return (
    <div className={`flex flex-col gap-3 w-full ${className}`.trim()}>
      {/* Top Header Label & Requirement Badge */}
      {!hideHeader && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-bold text-foreground">
            Chế độ làm việc <span className="text-destructive" aria-hidden="true">*</span>
          </span>
          {selectedMode ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 size={13} aria-hidden="true" />
              <span>Đã chọn: {selectedMode === 'dong_goi' ? 'Đóng gói' : 'Khui hàng'}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-destructive/15 text-destructive border border-destructive/30">
              <AlertCircle size={13} aria-hidden="true" />
              <span>Bắt buộc chọn trước khi quét</span>
            </span>
          )}
        </div>
      )}

      {/* Mode Options Container */}
      <div
        className={isList ? 'flex flex-col gap-3' : 'grid grid-cols-1 md:grid-cols-2 gap-3'}
        role="radiogroup"
        aria-label="Chọn chế độ làm việc"
        aria-required="true"
      >
        {/* Option 1: Đóng gói hàng */}
        <button
          type="button"
          role="radio"
          aria-checked={selectedMode === 'dong_goi'}
          className={`group relative flex items-center gap-3.5 min-h-[64px] p-3.5 sm:p-4 rounded-xl border-2 cursor-pointer text-left transition-all font-sans bg-card text-card-foreground hover:shadow-md active:scale-[0.99] ${
            selectedMode === 'dong_goi'
              ? 'border-primary bg-primary/10 shadow-[0_0_16px_rgba(37,99,235,0.15)] ring-1 ring-primary/30'
              : 'border-border hover:border-primary/50'
          }`}
          onClick={() => onSelectMode('dong_goi')}
        >
          {/* Icon Box */}
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
              selectedMode === 'dong_goi'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-primary/15 text-primary group-hover:bg-primary/20'
            }`}
          >
            <Package size={24} aria-hidden="true" />
          </div>

          {/* Text Information */}
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">Đóng gói hàng</span>
              <span className="text-[11px] font-semibold px-1.5 py-0.2 rounded bg-primary/15 text-primary border border-primary/20">
                Xuất kho
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 leading-snug">
              Xuất kho, dán nhãn & đóng đơn mới
            </div>
          </div>

          {/* Action / Selection Indicator */}
          <div className="shrink-0 flex items-center justify-center w-6 h-6" aria-hidden="true">
            {selectedMode === 'dong_goi' ? (
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
                <CheckCircle2 size={16} />
              </div>
            ) : (
              <ArrowRight size={16} className="text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            )}
          </div>
        </button>

        {/* Option 2: Khui hàng / Trả hàng */}
        <button
          type="button"
          role="radio"
          aria-checked={selectedMode === 'khui_hang'}
          className={`group relative flex items-center gap-3.5 min-h-[64px] p-3.5 sm:p-4 rounded-xl border-2 cursor-pointer text-left transition-all font-sans bg-card text-card-foreground hover:shadow-md active:scale-[0.99] ${
            selectedMode === 'khui_hang'
              ? 'border-amber-500 bg-amber-500/10 shadow-[0_0_16px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/30'
              : 'border-border hover:border-amber-500/50'
          }`}
          onClick={() => onSelectMode('khui_hang')}
        >
          {/* Icon Box */}
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
              selectedMode === 'khui_hang'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-amber-500/15 text-amber-500 group-hover:bg-amber-500/20'
            }`}
          >
            <PackageOpen size={24} aria-hidden="true" />
          </div>

          {/* Text Information */}
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">Khui hàng / Hoàn trả</span>
              <span className="text-[11px] font-semibold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                Hàng hoàn
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 leading-snug">
              Bóc kiểm kiện hàng hoàn, kiểm định lỗi
            </div>
          </div>

          {/* Action / Selection Indicator */}
          <div className="shrink-0 flex items-center justify-center w-6 h-6" aria-hidden="true">
            {selectedMode === 'khui_hang' ? (
              <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-sm">
                <CheckCircle2 size={16} />
              </div>
            ) : (
              <ArrowRight size={16} className="text-muted-foreground/50 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
            )}
          </div>
        </button>
      </div>

      {/* Validation feedback if user tried to scan without picking a mode */}
      {errorMessage && (
        <div className="flex items-center gap-2 text-xs font-semibold p-2.5 bg-destructive/15 text-destructive rounded-lg border border-destructive/30 mt-1" role="alert">
          <AlertCircle size={15} aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
