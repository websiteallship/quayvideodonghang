# 02 — ĐẶC TẢ KỸ THUẬT

## 1. Kiến trúc tổng quan

```
[Trình duyệt - PWA]
  ├─ Service Worker (cache tài nguyên tĩnh, offline shell)
  ├─ Module Camera (getUserMedia + enumerateDevices)
  ├─ Module Quét mã (BarcodeDetector API + fallback zxing-wasm)
  ├─ Module Quay video (MediaRecorder API)
  ├─ IndexedDB (lưu tạm video + metadata, hàng đợi upload)
  └─ Module Upload (gọi Backend trung gian → Google Drive API, resumable upload)

[Backend trung gian - nhỏ, serverless]
  ├─ Xác thực app (token nội bộ đơn giản, không cần tài khoản Google cho từng nhân viên)
  ├─ Giữ Service Account credentials Google Drive (không lộ ra trình duyệt)
  └─ Sinh resumable-upload session URL, ghi metadata vào Google Sheet

[Google Drive - tài khoản/Shared Drive admin cấu hình sẵn]
```

**Lý do bắt buộc phải có Backend trung gian dù là PWA nhỏ:** không được nhúng Service Account key trực tiếp vào mã nguồn frontend (ai mở DevTools cũng lấy được) → bắt buộc một lớp trung gian giữ khoá, kể cả chỉ là 1 Cloud Function/Node service rất nhỏ.

---

## 2. Bảng tương thích trình duyệt/thiết bị (căn cứ thực tế 2026)

| Tính năng | iOS Safari (di động) | Android Chrome | Windows Chrome/Edge (webcam rời & cam laptop) | macOS Safari/Chrome |
|---|---|---|---|---|
| Cài PWA "Add to Home Screen"/Install | Có (qua Safari, tạo WebClip — không đầy đủ như PWA chuẩn) | Có (đầy đủ) | Có (đầy đủ, icon cài trên thanh địa chỉ) | Có |
| `getUserMedia` (bật camera) | Có (yêu cầu HTTPS + phải bắt đầu từ thao tác chạm của người dùng) | Có | Có | Có |
| `enumerateDevices` (liệt kê nhiều camera) | Có nhưng hạn chế đổi camera giữa chừng mượt mà | Có | Có — quan trọng nhất cho nhóm B/C để chọn webcam rời | Có |
| `MediaRecorder` (quay video) | Có từ Safari 14.5+, khuyến nghị ép codec **H.264 Baseline + AAC** để chắc chắn tương thích | Có, mặc định VP8/VP9+Opus (WebM) | Có, WebM (VP8/VP9) | Có |
| `BarcodeDetector` (quét mã native, miễn phí, không cần thư viện) | **Không hỗ trợ** (bị tắt mặc định) | Có (từ Chrome 134+, phủ ~94% người dùng Chrome) | Có | Không hỗ trợ trên Safari, có trên Chrome |
| Background Sync / Background Fetch (upload nền khi tắt app) | **Không hỗ trợ** | Có | Có | Không hỗ trợ trên Safari |
| Độ ổn định lưu trữ IndexedDB lâu dài | Rủi ro: dữ liệu có thể bị hệ thống dọn nếu app không mở lại trong ~7 ngày | Ổn định | Ổn định | Rủi ro tương tự Safari di động |

**Kết luận kỹ thuật quan trọng nhất:**
1. **Không thể dùng BarcodeDetector làm giải pháp quét mã duy nhất** vì toàn bộ người dùng iPhone (nhóm A — nhóm ưu tiên số 1) sẽ không quét được. → Bắt buộc dùng thư viện fallback đa nền tảng: khuyến nghị **zxing-wasm** (nhẹ, nhanh, chạy được trên mọi trình duyệt hỗ trợ WebAssembly, không tốn phí bản quyền — khác với các SDK thương mại như Dynamsoft). Logic: nếu `'BarcodeDetector' in window` → dùng API gốc (nhanh hơn, đỡ tốn pin), nếu không → dùng zxing-wasm.
2. **Không thể dựa vào Background Sync để tự upload khi người dùng đã thoát/khoá máy** trên iOS. → Thiết kế upload phải chủ động chạy khi app đang mở/foreground, cộng thêm nhắc nhở người dùng "còn video chưa upload, vui lòng giữ app mở" khi có việc tồn đọng, và tự động thử lại ngay khi app được mở lại (`visibilitychange`, `online` event).
3. **Ưu tiên upload ngay lập tức** ngay sau khi quay xong (thay vì gom nhiều video rồi upload sau) để giảm thời gian dữ liệu nằm trong IndexedDB — giảm rủi ro bị hệ thống iOS dọn dẹp trước khi kịp upload.

