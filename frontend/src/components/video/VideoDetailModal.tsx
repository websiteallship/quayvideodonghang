import React, { useState, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CustomVideoPlayer } from '@/components/video/CustomVideoPlayer';
import { showToast } from '@/stores/toast-store';
import { formatDuration, formatBytes, formatDateTimeVN } from '@/utils/format';
import { getCarrierLabel } from '@/utils/detect-carrier';
import type { BienBan } from '@/types';
import {
  PlayCircle,
  Download,
  Copy,
  Check,
  ExternalLink,
  Clock,
  HardDrive,
  Smartphone,
  Laptop,
  Camera,
  User,
  AlertCircle,
  RefreshCw,
  X,
  FileVideo,
  Layers,
  PackageCheck,
  PackageOpen,
  CloudCheck,
  Globe,
  Tag,
  ShieldCheck,
  Timer,
  Loader2,
} from 'lucide-react';

export interface VideoDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: (BienBan & { ten_nhan_vien?: string }) | null;
  viewUrl: string | null;
  streamUrl: string | null;
  isVideoLoading: boolean;
  videoError: string | null;
  onRetry?: () => void;
}

function getCarrierBadgeColor(donViVc: string): string {
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

function getDeviceDisplay(device?: string): { label: string; icon: React.ReactNode } {
  switch (device) {
    case 'mobile':
      return {
        label: 'Điện thoại di động',
        icon: <Smartphone size={14} className="text-sky-500 shrink-0" />,
      };
    case 'pc_webcam':
      return {
        label: 'Webcam USB / Máy để bàn',
        icon: <Camera size={14} className="text-amber-500 shrink-0" />,
      };
    case 'laptop':
      return {
        label: 'Máy tính xách tay (Laptop)',
        icon: <Laptop size={14} className="text-emerald-500 shrink-0" />,
      };
    default:
      return {
        label: 'Thiết bị kho vận',
        icon: <HardDrive size={14} className="text-slate-500 shrink-0" />,
      };
  }
}

function parseBrowserUA(ua?: string): string {
  if (!ua) return 'Không rõ';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS Safari';
  if (ua.includes('Android')) return 'Android Web';
  if (ua.includes('Edg/')) return 'Microsoft Edge';
  if (ua.includes('Chrome/')) return 'Google Chrome';
  if (ua.includes('Firefox/')) return 'Mozilla Firefox';
  if (ua.includes('Safari/')) return 'Apple Safari';
  return 'Trình duyệt Web';
}

function calculateSyncDuration(created?: string | null, uploaded?: string | null): string | null {
  if (!created || !uploaded) return null;
  const start = new Date(created).getTime();
  const end = new Date(uploaded).getTime();
  if (isNaN(start) || isNaN(end) || end < start) return null;
  const diffSec = Math.round((end - start) / 1000);
  if (diffSec < 60) return `${diffSec} giây`;
  const mins = Math.floor(diffSec / 60);
  const secs = diffSec % 60;
  return `${mins} phút ${secs > 0 ? `${secs}s` : ''}`;
}

export const VideoDetailModal: React.FC<VideoDetailModalProps> = ({
  isOpen,
  onClose,
  item,
  viewUrl,
  streamUrl,
  isVideoLoading,
  videoError,
  onRetry,
}) => {
  const [videoMode, setVideoMode] = useState<'native' | 'iframe'>('native');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedDriveId, setCopiedDriveId] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const maVanDon = item?.ma_van_don;
  const driveFileId = item?.drive_file_id;

  // Link to open / copy on Google Drive
  const driveDirectLink = useMemo(() => {
    if (!driveFileId) return viewUrl || null;
    return `https://drive.google.com/file/d/${driveFileId}/view`;
  }, [driveFileId, viewUrl]);

  const handleCopyTrackingCode = useCallback(async () => {
    if (!maVanDon) return;
    try {
      await navigator.clipboard.writeText(maVanDon);
      setCopiedCode(true);
      showToast.success('Đã sao chép mã vận đơn', maVanDon);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      showToast.error('Không thể sao chép mã vận đơn');
    }
  }, [maVanDon]);

  const handleCopyVideoLink = useCallback(async () => {
    const link = driveDirectLink || viewUrl;
    if (!link) {
      showToast.error('Chưa có đường dẫn video để sao chép');
      return;
    }
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(true);
      showToast.success('Đã sao chép liên kết video Drive', link);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      showToast.error('Không thể sao chép liên kết');
    }
  }, [driveDirectLink, viewUrl]);

  const handleCopyDriveId = useCallback(async () => {
    if (!driveFileId) return;
    try {
      await navigator.clipboard.writeText(driveFileId);
      setCopiedDriveId(true);
      showToast.success('Đã sao chép Google Drive File ID', driveFileId);
      setTimeout(() => setCopiedDriveId(false), 2000);
    } catch {
      showToast.error('Không thể sao chép File ID');
    }
  }, [driveFileId]);

  const handleDownloadVideo = useCallback(async () => {
    if (isDownloading || !item) return;

    try {
      setIsDownloading(true);
      showToast.info('Đang bắt đầu tải video xuống...');

      const ext = item.mime_type?.includes('mp4') ? 'mp4' : 'webm';
      const fallbackName = `${item.ma_van_don}_${item.loai_bien_ban}_${item.thoi_luong_video}s.${ext}`;
      const fileName = item.drive_file_name || fallbackName;

      if (streamUrl) {
        // Tải trực tiếp stream qua backend proxy có Range & Token
        const res = await fetch(streamUrl);
        if (!res.ok) throw new Error(`Lỗi kết nối máy chủ (${res.status})`);
        const blob = await res.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = blobUrl;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        window.URL.revokeObjectURL(blobUrl);
        showToast.success('Tải video thành công', fileName);
      } else if (item.drive_file_id) {
        // Fallback tải trực tiếp từ Google Drive export link
        const driveDownloadUrl = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(item.drive_file_id)}`;
        const anchor = document.createElement('a');
        anchor.href = driveDownloadUrl;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        showToast.success('Đang chuyển hướng tải xuống từ Google Drive');
      } else {
        throw new Error('Chưa tìm thấy nguồn tải của video');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Tải video thất bại';
      showToast.error('Không thể tải video', msg);
    } finally {
      setIsDownloading(false);
    }
  }, [isDownloading, item, streamUrl]);

  if (!item) return null;

  const isDongGoi = item.loai_bien_ban === 'dong_goi';
  const syncTime = calculateSyncDuration(item.thoi_gian_tao, item.thoi_gian_upload);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        showCloseButton={false}
        className="w-[96vw] max-w-[96vw] sm:max-w-4xl lg:max-w-5xl p-0 rounded-2xl overflow-hidden border-border bg-card shadow-2xl max-h-[92vh] flex flex-col"
      >
        {/* Modal Header */}
        <DialogHeader className="px-5 py-3.5 border-b border-border flex flex-row items-center justify-between space-y-0 shrink-0 bg-muted/20">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
              <PlayCircle size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-base font-bold text-foreground font-mono tracking-tight truncate">
                  {item.ma_van_don}
                </DialogTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleCopyTrackingCode()}
                  className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer rounded-md"
                  title="Sao chép mã đơn"
                >
                  {copiedCode ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  <span className="text-[11px] ml-1">{copiedCode ? 'Đã chép' : 'Chép mã'}</span>
                </Button>
                <Badge
                  variant="outline"
                  className={getCarrierBadgeColor(item.don_vi_vc)}
                >
                  {getCarrierLabel(item.don_vi_vc)}
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    isDongGoi
                      ? 'bg-blue-500/10 text-blue-600 border-blue-500/25 dark:text-blue-400'
                      : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25 dark:text-emerald-400'
                  }
                >
                  {isDongGoi ? <PackageCheck size={12} className="mr-1 inline" /> : <PackageOpen size={12} className="mr-1 inline" />}
                  {isDongGoi ? 'Đóng gói' : 'Khui hàng'}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 truncate">
                <span>Biên bản ghi hình kho vận</span>
                <span>•</span>
                <span>Thời lượng: {formatDuration(item.thoi_luong_video)}</span>
                <span>•</span>
                <span>Dung lượng: {formatBytes(item.kich_thuoc_bytes)}</span>
              </DialogDescription>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted cursor-pointer transition-colors shrink-0 ml-2"
            aria-label="Đóng cửa sổ"
          >
            <X size={20} />
          </button>
        </DialogHeader>

        {/* Modal Body - 2 Columns on Desktop */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-0">
          {/* Left Column: Video Player & Controls (7 cols) */}
          <div className="lg:col-span-7 p-4 sm:p-5 flex flex-col gap-3.5 bg-black/5 dark:bg-black/25 border-b lg:border-b-0 lg:border-r border-border overflow-y-auto">
            {/* Video Container Box */}
            <div className="w-full aspect-video bg-black rounded-xl overflow-hidden relative shadow-md border border-black/20 dark:border-white/10 flex items-center justify-center">
              {isVideoLoading && (
                <div className="flex flex-col items-center gap-3 text-center p-4">
                  <RefreshCw size={28} className="text-amber-500 animate-spin" />
                  <p className="text-white/80 text-xs font-medium">Đang tải video bảo mật từ Google Drive...</p>
                </div>
              )}

              {videoError && (
                <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
                  <AlertCircle size={32} className="text-rose-400" />
                  <p className="text-white/80 text-xs sm:text-sm font-medium max-w-xs">{videoError}</p>
                  <div className="flex items-center gap-2">
                    {onRetry && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onRetry}
                        className="h-8 text-xs bg-white/10 text-white hover:bg-white/20 border-white/20 cursor-pointer"
                      >
                        <RefreshCw size={13} className="mr-1.5" />
                        Thử lại
                      </Button>
                    )}
                    {driveDirectLink && (
                      <a
                        href={driveDirectLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-8 px-3 rounded-lg inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold"
                      >
                        <ExternalLink size={13} />
                        Mở Drive
                      </a>
                    )}
                  </div>
                </div>
              )}

              {!isVideoLoading && !videoError && streamUrl && (
                <>
                  {videoMode === 'native' ? (
                    <CustomVideoPlayer
                      src={streamUrl}
                      expectedDuration={item.thoi_luong_video}
                      title={`${item.ma_van_don} | ${formatDateTimeVN(item.thoi_gian_tao)}`}
                      onError={() => {
                        setVideoMode('iframe');
                      }}
                    />
                  ) : viewUrl ? (
                    <>
                      <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-xs text-[11px] font-mono text-white/90 z-10 pointer-events-none select-none">
                        {item.ma_van_don} | {formatDateTimeVN(item.thoi_gian_tao)}
                      </div>
                      <iframe
                        src={viewUrl}
                        className="w-full h-full border-0"
                        allow="autoplay; encrypted-media"
                        allowFullScreen
                        title={`Video xem lại ${item.ma_van_don}`}
                      />
                    </>
                  ) : null}
                </>
              )}

              {!isVideoLoading && !videoError && !streamUrl && viewUrl && (
                <>
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-xs text-[11px] font-mono text-white/90 z-10 pointer-events-none select-none">
                    {item.ma_van_don} | {formatDateTimeVN(item.thoi_gian_tao)}
                  </div>
                  <iframe
                    src={viewUrl}
                    className="w-full h-full border-0"
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                    title={`Video xem lại ${item.ma_van_don}`}
                  />
                </>
              )}
            </div>

            {/* Video Mode Tabs & Quick Player Switch */}
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
              <Tabs
                value={videoMode}
                onValueChange={(val) => setVideoMode(val as 'native' | 'iframe')}
                className="w-auto"
              >
                <TabsList className="h-8 bg-muted/60 p-0.5 rounded-lg border border-border">
                  <TabsTrigger
                    value="native"
                    className="h-7 px-3 text-xs font-medium cursor-pointer data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
                  >
                    <PlayCircle size={13} className="mr-1.5 text-amber-500" />
                    Trình phát gốc
                  </TabsTrigger>
                  <TabsTrigger
                    value="iframe"
                    disabled={!viewUrl}
                    className="h-7 px-3 text-xs font-medium cursor-pointer data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs disabled:opacity-50"
                  >
                    <Globe size={13} className="mr-1.5 text-blue-500" />
                    Google Drive Viewer
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {item.drive_file_id && (
                <span className="text-[11px] text-muted-foreground font-mono truncate max-w-[200px]" title={item.drive_file_id}>
                  Drive ID: {item.drive_file_id.slice(0, 10)}...
                </span>
              )}
            </div>

            {/* Action Buttons Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <Button
                variant="default"
                size="sm"
                onClick={() => void handleDownloadVideo()}
                disabled={isDownloading}
                className="h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer inline-flex items-center justify-center gap-2"
              >
                {isDownloading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Đang tải...</span>
                  </>
                ) : (
                  <>
                    <Download size={15} />
                    <span>Tải video về</span>
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleCopyVideoLink()}
                className="h-10 rounded-xl border-border bg-card hover:bg-muted text-foreground font-semibold text-xs cursor-pointer inline-flex items-center justify-center gap-2"
              >
                {copiedLink ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
                <span>{copiedLink ? 'Đã sao chép link' : 'Sao chép link'}</span>
              </Button>

              {driveDirectLink && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="h-10 rounded-xl border-border bg-card hover:bg-muted text-foreground font-semibold text-xs cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  <a href={driveDirectLink} target="_blank" rel="noopener noreferrer">
                    <ExternalLink size={15} />
                    <span>Mở trên Drive</span>
                  </a>
                </Button>
              )}
            </div>
          </div>

          {/* Right Column: Detailed Info & Metadata (5 cols) */}
          <div className="lg:col-span-5 flex flex-col min-h-0 bg-card">
            <ScrollArea className="flex-1 p-4 sm:p-5">
              <div className="flex flex-col gap-4">
                {/* Section 1: Thông tin vận đơn */}
                <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                      <Tag size={14} className="text-amber-500" />
                      <span>Thông tin đơn hàng</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/25">
                      <CloudCheck size={11} className="mr-1 inline" />
                      ĐÃ LƯU DRIVE
                    </Badge>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Mã vận đơn:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-foreground">{item.ma_van_don}</span>
                        <button
                          type="button"
                          onClick={() => void handleCopyTrackingCode()}
                          className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Sao chép mã"
                        >
                          {copiedCode ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Đơn vị vận chuyển:</span>
                      <span className="font-semibold text-foreground">{getCarrierLabel(item.don_vi_vc)}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Loại quy trình:</span>
                      <span className="font-semibold text-foreground">
                        {isDongGoi ? 'Đóng gói đơn hàng gửi đi' : 'Khui hàng hoàn / kiểm tra'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section 2: Mốc thời gian */}
                <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <Clock size={14} className="text-sky-500" />
                    <span>Mốc thời gian ghi hình & tải lên</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Thời gian tạo (quay):</span>
                      <span className="font-mono font-medium text-foreground">
                        {formatDateTimeVN(item.thoi_gian_tao)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Thời gian tải lên Drive:</span>
                      <span className="font-mono font-medium text-foreground">
                        {item.thoi_gian_upload ? formatDateTimeVN(item.thoi_gian_upload) : '—'}
                      </span>
                    </div>

                    {syncTime && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Timer size={12} />
                          Thời gian đồng bộ:
                        </span>
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                          {syncTime}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 3: Thông số video */}
                <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <FileVideo size={14} className="text-indigo-500" />
                    <span>Thông số kỹ thuật video</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-card border border-border/60">
                      <span className="text-[10px] text-muted-foreground block">Thời lượng video</span>
                      <span className="font-mono font-bold text-foreground text-sm">
                        {formatDuration(item.thoi_luong_video)}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-card border border-border/60">
                      <span className="text-[10px] text-muted-foreground block">Dung lượng tệp</span>
                      <span className="font-mono font-bold text-foreground text-sm">
                        {formatBytes(item.kich_thuoc_bytes)}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-card border border-border/60">
                      <span className="text-[10px] text-muted-foreground block">Định dạng file</span>
                      <span className="font-mono font-semibold text-foreground text-xs truncate block" title={item.mime_type}>
                        {item.mime_type || 'video/webm'}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-card border border-border/60">
                      <span className="text-[10px] text-muted-foreground block">Thiết bị ghi</span>
                      <div className="flex items-center gap-1 text-xs font-semibold text-foreground mt-0.5">
                        {getDeviceDisplay(item.thiet_bi).icon}
                        <span className="truncate">{getDeviceDisplay(item.thiet_bi).label}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 4: Nhân sự & Lưu trữ Cloud */}
                <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <ShieldCheck size={14} className="text-emerald-500" />
                    <span>Nhân sự & Lưu trữ Drive</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <User size={12} />
                        Nhân viên thực hiện:
                      </span>
                      <span className="font-semibold text-foreground">
                        {item.ten_nhan_vien ? `${item.ten_nhan_vien} (${item.ma_nhan_vien})` : item.ma_nhan_vien}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Môi trường ghi hình:</span>
                      <span className="text-foreground font-medium">
                        {parseBrowserUA(item.user_agent)}
                      </span>
                    </div>

                    {item.drive_file_name && (
                      <div className="flex flex-col gap-0.5 pt-1">
                        <span className="text-[11px] text-muted-foreground">Tên tệp Google Drive:</span>
                        <span className="font-mono text-[11px] text-foreground bg-card p-1.5 rounded border border-border/60 break-all select-all">
                          {item.drive_file_name}
                        </span>
                      </div>
                    )}

                    {item.drive_file_id && (
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-muted-foreground">Google Drive File ID:</span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-[11px] text-muted-foreground truncate max-w-[120px]">
                            {item.drive_file_id}
                          </span>
                          <button
                            type="button"
                            onClick={() => void handleCopyDriveId()}
                            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground cursor-pointer"
                            title="Sao chép ID Drive"
                          >
                            {copiedDriveId ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* Modal Footer actions */}
            <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <Layers size={13} />
                <span className="text-[11px]">ID: {item.id.slice(0, 8)}...</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="h-9 px-5 rounded-xl border-border bg-card hover:bg-muted text-foreground text-xs font-bold cursor-pointer"
              >
                Đóng
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
