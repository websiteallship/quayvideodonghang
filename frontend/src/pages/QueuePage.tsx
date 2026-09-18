import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  UploadCloud,
  RefreshCw,
  Search,
  Filter,
  X,
  Clock,
  HardDrive,
  Play,
  Trash2,
  RotateCcw,
  Package,
  PackageOpen,
  AlertTriangle,
  CheckSquare,
  Square,
  Pause,
  Download,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Pagination } from '@/components/ui/pagination';
import { useUploadQueue } from '@/hooks/use-upload-queue';
import { useAuthStore } from '@/stores/auth-store';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SessionRecoveryModal } from '@/components/auth/SessionRecoveryModal';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatBytes, formatDuration, formatDateTimeVN, formatDateTimeShortVN } from '@/utils/format';
import type { QueueItem, UploadStatus, LoaiBienBan } from '@/types';

const ITEMS_PER_PAGE = 10;

type FilterStatus = 'all' | UploadStatus;
type FilterType = 'all' | LoaiBienBan;

/** Generate a thumbnail blob URL from the video blob */
function useThumbnail(blob: Blob | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blob || blob.size === 0) {
      setUrl(null);
      return;
    }

    const blobUrl = URL.createObjectURL(blob);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    let cancelled = false;

    const handleSeeked = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 90;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          setUrl(dataUrl);
        }
      } catch (err) {
        console.error('Failed to generate thumbnail:', err);
      } finally {
        URL.revokeObjectURL(blobUrl);
        video.removeAttribute('src');
        video.load();
      }
    };

    video.addEventListener('seeked', handleSeeked, { once: true });

    video.addEventListener(
      'loadeddata',
      () => {
        if (cancelled) return;
        video.currentTime = 0.01;
      },
      { once: true }
    );

    video.addEventListener(
      'error',
      () => {
        if (!cancelled) {
          URL.revokeObjectURL(blobUrl);
          setUrl(null);
        }
      },
      { once: true }
    );

    video.src = blobUrl;
    video.load();

    return () => {
      cancelled = true;
      URL.revokeObjectURL(blobUrl);
      video.removeAttribute('src');
      video.load();
    };
  }, [blob]);

  return url;
}