---

## 3. Chi tiết từng module

### 3.1 Module Camera & chọn thiết bị
```js
const devices = await navigator.mediaDevices.enumerateDevices();
const videoInputs = devices.filter(d => d.kind === 'videoinput');
```
- **Nhóm A (di động):** mặc định `facingMode: { ideal: 'environment' }` (camera sau). Có nút chuyển camera trước/sau.
- **Nhóm B (PC + webcam rời):** thường chỉ có 1 camera (webcam USB) → tự chọn, không cần hỏi. Nếu có nhiều webcam cắm cùng lúc → hiện dropdown chọn theo `label` (tên thiết bị, ví dụ "Logitech C920").
- **Nhóm C (laptop):** có ít nhất 1 camera tích hợp; nếu cắm thêm webcam ngoài → ưu tiên hiển thị dropdown để nhân viên tự chọn (không đoán tự động, vì camera tích hợp laptop thường đặt ở vị trí không thuận cho việc quay đóng gói).
- Lưu lựa chọn thiết bị camera vào `localStorage` để lần sau mở app tự dùng lại đúng camera đã chọn trên máy đó.

### 3.2 Module quét mã
- Vẽ khung quét (viewfinder) chuẩn UX quét mã, giữ camera resolution vừa đủ (720p) để cân bằng tốc độ nhận diện & hiệu năng.
- Danh sách định dạng cần hỗ trợ: `qr_code`, `code_128`, `code_39`, `ean_13` (đa số đơn vị vận chuyển VN dùng Code128 hoặc QR).
- Cơ chế: quét trong vòng lặp `requestAnimationFrame`, throttle để không đốt pin (quét mỗi ~150-200ms là đủ).

### 3.3 Module quay video
- Định dạng ghi:
  - iOS Safari: `video/mp4; codecs=avc1` (H.264) nếu hỗ trợ, kiểm tra bằng `MediaRecorder.isTypeSupported(...)` trước khi khởi tạo.
  - Chrome/Edge (Windows/Android): `video/webm; codecs=vp9` mặc định, có thể chuyển sang `vp8` nếu cần tương thích cũ hơn.
- Giới hạn độ phân giải quay đề xuất: **1280x720**, bitrate ~2.5 Mbps — đủ rõ làm bằng chứng, giảm đáng kể dung lượng so với 1080p/4K.
- Overlay mã đơn + timestamp: vẽ trực tiếp lên `<canvas>` ghép với luồng video trước khi đưa vào `MediaRecorder` (canvas capture stream), để mã đơn "cháy" vào video, không thể chỉnh sửa sau.

### 3.4 Hàng đợi & lưu trữ tạm (IndexedDB)
- Thư viện đề xuất: `idb` (wrapper nhẹ cho IndexedDB).
- Cấu trúc bản ghi:
```json
{
  "id": "uuid",
  "maVanDon": "GHN0123456789",
  "donViVC": "GHN",
  "loaiBienBan": "dong_goi | khui_hang",
  "nhanVien": "NV003",
  "thoiGianTao": "2026-09-14T14:30:22+07:00",
  "videoBlob": "<Blob>",
  "kichThuoc": 15234099,
  "trangThai": "cho_upload | dang_upload | da_upload | loi",
  "driveFileId": null
}
```
- Dùng `navigator.storage.estimate()` để cảnh báo khi dung lượng trình duyệt gần đầy.
- Dùng `navigator.storage.persist()` để **xin quyền lưu trữ bền vững**, giảm rủi ro bị hệ điều hành tự động xoá (hỗ trợ tốt trên Chrome/Edge; trên Safari hiệu quả có giới hạn nhưng vẫn nên gọi).

