# Quy định UI/UX & Design Systems (UI/UX Rules)
*Tham chiếu và kế thừa chỉ dẫn từ các skills: `ui-ux-pro-max`, `ui-ux-designer`, `ui-component`, `ui-skills`*

---

## 1. Nghiêm cấm Icon Ký tự (Unicode Emoji)
- **CẤM TUYỆT ĐỐI**: Không sử dụng emoji hoặc ký tự unicode làm biểu tượng (ví dụ: `📦`, `🎥`, `✅`, `❌`, `⚠️`, `🔍`, `⚙️`, `▶️`, `⏹️`).
- **BẮT BUỘC**: Sử dụng thư viện icon chuyên dụng `lucide-react` hoặc inline SVG chuẩn.
- Mỗi icon phải có `aria-hidden="true"` nếu đi kèm label text, hoặc `aria-label` khi là icon-only button.

---

## 2. Chuẩn hóa Component & Design Tokens (`ui-component`, `ui-skills`)
- **Cấm styling tùy tiện (No ad-hoc styles)**: Tuyệt đối không tự bịa các giá trị màu hoặc spacing tùy hứng (ví dụ: `p-[13px]`, `bg-[#1a2b3c]`). Bắt buộc dùng Design Tokens chuẩn từ [`11-ui-design-system.md`](file:///d:/TOOL%20AI/TOOL_QUAYVIDEO/docs/11-ui-design-system.md).
- **Cấu trúc Component công thái học (Component Ergonomics)**:
  - Tách bạch Primitives (Button, Badge, Input, Modal, Card) và Composite Components (CameraPreview, BarcodeScanner, ControlBar, UploadQueue).
  - Khai báo biến thể rõ ràng qua props: `variant` (primary | secondary | danger | ghost | outline), `size` (sm | md | lg), trạng thái `isLoading`, `isDisabled`.
  - Tích hợp trạng thái Focus Ring nổi bật (`focus-visible:ring-4 focus-visible:ring-sky-500`) hỗ trợ súng quét barcode và điều khiển bằng bàn phím.

---

## 3. Thiết kế cho Môi trường Kho vận (`ui-ux-designer`, `ui-ux-pro-max`)
- **Kích thước Vùng bấm (Touch Targets)**:
  - Tối thiểu `48px x 48px` cho toàn bộ các nút bấm và icon interactive.
  - Ưu tiên `56px x 56px` hoặc thanh bấm full-width cho các CTA chính: *Bắt đầu quay*, *Dừng & Lưu*, *Quét mã*.
- **Typography & Tương phản cao**:
  - Font chữ sans-serif dễ đọc: Inter, Roboto hoặc system fonts.
  - Text nội dung tối thiểu `14px`, mã vận đơn / mã quét hiển thị font monospace cỡ lớn (`18px - 24px`, bold) trên nền tương phản cao.
  - Tuân thủ độ tương phản WCAG 2.2 AA (>= 4.5:1 với text thường, >= 3:1 với icon và UI components).
- **Hệ thống Trạng thái Trực quan (Semantic Status System)**:
  - **Thành công (Success)**: Xanh lá (`emerald-500` / `#10B981`) - Mã hợp lệ, upload hoàn tất.
  - **Đang quay / Ghi hình (Recording)**: Đỏ (`rose-500` / `#F43F5E`) kèm chấm tròn hiệu ứng nhịp thở (pulse animation).
  - **Cảnh báo / Quét trùng (Warning)**: Vàng hổ phách (`amber-500` / `#F59E0B`) - Cảnh báo trùng mã, mạng yếu.
  - **Tiến trình / Đồng bộ (Info/Sync)**: Xanh lam (`sky-500` / `#0EA5E9`) - Đang tải video lên Drive, đang đợi đồng bộ.
  - **Empty States**: Luôn có icon minh họa SVG, tiêu đề rõ ràng và nút hành động khắc phục, không để màn hình trống rỗng.

---

## 4. Phản hồi Đa giác quan (Haptic, Audio & Visual)
- **Quét barcode thành công**: Phát âm thanh beep ngắn (800Hz, 100ms) + rung haptic `navigator.vibrate(100)`.
- **Lỗi quét / Trùng mã**: Phát âm thanh warning đôi (400Hz, 200ms x 2) + rung haptic `navigator.vibrate([100, 50, 100])`.
- **Bắt đầu / Dừng ghi hình**: Âm báo xác nhận rõ ràng để công nhân thao tác tự tin mà không cần nhìn chằm chằm vào màn hình.

---

## 5. Quản lý Màn hình & Hiển thị Thiết bị
- **Screen Wake Lock API**: Phải kích hoạt giữ sáng màn hình trong toàn bộ quá trình quay video (`navigator.wakeLock.request('screen')`), tự giải phóng khi dừng hoặc unmount.
- **Bố cục Thích ứng (Responsive Layout)**:
  - **Mobile (dọc)**: Video preview chiếm 60-70% khung hình phía trên; cụm điều khiển, trạng thái mã và danh sách hàng đợi ở nửa dưới.
  - **Desktop / Tablet (ngang)**: Split-screen 2 cột (Trái: Camera Preview lớn toàn màn hình; Phải: Bảng thông tin đơn, lịch sử quét và tiến độ upload Drive).
