// ---------------------------------------------------------------------------
// WorkModeModal — Popup forcing user to pick a work mode before scanning
// Tham chiếu: docs/03-uiux-flow.md (Mục 2: Chốt chặn an toàn Guard Rail)
// ---------------------------------------------------------------------------

import { Modal } from '../ui/Modal';
import { WorkModeSelector } from './WorkModeSelector';
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Chọn chế độ làm việc"
      maxWidth="480px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', margin: 0 }}>
          Vui lòng chọn chế độ thao tác cho ca làm việc hiện tại trước khi bắt đầu quét mã. Hệ thống sẽ ghi nhớ lựa chọn của bạn cho tất cả các đơn tiếp theo.
        </p>
        <WorkModeSelector
          selectedMode={null}
          onSelectMode={handleSelect}
        />
      </div>
    </Modal>
  );
}
