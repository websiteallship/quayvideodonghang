# 15 — HƯỚNG DẪN TRIỂN KHAI HỆ THỐNG (DEPLOYMENT GUIDE)

Tài liệu chuẩn hóa toàn bộ quy trình đưa hệ thống **Quay Video Đóng Hàng** từ môi trường phát triển lên Production trên hạ tầng Cloudflare (Workers, Pages, D1) kết hợp lưu trữ Google Cloud (Google Drive API, Google Sheets API).

---

## 1. TỔNG QUAN KIẾN TRÚC & YÊU CẦU HỆ THỐNG

### 1.1 Sơ đồ kiến trúc Production

```
                                  INTERNET
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           ▼                                                   ▼
┌─────────────────────────┐                         ┌──────────────────────────┐
│ Cloudflare Pages        │                         │ Cloudflare Workers       │
│ (Frontend PWA React 19) │                         │ (Backend API Hono)       │
│ https://quayvideo.      │                         │ https://quayvideo-api.   │
│ pages.dev               │                         │ <account>.workers.dev    │
└──────────┬──────────────┘                         └─────────────┬────────────┘
           │                                                      │
           │ API Requests (Bearer JWT)                            │
           └──────────────────────────────────────────────────────┤
                                                                  │
                                            ┌─────────────────────┼─────────────────────┐
                                            ▼                     ▼                     ▼
                                 ┌──────────────────┐  ┌────────────────────┐ ┌────────────────────┐
                                 │ Cloudflare D1    │  │ Google Drive API   │ │ Google Sheets API  │
                                 │ (SQLite at Edge) │  │ (Resumable Upload) │ │ (Log Metadata)     │
                                 │ quayvideo-db     │  │ Thư mục YYYY/MM/DD │ │ Tab "DuLieu"       │
                                 └──────────────────┘  └────────────────────┘ └────────────────────┘
```

### 1.2 Yêu cầu tiên quyết
- **Node.js**: >= 18.0.0 (khuyến nghị v20 LTS).
- **Trình quản lý gói**: `npm` >= 9.x.
- **Tài khoản Cloudflare**: Miễn phí (đã kích hoạt Workers, Pages và D1).
- **Tài khoản Google Cloud**: Đã kích hoạt Google Drive API & Google Sheets API.
- **Wrangler CLI**: Đã cài đặt toàn cục (`npm install -g wrangler`) hoặc chạy qua `npx wrangler`.

---

## 2. BƯỚC 1: CẤU HÌNH DỊCH VỤ GOOGLE CLOUD

Hệ thống hỗ trợ 2 phương án xác thực với Google:
- **Phương án A (Khuyến nghị cho Doanh nghiệp / Google Workspace)**: Sử dụng **Service Account** đẩy vào **Shared Drive** (Bộ nhớ dùng chung).
- **Phương án B (Khuyến nghị cho Cá nhân / Gmail Miễn phí 15GB)**: Sử dụng **OAuth 2.0 Client ID + Refresh Token** đẩy vào Google Drive cá nhân (tránh lỗi giới hạn quota 0GB của Service Account trên My Drive).

---

### Phương án A: Cấu hình Service Account (Shared Drive)

