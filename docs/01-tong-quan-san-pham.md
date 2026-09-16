# 01 — TỔNG QUAN SẢN PHẨM (PRD)
## Ứng dụng Web (PWA) Quay video đóng hàng/khui hàng + Quét mã vận đơn + Lưu trữ Google Drive

**Phiên bản:** 0.2 — chuyển hướng sang PWA cho Phase 1
**Ngày:** 14/09/2026

---

## 1. Vì sao chuyển sang PWA cho Phase 1

So với native app phải ký chứng chỉ, phân phối qua Ad Hoc/Enterprise, gia hạn hàng năm — PWA cho phép:
- **Triển khai tức thì**: chỉ cần một đường link, không cần cài đặt phức tạp, không cần Apple Developer Program.
- **Chạy trên mọi thiết bị** với cùng một codebase: điện thoại (iOS/Android), laptop Windows (camera tích hợp), PC (camera rời/webcam USB).
- **Cập nhật tức thời**: sửa lỗi/thêm tính năng, người dùng tự nhận bản mới khi tải lại trang, không cần "gửi bản build" cho từng máy.
- **Đánh đổi phải chấp nhận**: một số giới hạn kỹ thuật trên iOS Safari (không có background sync, dung lượng lưu tạm có thể bị dọn sau ~7 ngày không dùng, không có sẵn API quét mã native) — các giới hạn này và cách khắc phục được nêu chi tiết ở tài liệu **02-dac-ta-ky-thuat.md**.

---

## 2. Ba nhóm thiết bị mục tiêu

| Nhóm | Thiết bị | Camera sử dụng | Trình duyệt khuyến nghị |
|---|---|---|---|
| **A. Di động (ưu tiên)** | iPhone, Android | Camera sau tích hợp (mặc định), camera trước dự phòng | iOS: Safari (bắt buộc, vì Add to Home Screen chỉ hoạt động qua Safari). Android: Chrome |
| **B. PC bàn** | Máy tính để bàn Windows | **Webcam rời gắn ngoài qua USB** | Chrome hoặc Edge trên Windows |
| **C. Laptop** | Laptop Windows | Camera tích hợp sẵn trên laptop (có thể chọn webcam ngoài nếu cắm thêm) | Chrome hoặc Edge trên Windows |

Ứng dụng phải có **màn hình chọn thiết bị camera** khi máy có nhiều hơn 1 camera (chủ yếu ở nhóm B/C khi vừa có cam laptop vừa có webcam rời) — xem chi tiết luồng ở tài liệu **03-uiux-flow.md**.

---

## 3. Đối tượng sử dụng

- **Nhân viên đóng gói/kho vận**: thao tác chính — chọn chế độ "Đóng gói", quét mã hàng loạt, quay video, xác nhận lưu.
- **Nhân viên tại quầy nhận hàng trả (khui hàng)**: chọn chế độ "Khui hàng" tại đầu ca, quét mã hàng loạt, quay video bóc kiện kiểm tra.
- **Admin/Quản lý kho**: cấu hình kết nối Google Drive, xem lịch sử, tra cứu, xuất báo cáo.

---

## 4. Phạm vi Phase 1 (PWA)

### 4.1 Tính năng bắt buộc (MVP)
1. **Bộ chọn chế độ làm việc (Mode-First)**: Buộc chọn "Đóng gói" hoặc "Khui hàng" trước khi quét, ghi nhớ theo phiên làm việc.
2. Quét mã vận đơn bằng camera (QR/Code128/Code39...) hoặc súng quét USB barcode.
3. Tự động nhận diện ĐVVC và gán sẵn loại biên bản đã chọn từ trước.
4. Quay video đóng gói/khui hàng gắn với mã đơn vừa quét.
5. Lưu video tạm trên trình duyệt (IndexedDB) trong hàng đợi.
6. Tự động upload lên Google Drive (tài khoản admin cấu hình sẵn) khi có mạng và app đang mở.
6. Tra cứu lại theo mã đơn/ngày/nhân viên/trạng thái.
7. Cài đặt như một "app" trên màn hình chính (Add to Home Screen / Install app) cho cả di động và Windows.
8. Chọn camera khi có nhiều thiết bị (PC/laptop có webcam rời).

### 4.2 Tính năng nâng cao (đưa vào Phase 1, làm sau MVP)
- **Tự động quay khi nhận mã vận đơn (Auto-Record / Hands-free Mode):**
  - Quét mã thành công (camera/súng quét) → tự nhận diện ĐVVC → tự động kích hoạt quay video ngay mà không cần bấm xác nhận.
  - Tuỳ chọn cấu hình trong Cài đặt: Chuyển đổi giữa chế độ `Tự động quay (Auto)` và `Xác nhận trước khi quay (Confirm)`.
  - Cơ chế an toàn (Fail-safe): Tự động rơi về popup xác nhận thủ công nếu hệ thống phát hiện mã trùng (`isDuplicate`) hoặc mã bất thường.
- Chế độ quay liên tục nhiều đơn không cần thoát camera giữa các đơn.
- Nén video phía client trước khi upload để giảm dung lượng & thời gian chờ.
- Watermark mã đơn/nhân viên/thời gian lên video.
- Đăng nhập nhẹ bằng mã nhân viên (PIN) — không cần tài khoản Google cá nhân của từng nhân viên.
- Dashboard nhanh (tổng số đơn quay trong ngày, số chưa upload) đồng bộ qua Google Sheet.

### 4.3 Ngoài phạm vi Phase 1
- Web portal quản trị đầy đủ nhiều quyền (chuyển sang Phase 2).
- Tích hợp API trực tiếp với hệ thống bán hàng để tự đối soát đơn.
- Chuyển kho lưu trữ sang Google Cloud Storage/S3 (khi quy mô lớn hơn Drive đáp ứng tốt).

---

## 5. Tiêu chí thành công Phase 1

- Nhân viên quay xong 1 đơn (từ lúc quét mã đến lúc video vào hàng đợi) trong **dưới 10 giây thao tác tay** (không tính thời gian quay thực tế).
- Tỷ lệ upload thành công ≥ 98% trong vòng 24h kể từ khi quay (có tính đến việc mạng gián đoạn).
- Tra cứu ra đúng video trong vòng 5 giây kể từ khi quét lại mã đơn hoặc gõ mã.
- Cài đặt & chạy được ổn định trên: iPhone (Safari), Android (Chrome), Windows + webcam rời (Chrome/Edge), Windows laptop cam tích hợp (Chrome/Edge).

---

*Xem tiếp: **02-dac-ta-ky-thuat.md** (chi tiết kỹ thuật, khả năng tương thích trình duyệt), **03-uiux-flow.md** (màn hình & luồng thao tác), **04-tich-hop-luu-tru-du-lieu.md** (Google Drive & dữ liệu), **05-trien-khai-kiemthu-rui-ro.md** (triển khai, kiểm thử, rủi ro).*
