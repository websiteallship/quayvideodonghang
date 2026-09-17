// ---------------------------------------------------------------------------
// WorkModeModal — Popup forcing user to pick a work mode before scanning
// Tham chiếu: docs/03-uiux-flow.md (Mục 2: Chốt chặn an toàn Guard Rail)
// Rules: .agents/rules/01-ui-ux.md (Cấm emoji, touch targets >= 48px, lucide-react)
// ---------------------------------------------------------------------------

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { WorkModeSelector } from './WorkModeSelector';
import { Layers, Info } from 'lucide-react';
import type { LoaiBienBan } from '../../types';

interface WorkModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMode: (mode: LoaiBienBan) => void;
}

export function WorkModeModal({
  isOpen,
  onClose,
  onSelectMode,
}: WorkModeModalProps) {
  const handleSelect = (mode: LoaiBienBan) => {
    onSelectMode(mode);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full sm:max-w-[480px] p-6 gap-5">
        <DialogHeader className="gap-2 text-left">
          <div className="flex items-center gap-2.5 text-primary">
            <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
              <Layers size={20} className="text-primary" />
            </div>
            <DialogTitle className="text-lg font-bold text-foreground">
              Chọn chế độ làm việc
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Vui lòng chọn chế độ thao tác cho ca làm việc hiện tại trước khi bắt đầu quét mã. Hệ thống sẽ tự động gán loại biên bản và ghi nhớ cho các đơn tiếp theo.
          </DialogDescription>
        </DialogHeader>

        <div className="pt-1">
          <WorkModeSelector
            selectedMode={null}
            onSelectMode={handleSelect}
            hideHeader={true}
            variant="list"
          />
        </div>

        <div className="flex items-center gap-2 text-[11px] text-muted-foreground/80 bg-muted/50 px-3 py-2 rounded-lg border border-border/50">
          <Info size={14} className="shrink-0 text-muted-foreground" />
          <span>Bạn có thể đổi lại chế độ làm việc bất cứ lúc nào ở màn hình chính.</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
