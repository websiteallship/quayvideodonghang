# 10 — ERROR HANDLING & EDGE CASES

---

## 1. Error Handling Strategy

```
User action → Error occurs → Classify error → Show appropriate UI → Offer recovery action
```

**Nguyên tắc:**
- Mọi lỗi phải có **thông báo tiếng Việt dễ hiểu** (nhân viên kho không phải dev)
- Luôn có **hành động khôi phục** (nút thử lại, hướng dẫn bước tiếp)
- Lỗi nghiêm trọng → **Toast đỏ + vibrate** (di động)
- Lỗi nhẹ → **Toast vàng**, tự biến mất sau 5 giây
- Ghi log lỗi vào `console.error` + gửi về backend (nếu có mạng) để debug

---

## 2. Bảng Error States chi tiết

### 2.1 Camera Errors

| Error | Nguyên nhân | Thông báo hiển thị | Recovery Action |
|---|---|---|---|
| `NotAllowedError` | Người dùng từ chối quyền camera | "📷 Cần cho phép truy cập camera để quét mã và quay video. Vui lòng bật quyền camera trong Cài đặt trình duyệt." | Hiện hướng dẫn bật camera (có ảnh minh hoạ theo từng trình duyệt: Safari, Chrome, Edge) |
| `NotFoundError` | Không tìm thấy camera nào | "❌ Không tìm thấy camera. Kiểm tra webcam đã cắm chưa hoặc thử cổng USB khác." | Nút "Thử lại" (gọi `enumerateDevices` lại) |
| `NotReadableError` | Camera đang bị app khác dùng | "⚠️ Camera đang được ứng dụng khác sử dụng. Đóng các app đang dùng camera rồi thử lại." | Nút "Thử lại" |
| `OverconstrainedError` | Không hỗ trợ resolution yêu cầu | Tự động fallback xuống resolution thấp hơn, không hiện lỗi cho user | Auto-retry với constraints thấp hơn |
| Camera stream bị ngắt giữa chừng | USB webcam rút ra, Bluetooth disconnect | "⚠️ Camera bị ngắt kết nối. Kiểm tra lại cáp USB." | Nút "Kết nối lại camera" |

**Hướng dẫn bật camera theo trình duyệt:**

```
iOS Safari:
  Cài đặt → Safari → Camera → Cho phép

Chrome (Android/Windows):
  Bấm 🔒 trên thanh địa chỉ → Camera → Cho phép

Edge (Windows):
  Bấm 🔒 trên thanh địa chỉ → Quyền truy cập → Camera → Cho phép
```

---

### 2.2 Barcode Scanning Errors

| Error | Nguyên nhân | Thông báo hiển thị | Recovery Action |
|---|---|---|---|
| Không quét được mã sau 15 giây | Ánh sáng kém, mã bị mờ/nhàu | "💡 Không nhận diện được mã. Thử đưa mã gần camera hơn hoặc bật đèn." | Hiện nút "Nhập mã tay" (chuyển sang ô input) |
| zxing-wasm load thất bại | Mất mạng khi load WASM lần đầu | "Đang tải module quét mã... Cần kết nối mạng lần đầu." | Tự retry khi có mạng; nút "Nhập mã tay" |
| Quét ra mã nhưng format không hợp lệ | Quét nhầm mã QR không phải vận đơn | Popup: "Mã quét được: [xxx]. Đây có phải mã vận đơn không?" + 2 nút: "Đúng, sử dụng" / "Không, quét lại" | Cho user xác nhận hoặc quét lại |

---

### 2.3 Video Recording Errors

