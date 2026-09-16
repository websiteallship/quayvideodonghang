# Quy định Chế độ Offline & Độ tin cậy (Offline & Reliability Rules)

## 1. Lưu trữ Offline-First với IndexedDB
- Khi mất kết nối mạng (hoặc mạng chập chờn tại kho):
  - Thông tin phiên quay (`ma_van_don`, thời gian, mã nhân viên) và file video blob phải được lưu ngay vào **IndexedDB** (`table: offline_queue`).
  - Trạng thái phiên quay được đánh dấu: `CHO_DONG_BO` (Pending Sync).
  - Không chặn công nhân tiếp tục quét và quay đơn hàng tiếp theo.
- Kiểm tra dung lượng lưu trữ khả dụng (`navigator.storage.estimate()`). Nếu dung lượng còn lại < 500MB, cảnh báo người dùng giải phóng bộ nhớ hoặc kết nối mạng để đồng bộ.

## 2. Đồng bộ Tự động & Hàng đợi Upload
- Tự động kích hoạt đồng bộ khi trình duyệt nhận sự kiện `window.addEventListener('online')` hoặc khi nhân viên bấm "Đồng bộ ngay".
- Cơ chế gửi lại (Retry Strategy): Exponential Backoff kết hợp jitter (lần 1: 2s, lần 2: 4s, lần 3: 8s... tối đa 5 lần).
- Upload có thể tiếp tục (Resumable Upload): Sử dụng cơ chế Google Drive Resumable Upload protocol, theo dõi byte offset để tiếp tục upload đoạn còn lại nếu rớt mạng giữa chừng, không upload lại từ đầu.

## 3. Chống Mất mát Dữ liệu (Zero Data Loss)
- **Sự kiện beforeunload**:
  - Khi đang ghi hình hoặc đang trong tiến trình upload video lên Drive: Bắt buộc đăng ký sự kiện `beforeunload` để hiển thị cảnh báo xác nhận nếu người dùng vô tình đóng tab hoặc reload trình duyệt.
- Dọn dẹp an toàn: Chỉ xóa blob video khỏi IndexedDB SAU KHI backend xác nhận file đã upload thành công lên Google Drive và bản ghi đã lưu vào Cloudflare D1.
