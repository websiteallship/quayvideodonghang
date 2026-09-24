import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showFirstLast?: boolean;
  className?: string;
  siblingCount?: number;
  hideOnSinglePage?: boolean;
}

export function generatePaginationRange(currentPage: number, totalPages: number, siblingCount = 1) {
  const totalPageNumbers = siblingCount * 2 + 3;
  const totalBlocks = totalPageNumbers + 2;

  if (totalPages >= totalBlocks) {
    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

    const showLeftDots = leftSiblingIndex > 2;
    const showRightDots = rightSiblingIndex < totalPages - 2;

    if (!showLeftDots && showRightDots) {
      const leftItemCount = 3 + 2 * siblingCount;
      const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
      return [...leftRange, '...', totalPages];
    }

    if (showLeftDots && !showRightDots) {
      const rightItemCount = 3 + 2 * siblingCount;
      const rightRange = Array.from({ length: rightItemCount }, (_, i) => totalPages - rightItemCount + i + 1);
      return [1, '...', ...rightRange];
    }

    if (showLeftDots && showRightDots) {
      const middleRange = Array.from({ length: rightSiblingIndex - leftSiblingIndex + 1 }, (_, i) => leftSiblingIndex + i);
      return [1, '...', ...middleRange, '...', totalPages];
    }
  }
  return Array.from({ length: Math.max(1, totalPages) }, (_, i) => i + 1);
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  showFirstLast = false,
  className,
  siblingCount = 1,
  hideOnSinglePage = false,
}) => {
  if (totalPages <= 0) return null;
  if (totalPages === 1 && hideOnSinglePage) return null;

  const safeTotalPages = Math.max(1, totalPages);
  const pages = generatePaginationRange(currentPage, safeTotalPages, siblingCount);

  return (
    <div className={cn('flex items-center gap-1.5 select-none', className)}>
      {showFirstLast && (
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          title="Trang đầu tiên"
          className="size-8 shrink-0 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center disabled:opacity-35 disabled:pointer-events-none transition-all cursor-pointer shadow-2xs"
        >
          <ChevronsLeft size={14} />
        </button>
      )}

      <button
        type="button"
        onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
        disabled={currentPage === 1}
        title="Trang trước"
        className="size-8 shrink-0 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center disabled:opacity-35 disabled:pointer-events-none transition-all cursor-pointer shadow-2xs"
      >
        <ChevronLeft size={14} />
      </button>

      {pages.map((page, idx) =>
        page === '...' ? (
          <span key={`ellipsis-${idx}`} className="px-1 shrink-0 text-muted-foreground text-[11px]">
            ...
          </span>
        ) : (
          <button
            key={idx}
            type="button"
            onClick={() => onPageChange(page as number)}
            className={cn(
              'size-8 shrink-0 rounded-lg font-bold text-xs flex items-center justify-center transition-all cursor-pointer',
              currentPage === page
                ? 'bg-blue-600 text-white shadow-xs'
                : 'border border-border bg-card hover:bg-muted text-foreground'
            )}
          >
            {page}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => onPageChange(Math.min(currentPage + 1, safeTotalPages))}
        disabled={currentPage >= safeTotalPages}
        title="Trang kế tiếp"
        className="size-8 shrink-0 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center disabled:opacity-35 disabled:pointer-events-none transition-all cursor-pointer shadow-2xs"
      >
        <ChevronRight size={14} />
      </button>

      {showFirstLast && (
        <button
          type="button"
          onClick={() => onPageChange(safeTotalPages)}
          disabled={currentPage >= safeTotalPages}
          title="Trang cuối cùng"
          className="size-8 shrink-0 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center disabled:opacity-35 disabled:pointer-events-none transition-all cursor-pointer shadow-2xs"
        >
          <ChevronsRight size={14} />
        </button>
      )}
    </div>
  );
};

export interface PaginationInfoProps {
  startIndex: number;
  endIndex: number;
  totalItems: number;
  label?: string;
  className?: string;
}

export const PaginationInfo: React.FC<PaginationInfoProps> = ({
  startIndex,
  endIndex,
  totalItems,
  label = 'biên bản',
  className,
}) => (
  <div className={cn('text-xs text-muted-foreground', className)}>
    Hiển thị{' '}
    <strong className="text-foreground font-semibold">
      {startIndex} - {endIndex}
    </strong>{' '}
    trong tổng số <strong className="text-foreground font-semibold">{totalItems}</strong> {label}
  </div>
);

export interface PaginationLimitSelectProps {
  limit: number;
  onLimitChange: (limit: number) => void;
  options?: number[];
  className?: string;
}

export const PaginationLimitSelect: React.FC<PaginationLimitSelectProps> = ({
  limit,
  onLimitChange,
  options = [10, 20, 25, 50, 100],
  className,
}) => (
  <div className={cn('flex items-center gap-2', className)}>
    <span className="text-xs font-medium text-muted-foreground">Hiển thị</span>
    <Select value={String(limit)} onValueChange={(val) => onLimitChange(Number(val))}>
      <SelectTrigger
        size="sm"
        className="h-8 w-auto min-w-[100px] px-2.5 rounded-lg border border-input bg-card hover:bg-muted/50 text-foreground font-semibold text-xs cursor-pointer shadow-2xs transition-all focus-visible:ring-1 focus-visible:ring-primary"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="center" className="rounded-xl min-w-[100px] shadow-md">
        {options.map((opt) => (
          <SelectItem key={opt} value={String(opt)} className="text-xs font-medium cursor-pointer">
            {opt} / trang
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

// ---------------------------------------------------------------------------
// Mobile Pagination Footer (Compact single-row)
// ---------------------------------------------------------------------------

export interface MobilePaginationFooterProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  startIndex: number;
  endIndex: number;
  totalItems: number;
  limit: number;
  onLimitChange: (limit: number) => void;
  limitOptions?: number[];
  className?: string;
}

export const MobilePaginationFooter: React.FC<MobilePaginationFooterProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  startIndex,
  endIndex,
  totalItems,
  limit,
  onLimitChange,
  limitOptions = [10, 20, 50],
  className,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className={cn(
        'fixed bottom-16 left-0 right-0 z-40 px-3 py-1.5 border-t border-border bg-background/95 backdrop-blur-md flex items-center justify-between gap-1.5 select-none lg:hidden shadow-sm',
        className
      )}
    >
      {/* Left: Info text */}
      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
        <strong className="text-foreground font-semibold">{startIndex}-{endIndex}</strong>/{totalItems}
      </span>

      {/* Center: Prev / Page X / Next */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
          aria-label="Trang trước"
          className="size-7 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center disabled:opacity-35 disabled:pointer-events-none transition-all cursor-pointer"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-[11px] font-bold text-foreground px-1.5 tabular-nums">
          {currentPage}/{totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage >= totalPages}
          aria-label="Trang sau"
          className="size-7 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center disabled:opacity-35 disabled:pointer-events-none transition-all cursor-pointer"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Right: Limit selector (compact) */}
      <Select value={String(limit)} onValueChange={(val) => onLimitChange(Number(val))}>
        <SelectTrigger
          size="sm"
          aria-label="Số bản ghi mỗi trang"
          className="h-7 w-auto min-w-[70px] px-2 rounded-lg border border-input bg-card text-foreground font-semibold text-[11px] cursor-pointer shadow-2xs"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end" className="rounded-xl min-w-[90px] shadow-md z-[60]">
          {limitOptions.map((opt) => (
            <SelectItem key={opt} value={String(opt)} className="text-xs font-medium cursor-pointer">
              {opt} / trang
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>,
    document.body
  );
};