### 3.5 Module upload
- **Kiến trúc Web Worker:** Toàn bộ tiến trình đọc file từ IndexedDB và upload (resumable) lên Google Drive được thực hiện trong một **Dedicated Web Worker** (`upload.worker.ts`). Điều này giải phóng Main Thread 100%, chống giật lag UI và Camera khi nhân viên quay video liên tục (ngay cả trên thiết bị di động yếu).
- Dùng **Google Drive API resumable upload** (upload theo chunk, tự nối lại nếu đứt giữa chừng) — không upload thẳng từ trình duyệt tới Drive, mà qua Backend trung gian để lấy `resumable_upload_url`.
- Trigger upload khi: (a) có item mới trong queue, (b) app quay lại foreground, (c) có sự kiện `online`. Worker tự động xử lý hàng đợi tuần tự (1 file/lần) ngầm.
- Retry với backoff (2s, 4s, 8s, 16s, 32s + jitter) tối đa 5 lần, sau đó đánh dấu "lỗi" và cho phép nhân viên bấm "thử lại tay".

### 3.6 Cơ chế Tự động quay khi nhận mã (Auto-Record / Hands-free Mode)
- **Mục đích:** Tối ưu hóa năng suất đóng gói, nhân viên chỉ cần quét mã (bằng camera hoặc súng USB), hệ thống tự động quay mà không cần chạm tay vào màn hình điện thoại/máy tính.
- **Cấu hình kích hoạt:**
  - Thuộc tính `recordTriggerMode: 'auto' | 'confirm'` lưu trữ tại Zustand `configStore` và đồng bộ `localStorage('record_trigger_mode')`.
  - Mặc định toàn hệ thống là `'confirm'` (an toàn), người dùng/quản lý có thể bật `'auto'` trong Cài đặt.
- **Quy trình điều phối (State Machine):**
  1. Quét mã thành công (`onDetected`) → Phát tín hiệu âm thanh thành công (beep ngắn 2400Hz to, thanh, cao mạnh).
  2. Bắn yêu cầu kiểm tra mã trùng song song qua API `/api/v1/bien-ban/check-duplicate`.
  3. Kiểm tra điều kiện rẽ nhánh:
     - **Nếu `recordTriggerMode === 'auto'`:**
       - **Trường hợp mã hợp lệ (không trùng):** Tự động nhận diện ĐVVC (`detectCarrier(code)`), gán loại biên bản mặc định (`dong_goi`), phát tín hiệu rung haptic/âm báo kích hoạt kép (1000Hz), đếm ngược ngắn (tuỳ chọn 500ms) rồi gọi thẳng `startRecording()`. Bỏ qua hoàn toàn modal xác nhận `ScanResult`.
       - **Trường hợp mã trùng (`isDuplicate === true`) hoặc lỗi API:** Hệ thống tự động rơi về cơ chế bảo vệ (Fail-safe Fallback), hiển thị modal `ScanResult` kèm cảnh báo đỏ và chi tiết người quay trước đó để nhân viên quyết định quay tiếp hay dừng.
     - **Nếu `recordTriggerMode === 'confirm'`:** Luôn bung modal `ScanResult` để nhân viên chọn ĐVVC, loại biên bản và bấm nút "Bắt đầu quay" thủ công.
- **Độ trễ kích hoạt:** Yêu cầu chuyển trạng thái từ lúc quét mã đến khi `MediaRecorder` nhận dòng stream bắt đầu ghi <= 500ms.

---

## 4. Ngăn xếp công nghệ (đã chốt)

| Thành phần | Lựa chọn |
|---|---|
| Framework frontend | React 18+ (TypeScript) + Vite 5+ (build PWA nhanh qua `vite-plugin-pwa`) |
| State management | Zustand |
| Routing | React Router v6 |
| Quét mã | Native `BarcodeDetector` + fallback `zxing-wasm` |
| Quay video | `MediaRecorder` API thuần + Canvas overlay |
| Lưu trữ tạm | IndexedDB qua thư viện `idb` |
| Service Worker | Workbox (qua `vite-plugin-pwa`) — xem chi tiết ở mục 6 |
| **Backend trung gian** | **Cloudflare Workers** + Hono framework (edge runtime, không cold start, free tier 100K req/ngày) |
| **Database** | **Cloudflare D1** (SQLite tại edge, free tier 5GB, 5M reads/ngày) |
| Lưu trữ video | Google Drive API v3 (resumable upload, Shared Drive qua Service Account) |
| Tra cứu nhanh | Google Sheets API (đồng bộ metadata cho admin xem trực tiếp) |
| **Hosting frontend** | **Cloudflare Pages** (HTTPS mặc định, unlimited bandwidth, auto deploy từ Git) |

