import React from 'react';
import {
  BookOpen,
  Sparkles,
  Building2,
  ScanLine,
  Video,
  ShieldCheck,
  Zap,
  Keyboard,
  AlertTriangle,
  WifiOff,
  Camera,
  CheckCircle2,
  Barcode,
  Layers,
  MonitorCheck,
  ArrowRight,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOnboardingStore, type GuideTab } from '@/stores/onboarding-store';
import { useConfigStore } from '@/stores/config-store';

export const UserGuideModal: React.FC = () => {
  const {
    isGuideModalOpen,
    activeTab,
    closeGuideModal,
    setHasSeenGuide,
    setActiveTab,
  } = useOnboardingStore();

  const { warehouseName } = useConfigStore();

  const handleFinishOnboarding = () => {
    setHasSeenGuide(true);
    closeGuideModal();
  };

  return (
    <Dialog open={isGuideModalOpen} onOpenChange={(open) => !open && closeGuideModal()}>
      <DialogContent className="max-w-4xl lg:max-w-5xl w-[94vw] md:w-[90vw] max-h-[90vh] p-4 sm:p-6 md:p-7 rounded-3xl bg-card border-border shadow-2xl flex flex-col gap-4 sm:gap-5 overflow-hidden">
        {/* Modal Header */}
        <DialogHeader className="text-left space-y-1.5 shrink-0 pr-8">
          <div className="flex items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="size-10 sm:size-11 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-2xs">
                <BookOpen size={22} className="stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-base sm:text-xl font-bold text-foreground tracking-tight">
                    Hướng Dẫn Thao Tác Kho Vận (SOP)
                  </DialogTitle>
                  <Badge variant="outline" className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                    Quy trình chuẩn
                  </Badge>
                </div>
                <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Quy trình quét mã, quay video đóng/khui hàng chuẩn xác và xử lý sự cố nhanh tại trạm
                </DialogDescription>
              </div>
            </div>

            {/* Warehouse pill on desktop */}
            {warehouseName && (
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/60 border border-border text-xs text-muted-foreground shrink-0">
                <Building2 size={15} className="text-primary shrink-0" />
                <span className="font-semibold text-foreground truncate max-w-[180px]">{warehouseName}</span>
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Current Station Info Banner (Mobile / Tablet) */}
        <div className="flex lg:hidden items-center justify-between px-3.5 py-2 rounded-xl bg-muted/40 border border-border/70 text-xs shrink-0">
          <div className="flex items-center gap-2 text-muted-foreground min-w-0">
            <Building2 size={15} className="text-primary shrink-0" />
            <span>Trạm kho:</span>
            <strong className="text-foreground font-semibold truncate">
              {warehouseName || 'Chưa gán kho mặc định'}
            </strong>
          </div>
          <span className="text-[11px] text-muted-foreground hidden sm:inline shrink-0">
            Tự động Watermark thời gian thực
          </span>
        </div>

        {/* Tabs Control */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as GuideTab)}
          className="flex-1 flex flex-col min-h-0"
        >
          <TabsList className="grid grid-cols-3 h-11 w-full rounded-2xl bg-muted/70 p-1 shrink-0">
            <TabsTrigger
              value="steps"
              className="rounded-xl text-xs sm:text-sm font-bold gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
            >
              <Sparkles size={15} className="text-amber-500 shrink-0" />
              <span>4 Bước nhanh</span>
            </TabsTrigger>
            <TabsTrigger
              value="shortcuts"
              className="rounded-xl text-xs sm:text-sm font-bold gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
            >
              <Keyboard size={15} className="text-blue-500 shrink-0" />
              <span>Phím tắt & Mẹo</span>
            </TabsTrigger>
            <TabsTrigger
              value="faq"
              className="rounded-xl text-xs sm:text-sm font-bold gap-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
            >
              <AlertTriangle size={15} className="text-rose-500 shrink-0" />
              <span>Xử lý sự cố</span>
            </TabsTrigger>
          </TabsList>

          {/* ════ Tab 1: 4 Bước Thao Tác Chuẩn (2x2 Grid trên PC) ════ */}
          <TabsContent value="steps" className="flex-1 overflow-y-auto pr-1 mt-3 space-y-3.5 focus-visible:outline-none">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Step 1 */}
              <div className="flex items-start gap-3.5 p-4 rounded-2xl border border-border/80 bg-card hover:bg-muted/30 transition-colors shadow-2xs">
                <div className="size-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-black text-sm shrink-0 mt-0.5">
                  1
                </div>
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-foreground">
                      Chọn Kho & Thiết bị ghi hình
                    </h4>
                    <Badge variant="secondary" className="text-[10px] font-semibold">Bắt buộc</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Kiểm tra góc trên để đảm bảo đúng kho làm việc. Nếu dùng máy tính, chọn đúng Webcam USB góc rộng; nếu dùng điện thoại, chọn Camera sau góc rộng.
                  </p>
                  <div className="flex items-center gap-1 text-[11px] text-primary/80 font-medium pt-0.5">
                    <MonitorCheck size={13} />
                    <span>Cấu hình 1 lần — Tự lưu cho các ca sau</span>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3.5 p-4 rounded-2xl border border-border/80 bg-card hover:bg-muted/30 transition-colors shadow-2xs">
                <div className="size-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-sm shrink-0 mt-0.5">
                  2
                </div>
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-foreground">
                      Quét Mã Vận Đơn trên phiếu gửi
                    </h4>
                    <Barcode size={16} className="text-amber-500 shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Dùng súng quét barcode bắn vào mã vạch trên phiếu gửi hàng (hoặc camera). Hệ thống tự động nhận diện đơn vị vận chuyển, kiểm tra chống quét trùng.
                  </p>
                  <div className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium pt-0.5">
                    <Zap size={13} />
                    <span>Bật Auto-Scan: Quét mã là tự quay ngay</span>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3.5 p-4 rounded-2xl border border-border/80 bg-card hover:bg-muted/30 transition-colors shadow-2xs">
                <div className="size-8 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center font-black text-sm shrink-0 mt-0.5">
                  3
                </div>
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-foreground">
                      Ghi hình Đóng gói / Khui hàng
                    </h4>
                    <Video size={16} className="text-rose-500 shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong>Giơ rõ tem mã vận đơn và sản phẩm</strong> 1 - 2 giây đầu trước ống kính camera. Sau đó tiến hành đóng thùng, dán băng keo niêm phong cẩn thận.
                  </p>
                  <div className="flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400 font-medium pt-0.5">
                    <Sparkles size={13} />
                    <span>Watermark thời gian thực tự động chèn vào video</span>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex items-start gap-3.5 p-4 rounded-2xl border border-border/80 bg-card hover:bg-muted/30 transition-colors shadow-2xs">
                <div className="size-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-sm shrink-0 mt-0.5">
                  4
                </div>
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-foreground">
                      Hoàn thành & Tự động Tải lên
                    </h4>
                    <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Bấm nút <strong>Hoàn thành</strong> (hoặc bấm súng quét mã đơn tiếp theo). Video tự động đẩy vào hàng đợi và tải lên Google Drive ở chế độ nền.
                  </p>
                  <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium pt-0.5">
                    <CheckCircle2 size={13} />
                    <span>Hỗ trợ Offline: Mất mạng video vẫn lưu an toàn</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ════ Tab 2: Phím tắt & Tốc độ cao ════ */}
          <TabsContent value="shortcuts" className="flex-1 overflow-y-auto pr-1 mt-3 space-y-3.5 focus-visible:outline-none">
            <div className="p-4 rounded-2xl border border-blue-500/20 bg-blue-500/5 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-blue-600 dark:text-blue-400">
                <Zap size={18} />
                <span>Chế độ Quay Liên Tục Tốc Độ Cao (Continuous Barcode Scan)</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Khi đang quay đơn hiện tại, nhân viên chỉ cần <strong>cầm súng bắn mã của kiện hàng tiếp theo</strong>: hệ thống sẽ tự động chốt đóng gói video đơn cũ, đưa vào hàng đợi tải lên và lập tức bắt đầu quay đơn mới mà không cần chạm tay vào chuột.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border border-border/80 bg-card flex flex-col gap-1.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground text-xs">Bắt đầu / Dừng quay</span>
                  <Badge variant="outline" className="font-mono text-[10px] bg-muted px-2 py-0.5">Space</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Nhấn phím Cách (Spacebar) để chuyển đổi nhanh trạng thái ghi hình tại bàn làm việc.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-border/80 bg-card flex flex-col gap-1.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground text-xs">Súng quét barcode tự động</span>
                  <Badge variant="outline" className="font-mono text-[10px] bg-muted px-2 py-0.5">Auto-Focus</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Súng quét tự động bắt mã vạch dù con trỏ chuột đang ở bất kỳ đâu trên màn hình.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-border/80 bg-card flex flex-col gap-1.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground text-xs">Chuyển Đóng / Khui hàng</span>
                  <Badge variant="outline" className="font-mono text-[10px] bg-muted px-2 py-0.5">Nút đầu trang</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Chọn đúng tab Đóng gói hoặc Khui hàng để gắn nhãn phân loại video lưu trữ chính xác.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-border/80 bg-card flex flex-col gap-1.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground text-xs">Chống tắt máy khi quay</span>
                  <Badge variant="outline" className="font-mono text-[10px] text-emerald-600 bg-emerald-500/10 px-2 py-0.5">WakeLock</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Màn hình và camera luôn giữ hoạt động liên tục trong suốt thời gian đóng hàng.
                </p>
              </div>
            </div>
          </TabsContent>

          {/* ════ Tab 3: Xử Lý Sự Cố Kho (FAQ) ════ */}
          <TabsContent value="faq" className="flex-1 overflow-y-auto pr-1 mt-3 space-y-3.5 focus-visible:outline-none">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-2 shadow-2xs">
                <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-foreground">
                  <WifiOff size={16} className="text-amber-500 shrink-0" />
                  <span>Mất mạng / Mạng kho chập chờn?</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <strong>Vẫn tiếp tục đóng hàng bình thường</strong>. Toàn bộ video được lưu trữ an toàn trong bộ nhớ nội bộ của máy (<code className="font-mono text-[11px] bg-muted px-1 rounded">IndexedDB</code>). Khi có mạng trở lại, hệ thống sẽ tự động đồng bộ lên Google Drive.
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-2 shadow-2xs">
                <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-foreground">
                  <ScanLine size={16} className="text-rose-500 shrink-0" />
                  <span>Súng quét không nhận hoặc nhảy chữ lạ?</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  1. Tắt bộ gõ tiếng Việt (Unikey/EVKey) sang chế độ <strong>tiếng Anh [E]</strong>.<br/>
                  2. Rút đầu cắm cáp USB súng quét ra và cắm lại thật chặt.<br/>
                  3. Kiểm tra tem mã vận đơn có bị rách, ướt hoặc mờ hay không.
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-2 shadow-2xs">
                <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-foreground">
                  <Camera size={16} className="text-blue-500 shrink-0" />
                  <span>Màn hình camera bị đen / Báo lỗi?</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  1. Bấm vào biểu tượng ổ khóa cạnh thanh địa chỉ trình duyệt, chọn <strong>Cho phép Camera (Allow)</strong>.<br/>
                  2. Đóng các phần mềm khác đang dùng camera (Zalo, Zoom, Teams).<br/>
                  3. Nhấn phím <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">F5</kbd> để tải lại trang.
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-2 shadow-2xs">
                <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-foreground">
                  <Layers size={16} className="text-amber-500 shrink-0" />
                  <span>Hệ thống báo "Mã đã được quay"?</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Đơn hàng này đã có video trước đó trong hệ thống. Hãy kiểm tra thông tin hiển thị trên cảnh báo để tránh đóng gói trùng kiện hàng của đồng nghiệp cùng ca.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Modal Footer Controls */}
        <div className="pt-2 border-t border-border/70 flex items-center justify-between gap-3 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={closeGuideModal}
            className="text-xs text-muted-foreground hover:text-foreground h-11 px-4 rounded-xl cursor-pointer"
          >
            Đóng
          </Button>

          <Button
            type="button"
            onClick={handleFinishOnboarding}
            className="h-11 px-6 rounded-2xl text-xs sm:text-sm font-bold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer shadow-md min-w-[160px]"
          >
            <CheckCircle2 size={16} />
            <span>Đã hiểu, bắt đầu làm việc</span>
            <ArrowRight size={15} className="hidden sm:inline" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
