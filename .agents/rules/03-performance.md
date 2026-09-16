# Quy định Tối ưu Hiệu năng (Performance Rules)

## 1. Quản lý Bộ nhớ Video & Stream Tracks
- **Thu hồi Blob URL**: Bắt buộc gọi `URL.revokeObjectURL(blobUrl)` ngay sau khi phần tử `<video>` không còn dùng đến hoặc khi component unmount để tránh tràn RAM trên thiết bị di động.
- **Giải phóng Camera**: Bắt buộc lặp qua `stream.getTracks().forEach(track => track.stop())` khi chuyển màn hình hoặc tạm dừng để camera đèn tắt và giải phóng phần cứng.
- **MediaRecorder Chunking**:
  - Đặt `timeslice = 1000` (1 giây/chunk) khi ghi hình dài để tránh dồn toàn bộ video vào một mảng bộ nhớ lớn.
  - Sử dụng IndexedDB để lưu trữ tạm các video blobs thay vì giữ toàn bộ trong bộ nhớ RAM của trình duyệt.

## 2. Giới hạn Độ phân giải & Bitrate Video
- **Độ phân giải chuẩn**:
  - Mặc định: `1280x720` (720p), `30fps`. Đủ sắc nét để đọc rõ mã vạch và chữ trên phiếu gửi, tối ưu tốc độ upload.
  - Desktop cao cấp: Cho phép tùy chọn `1920x1080` (1080p), `30fps`.
- **Bitrate khuyên nghị**:
  - Video bitrate: `1,500,000 - 2,500,000 bps` (1.5 - 2.5 Mbps).
  - Audio bitrate: `64,000 - 96,000 bps` (mono hoặc stereo thấp để tiết kiệm băng thông).
- **MIME Type tương thích**: Ưu tiên `video/webm;codecs=vp8,opus` hoặc `video/mp4` (trên Safari iOS).

## 3. Tối ưu Frontend Bundle & Mạng
- **Code Splitting & Lazy Loading**:
  - Thư viện giải mã barcode (`@zxing/library` hoặc barcode scanner engine) phải được lazy import động khi người dùng mở camera quét mã, không nạp vào initial main bundle.
  - Các trang quản trị, danh sách lịch sử phải lazy load qua `React.lazy()` và `Suspense`.
- **PWA Cache Strategy**:
  - Tài nguyên tĩnh (JS, CSS, fonts, SVG icons): Chiến lược `CacheFirst` hoặc `StaleWhileRevalidate`.
  - API endpoints: Chiến lược `NetworkFirst` (fallback cache dữ liệu tra cứu cơ bản).
  - **CẤM**: Tuyệt đối không lưu file video blob vào Cache API của Service Worker. Chỉ lưu trữ tạm thời trong IndexedDB.
- **Quản lý luồng tải lên (Upload Background)**:
  - Bắt buộc sử dụng **Web Worker** cho tiến trình upload video lên Google Drive. Toàn bộ quá trình đọc file từ IndexedDB và gửi request (fetch) phải được thực hiện ở luồng chạy ngầm độc lập (worker thread).
  - Điều này đảm bảo Main Thread được giải phóng 100% để xử lý UI, render Camera và quét mã vạch, loại bỏ hoàn toàn hiện tượng giật lag (frame drops) kể cả khi quay liên tục hàng chục đơn hàng trên thiết bị yếu.

## 4. Tối ưu Truy vấn Cơ sở dữ liệu Cloudflare D1
- Mọi truy vấn tra cứu trạng thái đơn hàng bắt buộc sử dụng index trên cột `ma_van_don` (`idx_phien_quay_ma_van_don`).
- Sử dụng Prepared Statements (`env.DB.prepare(...).bind(...)`) cho tất cả truy vấn để tận dụng query plan caching và chống SQL Injection.
- Các API lấy danh sách phiên quay bắt buộc có phân trang (`LIMIT` tối đa 50 và `OFFSET` hoặc cursor-based).