> **Tổng chi phí hosting + DB: $0/tháng** — chỉ tốn tiền Google Workspace (công ty đã có) cho dung lượng Drive chứa video.

---

## 5. Yêu cầu bảo mật & vận hành

- **HTTPS bắt buộc tuyệt đối** — `getUserMedia` sẽ bị từ chối trên HTTP (trừ `localhost` lúc dev).
- Không dùng tài khoản Google cá nhân của nhân viên để tránh mất quyền truy cập khi nghỉ việc — đăng nhập nội bộ bằng mã nhân viên/PIN, xác thực với Backend trung gian bằng token riêng của hệ thống.
- Ghi log server-side mọi lượt upload (ai, khi nào, file nào) để phục vụ audit.
- Cấu hình CORS ở Backend chỉ cho phép domain app gọi vào.

---

## 6. Service Worker Strategy (chi tiết)

### Precache (build time — tự động qua Workbox)
- Tất cả static assets: `**/*.{js,css,html,ico,png,svg,woff2}`
- App shell HTML (index.html)
- Icon files, splash screens
- Sound file (beep.mp3)

### Runtime Cache
| URL Pattern | Strategy | Max Entries | Max Age |
|---|---|---|---|
| `/api/dashboard/*` | NetworkFirst | 10 | 5 phút |
| `/api/bien-ban*` (GET) | NetworkFirst | 50 | 5 phút |
| `/api/admin/cau-hinh` | StaleWhileRevalidate | 5 | 1 giờ |
| Google Fonts | CacheFirst | 20 | 365 ngày |
| Mọi API khác | NetworkOnly | — | — |

### Offline Fallback
- Khi mất mạng: app shell vẫn mở được (cached)
- Camera + quét mã + quay video: **hoạt động bình thường** (tất cả local)
- Upload + tra cứu: hiện thông báo "Cần kết nối mạng"
- Không dùng Background Sync (không hỗ trợ trên iOS Safari)

---

## 7. PWA Manifest Specification

```json
{
  "name": "Quay Video Đóng Hàng",
  "short_name": "QuayVideo",
  "description": "Quay video đóng gói/khui hàng, quét mã vận đơn, lưu trữ Google Drive",
  "start_url": "/",
  "display": "standalone",
  "orientation": "any",
  "theme_color": "#1a1a2e",
  "background_color": "#1a1a2e",
  "icons": [
    { "src": "icons/icon-72.png",  "sizes": "72x72",   "type": "image/png" },
    { "src": "icons/icon-96.png",  "sizes": "96x96",   "type": "image/png" },
    { "src": "icons/icon-128.png", "sizes": "128x128", "type": "image/png" },
    { "src": "icons/icon-144.png", "sizes": "144x144", "type": "image/png" },
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

**iOS Safari cần thêm meta tags** (vì Safari không đọc đầy đủ manifest):
```html
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="QuayVideo">
<link rel="apple-touch-icon" href="/icons/icon-192.png">
```

---

## 8. Video Compression Strategy

### Phase 1 (MVP): Không nén — upload trực tiếp
- MediaRecorder output (720p, ~2.5Mbps) đã đủ nhỏ (~18MB/phút)
- Nén phía client tốn CPU + thời gian, delay UX
- Ưu tiên upload nhanh hơn là tiết kiệm vài MB

### Phase 1 (sau MVP): Nén nhẹ trước upload
- **Giảm bitrate khi quay**: thay vì nén sau, giảm `videoBitsPerSecond` của MediaRecorder xuống 1.5-2Mbps
- Kết quả: ~12MB/phút thay vì ~18MB, chất lượng vẫn đủ rõ cho bằng chứng

### Phase 2 (nếu cần): Nén nặng bằng WebCodecs/FFmpeg.wasm
- Dùng WebCodecs API (Chrome 94+) hoặc FFmpeg.wasm để transcode
- Chỉ nên làm khi dung lượng Drive thực sự là vấn đề
- Trade-off: tốn 10-30 giây CPU phía client cho mỗi video

---

*Xem tiếp: **03-uiux-flow.md** (màn hình & luồng thao tác chi tiết theo từng nhóm thiết bị).*