/** Individual queue card with clean SaaS typography, thumbnail, and inline actions */
const QueueCard: React.FC<{
  item: QueueItem;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onPlayVideo: (item: QueueItem) => void;
  onUploadSingle: (item: QueueItem) => void;
  onRetry: (id: string) => void;
  onRemove: (item: QueueItem) => void;
  onCancelUpload?: (item: QueueItem) => void;
  isUploadingThis: boolean;
  uploadProgress: number;
}> = React.memo(
  ({
    item,
    isSelected,
    onToggleSelect,
    onPlayVideo,
    onUploadSingle,
    onRetry,
    onRemove,
    onCancelUpload,
    isUploadingThis,
    uploadProgress
  }) => {
    const thumbnail = useThumbnail(item.blob);
    const isDongGoi = item.loai_bien_ban === 'dong_goi';
    const isError = item.status === 'loi';
    const isPending = item.status === 'cho_upload';
    const isUploading = item.status === 'dang_upload' || isUploadingThis;

    const cardBorderClass = isUploading
      ? 'border-2 border-primary/40 shadow-sm'
      : item.status === 'da_upload'
      ? 'border-border/80 bg-card/60 opacity-90'
      : 'border-border shadow-xs hover:bg-accent/30';

    return (
      <Card
        className={`flex flex-col p-3.5 gap-3 relative cursor-pointer transition-colors overflow-hidden ${
          isSelected ? 'bg-primary/5 ring-1 ring-primary' : 'bg-card'
        } ${cardBorderClass}`}
        onClick={() => onPlayVideo(item)}
        role="button"
        tabIndex={0}
        aria-label={`Xem video ${item.ma_van_don}`}
        onKeyDown={(e) => e.key === 'Enter' && onPlayVideo(item)}
      >
        <div className="flex items-start justify-between flex-wrap gap-2">
          {/* Left section: Checkbox, Thumbnail, Info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Checkbox */}
            {item.status !== 'da_upload' && (
              <div
                className="flex items-center justify-center shrink-0 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelect(item.id);
                }}
              >
                {isSelected ? (
                  <CheckSquare size={20} className="text-primary" />
                ) : (
                  <Square size={20} className="text-muted-foreground" />
                )}
              </div>
            )}

            {/* Thumbnail Preview */}
            <div className="relative shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-muted">
              {thumbnail ? (
                <img
                  src={thumbnail}
                  alt={`Thumbnail ${item.ma_van_don}`}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Play size={16} className="text-muted-foreground/50" />
                </div>
              )}
              {/* Play icon overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100">
                <Play size={16} className="text-white fill-white" />
              </div>
            </div>

            {/* Info Column */}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono font-bold text-xs sm:text-sm text-foreground truncate">
                  {item.ma_van_don}
                </span>
                
                {item.status === 'da_upload' ? (
                  <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                    ĐÃ LƯU
                  </span>
                ) : (
                  <span className={`text-[9px] sm:text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 rounded border whitespace-nowrap ${
                    isDongGoi ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                  }`}>
                    {item.don_vi_vc}
                  </span>
                )}
              </div>
              
              <div className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1 flex-wrap">
                <span className="font-medium text-foreground/80">{isDongGoi ? 'Đóng gói' : 'Khui hàng'}</span>
                <span>•</span>
                <span>{formatBytes(item.kich_thuoc_bytes)}</span>
                <span>•</span>
                <span>{formatDuration(item.thoi_luong_video)}</span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline">Tạo: {formatDateTimeShortVN(item.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Right section: Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            {isUploading && onCancelUpload && (
              <button
                onClick={() => onCancelUpload(item)}
                className="h-7 sm:h-8 px-2 sm:px-3 rounded-lg border border-border hover:bg-muted text-[11px] sm:text-xs font-semibold cursor-pointer"
              >
                Tạm dừng
              </button>
            )}

            {isPending && (
              <button
                onClick={() => onUploadSingle(item)}
                className="h-7 sm:h-8 px-2.5 sm:px-3 rounded-xl bg-primary text-white text-[11px] sm:text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <UploadCloud size={14} />
                <span className="hidden sm:inline">Tải ngay</span>
              </button>
            )}

            {isError && (
              <button
                onClick={() => onRetry(item.id)}
                className="h-7 sm:h-8 px-2.5 sm:px-3 rounded-xl bg-amber-500/10 text-amber-600 text-[11px] sm:text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw size={14} />
                <span className="hidden sm:inline">Thử lại</span>
              </button>
            )}

            {item.status === 'da_upload' && (
              <button
                onClick={() => onPlayVideo(item)}
                className="h-7 sm:h-8 px-2.5 sm:px-3 rounded-lg border border-border hover:bg-muted text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Play size={12} className="text-amber-500 fill-current" />
                <span className="hidden sm:inline">Xem lại</span>
              </button>
            )}

            {item.status !== 'da_upload' && (
              <button
                onClick={() => onRemove(item)}
                className="w-7 sm:w-8 h-7 sm:h-8 rounded-xl border border-border hover:bg-muted text-destructive flex items-center justify-center cursor-pointer"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Upload Progress Bar if active */}
        {isUploading && (
          <div className="w-full">
            <div className="w-full h-1.5 sm:h-2 rounded-full bg-muted overflow-hidden mb-1">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-bold">
              <span className="text-blue-600 dark:text-blue-400">Đang tải: {uploadProgress.toFixed(0)}%</span>
            </div>
          </div>
        )}
        
        {/* Error Message */}
        {isError && item.last_error && (
          <div className="text-[10px] text-destructive flex items-center gap-1 bg-destructive/10 p-1.5 rounded-md">
            <AlertTriangle size={12} />
            <span>{item.last_error}</span>
          </div>
        )}
      </Card>
    );
  }
);

QueueCard.displayName = 'QueueCard';


