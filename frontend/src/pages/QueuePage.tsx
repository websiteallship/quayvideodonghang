import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  UploadCloud,
  RefreshCw,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
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
  Database,
  CheckCircle2
} from 'lucide-react';
import { useUploadQueue } from '@/hooks/use-upload-queue';
import { useAuthStore } from '@/stores/auth-store';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { SessionRecoveryModal } from '@/components/auth/SessionRecoveryModal';
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

    return (
      <div
        className="queue-card"
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'stretch',
          padding: '10px 12px 10px 8px',
          gap: '10px',
          backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.05)' : 'var(--color-bg-card)',
          borderColor: isSelected ? 'var(--color-primary-500)' : 'var(--color-border)',
          cursor: 'pointer',
          position: 'relative'
        }}
        onClick={() => onPlayVideo(item)}
        role="button"
        tabIndex={0}
        aria-label={`Xem video ${item.ma_van_don}`}
        onKeyDown={(e) => e.key === 'Enter' && onPlayVideo(item)}
      >
        {/* Left Indicator Color Strip */}
        <div
          style={{
            position: 'absolute',
            left: '0',
            top: '8px',
            bottom: '8px',
            width: '3.5px',
            borderRadius: '0 4px 4px 0',
            backgroundColor: isDongGoi ? '#3f51b5' : '#d97706'
          }}
        />

        {/* Checkbox Touch Target */}
        {item.status !== 'da_upload' ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              minWidth: '36px',
              cursor: 'pointer',
              flexShrink: 0
            }}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect(item.id);
            }}
            role="checkbox"
            aria-checked={isSelected}
            aria-label={`Chọn đơn ${item.ma_van_don}`}
          >
            {isSelected ? (
              <CheckSquare size={20} color="var(--color-primary-500)" />
            ) : (
              <Square size={20} color="var(--color-text-muted)" />
            )}
          </div>
        ) : (
          <div style={{ width: '36px', minWidth: '36px', flexShrink: 0 }} />
        )}

        {/* Thumbnail Preview */}
        <div className="queue-thumb">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={`Thumbnail ${item.ma_van_don}`}
              className="queue-thumb__img"
            />
          ) : (
            <Play size={20} color="rgba(255,255,255,0.4)" />
          )}

          {/* Duration overlay */}
          <span className="queue-thumb__duration">
            {formatDuration(item.thoi_luong_video)}
          </span>

          {/* Hover Play icon overlay */}
          <div
            className="queue-card__play-overlay"
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.4)',
              opacity: 0,
              transition: 'opacity 0.2s ease'
            }}
          >
            <Play size={18} color="#fff" fill="#fff" />
          </div>
        </div>

        {/* Info Column */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minWidth: 0,
            gap: '4px'
          }}
        >
          {/* Row 1: Code & Status Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '6px'
            }}
          >
            <span
              className="text-mono-code"
              style={{
                fontWeight: 700,
                fontSize: '13px',
                color: 'var(--color-text-primary)',
                letterSpacing: '0.02em'
              }}
            >
              {item.ma_van_don}
            </span>
            <Badge status={item.status} />
          </div>

          {/* Row 2: Metadata Chips */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              color: 'var(--color-text-secondary)',
              flexWrap: 'nowrap',
              overflow: 'hidden'
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                fontWeight: 600,
                fontSize: '10px',
                color: isDongGoi ? '#3f51b5' : '#d97706',
                background: isDongGoi ? 'rgba(63, 81, 181, 0.08)' : 'rgba(217, 119, 6, 0.08)',
                padding: '1px 5px',
                borderRadius: '4px',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              {isDongGoi ? <Package size={11} aria-hidden /> : <PackageOpen size={11} aria-hidden />}
              {isDongGoi ? 'Đóng gói' : 'Khui hàng'}
            </span>
            <span style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}>·</span>
            <span style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {item.don_vi_vc}
            </span>
            <span style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}>·</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', whiteSpace: 'nowrap', flexShrink: 0 }}>
              <HardDrive size={10} aria-hidden />
              {formatBytes(item.kich_thuoc_bytes)}
            </span>
          </div>

          {/* Upload Progress Bar if active */}
          {isUploading && (
            <div style={{ marginTop: '2px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '10px',
                  fontWeight: 600,
                  color: 'var(--color-info)',
                  marginBottom: '2px'
                }}
              >
                <span>Đang tải...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div
                style={{
                  height: '3px',
                  background: 'var(--color-bg-elevated)',
                  borderRadius: '999px',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${uploadProgress}%`,
                    background: 'var(--color-info)',
                    transition: 'width 0.2s ease'
                  }}
                />
              </div>
            </div>
          )}

          {/* Error Line if failed */}
          {isError && item.last_error && (
            <div
              style={{
                fontSize: '10px',
                color: 'var(--color-error)',
                display: 'flex',
                alignItems: 'center',
                gap: '3px'
              }}
            >
              <AlertTriangle size={11} aria-hidden />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.last_error}
              </span>
            </div>
          )}

          {/* Row 3: Timestamp and Action Buttons (Clean 1-line SaaS layout) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '6px',
              marginTop: '3px',
              flexWrap: 'nowrap'
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                color: 'var(--color-text-muted)',
                whiteSpace: 'nowrap',
                flexShrink: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontFamily: 'var(--font-mono)'
              }}
              title={`Thời gian tạo: ${formatDateTimeVN(item.created_at)}`}
            >
              <Clock size={11} style={{ flexShrink: 0 }} aria-hidden />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {formatDateTimeShortVN(item.created_at)}
              </span>
            </div>

            {/* Action Buttons (Icon-only SaaS style) */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                flexShrink: 0,
                whiteSpace: 'nowrap'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {isUploading && onCancelUpload && (
                <button
                  className="queue-card__action-btn queue-card__action-btn--danger queue-card__action-btn--icon"
                  onClick={() => onCancelUpload(item)}
                  aria-label="Hủy tải lên"
                  title="Hủy tải lên"
                >
                  <X size={14} />
                </button>
              )}

              {isPending && (
                <button
                  className="queue-card__action-btn queue-card__action-btn--primary queue-card__action-btn--icon"
                  onClick={() => onUploadSingle(item)}
                  aria-label="Tải video này lên ngay"
                  title="Tải lên ngay"
                >
                  <UploadCloud size={14} />
                </button>
              )}

              {isError && (
                <button
                  className="queue-card__action-btn queue-card__action-btn--warning queue-card__action-btn--icon"
                  onClick={() => onRetry(item.id)}
                  aria-label="Thử lại upload"
                  title="Thử lại"
                >
                  <RotateCcw size={14} />
                </button>
              )}

              {item.status !== 'da_upload' && (
                <button
                  className="queue-card__action-btn queue-card__action-btn--danger queue-card__action-btn--icon"
                  onClick={() => onRemove(item)}
                  aria-label="Xóa video"
                  title="Xóa video"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
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
    <Modal isOpen={!!item} onClose={onClose} title={`Xem video: ${item.ma_van_don}`} maxWidth="640px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {/* Video Player Box */}
        <div
          style={{
            width: '100%',
            borderRadius: '10px',
            overflow: 'hidden',
            background: '#000'
          }}
        >
          {blobUrl && (
            <video
              ref={videoRef}
              src={blobUrl}
              controls
              playsInline
              autoPlay
              style={{ width: '100%', maxHeight: '360px', display: 'block' }}
            />
          )}
        </div>

        {/* Info row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-secondary)'
          }}
        >
          <Badge status={item.status} />

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 600,
              fontSize: '11px',
              color: isDongGoi ? '#3f51b5' : '#d97706',
              background: isDongGoi ? 'rgba(63, 81, 181, 0.08)' : 'rgba(217, 119, 6, 0.08)',
              padding: '2px 8px',
              borderRadius: '4px'
            }}
          >
            {isDongGoi ? <Package size={13} aria-hidden /> : <PackageOpen size={13} aria-hidden />}
            {isDongGoi ? 'Đóng gói' : 'Khui hàng'}
          </span>

          <span style={{ color: 'var(--color-border)' }}>|</span>
          <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{item.don_vi_vc}</span>
          <span style={{ color: 'var(--color-border)' }}>|</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <Clock size={12} aria-hidden />
            {formatDuration(item.thoi_luong_video)}
          </span>
          <span style={{ color: 'var(--color-border)' }}>|</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <HardDrive size={12} aria-hidden />
            {formatBytes(item.kich_thuoc_bytes)}
          </span>
        </div>

        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
          Thời gian tạo: {formatDateTimeVN(item.created_at)}
        </div>

        {/* Modal Action Buttons (Clean 2-tier SaaS mobile-first layout) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            paddingTop: '10px',
            borderTop: '1px solid var(--color-border)'
          }}
        >
          {item.status !== 'da_upload' && (
            <Button
              variant="primary"
              leftIcon={<UploadCloud size={15} />}
              onClick={() => {
                onClose();
                onUploadSingle(item);
              }}
              style={{
                width: '100%',
                minHeight: '40px',
                height: '40px',
                fontSize: '13px',
                fontWeight: 600,
                justifyContent: 'center'
              }}
            >
              Tải lên ngay
            </Button>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px'
            }}
          >
            <Button
              variant="secondary"
              leftIcon={<Download size={14} />}
              onClick={handleDownload}
              style={{
                minHeight: '38px',
                height: '38px',
                fontSize: '12px',
                fontWeight: 500,
                justifyContent: 'center'
              }}
            >
              Tải về máy
            </Button>

            {item.status !== 'da_upload' && (
              <Button
                variant="danger"
                leftIcon={<Trash2 size={14} />}
                onClick={() => {
                  onClose();
                  onDelete(item);
                }}
                style={{
                  minHeight: '38px',
                  height: '38px',
                  fontSize: '12px',
                  fontWeight: 500,
                  justifyContent: 'center'
                }}
              >
                Xóa video
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={hasUnsynced ? 'Cảnh báo xóa video chưa tải' : 'Xác nhận xóa video'}
      maxWidth="460px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {hasUnsynced && (
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              color: 'var(--color-error)'
            }}
          >
            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '12px', lineHeight: 1.4 }}>
              <strong style={{ fontWeight: 600 }}>Video chưa được tải lên Google Drive!</strong>
              <p style={{ marginTop: '2px', color: 'var(--color-text-secondary)', fontSize: '11px' }}>
                Nếu xóa, toàn bộ dữ liệu video sẽ bị xóa vĩnh viễn khỏi thiết bị và không thể phục hồi.
              </p>
            </div>
          </div>
        )}

        <div style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}>
          Bạn có chắc chắn muốn xóa {items.length} video sau:
        </div>

        <div
          style={{
            maxHeight: '120px',
            overflowY: 'auto',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            padding: '6px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          {items.map((it) => (
            <div
              key={it.id}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--color-text-secondary)',
                display: 'flex',
                justifyContent: 'space-between'
              }}
            >
              <span style={{ fontWeight: 600 }}>{it.ma_van_don}</span>
              <span>{it.loai_bien_ban === 'dong_goi' ? 'Đóng gói' : 'Khui hàng'}</span>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            gap: 'var(--space-2)',
            justifyContent: 'flex-end',
            marginTop: '4px'
          }}
        >
          <Button variant="secondary" onClick={onClose} style={{ minHeight: '38px', height: '38px', minWidth: '80px', fontSize: '12px' }}>
            Hủy bỏ
          </Button>
          <Button variant="danger" onClick={onConfirm} style={{ minHeight: '38px', height: '38px', minWidth: '100px', fontSize: '12px' }}>
            Xác nhận xóa
          </Button>
        </div>
      </div>
    </Modal>
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Xác nhận tải lên Google Drive"
      maxWidth="480px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {/* Info Box */}
        <div
          style={{
            padding: '10px 12px',
            backgroundColor: 'rgba(37, 99, 235, 0.08)',
            border: '1px solid rgba(37, 99, 235, 0.25)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px'
          }}
        >
          <UploadCloud size={18} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--color-primary-500)' }} />
          <div style={{ fontSize: '12px', lineHeight: 1.4 }}>
            <strong style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Chuẩn bị tải {items.length} video lên Google Drive
            </strong>
            <p style={{ marginTop: '2px', color: 'var(--color-text-secondary)', fontSize: '11px' }}>
              Tổng dung lượng: <strong style={{ color: 'var(--color-text-primary)' }}>{formatBytes(totalBytes)}</strong>
              {dongGoiCount > 0 && ` • ${dongGoiCount} đóng gói`}
              {khuiHangCount > 0 && ` • ${khuiHangCount} khui hàng`}
            </p>
          </div>
        </div>

        <div style={{ fontSize: '13px', color: 'var(--color-text-primary)', fontWeight: 500 }}>
          Danh sách mã vận đơn sẽ tải:
        </div>

        {/* List of items preview */}
        <div
          style={{
            maxHeight: '150px',
            overflowY: 'auto',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            padding: '6px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            backgroundColor: 'var(--color-bg-elevated)'
          }}
        >
          {items.map((it) => (
            <div
              key={it.id}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--color-text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '2px 0'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: it.loai_bien_ban === 'dong_goi' ? '#3f51b5' : '#d97706',
                    flexShrink: 0
                  }}
                />
                <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {it.ma_van_don}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', flexShrink: 0 }}>
                <span>{it.don_vi_vc}</span>
                <span>•</span>
                <span>{formatBytes(it.kich_thuoc_bytes)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Modal Actions */}
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-2)',
            justifyContent: 'flex-end',
            marginTop: '4px'
          }}
        >
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isSyncing}
            style={{ minHeight: '38px', height: '38px', minWidth: '80px', fontSize: '12px' }}
          >
            Hủy bỏ
          </Button>
          <Button
            variant="primary"
            leftIcon={<UploadCloud size={14} />}
            onClick={onConfirm}
            isLoading={isSyncing}
            disabled={isSyncing}
            style={{ minHeight: '38px', height: '38px', minWidth: '130px', fontSize: '12px' }}
          >
            Bắt đầu tải lên
          </Button>
        </div>
      </div>
    </Modal>
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
    <div
      className="page-stack"
      style={{
        gap: '12px',
        paddingBottom: selectedIds.size > 0 ? '76px' : '8px'
      }}
    >
      {/* 1. Header Toolbar (Clean SaaS) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h2
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              margin: 0,
              letterSpacing: '-0.02em'
            }}
          >
            Hàng đợi tải lên
          </h2>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              padding: '2px 7px',
              borderRadius: '999px',
              backgroundColor: 'var(--color-bg-elevated)',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)'
            }}
          >
            {queue.length} video
          </span>
        </div>

        {/* Global Toolbar Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {(pendingCount > 0 || errorCount > 0) && (
            <Button
              variant="primary"
              leftIcon={<UploadCloud size={14} />}
              onClick={handleRequestUploadAll}
              disabled={isSyncing}
              style={{
                minHeight: '34px',
                height: '34px',
                fontSize: '12px',
                padding: '0 12px',
                borderRadius: '8px'
              }}
            >
              {isSyncing ? 'Đang tải...' : `Tải tất cả (${pendingCount + errorCount})`}
            </Button>
          )}

          {completedCount > 0 && (
            <Button
              variant="secondary"
              leftIcon={<Trash2 size={13} />}
              onClick={() => removeCompleted()}
              style={{
                minHeight: '34px',
                height: '34px',
                fontSize: '12px',
                padding: '0 10px',
                borderRadius: '8px'
              }}
            >
              Dọn ({completedCount})
            </Button>
          )}

          <Button
            variant="secondary"
            leftIcon={<RefreshCw size={13} />}
            onClick={() => loadQueue()}
            style={{
              minHeight: '34px',
              height: '34px',
              fontSize: '12px',
              padding: '0 10px',
              borderRadius: '8px'
            }}
            title="Làm mới hàng đợi"
          >
            Làm mới
          </Button>
        </div>
      </div>

      {/* 2. Storage Quota Status Bar (Clean & Compact) */}
      {storageEstimate && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '6px 12px',
            backgroundColor: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            fontSize: '11px',
            color: 'var(--color-text-secondary)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Database size={13} color="var(--color-primary-500)" />
            <span>
              Bộ nhớ thiết bị:{' '}
              <strong style={{ color: 'var(--color-text-primary)' }}>
                {storageEstimate.remainingMB !== undefined
                  ? `${(storageEstimate.remainingMB / 1024).toFixed(1)} GB còn trống`
                  : 'Khả dụng'}
              </strong>
            </span>
          </div>
          <div>
            Hàng đợi chiếm:{' '}
            <strong style={{ color: 'var(--color-text-primary)' }}>
              {storageEstimate.usage !== undefined
                ? formatBytes(storageEstimate.usage)
                : formatBytes(selectedSize)}
            </strong>
          </div>
        </div>
      )}

      {/* Storage warning alert */}
      {storageWarning && (
        <div className="alert-banner alert-banner--error" style={{ padding: '8px 12px', fontSize: '11px' }}>
          <AlertTriangle size={15} style={{ flexShrink: 0 }} />
          <span>{storageWarning}</span>
        </div>
      )}

      {/* 3. Global Syncing Progress Banner (When syncing) */}
      {isSyncing && (
        <div
          style={{
            padding: '10px 12px',
            backgroundColor: 'rgba(14, 165, 233, 0.08)',
            border: '1px solid rgba(14, 165, 233, 0.25)',
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--color-info)'
              }}
            >
              <UploadCloud size={15} />
              <span>
                Đang đồng bộ Google Drive ({syncedInSession}/{totalToSync || 1} video)
              </span>
            </div>
            <button
              onClick={abortSync}
              className="queue-card__action-btn"
              style={{ fontSize: '11px', padding: '2px 8px' }}
            >
              <Pause size={11} />
              <span>Tạm dừng</span>
            </button>
          </div>
          <div
            style={{
              height: '4px',
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '999px',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${
                  totalToSync > 0
                    ? Math.round((syncedInSession / totalToSync) * 100)
                    : currentProgress
                }%`,
                background: 'var(--color-info)',
                transition: 'width 0.3s ease'
              }}
            />
          </div>
        </div>
      )}

      {/* 4. TYPE SEGMENTED FILTER BAR (Modern SaaS Slider Style) */}
      <div
        style={{
          display: 'flex',
          padding: '3px',
          backgroundColor: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
          borderRadius: '10px',
          gap: '3px'
        }}
      >
        <button
          onClick={() => setFilterType('all')}
          style={{
            flex: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
            padding: '6px 8px',
            borderRadius: '7px',
            border: 'none',
            background: filterType === 'all' ? 'var(--color-bg-card)' : 'transparent',
            color:
              filterType === 'all'
                ? 'var(--color-text-primary)'
                : 'var(--color-text-secondary)',
            fontWeight: filterType === 'all' ? 600 : 500,
            fontSize: '12px',
            boxShadow:
              filterType === 'all'
                ? '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)'
                : 'none',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <CheckCircle2 size={13} color={filterType === 'all' ? 'var(--color-primary-500)' : 'var(--color-text-muted)'} />
          <span>Tất cả</span>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              background: filterType === 'all' ? 'var(--color-primary-500)' : 'var(--color-bg-card)',
              color: filterType === 'all' ? '#fff' : 'var(--color-text-muted)',
              padding: '1px 5px',
              borderRadius: '999px'
            }}
          >
            {queue.length}
          </span>
        </button>

        <button
          onClick={() => setFilterType('dong_goi')}
          style={{
            flex: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
            padding: '6px 8px',
            borderRadius: '7px',
            border: 'none',
            background: filterType === 'dong_goi' ? 'var(--color-bg-card)' : 'transparent',
            color:
              filterType === 'dong_goi'
                ? 'var(--color-text-primary)'
                : 'var(--color-text-secondary)',
            fontWeight: filterType === 'dong_goi' ? 600 : 500,
            fontSize: '12px',
            boxShadow:
              filterType === 'dong_goi'
                ? '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)'
                : 'none',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <Package size={13} color={filterType === 'dong_goi' ? '#3f51b5' : 'var(--color-text-muted)'} />
          <span>Đóng gói</span>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              background: filterType === 'dong_goi' ? '#3f51b5' : 'var(--color-bg-card)',
              color: filterType === 'dong_goi' ? '#fff' : 'var(--color-text-muted)',
              padding: '1px 5px',
              borderRadius: '999px'
            }}
          >
            {dongGoiCount}
          </span>
        </button>

        <button
          onClick={() => setFilterType('khui_hang')}
          style={{
            flex: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
            padding: '6px 8px',
            borderRadius: '7px',
            border: 'none',
            background: filterType === 'khui_hang' ? 'var(--color-bg-card)' : 'transparent',
            color:
              filterType === 'khui_hang'
                ? 'var(--color-text-primary)'
                : 'var(--color-text-secondary)',
            fontWeight: filterType === 'khui_hang' ? 600 : 500,
            fontSize: '12px',
            boxShadow:
              filterType === 'khui_hang'
                ? '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)'
                : 'none',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <PackageOpen size={13} color={filterType === 'khui_hang' ? '#d97706' : 'var(--color-text-muted)'} />
          <span>Khui hàng</span>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              background: filterType === 'khui_hang' ? '#d97706' : 'var(--color-bg-card)',
              color: filterType === 'khui_hang' ? '#fff' : 'var(--color-text-muted)',
              padding: '1px 5px',
              borderRadius: '999px'
            }}
          >
            {khuiHangCount}
          </span>
        </button>
      </div>

      {/* 5. Search Bar (Clean SaaS Form Input) */}
      <div style={{ position: 'relative' }}>
        <Search
          size={15}
          style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--color-text-muted)',
            pointerEvents: 'none'
          }}
        />
        <input
          type="text"
          placeholder="Tìm mã vận đơn, đơn vị vận chuyển…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-field"
          style={{
            paddingLeft: '34px',
            paddingRight: searchQuery ? '32px' : '12px',
            height: '38px',
            fontSize: '13px',
            width: '100%',
            borderRadius: '8px'
          }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            style={{
              position: 'absolute',
              right: '6px',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              borderRadius: '999px',
              background: 'var(--color-bg-elevated)',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              border: 'none'
            }}
            aria-label="Xóa tìm kiếm"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* 6. Status Filter Horizontal Pills */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          paddingBottom: '2px',
          msOverflowStyle: 'none',
          scrollbarWidth: 'none'
        }}
      >
        <button
          onClick={() => setFilterStatus('all')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            borderRadius: '999px',
            border:
              filterStatus === 'all'
                ? '1px solid var(--color-primary-500)'
                : '1px solid var(--color-border)',
            background:
              filterStatus === 'all' ? 'rgba(37, 99, 235, 0.08)' : 'var(--color-bg-card)',
            color:
              filterStatus === 'all'
                ? 'var(--color-primary-600)'
                : 'var(--color-text-secondary)',
            fontSize: '11px',
            fontWeight: filterStatus === 'all' ? 600 : 500,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            minHeight: '28px'
          }}
        >
          <span>Tất cả</span>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              background:
                filterStatus === 'all'
                  ? 'var(--color-primary-500)'
                  : 'var(--color-bg-elevated)',
              color: filterStatus === 'all' ? '#fff' : 'var(--color-text-muted)',
              padding: '0 5px',
              borderRadius: '999px'
            }}
          >
            {queue.length}
          </span>
        </button>

        <button
          onClick={() => setFilterStatus('cho_upload')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            borderRadius: '999px',
            border:
              filterStatus === 'cho_upload'
                ? '1px solid #f59e0b'
                : '1px solid var(--color-border)',
            background:
              filterStatus === 'cho_upload' ? 'rgba(245, 158, 11, 0.08)' : 'var(--color-bg-card)',
            color:
              filterStatus === 'cho_upload'
                ? '#b45309'
                : 'var(--color-text-secondary)',
            fontSize: '11px',
            fontWeight: filterStatus === 'cho_upload' ? 600 : 500,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            minHeight: '28px'
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#f59e0b',
              flexShrink: 0
            }}
          />
          <span>Chờ tải</span>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              background:
                filterStatus === 'cho_upload' ? '#f59e0b' : 'var(--color-bg-elevated)',
              color: filterStatus === 'cho_upload' ? '#fff' : 'var(--color-text-muted)',
              padding: '0 5px',
              borderRadius: '999px'
            }}
          >
            {pendingCount}
          </span>
        </button>

        <button
          onClick={() => setFilterStatus('dang_upload')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            borderRadius: '999px',
            border:
              filterStatus === 'dang_upload'
                ? '1px solid #0ea5e9'
                : '1px solid var(--color-border)',
            background:
              filterStatus === 'dang_upload' ? 'rgba(14, 165, 233, 0.08)' : 'var(--color-bg-card)',
            color:
              filterStatus === 'dang_upload'
                ? '#0284c7'
                : 'var(--color-text-secondary)',
            fontSize: '11px',
            fontWeight: filterStatus === 'dang_upload' ? 600 : 500,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            minHeight: '28px'
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#0ea5e9',
              flexShrink: 0
            }}
          />
          <span>Đang tải</span>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              background:
                filterStatus === 'dang_upload' ? '#0ea5e9' : 'var(--color-bg-elevated)',
              color: filterStatus === 'dang_upload' ? '#fff' : 'var(--color-text-muted)',
              padding: '0 5px',
              borderRadius: '999px'
            }}
          >
            {uploadingCount}
          </span>
        </button>

        <button
          onClick={() => setFilterStatus('loi')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            borderRadius: '999px',
            border:
              filterStatus === 'loi'
                ? '1px solid #ef4444'
                : '1px solid var(--color-border)',
            background:
              filterStatus === 'loi' ? 'rgba(239, 68, 68, 0.08)' : 'var(--color-bg-card)',
            color:
              filterStatus === 'loi'
                ? '#dc2626'
                : 'var(--color-text-secondary)',
            fontSize: '11px',
            fontWeight: filterStatus === 'loi' ? 600 : 500,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            minHeight: '28px'
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#ef4444',
              flexShrink: 0
            }}
          />
          <span>Lỗi</span>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              background:
                filterStatus === 'loi' ? '#ef4444' : 'var(--color-bg-elevated)',
              color: filterStatus === 'loi' ? '#fff' : 'var(--color-text-muted)',
              padding: '0 5px',
              borderRadius: '999px'
            }}
          >
            {errorCount}
          </span>
        </button>

        <button
          onClick={() => setFilterStatus('da_upload')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            borderRadius: '999px',
            border:
              filterStatus === 'da_upload'
                ? '1px solid #10b981'
                : '1px solid var(--color-border)',
            background:
              filterStatus === 'da_upload' ? 'rgba(16, 185, 129, 0.08)' : 'var(--color-bg-card)',
            color:
              filterStatus === 'da_upload'
                ? '#059669'
                : 'var(--color-text-secondary)',
            fontSize: '11px',
            fontWeight: filterStatus === 'da_upload' ? 600 : 500,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            minHeight: '28px'
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#10b981',
              flexShrink: 0
            }}
          />
          <span>Đã tải</span>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              background:
                filterStatus === 'da_upload' ? '#10b981' : 'var(--color-bg-elevated)',
              color: filterStatus === 'da_upload' ? '#fff' : 'var(--color-text-muted)',
              padding: '0 5px',
              borderRadius: '999px'
            }}
          >
            {completedCount}
          </span>
        </button>
      </div>

      {/* 7. Selection Control Row */}
      {paginatedItems.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '2px 4px',
            fontSize: '12px',
            color: 'var(--color-text-secondary)'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              userSelect: 'none'
            }}
            onClick={handleSelectAllVisible}
          >
            {isAllCurrentPageSelected ? (
              <CheckSquare size={16} color="var(--color-primary-500)" />
            ) : (
              <Square size={16} color="var(--color-text-muted)" />
            )}
            <span style={{ fontSize: '12px' }}>Chọn tất cả trang này ({paginatedItems.length})</span>
          </div>

          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
            {filteredQueue.length} video phù hợp
          </span>
        </div>
      )}

      {/* 8. Queue Items List */}
      {filteredQueue.length === 0 ? (
        queue.length === 0 ? (
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
        )
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
      )}

      {/* 9. Pagination Controls */}
      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            paddingTop: '6px'
          }}
        >
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="queue-pagination__btn"
            aria-label="Trang trước"
          >
            <ChevronLeft size={15} />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
            .reduce<(number | 'dots')[]>((acc, page, idx, arr) => {
              if (idx > 0 && page - (arr[idx - 1] as number) > 1) {
                acc.push('dots');
              }
              acc.push(page);
              return acc;
            }, [])
            .map((item, idx) =>
              item === 'dots' ? (
                <span
                  key={`dots-${idx}`}
                  style={{ color: 'var(--color-text-muted)', fontSize: '11px', padding: '0 2px' }}
                >
                  …
                </span>
              ) : (
                <button
                  key={item}
                  onClick={() => setCurrentPage(item as number)}
                  className={`queue-pagination__btn ${
                    currentPage === item ? 'queue-pagination__btn--active' : ''
                  }`}
                >
                  {item}
                </button>
              )
            )}

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="queue-pagination__btn"
            aria-label="Trang sau"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      )}

      {/* 10. STICKY FLOATING BULK ACTION BAR */}
      {selectedIds.size > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: '72px',
            left: '16px',
            right: '16px',
            maxWidth: '1200px',
            margin: '0 auto',
            zIndex: 45,
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.45)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            backgroundColor: '#0f172a',
            color: '#fff',
            borderRadius: '14px',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            animation: 'fadeInUp 0.2s ease'
          }}
        >
          {/* Selected Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleClearSelection}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '26px',
                height: '26px'
              }}
              title="Bỏ chọn"
            >
              <X size={15} />
            </button>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                Đã chọn {selectedIds.size} video
              </div>
              <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                Tổng dung lượng: {formatBytes(selectedSize)}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleRequestRemoveSelected}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '8px',
                padding: '0 12px',
                height: '36px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Trash2 size={14} />
              <span>Xóa ({selectedIds.size})</span>
            </button>

            <button
              onClick={handleRequestUploadSelected}
              disabled={isSyncing}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '0 14px',
                height: '36px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: isSyncing ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)'
              }}
            >
              <UploadCloud size={14} />
              <span>{isSyncing ? 'Đang tải...' : `Tải lên (${selectedIds.size})`}</span>
            </button>
          </div>
        </div>
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
