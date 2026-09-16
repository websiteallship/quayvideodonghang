# 12 — HƯỚNG DẪN SETUP KẾT NỐI GOOGLE DRIVE & GOOGLE SHEET

Tài liệu hướng dẫn chi tiết từng bước thiết lập Google Cloud Service Account, Shared Drive, Google Sheet template và biến môi trường để chạy kiểm thử tải video thật trên môi trường phát triển (Dev Local) và Production.

---

## 1. Tạo Google Cloud Project

1. Truy cập [Google Cloud Console](https://console.cloud.google.com).
2. Nhấp vào menu chọn project ở góc trên bên trái → Chọn **New Project**.
3. Đặt tên: `quayvideo-prod` (hoặc `quayvideo-dev` cho local).
4. Nhấn **Create** và chờ quá trình tạo hoàn tất, sau đó chuyển sang project vừa tạo.

---

## 2. Kích hoạt Google APIs

1. Điều hướng đến **APIs & Services** → **Library**.
2. Tìm kiếm và bấm **Enable** cho 2 API sau:
   - **Google Drive API** (quản lý thư mục, tạo resumable upload session, lưu video)
   - **Google Sheets API** (ghi log metadata đồng bộ sang bảng tính)

---

## 3. Tạo Service Account & Tải JSON Key

1. Điều hướng đến **APIs & Services** → **Credentials**.
2. Nhấp **Create Credentials** → Chọn **Service Account**.
3. Thiết lập thông tin:
   - **Service account name**: `quayvideo-uploader`
   - **Service account ID**: `quayvideo-uploader` (tự động tạo)
4. Nhấn **Create and Continue** → Phần cấp quyền Role trong project có thể bỏ qua (quyền sẽ được phân bổ trực tiếp trên thư mục Drive và Sheet) → Nhấn **Done**.
5. Trong danh sách Service Accounts, nhấp vào tài khoản vừa tạo (`quayvideo-uploader@<project-id>.iam.gserviceaccount.com`).
6. Chuyển sang tab **Keys** → Chọn **Add Key** → **Create new key**.
7. Chọn định dạng **JSON** → Nhấn **Create**. File credential JSON sẽ tự động tải về máy tính.
8. **Sao chép địa chỉ email** của Service Account để cấp quyền ở các bước tiếp theo.

> [!CAUTION]
> File JSON chứa private key cho phép truy cập tài nguyên Google. Tuyệt đối không commit file này vào Git hoặc chia sẻ công khai.

---

## 4. Tạo Thư Mục Lưu Trữ Trên Google Drive

### Phương án A: Sử dụng Shared Drive (Khuyến nghị cho Google Workspace)
1. Truy cập Google Drive → Vào mục **Shared Drives** (Bộ nhớ dùng chung) → Nhấn chuột phải chọn **New Shared Drive**: Đặt tên `DongGoi_Videos`.
2. Chuột phải vào Shared Drive vừa tạo → Chọn **Manage Members** (Quản lý thành viên).
3. Dán địa chỉ email Service Account (bước 3) → Phân quyền **Content Manager** (Người quản trị nội dung - quyền tạo folder và ghi file).
4. Mở Shared Drive, sao chép `DRIVE_FOLDER_ID` từ thanh địa chỉ URL:
   ```
   https://drive.google.com/drive/u/0/folders/1aBcD_ExampleFolderIdXYZ987
                                             ^^^^^^^^^^^^^^^^^^^^^^^^^^
                                             Đây là DRIVE_FOLDER_ID
   ```

### Phương án B: Thư mục cá nhân (Google Drive cá nhân)
1. Tại **My Drive**, tạo thư mục mới: `DongGoi_Videos`.
2. Chuột phải vào thư mục → Chọn **Share** (Chia sẻ).
3. Thêm email Service Account với quyền **Editor** (Người chỉnh sửa).
4. Mở thư mục và sao chép ID từ thanh URL tương tự như trên.

---

## 5. Tạo Google Sheet Template

1. Truy cập [Google Sheets](https://sheets.google.com) → Tạo bảng tính mới: Đặt tên `QuayVideo_Metadata`.
2. Đổi tên tab đầu tiên (`Sheet1`) thành: **`DuLieu`** (bắt buộc đúng tên tab).
3. Nhập danh sách cột vào Hàng 1 (Header) từ cột A đến cột L:

| Cột | Tên trường | Kiểu dữ liệu | Ví dụ minh họa |
|:---:|---|---|---|
| **A** | ID | UUID | `550e8400-e29b-41d4-a716-446655440000` |
| **B** | Mã vận đơn | Text | `GHN0123456789` |
| **C** | ĐVVC | Text | `GHN` |
| **D** | Loại biên bản | Text | `dong_goi` / `khui_hang` |
| **E** | Mã nhân viên | Text | `NV003` |
| **F** | Thời gian tạo | ISO DateTime | `2026-09-16T10:30:00Z` |
| **G** | Thời lượng (s) | Số nguyên | `65` |
| **H** | Dung lượng (bytes) | Số nguyên | `18500000` |
| **I** | Drive File ID | Text | `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74...` |
| **J** | Tên file | Text | `DongGoi_GHN0123456789_GHN_NV003_20260916_103000.webm` |
| **K** | Link xem | Text URL | `https://drive.google.com/file/d/.../view` |
| **L** | Trạng thái | Text | `Đã lưu` |

4. Cố định hàng tiêu đề: Vào menu **View** → **Freeze** → **1 row**.
5. Nhấp nút **Share** (Chia sẻ) ở góc trên bên phải → Thêm email Service Account với quyền **Editor**.
6. Lấy `GOOGLE_SHEET_ID` từ đường dẫn URL:
   ```
   https://docs.google.com/spreadsheets/d/1XyZ_ExampleSheetId123456789/edit
                                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                          Đây là GOOGLE_SHEET_ID
   ```

---

## 6. Cấu Hình Môi Trường

### 6.1 Môi trường Dev Local (sử dụng `.dev.vars`)
Tạo file `backend/.dev.vars` (file này đã nằm trong `.gitignore`):

```ini
DRIVE_FOLDER_ID=1aBcD_ExampleFolderIdXYZ987
GOOGLE_SHEET_ID=1XyZ_ExampleSheetId123456789
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"quayvideo-dev","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"quayvideo-uploader@quayvideo-dev.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}
```

> [!IMPORTANT]
> `GOOGLE_SERVICE_ACCOUNT_JSON` phải được nén trên **1 dòng duy nhất**, không xuống dòng giữa nội dung JSON.

Lệnh PowerShell để copy nhanh JSON thành 1 dòng vào Clipboard:
```powershell
(Get-Content "path\to\service-account.json" -Raw) -replace "`r?`n", "" | Set-Clipboard
```

### 6.2 Môi trường Production (Cloudflare Workers Secrets)
Đẩy các thông tin nhạy cảm lên Cloudflare Edge:

```bash
cd backend

# Đặt Service Account JSON
npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON
# Paste toàn bộ nội dung file JSON khi được nhắc

# Cập nhật ID thư mục và ID sheet vào wrangler.toml hoặc secret
npx wrangler secret put DRIVE_FOLDER_ID
npx wrangler secret put GOOGLE_SHEET_ID
```

---

## 7. Kiểm Thử Vận Hành

1. **Khởi động Backend:**
   ```bash
   cd backend
   npm run dev
   ```
   Wrangler tự động nạp các biến từ `.dev.vars`. Khi có request upload, Backend kiểm tra `driveService.isConfigured()`. Nếu có cấu hình, hệ thống gọi Drive API thật để tạo thư mục theo ngày `YYYY/MM/DD` và khởi tạo session upload.
2. **Khởi động Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```
3. **Thực hiện quay và upload video:**
   - Mở trình duyệt tại `http://localhost:5173`.
   - Đăng nhập, quét mã vận đơn, quay video ngắn và xác nhận tải lên.
4. **Kiểm tra kết quả:**
   - **Google Drive**: Thư mục `DongGoi_Videos / 2026 / MM / DD /` có video mới với tên chuẩn `{Loai}_{MaVanDon}_{DVVC}_{MaNV}_{Timestamp}.webm`.
   - **Google Sheet**: Tab `DuLieu` xuất hiện 1 dòng mới với đầy đủ 12 trường metadata và link xem video.

---

## 8. Bảng Mã Lỗi & Xử Lý Sự Cố (Troubleshooting)

| Mã lỗi / Hiện tượng | Nguyên nhân chính | Cách xử lý |
|---|---|---|
| `Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON` | Chuỗi JSON bị ngắt dòng hoặc chứa ký tự đặc biệt không thoát chuỗi | Đảm bảo giá trị biến trong `.dev.vars` nằm trên đúng 1 dòng |
| `Google OAuth2 error: 401 Unauthorized` | Private key bị sai, bị thu hồi hoặc clock skew hệ thống quá lớn | Tạo lại Key JSON mới từ Google Cloud Console |
| `Drive init resumable error: 403 Forbidden` | Service Account chưa được thêm vào thư mục hoặc chưa đủ quyền | Kiểm tra lại quyền Content Manager (Shared Drive) hoặc Editor (Thư mục thường) |
| `Drive init resumable error: 404 Not Found` | `DRIVE_FOLDER_ID` không tồn tại hoặc Service Account không thấy thư mục | Kiểm tra lại Folder ID trên URL |
| `Failed to append row: 403 / 404` | Google Sheet chưa share cho Service Account hoặc tên tab không phải `DuLieu` | Đổi tên sheet tab thành `DuLieu` và chia sẻ quyền Editor cho email Service Account |
| Hệ thống vẫn tải qua URL mock | Chưa khởi động lại server sau khi tạo `.dev.vars` | Nhấn `Ctrl+C` và chạy lại `npm run dev` ở backend |