/** Enhanced Video playback modal with direct actions */
const VideoPlayerModal: React.FC<{
  item: QueueItem | null;
  onClose: () => void;
  onUploadSingle: (item: QueueItem) => void;
  onDelete: (item: QueueItem) => void;
}> = ({ item, onClose, onUploadSingle, onDelete }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (item?.blob) {
      const url = URL.createObjectURL(item.blob);
      setBlobUrl(url);
      return () => {
        URL.revokeObjectURL(url);
        setBlobUrl(null);
      };
    }
    setBlobUrl(null);
  }, [item]);

  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = '';
      }
    };
  }, []);

  const handleDownload = useCallback(() => {
    if (!item?.blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(item.blob);
    a.download = `${item.ma_van_don}_${item.loai_bien_ban}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }, [item]);

  if (!item) return null;

  const isDongGoi = item.loai_bien_ban === 'dong_goi';

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[640px] p-0 overflow-hidden bg-card border-border">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="text-lg">Xem video: {item.ma_van_don}</DialogTitle>
          <DialogDescription className="sr-only">
            Chi tiết video mã vận đơn {item.ma_van_don}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 p-4 pt-2">
          {/* Video Player Box */}
          <div className="w-full rounded-md overflow-hidden bg-black aspect-video flex items-center justify-center">
            {blobUrl ? (
              <video
                ref={videoRef}
                src={blobUrl}
                controls
                playsInline
                autoPlay
                className="w-full h-full max-h-[360px] object-contain"
              />
            ) : (
              <div className="text-muted-foreground text-sm">Không thể tải video</div>
            )}
          </div>

          {/* Info row */}
          <div className="flex items-center flex-wrap gap-2 text-sm text-muted-foreground">
            <Badge 
              variant={item.status === 'loi' ? 'destructive' : item.status === 'da_upload' ? 'outline' : item.status === 'dang_upload' ? 'default' : 'secondary'}
            >
              {item.status === 'loi' ? 'Lỗi' : item.status === 'da_upload' ? 'Đã tải' : item.status === 'dang_upload' ? 'Đang tải' : 'Chờ tải'}
            </Badge>

            <span
              className={`inline-flex items-center gap-1.5 font-semibold text-[11px] px-2 py-0.5 rounded ${
                isDongGoi ? 'text-primary bg-primary/10' : 'text-amber-600 bg-amber-500/10'
              }`}
            >
              {isDongGoi ? <Package size={13} aria-hidden /> : <PackageOpen size={13} aria-hidden />}
              {isDongGoi ? 'Đóng gói' : 'Khui hàng'}
            </span>

            <span className="text-border">|</span>
            <span className="font-semibold text-foreground">{item.don_vi_vc}</span>
            <span className="text-border">|</span>
            <span className="inline-flex items-center gap-1">
              <Clock size={12} aria-hidden />
              {formatDuration(item.thoi_luong_video)}
            </span>
            <span className="text-border">|</span>
            <span className="inline-flex items-center gap-1">
              <HardDrive size={12} aria-hidden />
              {formatBytes(item.kich_thuoc_bytes)}
            </span>
          </div>

          <div className="text-[11px] text-muted-foreground">
            Thời gian tạo: {formatDateTimeVN(item.created_at)}
          </div>

          {/* Modal Action Buttons (Clean 2-tier SaaS mobile-first layout) */}
          <div className="flex flex-col gap-2 pt-3 border-t border-border mt-1">
            {item.status !== 'da_upload' && (
              <Button
                onClick={() => {
                  onClose();
                  onUploadSingle(item);
                }}
                className="w-full h-10 font-semibold"
              >
                <UploadCloud size={15} className="mr-2" />
                Tải lên ngay
              </Button>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                onClick={handleDownload}
                className="h-[38px] text-xs font-medium"
              >
                <Download size={14} className="mr-2" />
                Tải về máy
              </Button>

              {item.status !== 'da_upload' && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    onClose();
                    onDelete(item);
                  }}
                  className="h-[38px] text-xs font-medium"
                >
                  <Trash2 size={14} className="mr-2" />
                  Xóa video
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/** Confirmation dialog for deleting un-uploaded videos */
const ConfirmDeleteModal: React.FC<{
  isOpen: boolean;
  items: QueueItem[];
  onClose: () => void;
  onConfirm: () => void;
}> = ({ isOpen, items, onClose, onConfirm }) => {
  if (!isOpen || !items.length) return null;

  const hasUnsynced = items.some((i) => i.status !== 'da_upload');

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="sm:max-w-[460px]">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {hasUnsynced ? 'Cảnh báo xóa video chưa tải' : 'Xác nhận xóa video'}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="flex flex-col gap-3">
              {hasUnsynced && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-start gap-2 text-destructive">
                  <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                  <div className="text-xs leading-relaxed">
                    <strong className="font-semibold">Video chưa được tải lên Google Drive!</strong>
                    <p className="mt-1 text-destructive/80 text-[11px]">
                      Nếu xóa, toàn bộ dữ liệu video sẽ bị xóa vĩnh viễn khỏi thiết bị và không thể phục hồi.
                    </p>
                  </div>
                </div>
              )}

              <div className="text-sm text-foreground">
                Bạn có chắc chắn muốn xóa {items.length} video sau:
              </div>

              <div className="max-h-[120px] overflow-y-auto border border-border rounded-md p-2 flex flex-col gap-1">
                {items.map((it) => (
                  <div
                    key={it.id}
                    className="font-mono text-xs text-muted-foreground flex justify-between"
                  >
                    <span className="font-semibold">{it.ma_van_don}</span>
                    <span>{it.loai_bien_ban === 'dong_goi' ? 'Đóng gói' : 'Khui hàng'}</span>
                  </div>
                ))}
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Hủy bỏ</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Xác nhận xóa
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

/** Confirmation dialog for uploading videos to Google Drive */
const ConfirmUploadModal: React.FC<{
  isOpen: boolean;
  items: QueueItem[];
  isSyncing: boolean;
  onClose: () => void;
  onConfirm: () => void;
}> = ({ isOpen, items, isSyncing, onClose, onConfirm }) => {
  if (!isOpen || !items.length) return null;

  const totalBytes = items.reduce((acc, item) => acc + (item.kich_thuoc_bytes || 0), 0);
  const dongGoiCount = items.filter((i) => i.loai_bien_ban === 'dong_goi').length;
  const khuiHangCount = items.filter((i) => i.loai_bien_ban === 'khui_hang').length;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && !isSyncing && onClose()}>
      <AlertDialogContent className="sm:max-w-[480px]">
        <AlertDialogHeader>
          <AlertDialogTitle>Xác nhận tải lên Google Drive</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="flex flex-col gap-3">
              {/* Info Box */}
              <div className="p-3 bg-primary/10 border border-primary/20 rounded-md flex items-start gap-2">
                <UploadCloud size={18} className="shrink-0 mt-0.5 text-primary" />
                <div className="text-xs leading-relaxed">
                  <strong className="font-semibold text-foreground">
                    Chuẩn bị tải {items.length} video lên Google Drive
                  </strong>
                  <p className="mt-1 text-muted-foreground text-[11px]">
                    Tổng dung lượng: <strong className="text-foreground">{formatBytes(totalBytes)}</strong>
                    {dongGoiCount > 0 && ` • ${dongGoiCount} đóng gói`}
                    {khuiHangCount > 0 && ` • ${khuiHangCount} khui hàng`}
                  </p>
                </div>
              </div>

              <div className="text-sm text-foreground font-medium">
                Danh sách mã vận đơn sẽ tải:
              </div>

              {/* List of items preview */}
              <div className="max-h-[150px] overflow-y-auto border border-border rounded-md p-2 flex flex-col gap-1.5 bg-muted/50">
                {items.map((it) => (
                  <div
                    key={it.id}
                    className="font-mono text-[11px] text-muted-foreground flex items-center justify-between py-0.5"
                  >
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: it.loai_bien_ban === 'dong_goi' ? '#3f51b5' : '#d97706' }}
                      />
                      <span className="font-semibold text-foreground overflow-hidden text-ellipsis whitespace-nowrap">
                        {it.ma_van_don}
                      </span>
                    </div>
                    <span className="shrink-0 ml-2">
                      {formatBytes(it.kich_thuoc_bytes)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} disabled={isSyncing}>Hủy bỏ</AlertDialogCancel>
          <Button
            onClick={onConfirm}
            disabled={isSyncing}
            className="min-w-[100px]"
          >
            {isSyncing ? 'Đang tải...' : 'Xác nhận tải'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export const QueuePage: React.FC = () => {
  const {
    queue,
    pendingCount,
    errorCount,
    completedCount,
    isSyncing,
    currentProgress,
    currentUpload,
    totalToSync,
    syncedInSession,
    storageEstimate,
    storageWarning,
    loadQueue,
    processAll,
    uploadSelected,
    uploadSingle,
    retryOne,
    removeItem,
    removeSelected,
    removeCompleted,
    cancelItem,
    abortSync
  } = useUploadQueue();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('cho_upload');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [playingItem, setPlayingItem] = useState<QueueItem | null>(null);

  // Bulk select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Confirm delete modal state
  const [deleteTargets, setDeleteTargets] = useState<QueueItem[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Confirm upload modal state
  const [uploadTargets, setUploadTargets] = useState<QueueItem[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, filterType]);

  // Counts by type
  const dongGoiCount = useMemo(() => queue.filter((i) => i.loai_bien_ban === 'dong_goi').length, [queue]);
  const khuiHangCount = useMemo(() => queue.filter((i) => i.loai_bien_ban === 'khui_hang').length, [queue]);
  const uploadingCount = useMemo(() => queue.filter((q) => q.status === 'dang_upload').length, [queue]);

  // Filter & search
  const filteredQueue = useMemo(() => {
    let result = [...queue];

    // Filter by type (Đóng gói / Khui hàng)
    if (filterType !== 'all') {
      result = result.filter((item) => item.loai_bien_ban === filterType);
    }

    // Filter by status
    if (filterStatus !== 'all') {
      result = result.filter((item) => item.status === filterStatus);
    }

    // Search by ma_van_don or don_vi_vc
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (item) => item.ma_van_don.toLowerCase().includes(q) || item.don_vi_vc.toLowerCase().includes(q)
      );
    }

    return result;
  }, [queue, filterType, filterStatus, searchQuery]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredQueue.length / ITEMS_PER_PAGE));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredQueue.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredQueue, currentPage]);

  // Selection handlers
  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAllVisible = useCallback(() => {
    setSelectedIds((prev) => {
      const allVisibleIds = paginatedItems.filter((item) => item.status !== 'da_upload').map((item) => item.id);
      if (allVisibleIds.length === 0) return prev;
      const isAllSelected = allVisibleIds.every((id) => prev.has(id));
      const next = new Set(prev);
      if (isAllSelected) {
        allVisibleIds.forEach((id) => next.delete(id));
      } else {
        allVisibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, [paginatedItems]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isAllCurrentPageSelected = useMemo(() => {
    if (!paginatedItems.length) return false;
    return paginatedItems.every((item) => selectedIds.has(item.id));
  }, [paginatedItems, selectedIds]);

  const selectedSize = useMemo(() => {
    let size = 0;
    queue.forEach((item) => {
      if (selectedIds.has(item.id)) {
        size += item.kich_thuoc_bytes || 0;
      }
    });
    return size;
  }, [queue, selectedIds]);

  // Actions
  const handlePlayVideo = useCallback((item: QueueItem) => {
    setPlayingItem(item);
  }, []);

  const handleClosePlayer = useCallback(() => {
    setPlayingItem(null);
  }, []);

  const handleRetry = useCallback(
    async (id: string) => {
      await retryOne(id);
    },
    [retryOne]
  );

  const handleCancelUpload = useCallback(
    async (item: QueueItem) => {
      await cancelItem(item.id);
    },
    [cancelItem]
  );

  const handleRequestRemoveItem = useCallback((item: QueueItem) => {
    if (item.status === 'da_upload') {
      void removeItem(item.id);
    } else {
      setDeleteTargets([item]);
      setIsDeleteModalOpen(true);
    }
  }, [removeItem]);

  const handleRequestRemoveSelected = useCallback(() => {
    const items = queue.filter((i) => selectedIds.has(i.id));
    if (!items.length) return;

    const hasUnsynced = items.some((i) => i.status !== 'da_upload');
    if (hasUnsynced) {
      setDeleteTargets(items);
      setIsDeleteModalOpen(true);
    } else {
      void removeSelected(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  }, [queue, selectedIds, removeSelected]);

  const handleConfirmDelete = useCallback(async () => {
    const ids = deleteTargets.map((t) => t.id);
    await removeSelected(ids);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
    setIsDeleteModalOpen(false);
    setDeleteTargets([]);
  }, [deleteTargets, removeSelected]);

  // Trigger modal for uploading single video
  const handleRequestUploadSingle = useCallback((item: QueueItem) => {
    setUploadTargets([item]);
    setIsUploadModalOpen(true);
  }, []);

  // Trigger modal for uploading all pending/error videos
  const handleRequestUploadAll = useCallback(() => {
    const syncable = queue.filter((i) => i.status === 'cho_upload' || i.status === 'loi');
    if (!syncable.length) return;
    setUploadTargets(syncable);
    setIsUploadModalOpen(true);
  }, [queue]);

  // Trigger modal for uploading selected videos
  const handleRequestUploadSelected = useCallback(() => {
    const items = queue.filter((i) => selectedIds.has(i.id) && i.status !== 'dang_upload');
    if (!items.length) return;
    setUploadTargets(items);
    setIsUploadModalOpen(true);
  }, [queue, selectedIds]);

  // Token expired modal state
  const [isTokenExpiredModalOpen, setIsTokenExpiredModalOpen] = useState(false);
  const checkTokenValid = useAuthStore((s) => s.checkTokenValid);

  // Confirmed upload from modal
  const handleConfirmUpload = useCallback(async () => {
    const targets = [...uploadTargets];
    setIsUploadModalOpen(false);
    setUploadTargets([]);

    // Verify token before starting upload to avoid silent 401 failures
    const isValid = await checkTokenValid();
    if (!isValid) {
      setIsTokenExpiredModalOpen(true);
      return;
    }

    const syncableCount = queue.filter((i) => i.status === 'cho_upload' || i.status === 'loi').length;
    if (targets.length === 1) {
      await uploadSingle(targets[0].id);
    } else if (targets.length === syncableCount && syncableCount > 0) {
      await processAll();
    } else {
      await uploadSelected(targets.map((t) => t.id));
    }
  }, [uploadTargets, uploadSingle, processAll, uploadSelected, queue, checkTokenValid]);

  return (
    <div className="flex flex-col gap-2.5 w-full h-full flex-1 min-h-0 relative data-[has-selection=true]:pb-16" data-has-selection={selectedIds.size > 0}>
      {/* 1. Top Queue Header */}
      <div className="flex justify-between items-center gap-2 mb-0.5 shrink-0">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg lg:text-3xl font-bold tracking-tight text-foreground truncate">
            Hàng đợi tải lên
          </h2>
          <p className="text-sm text-muted-foreground mt-1 hidden lg:block">
            Tự động lưu tạm video vào bộ nhớ IndexedDB và đồng bộ lên Google Drive khi có mạng
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {(pendingCount > 0 || errorCount > 0) && (
            <Button
              onClick={handleRequestUploadAll}
              disabled={isSyncing}
              size="sm"
              className="h-8 px-2.5 rounded-lg font-semibold shadow-xs text-[11px] sm:text-xs cursor-pointer"
            >
              <UploadCloud size={14} className="sm:mr-1.5" />
              <span className="hidden sm:inline">{isSyncing ? 'Đang tải...' : `Tải lên tất cả (${pendingCount + errorCount})`}</span>
            </Button>
          )}
          {completedCount > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => removeCompleted()}
              className="h-8 px-2.5 rounded-lg font-semibold shadow-xs text-[11px] sm:text-xs cursor-pointer"
            >
              <Trash2 size={14} className="sm:mr-1.5 text-destructive" />
              <span className="hidden sm:inline text-destructive">Dọn dẹp</span>
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => loadQueue()}
            className="h-8 w-8 p-0 rounded-lg font-semibold shadow-xs flex items-center justify-center shrink-0 cursor-pointer"
            title="Làm mới hàng đợi"
          >
            <RefreshCw size={14} />
          </Button>
        </div>
      </div>

      {/* 2. Metric Cards Grid (Compact on mobile) */}
      <div className="grid grid-cols-4 gap-2 lg:gap-4 mb-0.5 shrink-0">
        <div className="p-2 lg:p-4 rounded-xl border border-border bg-card shadow-xs flex flex-col lg:flex-row items-center gap-1 lg:gap-3 text-center lg:text-left">
          <div className="lg:w-10 lg:h-10 rounded-lg lg:bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="hidden lg:block text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Đang tải</div>
            <div className="text-sm lg:text-xl font-bold text-foreground leading-none lg:mt-0.5">{uploadingCount} <span className="hidden lg:inline text-sm font-normal text-muted-foreground">video</span></div>
            <div className="lg:hidden text-[9px] text-muted-foreground font-medium uppercase tracking-tighter mt-1 truncate">Đang tải</div>
          </div>
        </div>

        <div className="p-2 lg:p-4 rounded-xl border border-border bg-card shadow-xs flex flex-col lg:flex-row items-center gap-1 lg:gap-3 text-center lg:text-left">
          <div className="lg:w-10 lg:h-10 rounded-lg lg:bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="hidden lg:block text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Chờ tải</div>
            <div className="text-sm lg:text-xl font-bold text-foreground leading-none lg:mt-0.5">{pendingCount + errorCount} <span className="hidden lg:inline text-sm font-normal text-muted-foreground">video</span></div>
            <div className="lg:hidden text-[9px] text-muted-foreground font-medium uppercase tracking-tighter mt-1 truncate">Chờ tải</div>
          </div>
        </div>

        <div className="p-2 lg:p-4 rounded-xl border border-border bg-card shadow-xs flex flex-col lg:flex-row items-center gap-1 lg:gap-3 text-center lg:text-left">
          <div className="lg:w-10 lg:h-10 rounded-lg lg:bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <Check className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="hidden lg:block text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Đã xong</div>
            <div className="text-sm lg:text-xl font-bold text-foreground leading-none lg:mt-0.5">{completedCount} <span className="hidden lg:inline text-sm font-normal text-muted-foreground">video</span></div>
            <div className="lg:hidden text-[9px] text-muted-foreground font-medium uppercase tracking-tighter mt-1 truncate">Đã xong</div>
          </div>
        </div>

        <div className="p-2 lg:p-4 rounded-xl border border-border bg-card shadow-xs flex flex-col lg:flex-row items-center gap-1 lg:gap-3 text-center lg:text-left">
          <div className="lg:w-10 lg:h-10 rounded-lg lg:bg-slate-500/10 text-slate-600 flex items-center justify-center shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div className="min-w-0 max-w-full">
            <div className="hidden lg:block text-[11px] text-muted-foreground font-medium uppercase tracking-wider">IndexedDB</div>
            <div className="text-sm lg:text-xl font-bold text-foreground leading-none tracking-tighter lg:mt-0.5 truncate">
              {storageEstimate?.usage ? formatBytes(storageEstimate.usage).replace(' ', '') : '0B'}
            </div>
            <div className="lg:hidden text-[9px] text-muted-foreground font-medium uppercase tracking-tighter mt-1 truncate">Bộ nhớ</div>
          </div>
        </div>
      </div>

      {/* Storage warning alert */}
      {storageWarning && (
        <div className="alert-banner alert-banner--error" style={{ padding: '6px 10px', fontSize: '11px' }}>
          <AlertTriangle size={14} style={{ flexShrink: 0 }} />
          <span>{storageWarning}</span>
        </div>
      )}

      {/* 3. Global Syncing Progress Banner (When syncing) */}
      {isSyncing && (
        <Card className="flex flex-col gap-2 p-2.5 bg-blue-500/10 border-blue-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-blue-500">
              <UploadCloud size={14} />
              <span>
                Đang đồng bộ ({syncedInSession}/{totalToSync || 1})
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={abortSync}
              className="h-6 px-2 text-[10px] sm:text-[11px] border-blue-200 hover:bg-blue-100 text-blue-700 bg-white/50"
            >
              <Pause size={10} className="mr-1" />
              Tạm dừng
            </Button>
          </div>
          <Progress 
            value={totalToSync > 0 ? (syncedInSession / totalToSync) * 100 : currentProgress} 
            className="h-1.5 bg-blue-500/20"
          />
        </Card>
      )}

      {/* 4. Filter & Search Row (HistoryPage Layout Style) */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:p-1.5 lg:rounded-2xl lg:border lg:border-slate-200/90 dark:lg:border-slate-800 lg:bg-card lg:shadow-xs gap-2 lg:gap-3 mt-1 lg:mt-2 shrink-0">
        {/* Type Filter (Segmented Pills) */}
        <div className="inline-flex bg-muted/60 p-1 rounded-xl border border-border/60 shrink-0 w-full lg:w-auto overflow-x-auto no-scrollbar">
          {[
            { id: 'all' as const, label: 'Tất cả', count: queue.length, icon: null },
            { id: 'dong_goi' as const, label: 'Đóng gói', count: dongGoiCount, icon: <Package size={14} className="text-blue-500" /> },
            { id: 'khui_hang' as const, label: 'Khui hàng', count: khuiHangCount, icon: <PackageOpen size={14} className="text-amber-500" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterType(tab.id)}
              className={cn(
                'flex-1 lg:flex-none px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg text-[11px] lg:text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap',
                filterType === tab.id
                  ? 'bg-card text-foreground shadow-xs border border-border/70'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] lg:text-[10px] bg-muted font-bold text-foreground">
                ({tab.count})
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 lg:max-w-md lg:ml-auto">
          <Input
            type="text"
            placeholder="Tìm theo mã vận đơn..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 lg:h-10 pl-8 pr-8 lg:pl-9 lg:pr-9 text-[11px] lg:text-xs font-mono bg-background lg:bg-muted/30 border-border lg:rounded-xl focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 rounded-lg shadow-sm lg:shadow-none"
          />
          <Search size={14} className="absolute left-2.5 lg:left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-1 lg:right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-muted transition-colors border-none bg-transparent cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 5. Status Filter Horizontal Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar mt-0.5 shrink-0">
        {[
          { id: 'all' as const, label: 'Tất cả', count: queue.length },
          {
            id: 'cho_upload' as const,
            label: 'Chờ tải',
            count: pendingCount,
            icon: (isActive: boolean) => <Clock size={12} className={`shrink-0 ${isActive ? 'text-primary-foreground' : 'text-amber-500'}`} />
          },
          {
            id: 'dang_upload' as const,
            label: 'Đang tải',
            count: uploadingCount,
            icon: (isActive: boolean) => (
              <RefreshCw
                size={12}
                className={`shrink-0 ${uploadingCount > 0 ? 'animate-spin' : ''} ${
                  isActive ? 'text-primary-foreground' : 'text-blue-500'
                }`}
              />
            ),
          },
          {
            id: 'loi' as const,
            label: 'Lỗi',
            count: errorCount,
            icon: (isActive: boolean) => <AlertTriangle size={12} className={`shrink-0 ${isActive ? 'text-primary-foreground' : 'text-destructive'}`} />
          },
          {
            id: 'da_upload' as const,
            label: 'Đã tải',
            count: completedCount,
            icon: (isActive: boolean) => <Check size={12} className={`shrink-0 ${isActive ? 'text-primary-foreground' : 'text-emerald-500'}`} />
          },
        ].map((item) => {
          const isActive = filterStatus === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilterStatus(item.id)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] sm:text-xs font-medium whitespace-nowrap min-h-[26px] cursor-pointer transition-all shrink-0 ${
                isActive
                  ? 'bg-primary text-primary-foreground border-primary shadow-xs font-semibold'
                  : 'bg-background text-muted-foreground border-border hover:bg-muted/80 hover:text-foreground'
              }`}
            >
              {item.icon && item.icon(isActive)}
              <span>{item.label}</span>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-4 text-center leading-none ${
                  isActive
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {item.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 7. Selection Control Row */}
      {paginatedItems.length > 0 && (
        <div className="flex items-center justify-between px-1 text-xs text-muted-foreground shrink-0">
          <div
            className="flex items-center gap-1.5 cursor-pointer select-none text-foreground hover:text-primary transition-colors"
            onClick={handleSelectAllVisible}
          >
            {isAllCurrentPageSelected ? (
              <CheckSquare size={16} className="text-primary" />
            ) : (
              <Square size={16} className="text-muted-foreground" />
            )}
            <span className="font-medium text-[12px]">Chọn tất cả trang này ({paginatedItems.length})</span>
          </div>

          <span className="text-[11px] font-medium text-muted-foreground">
            {filteredQueue.length} video phù hợp
          </span>
        </div>
      )}

      {/* 8. Queue Items List & Fixed Pagination */}
      {filteredQueue.length === 0 ? (
        <div className="flex-1 min-h-0 flex items-center justify-center">
          {queue.length === 0 ? (
            <EmptyState
              icon={UploadCloud}
              title="Hàng đợi trống"
              description="Tất cả video đã được tải lên Google Drive an toàn"
            />
          ) : (
            <EmptyState
              icon={Filter}
              title="Không tìm thấy kết quả"
              description={
                searchQuery
                  ? `Không có video nào khớp "${searchQuery}"`
                  : 'Không có video nào thỏa mãn bộ lọc hiện tại'
              }
            />
          )}
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col gap-2">
          {/* Middle Scrollable list of cards */}
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 pr-1 saas-scrollbar">
            {paginatedItems.map((item) => (
              <QueueCard
                key={item.id}
                item={item}
                isSelected={selectedIds.has(item.id)}
                onToggleSelect={handleToggleSelect}
                onPlayVideo={handlePlayVideo}
                onUploadSingle={handleRequestUploadSingle}
                onRetry={handleRetry}
                onRemove={handleRequestRemoveItem}
                onCancelUpload={handleCancelUpload}
                isUploadingThis={currentUpload === item.id}
                uploadProgress={currentUpload === item.id ? currentProgress : 0}
              />
            ))}
          </div>

          {/* Fixed Bottom Pagination Footer */}
          <div className="shrink-0 p-3 rounded-xl border border-border bg-card shadow-xs flex items-center justify-between flex-wrap gap-2 text-xs text-muted-foreground select-none">
            <div className="text-xs text-muted-foreground font-medium">
              Hiển thị <strong className="text-foreground">{paginatedItems.length}</strong> / <strong>{filteredQueue.length}</strong> video
            </div>
            {totalPages > 1 ? (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                siblingCount={1}
              />
            ) : (
              <span className="text-[11px] text-muted-foreground font-mono">Trang 1 / 1</span>
            )}
          </div>
        </div>
      )}

      {/* 10. STICKY FLOATING BULK ACTION BAR */}
      {selectedIds.size > 0 && (
        <Card
          className="fixed bottom-[72px] lg:bottom-6 left-4 right-4 max-w-[1200px] mx-auto z-45 p-3 flex items-center justify-between gap-3 bg-slate-900 border-white/20 text-white shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5"
        >
          {/* Selected Info */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearSelection}
              className="w-7 h-7 flex items-center justify-center rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors border-none cursor-pointer shrink-0"
              title="Bỏ chọn"
            >
              <X size={15} />
            </button>
            <div className="flex flex-col">
              <div className="text-sm font-bold text-white leading-tight">
                Đã chọn {selectedIds.size} video
              </div>
              <div className="text-[10px] text-slate-400 leading-tight">
                Tổng dung lượng: {formatBytes(selectedSize)}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              onClick={handleRequestRemoveSelected}
              className="h-9 px-3 text-xs font-semibold bg-destructive/20 text-red-400 hover:bg-destructive/30 border border-destructive/40"
            >
              <Trash2 size={14} className="mr-1.5" />
              Xóa ({selectedIds.size})
            </Button>

            <Button
              variant="default"
              onClick={handleRequestUploadSelected}
              disabled={isSyncing}
              className="h-9 px-3.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/40"
            >
              <UploadCloud size={14} className="mr-1.5" />
              {isSyncing ? 'Đang tải...' : `Tải lên (${selectedIds.size})`}
            </Button>
          </div>
        </Card>
      )}

      {/* Video Player Modal */}
      <VideoPlayerModal
        item={playingItem}
        onClose={handleClosePlayer}
        onUploadSingle={handleRequestUploadSingle}
        onDelete={handleRequestRemoveItem}
      />

      {/* Safe Delete Modal */}
      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        items={deleteTargets}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeleteTargets([]);
        }}
        onConfirm={handleConfirmDelete}
      />

      {/* Confirm Upload Modal */}
      <ConfirmUploadModal
        isOpen={isUploadModalOpen}
        items={uploadTargets}
        isSyncing={isSyncing}
        onClose={() => {
          setIsUploadModalOpen(false);
          setUploadTargets([]);
        }}
        onConfirm={handleConfirmUpload}
      />

      {/* Token Expired Modal */}
      <SessionRecoveryModal
        isOpen={isTokenExpiredModalOpen}
        onClose={() => setIsTokenExpiredModalOpen(false)}
        onSuccess={() => {
          setIsTokenExpiredModalOpen(false);
          // Automatically retry the upload that was interrupted
          void handleConfirmUpload();
        }}
      />

    </div>
  );
};