1. **Tạo Service Account**:
   - Truy cập [Google Cloud Console](https://console.cloud.google.com).
   - Chọn project → Vào **APIs & Services** → **Library** → Bật:
     - `Google Drive API`
     - `Google Sheets API`
   - Vào **Credentials** → **Create Credentials** → **Service Account**:
     - Tên: `quayvideo-uploader`
     - Bấm **Done** (bỏ qua bước phân quyền Role trên Project).
   - Nhấp vào Service Account vừa tạo → Tab **Keys** → **Add Key** → **Create new key** → Chọn **JSON**.
   - Tải file JSON về máy tính (tuyệt đối không chia sẻ hay commit lên Git).

2. **Cấp quyền trên Shared Drive**:
   - Mở Google Drive → Vào **Shared Drives** (Bộ nhớ dùng chung) → Tạo thư mục mới (ví dụ: `DongGoi_Videos`).
   - Chuột phải vào Shared Drive → **Manage members** (Quản lý thành viên).
   - Thêm email Service Account (`quayvideo-uploader@<project-id>.iam.gserviceaccount.com`) với quyền **Content Manager**.
   - Sao chép `DRIVE_FOLDER_ID` trên URL:
     `https://drive.google.com/drive/u/0/folders/<DRIVE_FOLDER_ID>`

---

### Phương án B: Cấu hình OAuth 2.0 Refresh Token (Drive cá nhân)

Chi tiết thực hiện theo [`13-huong-dan-lay-refresh-token.md`](file:///d:/TOOL%20AI/TOOL_QUAYVIDEO/docs/13-huong-dan-lay-refresh-token.md):
1. **OAuth Consent Screen**: Chọn **External**, thêm email cá nhân vào **Test users**.
2. **Credentials**: Tạo **OAuth Client ID** loại **Web application**.
   - Redirect URI: `https://developers.google.com/oauthplayground`
   - Thu thập: `GOOGLE_CLIENT_ID` và `GOOGLE_CLIENT_SECRET`.
3. **Lấy Refresh Token**:
   - Truy cập [Google OAuth Playground](https://developers.google.com/oauthplayground/).
   - Cấu hình bánh răng ⚙️: Tích chọn *Use your own OAuth credentials*, điền Client ID & Secret.
   - Ủy quyền 2 scope:
     - `https://www.googleapis.com/auth/drive`
     - `https://www.googleapis.com/auth/spreadsheets`
   - Nhấn **Exchange authorization code for tokens** → Thu thập `GOOGLE_REFRESH_TOKEN`.
4. **Thư mục Drive cá nhân**: Tạo thư mục trên My Drive (ví dụ: `DongGoi_Videos`) và lấy `DRIVE_FOLDER_ID` từ URL.

---

### Thiết lập Google Sheet Template

1. Tạo file Google Sheet mới: Đặt tên `QuayVideo_Metadata`.
2. Đổi tên tab đầu tiên thành: **`DuLieu`** (chính xác từng ký tự).
3. Điền tiêu đề cột Hàng 1 (Header từ Cột A đến L):

| Cột | Tên trường | Kiểu dữ liệu | Mô tả |
|:---:|---|---|---|
| **A** | ID | Text (UUID) | ID duy nhất biên bản |
| **B** | Mã vận đơn | Text | Mã vận đơn quét được |
| **C** | ĐVVC | Text | Đơn vị vận chuyển (GHN, GHTK, ...) |
| **D** | Loại biên bản | Text | `dong_goi` hoặc `khui_hang` |
| **E** | Mã nhân viên | Text | Mã nhân viên thao tác |
| **F** | Thời gian tạo | Text (ISO/VN) | Thời gian hoàn thành đóng gói |
| **G** | Thời lượng (s) | Số nguyên | Độ dài video (giây) |
| **H** | Dung lượng (bytes)| Số nguyên | Kích thước file video |
| **I** | Drive File ID | Text | ID file trên Google Drive |
| **J** | Tên file | Text | Tên file chuẩn hóa |
| **K** | Link xem | Text URL | Link xem trực tiếp video |
| **L** | Trạng thái | Text | Trạng thái biên bản (`da_upload`) |

4. Cố định hàng đầu: **View** → **Freeze** → **1 row**.
5. **Chia sẻ quyền**:
   - Nếu dùng Phương án A (Service Account): Bấm **Share** → Thêm email Service Account với quyền **Editor**.
   - Nếu dùng Phương án B (OAuth cá nhân): File nằm sẵn trên Drive cá nhân, không cần chia sẻ thêm.
6. Sao chép `GOOGLE_SHEET_ID` từ thanh URL:
   `https://docs.google.com/spreadsheets/d/<GOOGLE_SHEET_ID>/edit`

---

## 3. BƯỚC 2: KHỞI TẠO CƠ SỞ DỮ LIỆU CLOUDFLARE D1

### 3.1 Đăng nhập Cloudflare Wrangler
Mở Terminal tại thư mục gốc dự án:
```bash
npx wrangler login
```
*(Trình duyệt sẽ tự động mở để xác thực tài khoản Cloudflare)*

### 3.2 Tạo Database D1 trên Cloudflare
```bash
npx wrangler d1 create quayvideo-db
```
Kết quả trả về sẽ có dạng:
```text
✅ Successfully created DB 'quayvideo-db'
[[d1_databases]]
binding = "DB"
database_name = "quayvideo-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### 3.3 Cập nhật ID vào `backend/wrangler.toml`
Mở file [backend/wrangler.toml](file:///d:/TOOL%20AI/TOOL_QUAYVIDEO/backend/wrangler.toml) và thay thế `database_id`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "quayvideo-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" # Thay bằng ID vừa tạo
```

### 3.4 Thực thi tuần tự 6 Migration lên Production (Remote)
Hệ thống sử dụng 6 migration khởi tạo bảng, khóa phụ, chống brute-force và token stream video. Chạy các lệnh sau từ thư mục `backend`:

```bash
cd backend

# 1. Khởi tạo bảng core (nhan_vien, bien_ban, phien_dang_nhap, upload_log, cau_hinh)
npx wrangler d1 execute quayvideo-db --remote --file=./migrations/0001_initial_schema.sql

# 2. Seed tài khoản khởi tạo (ADMIN: PIN 0000, NV001: PIN 1234, default configs)
npx wrangler d1 execute quayvideo-db --remote --file=./migrations/0002_seed_data.sql

# 3. Quản lý danh mục kho vận tập trung (kho_hang)
npx wrangler d1 execute quayvideo-db --remote --file=./migrations/0003_warehouse_management.sql

# 4. Chính sách lưu trữ & dọn dẹp video tự động (retention)
npx wrangler d1 execute quayvideo-db --remote --file=./migrations/0004_data_retention.sql

# 5. Khóa đăng nhập tạm thời chống Brute-force PIN (login_attempts)
npx wrangler d1 execute quayvideo-db --remote --file=./migrations/0005_login_attempts.sql

# 6. Bảo mật xem lại video bằng Stream Token ngắn hạn (stream_tokens)
npx wrangler d1 execute quayvideo-db --remote --file=./migrations/0006_stream_tokens.sql
```

> [!TIP]
> Để kiểm tra các bảng đã tạo thành công:
> ```bash
> npx wrangler d1 execute quayvideo-db --remote --command="SELECT name FROM sqlite_master WHERE type='table';"
> ```

---

## 4. BƯỚC 3: CẤU HÌNH & DEPLOY BACKEND (CLOUDFLARE WORKERS)

### 4.1 Cấu hình Secrets bảo mật
Tất cả khóa riêng tư và secret nhạy cảm được đưa trực tiếp vào Cloudflare Secret Manager (không lưu trong git):

```bash
cd backend

# 1. Khóa ký JWT (chuỗi ngẫu nhiên tối thiểu 32 ký tự)
npx wrangler secret put JWT_SECRET
# Nhập chuỗi bảo mật ngẫu nhiên (ví dụ: c8f2e9a1b4d7e6f3a5c2b9d8e7f1a4b6c8d0e2f4a6b8c0d2e4f6a8b0c2d4e6f8)

# 2. Cấu hình ID thư mục Drive và Google Sheet
npx wrangler secret put DRIVE_FOLDER_ID
# Nhập DRIVE_FOLDER_ID thu được ở Bước 1

npx wrangler secret put GOOGLE_SHEET_ID
# Nhập GOOGLE_SHEET_ID thu được ở Bước 1
```

**Nhập thông tin xác thực Google tương ứng với phương án bạn chọn:**

- **Nếu dùng Phương án A (Service Account)**:
  ```bash
  # Lệnh PowerShell nén JSON thành 1 dòng trước khi paste:
  (Get-Content "..\quayvideo-credentials.json" -Raw) -replace "`r?`n", "" | Set-Clipboard
  
  npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON
  # Dán chuỗi JSON 1 dòng vào Terminal
  ```

- **Nếu dùng Phương án B (OAuth2 Cá nhân)**:
  ```bash
  npx wrangler secret put GOOGLE_CLIENT_ID
  # Nhập GOOGLE_CLIENT_ID
  
  npx wrangler secret put GOOGLE_CLIENT_SECRET
  # Nhập GOOGLE_CLIENT_SECRET
  
  npx wrangler secret put GOOGLE_REFRESH_TOKEN
  # Nhập chuỗi Refresh Token (1//0...)
  ```

### 4.2 Cập nhật Biến Môi Trường Không Nhạy Cảm (`wrangler.toml`)
Kiểm tra file [backend/wrangler.toml](file:///d:/TOOL%20AI/TOOL_QUAYVIDEO/backend/wrangler.toml):
```toml
[vars]
# Tạm thời cấu hình, sau khi deploy frontend có domain chính thức sẽ cập nhật lại
ALLOWED_ORIGINS = "https://quayvideo.pages.dev,http://localhost:5173,https://localhost:5173"
JWT_EXPIRES_IN = "86400"
UPLOAD_CHUNK_SIZE = "5242880"
```

### 4.3 Triển khai Backend API
```bash
npm run deploy
```
*Wrangler sẽ biên dịch code bằng esbuild, tối ưu bundle và đẩy lên mạng lưới Cloudflare Edge toàn cầu.*

Ghi lại đường dẫn API được Cloudflare cấp:
```text
Uploaded quayvideo-api (1.20 sec)
Deployed quayvideo-api triggers (0.50 sec)
  https://quayvideo-api.<tên-subdomain-cloudflare>.workers.dev
```

### 4.4 Kiểm tra Endpoint Backend
Chạy kiểm tra tình trạng dịch vụ bằng cURL hoặc trình duyệt:
```bash
curl https://quayvideo-api.<tên-subdomain-cloudflare>.workers.dev/health
# Kết quả mong đợi: OK

curl https://quayvideo-api.<tên-subdomain-cloudflare>.workers.dev/
# Kết quả mong đợi: {"success":true,"data":{"status":"ok","service":"Quay Video Kho Van API",...}}
```

---

## 5. BƯỚC 4: TRIỂN KHAI FRONTEND (CLOUDFLARE PAGES)

Cloudflare Pages hỗ trợ 2 hình thức: **Git Integration** (Khuyến nghị để CI/CD tự động) hoặc **Direct Deploy qua CLI**.

---

### Phương án 1: Triển khai tự động qua GitHub/GitLab (Khuyến nghị)

1. Push toàn bộ mã nguồn lên repository GitHub/GitLab của bạn:
   ```bash
   git add .
   git commit -m "feat: chuẩn bị cấu hình production"
   git push origin main
   ```
2. Mở [Cloudflare Dashboard](https://dash.cloudflare.com/) → Vào mục **Workers & Pages** → **Create application** → Chọn tab **Pages** → **Connect to Git**.
3. Chọn repository dự án → Bấm **Begin setup**.
4. Cấu hình thông số Build:
   - **Project name**: `quayvideo` (Domain mặc định sẽ là `quayvideo.pages.dev`)
   - **Production branch**: `main` (hoặc branch mặc định của bạn)
   - **Framework preset**: `Vite` (hoặc `None`)
   - **Root directory**: `frontend`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. **Cấu hình Biến Môi Trường (Environment Variables)**:
   Mở mục **Environment variables (advanced)** → Thêm biến sau:
   - **Variable name**: `VITE_API_URL` (hoặc `VITE_API_BASE_URL`)
   - **Value**: `https://quayvideo-api.<tên-subdomain-cloudflare>.workers.dev` *(URL Backend lấy từ Bước 3)*
6. Nhấn **Save and Deploy**. Cloudflare Pages sẽ tự động cài đặt gói, chạy `tsc -b && vite build` và xuất bản trang web.

---

### Phương án 2: Triển khai trực tiếp bằng CLI (Wrangler Direct Upload)

Nếu không dùng Git kết nối trực tiếp, bạn có thể build và deploy từ máy tính:

1. Di chuyển vào thư mục `frontend`:
   ```bash
   cd frontend
   ```
2. Tạo file cấu hình môi trường production `.env.production`:
   ```ini
   VITE_API_BASE_URL=https://quayvideo-api.<tên-subdomain-cloudflare>.workers.dev
   VITE_API_URL=https://quayvideo-api.<tên-subdomain-cloudflare>.workers.dev
   ```
3. Chạy build production:
   ```bash
   npm run build
   ```
   *(Quá trình build sẽ sinh thư mục `frontend/dist` chứa asset, PWA Service Worker `sw.js` và file điều hướng SPA `_redirects`)*

4. Triển khai thư mục `dist` lên Cloudflare Pages:
   ```bash
   npx wrangler pages deploy dist --project-name=quayvideo
   ```
   *Lần đầu chạy lệnh, Wrangler sẽ tự động tạo project `quayvideo` trên tài khoản Cloudflare của bạn.*

---

## 6. BƯỚC 5: KHỚP NỐI CORS & BẢO MẬT GIỮA FRONTEND VÀ BACKEND

Để trình duyệt không bị lỗi `CORS Blocked (403 Forbidden)`, domain của Frontend Pages bắt buộc phải nằm trong danh sách `ALLOWED_ORIGINS` của Backend.

1. Lấy URL chính thức của Cloudflare Pages (ví dụ: `https://quayvideo.pages.dev` hoặc custom domain `https://quayvideo.tencongty.vn`).
2. Mở file [backend/wrangler.toml](file:///d:/TOOL%20AI/TOOL_QUAYVIDEO/backend/wrangler.toml) và cập nhật:
   ```toml
   [vars]
   ALLOWED_ORIGINS = "https://quayvideo.pages.dev,https://quayvideo.tencongty.vn,http://localhost:5173"
   ```
3. Deploy lại Backend để áp dụng:
   ```bash
   cd backend
   npm run deploy
   ```

---

## 7. BƯỚC 6: CẤU HÌNH DOMAIN RIÊNG & SSL (TÙY CHỌN)

WebRTC Camera (`navigator.mediaDevices.getUserMedia`) và PWA Service Worker **bắt buộc yêu cầu kết nối HTTPS an toàn** (ngoại trừ `localhost`). Mặc định domain `*.pages.dev` và `*.workers.dev` của Cloudflare đã có sẵn chứng chỉ SSL hợp lệ.

Nếu muốn gắn tên miền thương hiệu công ty:
1. **Frontend**: Cloudflare Dashboard → **Workers & Pages** → Chọn dự án `quayvideo` → Tab **Custom domains** → **Set up a custom domain** (ví dụ: `quayvideo.tencongty.com`).
2. **Backend**: Cloudflare Dashboard → Chọn Worker `quayvideo-api` → Tab **Settings** → **Triggers** → **Custom Domains** → Thêm `api-quayvideo.tencongty.com`.
3. Cập nhật lại `ALLOWED_ORIGINS` ở Backend và `VITE_API_URL` ở Frontend cho khớp tên miền mới.

---

## 8. BẢNG CHECKLIST KIỂM THỬ VẬN HÀNH SAU KHI DEPLOY (SMOKE TEST)

Sau khi hoàn tất quá trình triển khai, thực hiện tuần tự danh sách kiểm tra sau:

| STT | Hạng mục kiểm tra | Thao tác thực hiện | Kết quả mong đợi |
|:---:|---|---|---|
| **1** | Truy cập trang web | Mở `https://quayvideo.pages.dev` trên Chrome/Safari | Giao diện hiển thị tức thì, tải font Geist và Dark theme mượt mà |
| **2** | Định tuyến SPA | Bấm F5 (Reload) tại đường dẫn `/login` hoặc `/history` | Không bị lỗi 404 của Cloudflare (nhờ file `_redirects`) |
| **3** | Đăng nhập Quản trị viên | Chọn tài khoản `ADMIN` → Nhập PIN khởi tạo `0000` | Đăng nhập thành công, chuyển hướng vào màn hình chính/Dashboard |
| **4** | Đổi mã PIN bảo mật | Vào trang Quản trị (`/admin/employees`) → Đổi PIN `ADMIN` | Hệ thống cập nhật thành công, PIN mới có hiệu lực ngay lập tức |
| **5** | Kiểm tra kết nối Google Drive | Vào Cấu hình hệ thống (`/admin/settings`) → Bấm **Kiểm tra kết nối Google Drive** | Trả về thông báo xanh: *Kết nối Drive thành công*, đúng tên thư mục và hạn mức |
| **6** | Cấp quyền Camera & Quét mã | Vào màn hình quay video → Cấp quyền Camera | Preview video hiển thị mượt mà. Quét mã vận đơn mẫu (barcode/QR code) thành công và phát âm thanh bip |
| **7** | Quay & Upload Video thật | Bấm quay 5-10 giây → Bấm dừng quay | Video được nén và tải lên Google Drive; thanh tiến trình hiển thị 100% |
| **8** | Đối soát Google Drive | Mở Google Drive trên trình duyệt | Thư mục `YYYY/MM/DD` tự động được tạo, video hiển thị đúng chuẩn tên file `{Loai}_{MaVanDon}_{DVVC}_{MaNV}_{Timestamp}.webm` |
| **9** | Đối soát Google Sheet | Mở file `QuayVideo_Metadata` | Tab `DuLieu` xuất hiện 1 dòng mới với đầy đủ 12 trường metadata và link xem trực tiếp |
| **10** | Cài đặt PWA | Mở menu trình duyệt trên điện thoại/máy tính → Chọn **Cài đặt ứng dụng** / **Thêm vào màn hình chính** | App cài đặt thành icon riêng biệt, mở toàn màn hình (Standalone) không thanh URL trình duyệt |

---

## 9. XỬ LÝ SỰ CỐ PHỔ BIẾN (TROUBLESHOOTING)

### 1. Lỗi `CORS error` hoặc HTTP 403 khi gọi API
- **Nguyên nhân**: Domain Frontend chưa được khai báo trong biến `ALLOWED_ORIGINS` của Worker.
- **Khắc phục**: Kiểm tra lại URL chính xác (kèm giao thức `https://`, không có dấu `/` ở cuối) trong `backend/wrangler.toml` → Chạy `npm run deploy` lại.

### 2. Lỗi `404 Not Found` khi F5 hoặc truy cập trực tiếp URL con trên Cloudflare Pages
- **Nguyên nhân**: Cloudflare Pages chưa nhận diện cấu hình định tuyến cho Single Page Application (SPA).
- **Khắc phục**: Đảm bảo file `frontend/public/_redirects` có dòng:
  ```text
  /*    /index.html   200
  ```
  Sau khi build, kiểm tra `dist/_redirects` tồn tại trước khi deploy.

### 3. Lỗi `403 storageQuotaExceeded` khi tải video lên Google Drive
- **Nguyên nhân**: Dùng Service Account đẩy vào thư mục **My Drive** (Drive cá nhân) thay vì **Shared Drive** (Service account chỉ có 0GB lưu trữ trên My Drive).
- **Khắc phục**:
  - Chuyển thư mục sang **Shared Drive** (Google Workspace).
  - Hoặc chuyển sang **Phương án B (OAuth2 Refresh Token)** để sử dụng 15GB miễn phí của tài khoản Gmail cá nhân.

### 4. Lỗi `Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON`
- **Nguyên nhân**: Chuỗi JSON của Service Account bị ngắt dòng hoặc chứa ký tự đặc biệt khi đưa vào Cloudflare Secret.
- **Khắc phục**: Sử dụng lệnh PowerShell loại bỏ xuống dòng trước khi paste vào secret:
  ```powershell
  (Get-Content "service-account.json" -Raw) -replace "`r?`n", "" | Set-Clipboard
  ```

### 5. Camera không khởi động được (`NotAllowedError` hoặc `NotFoundError`)
- **Nguyên nhân**: Trang web chạy trên giao thức `http://` (không phải `localhost`) hoặc người dùng từ chối quyền truy cập camera.
- **Khắc phục**: Đảm bảo luôn sử dụng HTTPS trên Production. Vào cài đặt trình duyệt cấp quyền Camera cho trang web.

---

## 10. BẢO TRÌ & SAO LƯU DỮ LIỆU ĐỊNH KỲ

1. **Sao lưu Database Cloudflare D1**:
   ```bash
   # Xuất bản sao lưu SQL về máy tính
   npx wrangler d1 export quayvideo-db --remote --output=./backup_$(date +%Y%m%d).sql
   ```
2. **Theo dõi Log hệ thống thời gian thực**:
   ```bash
   cd backend
   npx wrangler tail
   ```
3. **Chính sách dọn dẹp video tự động (Retention Cleanup)**:
   Backend đã tích hợp sẵn Cron Trigger chạy lúc 02:00 sáng hàng ngày (`0 2 * * *` trong `wrangler.toml`) để tự động kiểm tra và dọn dẹp các video quá hạn theo cấu hình trong trang Admin.