| Error | Nguyên nhân | Thông báo hiển thị | Recovery Action |
|---|---|---|---|
| `MediaRecorder` không hỗ trợ codec | Trình duyệt cũ | Tự fallback qua codec khác. Nếu hết option: "Trình duyệt không hỗ trợ quay video. Vui lòng cập nhật trình duyệt." | Link đến update browser |
| Video quá ngắn (< 3 giây) | Bấm dừng quá nhanh | "⚠️ Video quá ngắn (dưới 3 giây). Quay lại để đảm bảo đủ bằng chứng." | Tự động quay lại màn hình quay |
| Video quá dài (> 5 phút) | Quên bấm dừng | Tự động dừng + cảnh báo: "Video đã đạt 5 phút tối đa." | Chuyển sang màn hình xác nhận |
| MediaRecorder crash/error event | Bug trình duyệt, bộ nhớ thiếu | "❌ Lỗi khi quay video. Đã lưu phần đã quay." | Cố lưu partial data + nút "Quay lại từ đầu" |
| Canvas overlay lỗi | Hiếm gặp | Tiếp tục quay không overlay, log lỗi | Không hiện lỗi cho user, quay bình thường |

---

### 2.4 Storage Errors (IndexedDB)

| Error | Nguyên nhân | Thông báo hiển thị | Recovery Action |
|---|---|---|---|
| `QuotaExceededError` | Bộ nhớ trình duyệt đầy | "⚠️ Bộ nhớ trình duyệt gần đầy. Vui lòng kết nối mạng để upload video tồn đọng trước khi quay thêm." | Hiện danh sách video chưa upload + nút "Upload ngay" |
| IndexedDB bị khoá | Nhiều tab cùng mở app | "Ứng dụng đang mở ở tab khác. Vui lòng đóng tab cũ." | Link mở tab đang active |
| Dữ liệu bị iOS Safari dọn | Không mở app > 7 ngày | Không phát hiện được trước → phòng ngừa: banner nhắc "Mở app hàng ngày" + upload ngay lập tức | — |
| `persist()` bị từ chối | Trình duyệt từ chối storage persistent | Log warning, tiếp tục hoạt động bình thường, ưu tiên upload nhanh hơn | — |

---

### 2.5 Upload Errors

| Error | Nguyên nhân | Thông báo hiển thị | Recovery Action |
|---|---|---|---|
| Mất mạng (`offline`) | WiFi/4G mất | "📡 Mất kết nối mạng. Video đã lưu an toàn, sẽ tự upload khi có mạng lại." | Tự retry khi `online` event |
| Upload timeout | Mạng chậm, file lớn | Tự retry với backoff (1s → 3s → 10s → 30s → 60s) | Max 5 lần retry tự động, sau đó: nút "Thử lại" thủ công |
| Backend trả 401 | Token hết hạn | Redirect về trang đăng nhập, giữ nguyên video queue | Login lại → auto resume upload |
| Backend trả 500 | Server error | "Lỗi hệ thống, vui lòng thử lại sau." | Nút "Thử lại" + backoff |
| Google Drive quota exceeded | Hết dung lượng Drive | "⚠️ Kho lưu trữ đã đầy. Liên hệ quản trị viên." | Admin cần mở rộng storage hoặc xoá video cũ |
| Resumable upload bị expired | Upload URL hết hạn (> 24h) | Tự tạo session mới, retry | Transparent cho user |
| Chunk upload failed | Đứt mạng giữa chunk | Retry chunk đó, không upload lại từ đầu | Transparent cho user |
| Duplicate file trên Drive | Upload lại video đã có | Backend kiểm tra drive_file_id, nếu đã có → skip, đánh dấu thành công | Transparent cho user |

**Retry Strategy chi tiết:**

```
Lần 1: chờ 1 giây → retry
Lần 2: chờ 3 giây → retry
Lần 3: chờ 10 giây → retry
Lần 4: chờ 30 giây → retry
Lần 5: chờ 60 giây → retry
→ Sau 5 lần: dừng auto retry, đánh dấu "lỗi", hiện nút "Thử lại" thủ công
→ Nếu user bấm "Thử lại" → reset counter, bắt đầu lại từ lần 1
```

---

### 2.6 Authentication Errors

