# Quy định Tương thích Thiết bị & Phần cứng (Hardware & Device Rules)

## 1. Hỗ trợ 3 Nhóm Thiết bị Mục tiêu
- **Nhóm 1: Mobile (Android Chrome & iOS Safari)**
  - Thẻ `<video>` bắt buộc có các thuộc tính: `autoPlay`, `playsInline`, `muted` (bắt buộc trên iOS Safari để preview tự động chạy mà không mở fullscreen player).
  - Tự động chọn camera sau (`facingMode: { ideal: "environment" }`) khi quét mã hoặc quay đóng gói.
  - Xử lý Safari iOS: Kiểm tra hỗ trợ MediaRecorder MIME types (`video/mp4` fallback khi WebM không được hỗ trợ).
- **Nhóm 2: Desktop PC với Webcam USB rời**
  - Cho phép lưu lựa chọn thiết bị (`deviceId`) vào `localStorage`. Khi khởi động lại, tự động kết nối đúng webcam kho đã cấu hình.
  - Xử lý khi rút/cắm webcam: Lắng nghe sự kiện `navigator.mediaDevices.ondevicechange` để cập nhật danh sách camera thời gian thực.
- **Nhóm 3: Laptop với Camera tích hợp**
  - Hỗ trợ phím tắt điều khiển: Phím `Space` (Bắt đầu / Dừng quay), phím `Enter` (Xác nhận quét mã), phím `Esc` (Hủy / Đặt lại).

## 2. Tương thích Đầu đọc Mã vạch (Barcode Scanner Gun & Camera Scanner)
- **Đầu đọc USB / Không dây (HID Keyboard Wedge)**:
  - Bắt buộc gắn listener bàn phím ở cấp ứng dụng (`window.addEventListener('keydown')`).
  - Thuật toán nhận diện súng quét: Chuỗi ký tự nhập vào với tốc độ cực nhanh (< 50ms giữa 2 ký tự liên tiếp) kết thúc bằng phím `Enter`.
  - Tự động điền mã vào ô quét mà không cần công nhân phải click chuột focus vào input.
- **Quét bằng Camera (ZXing / Barcode Detection API)**:
  - Sử dụng Native `BarcodeDetector` API nếu trình duyệt hỗ trợ (Android Chrome); fallback sang thư viện `@zxing/library` cho các trình duyệt khác.
  - Điều tiết (throttle) tần số phân tích frame: Tối đa 10 - 15 fps để tránh nóng máy và tiết kiệm pin thiết bị di động.

## 3. Khôi phục Sự cố Phần cứng
- Khi mất quyền truy cập camera (Camera Permission Denied): Hiển thị modal hướng dẫn cụ thể cách cấp lại quyền trên từng trình duyệt.
- Nếu microphone bị chặn quyền: Vẫn cho phép quay video không có tiếng (`audio: false`), thông báo cảnh báo nhẹ, không làm gián đoạn quy trình kho.
