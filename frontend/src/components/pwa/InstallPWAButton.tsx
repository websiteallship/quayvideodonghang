import React, { useState } from 'react';
import { 
  Download, 
  Share2, 
  PlusSquare, 
  Monitor, 
  Smartphone, 
  CheckCircle2, 
  Sparkles 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall, PWAInstallPlatform } from '@/hooks/usePWAInstall';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export const InstallPWAButton: React.FC = () => {
  const { isInstalled, hasNativePrompt, platform, triggerInstall } = usePWAInstall();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<PWAInstallPlatform>(platform);

  // Sync tab when platform changes
  React.useEffect(() => {
    setSelectedTab(platform);
  }, [platform]);

  // If already running in installed standalone app, do not show install button
  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (hasNativePrompt) {
      const result = await triggerInstall();
      if (result === 'manual') {
        setIsDialogOpen(true);
      }
    } else {
      setIsDialogOpen(true);
    }
  };

  return (
    <>
      <Button
        onClick={handleClick}
        variant="outline"
        size="sm"
        title="Cài đặt ứng dụng ra màn hình chính (Desktop & Mobile)"
        aria-label="Cài đặt ứng dụng"
        className="flex items-center gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3 text-xs font-semibold rounded-full border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-800 dark:hover:text-emerald-200 transition-colors shadow-2xs cursor-pointer"
      >
        <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400 stroke-[2.2]" />
        <span className="inline">Cài đặt App</span>
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md w-[92vw] p-5 sm:p-6 rounded-2xl bg-card border-border shadow-2xl">
          <DialogHeader className="text-left space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                  Cài đặt ứng dụng Kho
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Sử dụng như ứng dụng native, quay video mượt mà và hoạt động offline.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Platform Switcher */}
          <div className="flex rounded-xl bg-muted/70 p-1 mt-2 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setSelectedTab('desktop')}
              className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                selectedTab === 'desktop'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Máy tính</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedTab('ios')}
              className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                selectedTab === 'ios'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>iPhone/iPad</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedTab('android')}
              className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                selectedTab === 'android'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Android</span>
            </button>
          </div>

          {/* Instructions by Platform */}
          <div className="mt-4 space-y-3">
            {selectedTab === 'desktop' && (
              <div className="space-y-2.5 text-xs text-foreground bg-muted/30 p-3.5 rounded-xl border border-border/60">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                  <span>Nhấp vào biểu tượng <strong>Cài đặt</strong> (icon tải xuống ⊕) ở <strong>thanh địa chỉ URL</strong> trên Chrome, Edge hoặc Cốc Cốc.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                  <span>Hoặc bấm menu <strong>⋮</strong> &gt; chọn <strong>Cài đặt Quay Video Đóng Hàng...</strong></span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                  <span>Biểu tượng sẽ xuất hiện ngay trên Desktop và thanh Taskbar để mở nhanh.</span>
                </div>
              </div>
            )}

            {selectedTab === 'ios' && (
              <div className="space-y-2.5 text-xs text-foreground bg-muted/30 p-3.5 rounded-xl border border-border/60">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                  <span>Mở trang bằng trình duyệt <strong>Safari</strong> trên iOS.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                  <span>Bấm nút <strong>Chia sẻ</strong> <Share2 className="w-3.5 h-3.5 inline mx-0.5 text-primary" /> ở thanh công cụ dưới cùng Safari.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                  <span>Cuộn xuống và chọn <strong>Thêm vào MH chính</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-emerald-500" /> (Add to Home Screen).</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">4</span>
                  <span>Bấm <strong>Thêm</strong> (Add) góc phải trên để hoàn tất.</span>
                </div>
              </div>
            )}

            {selectedTab === 'android' && (
              <div className="space-y-2.5 text-xs text-foreground bg-muted/30 p-3.5 rounded-xl border border-border/60">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                  <span>Mở trình duyệt <strong>Chrome</strong> trên điện thoại Android.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                  <span>Bấm nút menu <strong>⋮</strong> ở góc trên bên phải màn hình.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                  <span>Chọn <strong>Cài đặt ứng dụng</strong> hoặc <strong>Thêm vào màn hình chính</strong>.</span>
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 flex justify-end">
            <Button 
              onClick={() => setIsDialogOpen(false)}
              className="w-full sm:w-auto h-9 text-xs font-semibold rounded-xl"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Đã hiểu
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
export default InstallPWAButton;
