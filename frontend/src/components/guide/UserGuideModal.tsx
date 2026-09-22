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
      <DialogContent className="max-w-2xl w-[94vw] max-h-[90vh] p-4 sm:p-6 rounded-3xl bg-card border-border shadow-2xl flex flex-col gap-4 overflow-hidden">
        {/* Modal Header */}
        <DialogHeader className="text-left space-y-1.5 shrink-0 pr-6">
          <div className="flex items-center gap-2.5">
            <div className="size-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <BookOpen size={20} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                  Hướng Dẫn Thao Tác Kho Vận
                </DialogTitle>
                <Badge variant="outline" className="hidden sm:inline-flex text-[10px] border-amber-500/30 text-amber-600 dark:text-amber-400 font-semibold">
                  Dành cho Nhân viên
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                Quy trình quét mã, quay video đóng/khui hàng chuẩn xác và xử lý sự cố nhanh
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Current Station Info Banner */}
        <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-muted/40 border border-border/70 text-xs shrink-0">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Building2 size={15} className="text-primary shrink-0" />
            <span>Trạm kho hiện tại:</span>
            <strong className="text-foreground font-semibold">
              {warehouseName || 'Chưa gán kho mặc định'}
            </strong>
          </div>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            Hệ thống tự động kích hoạt Watermark
          </span>
        </div>

        {/* Tabs Control */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as GuideTab)}
          className="flex-1 flex flex-col min-h-0"
        >
          <TabsList className="grid grid-cols-3 h-10 w-full rounded-xl bg-muted/70 p-1 shrink-0">
            <TabsTrigger
              value="steps"
              className="rounded-lg text-xs font-semibold gap-1.5 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <Sparkles size={14} className="text-amber-500 shrink-0" />
              <span>4 Bước nhanh</span>
            </TabsTrigger>
            <TabsTrigger
              value="shortcuts"
              className="rounded-lg text-xs font-semibold gap-1.5 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <Keyboard size={14} className="text-blue-500 shrink-0" />
              <span>Phím tắt & Mẹo</span>
            </TabsTrigger>
            <TabsTrigger
              value="faq"
              className="rounded-lg text-xs font-semibold gap-1.5 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <AlertTriangle size={14} className="text-rose-500 shrink-0" />
              <span>Xử lý sự cố</span>
            </TabsTrigger>
          </TabsList>

          {/* ════ Tab 1: 4 Bước Thao Tác Chuẩn ════ */}
          <TabsContent value="steps" className="flex-1 overflow-y-auto pr-1 mt-3 space-y-3 focus-visible:outline-none">
            {/* Step 1 */}
            <div className="flex items-start gap-3 p-3.5 rounded-2xl border border-border/80 bg-muted/20">
              <div className="size-7 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                1
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-bold text-foreground">
                    Chọn đúng Kho & Thiết bị ghi hình
                  </h4>
                  <Badge variant="secondary" className="text-[10px] font-medium">Bắt buộc</Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Kiểm tra thanh tiêu đề để đảm bảo đúng kho đang làm việc. Nếu dùng máy tính, chọn đúng Webcam USB góc quay rộng; nếu dùng điện thoại, chọn Camera sau góc rộng.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3 p-3.5 rounded-2xl border border-border/80 bg-muted/20">
              <div className="size-7 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                2
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-bold text-foreground">
                    Quét Mã Vận Đơn trên phiếu gửi
                  </h4>
                  <Barcode size={15} className="text-amber-500" />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Cầm súng quét barcode bắn vào mã vạch trên phiếu gửi hàng (hoặc dùng camera quét). Hệ thống tự động nhận mã, kiểm tra chống trùng và tự động khởi động quay nếu bật tính năng <strong>Auto-Scan</strong>.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3 p-3.5 rounded-2xl border border-border/80 bg-muted/20">
              <div className="size-7 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                3
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-bold text-foreground">
                    Ghi hình quy trình Đóng gói / Khui hàng
                  </h4>
                  <Video size={15} className="text-rose-500" />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <strong>Giơ rõ tem mã vận đơn và sản phẩm</strong> trong 1 - 2 giây đầu trước ống kính. Sau đó đóng thùng, dán băng keo niêm phong và dán tem vận chuyển.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex items-start gap-3 p-3.5 rounded-2xl border border-border/80 bg-muted/20">
              <div className="size-7 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                4
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-bold text-foreground">
                    Bấm Kết thúc & Tự động tải lên
                  </h4>
                  <ShieldCheck size={15} className="text-emerald-500" />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Bấm nút <strong>Hoàn thành</strong> (hoặc bấm súng quét mã đơn tiếp theo). Video tự động chèn Watermark thời gian thực và đẩy vào hàng đợi tải lên Google Drive.
                </p>
              </div>
            </div>
          </TabsContent>

          {/* ════ Tab 2: Phím tắt & Tốc độ cao ════ */}
          <TabsContent value="shortcuts" className="flex-1 overflow-y-auto pr-1 mt-3 space-y-3 focus-visible:outline-none">
            <div className="p-3.5 rounded-2xl border border-blue-500/20 bg-blue-500/5 space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs text-blue-600 dark:text-blue-400">
                <Zap size={16} />
                <span>Chế độ Quay Liên Tục (Continuous Mode)</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Khi đang quay đơn hiện tại, nhân viên chỉ cần <strong>cầm súng bắn mã đơn tiếp theo</strong>: hệ thống sẽ tự động đóng gói video đơn cũ, đưa vào hàng đợi tải lên và lập tức bắt đầu quay đơn mới mà không cần chạm tay vào chuột.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 rounded-xl border border-border/70 bg-card flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Bắt đầu / Dừng quay</span>
                  <Badge variant="outline" className="font-mono text-[10px] bg-muted">Space</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Nhấn phím Cách (Spacebar) để chuyển đổi nhanh trạng thái ghi hình.
                </p>
              </div>

              <div className="p-3 rounded-xl border border-border/70 bg-card flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Bắn súng quét barcode</span>
                  <Badge variant="outline" className="font-mono text-[10px] bg-muted">Auto-Focus</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Súng quét tự động bắt mã dù con trỏ chuột đang ở bất kỳ đâu trên màn hình.
                </p>
              </div>

              <div className="p-3 rounded-xl border border-border/70 bg-card flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Chuyển Đóng / Khui hàng</span>
                  <Badge variant="outline" className="font-mono text-[10px] bg-muted">Nút đầu trang</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Chọn đúng tab Đóng gói hoặc Khui hàng để gắn cờ phân loại video chính xác.
                </p>
              </div>

              <div className="p-3 rounded-xl border border-border/70 bg-card flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Chống tắt máy khi quay</span>
                  <Badge variant="outline" className="font-mono text-[10px] text-emerald-600 bg-emerald-500/10">WakeLock</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Màn hình luôn giữ sáng trong suốt thời gian ghi hình để nhân viên tiện theo dõi.
                </p>
              </div>
            </div>
          </TabsContent>

          {/* ════ Tab 3: Xử Lý Sự Cố Kho (FAQ) ════ */}
          <TabsContent value="faq" className="flex-1 overflow-y-auto pr-1 mt-3 space-y-3 focus-visible:outline-none">
            <div className="p-3.5 rounded-2xl border border-border/80 bg-muted/20 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                <WifiOff size={16} className="text-amber-500 shrink-0" />
                <span>Mất mạng / Mạng kho chập chờn?</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong>Vẫn tiếp tục đóng hàng bình thường</strong>. Toàn bộ video được lưu trữ an toàn trong bộ nhớ nội bộ của máy (<code className="font-mono text-[11px]">IndexedDB</code>). Khi có mạng trở lại, hệ thống sẽ tự động đồng bộ lên Google Drive.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl border border-border/80 bg-muted/20 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                <ScanLine size={16} className="text-rose-500 shrink-0" />
                <span>Súng quét không nhận mã hoặc nhảy chữ lạ?</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                1. Tắt bộ gõ tiếng Việt (Unikey/EVKey) sang chế độ <strong>tiếng Anh [E]</strong>.<br/>
                2. Rút đầu cắm cáp USB súng quét ra và cắm lại thật chặt.<br/>
                3. Kiểm tra tem mã vận đơn có bị rách, ướt hoặc mờ hay không.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl border border-border/80 bg-muted/20 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                <Camera size={16} className="text-blue-500 shrink-0" />
                <span>Màn hình camera bị đen hoặc báo lỗi kết nối?</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                1. Bấm vào biểu tượng ổ khóa cạnh thanh địa chỉ trình duyệt, chọn <strong>Cho phép Camera (Allow)</strong>.<br/>
                2. Đóng các phần mềm khác đang dùng camera (Zalo, Zoom, Teams).<br/>
                3. Nhấn phím <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">F5</kbd> để tải lại trang.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl border border-border/80 bg-muted/20 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                <Layers size={16} className="text-amber-500 shrink-0" />
                <span>Hệ thống báo "Mã vận đơn đã được quay"?</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Đơn hàng này đã có video trước đó trong hệ thống. Hãy kiểm tra thông tin hiển thị trên cảnh báo để tránh đóng gói trùng kiện hàng của đồng nghiệp.
              </p>
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
            className="text-xs text-muted-foreground hover:text-foreground h-11 px-3.5 rounded-xl cursor-pointer"
          >
            Đóng
          </Button>

          <Button
            type="button"
            onClick={handleFinishOnboarding}
            className="h-11 px-5 rounded-2xl text-xs font-bold gap-2 bg-primary hover:bg-primary/90 cursor-pointer shadow-md min-w-[140px]"
          >
            <CheckCircle2 size={16} />
            <span>Đã hiểu, bắt đầu</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