| Error | Nguyên nhân | Thông báo hiển thị | Recovery Action |
|---|---|---|---|
| PIN sai | Nhập sai PIN | "Mã nhân viên hoặc PIN không đúng" (không nói rõ cái nào sai — bảo mật) | Focus vào ô PIN, cho nhập lại |
| Nhập sai 5 lần liên tiếp | Brute-force | "Đã nhập sai quá nhiều lần. Vui lòng thử lại sau 5 phút." | Khoá input 5 phút, hiện đếm ngược |
| Tài khoản bị vô hiệu hoá | Admin tắt NV | "Tài khoản đã bị vô hiệu hoá. Liên hệ quản trị viên." | — |
| Token hết hạn (24h) | Hết phiên | Tự redirect về login, hiện: "Phiên làm việc đã hết. Vui lòng đăng nhập lại." | Focus vào ô mã NV |

---

### 2.7 Duplicate Mã Vận Đơn

| Kịch bản | Xử lý |
|---|---|
| Quét mã đã có video "đóng gói" → muốn quay "đóng gói" lại | Popup: "⚠️ Mã [X] đã có video đóng gói (quay bởi NV002 lúc 10:15). Bạn muốn quay thêm video mới?" → "Quay thêm" / "Bỏ qua" |
| Quét mã đã có video "đóng gói" → muốn quay "khui hàng" | Cho phép bình thường (khác loại biên bản). Hiện thông tin: "Mã này đã có video đóng gói. Bạn đang quay video khui hàng." |
| Quét mã đã có video "lỗi" | Cho phép quay lại (video lỗi = chưa upload thành công, cần quay lại) |

---

## 3. Offline Behavior

| Tình huống | Hành vi |
|---|---|
| Mở app khi offline | PWA shell mở bình thường (cached). Hiện banner: "📡 Không có mạng — Có thể quét mã và quay video, video sẽ upload khi có mạng lại." |
| Quét mã khi offline | ✅ Hoạt động (BarcodeDetector/zxing-wasm chạy hoàn toàn local). **Không** gọi API check mã trùng (skip). |
| Quay video khi offline | ✅ Hoạt động (MediaRecorder local). Lưu vào IndexedDB. |
| Upload khi offline | ❌ Queue lại, hiện số video đang chờ. Tự upload khi có mạng. |
| Tra cứu lịch sử khi offline | ❌ Hiện: "Cần kết nối mạng để tra cứu." Có thể show danh sách video local trong IndexedDB (chưa upload). |
| Login khi offline | ❌ Nhưng nếu đã login trước đó → session vẫn còn (token trong localStorage). Chỉ verify lại khi có mạng. |

---

## 4. Performance Edge Cases

| Tình huống | Xử lý |
|---|---|
| Quay video khi pin điện thoại thấp (< 15%) | Hiện cảnh báo: "🔋 Pin yếu. Đề nghị cắm sạc trước khi quay." |
| Nhiều video tồn đọng (> 20) chưa upload | Hiện cảnh báo mạnh: "🔴 Có 20+ video chưa lưu trữ! Vui lòng kết nối WiFi mạnh và giữ app mở." Upload theo thứ tự FIFO. |
| Upload trên 3G/4G chậm | Hiện estimated time: "Ước tính còn ~5 phút để upload hết." Đề xuất: "Kết nối WiFi để upload nhanh hơn." |

---

## 5. Validation Rules

| Field | Quy tắc | Error message |
|---|---|---|
| Mã nhân viên | 2-20 ký tự, chỉ chữ + số | "Mã nhân viên chỉ gồm chữ và số, 2-20 ký tự" |
| PIN | Đúng 4 chữ số | "PIN gồm 4 chữ số" |
| Mã vận đơn (quét) | Không rỗng, 5-50 ký tự | "Mã vận đơn không hợp lệ" |
| Mã vận đơn (nhập tay) | 5-50 ký tự, chỉ chữ + số | "Mã vận đơn chỉ gồm chữ và số" |
| Video duration | 3 giây ≤ x ≤ 300 giây (5 phút) | "Video quá ngắn" / "Video đạt tối đa 5 phút" |
| Video file size | ≤ 500MB | "Video quá lớn. Thử giảm thời gian quay." |

---

*Xem tiếp: **11-ui-design-system.md** (design tokens, wireframes, component specs).*
