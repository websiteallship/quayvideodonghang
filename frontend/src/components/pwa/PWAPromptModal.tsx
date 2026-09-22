import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Download,
  Share2,
  PlusSquare,
  Monitor,
  Smartphone,
  CheckCircle2,
  Zap,
  ShieldCheck,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usePWAInstall, type PWAInstallPlatform, isPWAPromptDismissed, dismissPWAPrompt, neverShowPWAPromptAgain } from '@/hooks/usePWAInstall';
import { useAuthStore } from '@/stores/auth-store';
import { useOnboardingStore } from '@/stores/onboarding-store';

export const PWAPromptModal: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const { isInstalled, hasNativePrompt, platform, triggerInstall } = usePWAInstall();
  const { hasSeenGuide, isGuideModalOpen } = useOnboardingStore();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<PWAInstallPlatform>(platform);
  const [neverShow, setNeverShow] = useState(false);

  useEffect(() => {
    setSelectedTab(platform);
  }, [platform]);

  useEffect(() => {
    // Tránh xung đột: Chỉ kích hoạt khi đã đăng nhập, KHÔNG chạy PWA, chưa dismiss, và đã hoàn tất Onboarding
    if (!isAuthenticated || isInstalled || isPWAPromptDismissed() || !hasSeenGuide || isGuideModalOpen) {
      return;
    }

    // Delay 1.5 giây sau khi xem xong hướng dẫn để trải nghiệm mượt mà
    const timer = setTimeout(() => {
      if (!isPWAPromptDismissed() && !useOnboardingStore.getState().isGuideModalOpen) {
        setIsOpen(true);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [isAuthenticated, isInstalled, hasSeenGuide, isGuideModalOpen]);

  // Đang chạy trong PWA standalone -> không hiển thị gì
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (hasNativePrompt) {
      const res = await triggerInstall();
      if (res === 'prompted') {
        setIsOpen(false);
        return;
      }
    }
    // Nếu iOS hoặc không có native prompt, giữ modal mở ở tab hướng dẫn tương ứng
    setSelectedTab(platform === 'ios' ? 'ios' : 'desktop');
  };

  const handleDismiss = () => {
    if (neverShow) {
      neverShowPWAPromptAgain();
    } else {
      dismissPWAPrompt(7); // Nhắc lại sau 7 ngày
    }
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent className="max-w-md w-[92vw] p-5 sm:p-6 rounded-2xl bg-card border-border shadow-2xl">
        <DialogHeader className="text-left space-y-2">
          <div className="flex items-center gap-2.5 pr-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                Trải nghiệm App mượt mà hơn
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Cài đặt PWA để sử dụng đầy đủ tính năng kho vận chuyên nghiệp
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Highlight benefits */}
        <div className="space-y-2.5 my-2">
          <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-muted/40 border border-border/70 text-xs">
            <Zap className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <strong className="text-foreground font-semibold">Khung hình chuẩn & Toàn màn hình</strong>
              <p className="text-muted-foreground text-[11px] mt-0.5">Không bị thanh URL trình duyệt che khuất màn hình quay video.</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-muted/40 border border-border/70 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <strong className="text-foreground font-semibold">Mở 1 chạm & Chống mất dữ liệu</strong>
              <p className="text-muted-foreground text-[11px] mt-0.5">Mở trực tiếp từ Màn hình chính, video lưu an toàn cả khi mạng yếu.</p>
            </div>
          </div>
        </div>

        {/* Platform switcher tab */}
        <div className="flex rounded-xl bg-muted/70 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setSelectedTab('desktop')}
            className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
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
            className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              selectedTab === 'ios'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>iOS Safari</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedTab('android')}
            className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              selectedTab === 'android'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Android</span>
          </button>
        </div>

        {/* Platform specific instruction */}
        <div className="bg-muted/30 border border-border/60 rounded-xl p-3 text-xs space-y-2">
          {selectedTab === 'ios' && (
            <ol className="space-y-1.5 list-decimal list-inside text-muted-foreground">
              <li>Mở trang này bằng trình duyệt <strong className="text-foreground">Safari</strong>.</li>
              <li className="flex items-center gap-1 flex-wrap">
                Bấm nút Chia sẻ <Share2 className="w-3.5 h-3.5 inline text-sky-500 mx-0.5" /> trên thanh điều hướng Safari.
              </li>
              <li className="flex items-center gap-1 flex-wrap">
                Chọn <strong className="text-foreground">Thêm vào MH chính</strong> <PlusSquare className="w-3.5 h-3.5 inline text-emerald-500 mx-0.5" />.
              </li>
              <li>Bấm <strong className="text-foreground">Thêm</strong> ở góc trên bên phải để hoàn tất.</li>
            </ol>
          )}

          {selectedTab === 'android' && (
            <div className="space-y-2">
              <p className="text-muted-foreground">
                Bấm nút bên dưới để cài đặt ứng dụng trực tiếp, hoặc bấm biểu tượng <strong>Ba chấm (⋮)</strong> trên Chrome → <strong>Cài đặt ứng dụng</strong>.
              </p>
              {hasNativePrompt && (
                <Button
                  onClick={handleInstallClick}
                  className="w-full h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5 cursor-pointer"
                >
                  <Download size={14} />
                  Cài đặt ngay lên điện thoại
                </Button>
              )}
            </div>
          )}

          {selectedTab === 'desktop' && (
            <div className="space-y-2">
              <p className="text-muted-foreground">
                Cài đặt trên máy tính (Chrome/Edge) để mở trong cửa sổ riêng biệt như phần mềm máy tính:
              </p>
              {hasNativePrompt ? (
                <Button
                  onClick={handleInstallClick}
                  className="w-full h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5 cursor-pointer"
                >
                  <Download size={14} />
                  Cài đặt ngay lên máy tính
                </Button>
              ) : (
                <p className="text-[11px] text-muted-foreground/80 italic">
                  * Bấm biểu tượng Cài đặt trên thanh địa chỉ trình duyệt (góc phải cạnh dấu sao bookmark) để cài đặt.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="pt-2 flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground select-none">
              <input
                type="checkbox"
                checked={neverShow}
                onChange={(e) => setNeverShow(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary size-3.5"
              />
              <span className="text-[11px]">Không nhắc lại trên trình duyệt này</span>
            </label>

            <button
              type="button"
              onClick={handleDismiss}
              className="text-[11px] text-muted-foreground hover:text-foreground underline cursor-pointer"
            >
              Để sau (7 ngày)
            </button>
          </div>

          <Button
            onClick={handleDismiss}
            variant="outline"
            className="w-full h-9 rounded-xl text-xs font-semibold cursor-pointer"
          >
            <CheckCircle2 size={14} className="mr-1.5 text-emerald-500" />
            Đã hiểu, tiếp tục làm việc
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
