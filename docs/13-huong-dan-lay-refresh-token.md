# 13 — HƯỚNG DẪN LẤY OAUTH2 REFRESH TOKEN (CHO GOOGLE DRIVE CÁ NHÂN)

Tài liệu này hướng dẫn bạn cách thiết lập để Backend có thể sử dụng **chính tài khoản Gmail cá nhân của bạn** để tải video lên Google Drive, sử dụng dung lượng 15GB miễn phí, thay vì dùng Service Account bị kẹt ở mức 0GB.

---

## BƯỚC 1: TẠO OAUTH 2.0 CLIENT ID TRÊN GOOGLE CLOUD
1. Truy cập [Google Cloud Console](https://console.cloud.google.com).
2. Chọn Project của bạn (Ví dụ: `quayvideo-dev`).
3. Điều hướng đến **APIs & Services** (API và Dịch vụ) → **OAuth consent screen** (Màn hình đồng ý OAuth).
   - Chọn **External** (Bên ngoài) và bấm **Create**.
   - Điền tên ứng dụng: `QuayVideo Uploader`, email hỗ trợ: (chọn email của bạn).
   - Cuộn xuống dưới cùng, phần Developer contact information điền email của bạn. Bấm **Save and Continue**.
   - Bước **Scopes**: Bấm **Save and Continue** bỏ qua.
   - Bước **Test users** (Người dùng thử nghiệm): Đây là bước **CỰC KỲ QUAN TRỌNG**. Bấm **+ ADD USERS**, sau đó nhập địa chỉ email Gmail cá nhân của bạn (ví dụ: `packaging.allship@gmail.com`) vào và bấm Add. Xong bấm **Save and Continue**.
   - (Tuỳ chọn) Quay lại Dashboard OAuth consent screen, bạn có thể bấm **PUBLISH APP** (Xuất bản ứng dụng) nếu muốn. Nhưng chỉ cần thêm Test users ở trên là đủ.
4. Điều hướng sang tab **Credentials** (Thông tin xác thực) bên tay trái.
5. Bấm **+ CREATE CREDENTIALS** (TẠO THÔNG TIN XÁC THỰC) → Chọn **OAuth client ID** (ID ứng dụng khách OAuth).
6. **Application type** (Loại ứng dụng): Chọn **Web application** (Ứng dụng Web).
7. Tên: `QuayVideo OAuth`.
8. Tại phần **Authorized redirect URIs** (URI chuyển hướng được uỷ quyền), bấm Add URI và dán chính xác link này vào:
   ```
   https://developers.google.com/oauthplayground
   ```
9. Bấm **Create** (Tạo).
10. Một bảng popup hiện ra chứa **Client ID** và **Client Secret**. (Hãy copy chúng ra Notepad, chúng ta sẽ cần ở Bước 3).

---

## BƯỚC 2: LẤY REFRESH TOKEN BẰNG OAUTH PLAYGROUND
1. Mở trang web: [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/).
2. Nhìn góc trên bên phải, bấm vào biểu tượng hình bánh răng ⚙️ (OAuth 2.0 configuration).
3. Tích chọn ô: **Use your own OAuth credentials**.
4. Dán **Client ID** và **Client Secret** (từ Bước 1) vào 2 ô tương ứng, sau đó bấm **Close**.
5. Nhìn sang cột bên trái (Step 1), cuộn xuống tìm và click vào dòng **Drive API v3**.
6. Chọn 2 quyền sau đây:
   - `https://www.googleapis.com/auth/drive`
   - `https://www.googleapis.com/auth/spreadsheets`
7. Bấm nút màu xanh **Authorize APIs**.
8. Một cửa sổ đăng nhập Google hiện ra. Hãy chọn tài khoản Gmail cá nhân của bạn (tài khoản bạn muốn lưu video).
   - Nếu có cảnh báo "Google hasn't verified this app" (Google chưa xác minh ứng dụng), hãy bấm **Advanced** (Nâng cao) → **Go to QuayVideo Uploader (unsafe)**.
   - Bấm **Continue** (Tiếp tục) để cấp quyền.
9. Trình duyệt quay lại trang Playground. Nhìn sang **Step 2**, bấm nút màu xanh **Exchange authorization code for tokens**.
10. Ở ô Response bên phải, hoặc ngay bên dưới nút bấm, bạn sẽ thấy chuỗi **Refresh token**. Hãy copy toàn bộ chuỗi này (Nó thường bắt đầu bằng `1//0...`).

---

## BƯỚC 3: CẤU HÌNH VÀO DỰ ÁN
Mở file `backend/.dev.vars` bằng VSCode, và cấu hình như sau:

```ini
DRIVE_FOLDER_ID=ID_THU_MUC_TREN_DRIVE_CA_NHAN_CUA_BAN
GOOGLE_SHEET_ID=ID_FILE_GOOGLE_SHEET_CUA_BAN

# Các biến mới cho OAuth2 (Personal Drive)
GOOGLE_CLIENT_ID=dán_client_id_của_bạn_vào_đây
GOOGLE_CLIENT_SECRET=dán_client_secret_của_bạn_vào_đây
GOOGLE_REFRESH_TOKEN=1//0...dán_refresh_token_của_bạn_vào_đây

# Bạn CÓ THỂ XOÁ hoặc COMMENT dòng GOOGLE_SERVICE_ACCOUNT_JSON cũ đi
# GOOGLE_SERVICE_ACCOUNT_JSON=...
```

Sau khi lưu file `.dev.vars`, Cloudflare Workers (Terminal) sẽ tự động nạp lại.
Từ giờ, bạn có thể tải video thẳng lên thư mục Drive cá nhân (My Drive) mà không bị lỗi `403 storageQuotaExceeded` nữa!
