# Quy định Bảo mật (Security Rules)

## 1. Bảo vệ Thông tin Xác thực & Secrets
- **NGHIÊM CẤM TUYỆT ĐỐI**: Không bao giờ đưa Google Service Account Private Key, OAuth client secret, hoặc Database credentials vào frontend client bundle (`VITE_*` env vars).
- Mọi giao tiếp với Google Drive API bắt buộc thực hiện phía Cloudflare Workers backend.
- Biến môi trường nhạy cảm phải lưu trong Cloudflare Secrets (`wrangler secret put`).

## 2. Xác thực & Phân quyền (Authentication & Authorization)
- Nhân viên xác thực bằng Mã nhân viên (`ma_nv`) + Mã PIN 4 chữ số.
- Mã PIN lưu trữ trong D1 SQLite phải băm bằng Argon2id hoặc bcrypt (cost factor >= 10). Không lưu plaintext.
- JWT Access Token:
  - Thời hạn tối đa: 60 phút.
  - Chứa claims: `sub` (nhan_vien_id), `role` (ADMIN | PACKER | VIEWER), `exp`, `iat`.
  - Ký bằng bí mật mã hóa lưu tại Worker secret (`JWT_SECRET`).
  - Phía Client: Lưu token trong bộ nhớ ứng dụng (Zustand memory) hoặc `httpOnly, Secure, SameSite=Strict` Cookie; tránh lưu trữ khóa nhạy cảm trong `localStorage` không mã hóa.

## 3. Xác thực Dữ liệu Đầu vào (Input Validation)
- Tất cả request body, query params và path params gửi lên Cloudflare Workers bắt buộc validate qua **Zod Schema**.
- Mã vận đơn (`ma_van_don`): Chuẩn hóa regex (chỉ nhận chữ cái, số, dấu gạch nối, gạch dưới; độ dài 4-64 ký tự). Loại bỏ mọi ký tự điều khiển chống XSS và SQL Injection.
- Giới hạn kích thước payload JSON tối đa 1MB; upload video phải dùng endpoint chunked stream riêng biệt.

## 4. Bảo mật Mạng & Tiêu chuẩn Header
- Bật CORS có kiểm soát: Chỉ cho phép domain của Cloudflare Pages (staging và production), không dùng `Access-Control-Allow-Origin: *` cho các endpoint nhạy cảm.
- Cấu hình Content Security Policy (CSP):
  - `default-src 'self';`
  - `connect-src 'self' https://*.cloudflare.com https://www.googleapis.com;`
  - `media-src 'self' blob:;`
  - `img-src 'self' blob: data:;`
- Rate Limiting: Giới hạn tối đa 5 lần nhập sai mã PIN trong 15 phút trên mỗi IP/nhân viên để chống brute-force.
