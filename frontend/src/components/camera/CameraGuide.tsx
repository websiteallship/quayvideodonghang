import { X, ShieldAlert, ExternalLink } from 'lucide-react';
import type { CameraError } from '../../hooks/use-camera';

interface CameraGuideProps {
  error: CameraError;
  onRetry: () => void;
  onDismiss: () => void;
}

/**
 * CameraGuide — modal hướng dẫn khắc phục lỗi camera.
 * Hiển thị hướng dẫn cụ thể cho từng loại lỗi (doc 10 §2.1).
 * Recovery guides cho từng trình duyệt (Chrome, Safari, Edge).
 */
export function CameraGuide({ error, onRetry, onDismiss }: CameraGuideProps) {
  return (
    <div className="camera-guide-overlay" role="dialog" aria-modal="true" aria-label="Hướng dẫn camera">
      <div className="camera-guide">
        <button
          className="camera-guide__close"
          onClick={onDismiss}
          aria-label="Đóng"
          type="button"
        >
          <X size={20} aria-hidden="true" />
        </button>

        <div className="camera-guide__header">
          <div className="camera-guide__icon-wrapper">
            <ShieldAlert size={32} aria-hidden="true" />
          </div>
          <h2 className="camera-guide__title">
            {getTitleForError(error.code)}
          </h2>
        </div>

        <p className="camera-guide__message">{error.userMessage}</p>

        {error.code === 'permission_denied' && (
          <div className="camera-guide__instructions">
            <h3 className="camera-guide__subtitle">
              Hướng dẫn bật quyền Camera
            </h3>

            <div className="camera-guide__browser-list">
              <BrowserStep
                browser="Chrome / Edge (Android, Windows)"
                steps={[
                  'Bấm biểu tượng khóa trên thanh địa chỉ',
                  'Chọn "Quyền truy cập trang web" hoặc "Site settings"',
                  'Tìm mục Camera → chọn "Cho phép"',
                  'Tải lại trang (F5)',
                ]}
              />

              <BrowserStep
                browser="Safari (iOS / macOS)"
                steps={[
                  'Mở Cài đặt → Safari',
                  'Cuộn đến mục Camera',
                  'Chọn "Cho phép" hoặc "Hỏi"',
                  'Quay lại ứng dụng và tải lại trang',
                ]}
              />

              <BrowserStep
                browser="Firefox"
                steps={[
                  'Bấm biểu tượng khóa trên thanh địa chỉ',
                  'Xóa quyền bị chặn: Camera → "Xóa quyền"',
                  'Tải lại trang → Bấm "Cho phép" khi được hỏi',
                ]}
              />
            </div>
          </div>
        )}

        {error.code === 'not_found' && (
          <div className="camera-guide__instructions">
            <h3 className="camera-guide__subtitle">Kiểm tra phần cứng</h3>
            <ul className="camera-guide__checklist">
              <li>Webcam USB đã cắm chặt vào cổng USB chưa?</li>
              <li>Thử rút ra cắm lại, hoặc đổi cổng USB khác</li>
              <li>Kiểm tra đèn LED trên webcam có sáng không</li>
              <li>Nếu dùng laptop: camera tích hợp có bị che bởi nắp bảo vệ không?</li>
            </ul>
          </div>
        )}

        {error.code === 'not_readable' && (
          <div className="camera-guide__instructions">
            <h3 className="camera-guide__subtitle">Camera đang bận</h3>
            <ul className="camera-guide__checklist">
              <li>Đóng các ứng dụng khác đang dùng camera (Zoom, Teams, Skype...)</li>
              <li>Đóng các tab trình duyệt khác có sử dụng camera</li>
              <li>Thử khởi động lại trình duyệt</li>
            </ul>
          </div>
        )}

        <div className="camera-guide__actions">
          <button
            className="camera-guide__btn camera-guide__btn--primary"
            onClick={onRetry}
            type="button"
          >
            Thử lại
          </button>
          <button
            className="camera-guide__btn camera-guide__btn--secondary"
            onClick={onDismiss}
            type="button"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function BrowserStep({
  browser,
  steps,
}: {
  browser: string;
  steps: string[];
}) {
  return (
    <div className="camera-guide__browser-step">
      <h4 className="camera-guide__browser-name">
        <ExternalLink size={14} aria-hidden="true" />
        {browser}
      </h4>
      <ol className="camera-guide__steps">
        {steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTitleForError(code: CameraError['code']): string {
  switch (code) {
    case 'permission_denied':
      return 'Quyền Camera bị từ chối';
    case 'not_found':
      return 'Không tìm thấy Camera';
    case 'not_readable':
      return 'Camera đang bị chiếm dụng';
    case 'not_supported':
      return 'Trình duyệt không hỗ trợ';
    case 'stream_ended':
      return 'Camera bị ngắt kết nối';
    default:
      return 'Lỗi Camera';
  }
}
