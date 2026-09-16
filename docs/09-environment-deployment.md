# 09 — ENVIRONMENT, CONFIG & DEPLOYMENT GUIDE

---

## 1. Tổng quan kiến trúc triển khai

```
┌─────────────────────────────────────────────────────┐
│                   Cloudflare                         │
│                                                      │
│  ┌──────────────┐     ┌──────────────────────────┐  │
│  │ Cloudflare   │     │ Cloudflare Workers       │  │
│  │ Pages        │────▶│ (Backend API)            │  │
│  │ (Frontend)   │     │                          │  │
│  │              │     │  ┌─────────────────────┐ │  │
│  │ quayvideo.   │     │  │ Cloudflare D1       │ │  │
│  │ pages.dev    │     │  │ (SQLite Database)   │ │  │
│  └──────────────┘     │  └─────────────────────┘ │  │
│                       └──────────┬───────────────┘  │
│                                  │                   │
└──────────────────────────────────┼───────────────────┘
                                   │
                    ┌──────────────▼───────────────┐
                    │      Google Cloud             │
                    │                               │
                    │  ┌─────────┐  ┌───────────┐  │
                    │  │ Drive   │  │ Sheets    │  │
                    │  │ API     │  │ API       │  │
                    │  └─────────┘  └───────────┘  │
                    └───────────────────────────────┘
```

---

## 2. Environment Variables

### 2.1 Backend (Cloudflare Workers)

File `backend/wrangler.toml`:

```toml
name = "quayvideo-api"
main = "src/index.ts"
compatibility_date = "2024-09-14"

# D1 Database binding
[[d1_databases]]
binding = "DB"
database_name = "quayvideo-db"
database_id = "<D1_DATABASE_ID>"    # Lấy sau khi tạo D1

# Environment variables (non-secret)
[vars]
ALLOWED_ORIGINS = "https://quayvideo.pages.dev,http://localhost:5173"
JWT_EXPIRES_IN = "86400"
DRIVE_FOLDER_ID = "<SHARED_DRIVE_FOLDER_ID>"
GOOGLE_SHEET_ID = "<SHEET_ID>"
UPLOAD_CHUNK_SIZE = "5242880"       # 5MB

# Cron trigger (cleanup video cũ)
[triggers]
crons = ["0 2 * * *"]
```

**Secrets (KHÔNG đặt trong wrangler.toml):**

```bash
# JWT signing key
npx wrangler secret put JWT_SECRET
# → Nhập: <random 64-char string>

# Google Service Account credentials (JSON string)
npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON
# → Paste nội dung file JSON service account
```

### 2.2 Frontend (Vite)

File `frontend/.env.example`:

```env
# API Backend URL
VITE_API_BASE_URL=http://localhost:8787

# App metadata
VITE_APP_NAME=Quay Video Đóng Hàng
VITE_APP_VERSION=1.0.0
```

File `frontend/.env.production`:

```env
VITE_API_BASE_URL=https://quayvideo-api.<account>.workers.dev
```

---

## 3. Google Cloud Setup (Step-by-Step)

### Bước 1: Tạo Google Cloud Project

1. Truy cập [Google Cloud Console](https://console.cloud.google.com)
2. Tạo project mới: `quayvideo-prod`
3. Ghi nhớ **Project ID**

### Bước 2: Enable APIs

```
Vào APIs & Services → Library → Enable:
  ✅ Google Drive API
  ✅ Google Sheets API
```

### Bước 3: Tạo Service Account

```
1. APIs & Services → Credentials → Create Credentials → Service Account
2. Tên: quayvideo-uploader
3. Role: không cần (quyền sẽ cấp ở Drive)
4. Tạo xong → vào Service Account → Keys → Add Key → Create new key → JSON
5. Download file JSON → ĐÂY LÀ SECRET, KHÔNG COMMIT VÀO GIT
```

### Bước 4: Tạo Shared Drive & cấp quyền

```
1. Google Drive → Shared Drives → New Shared Drive: "DongGoi_Videos"
2. Manage Members → Add: <service-account-email>@<project-id>.iam.gserviceaccount.com
3. Quyền: Content Manager (ghi file, tạo thư mục)
4. Ghi nhớ Shared Drive ID (trong URL khi vào Shared Drive)
```

### Bước 5: Tạo Google Sheet template

```
1. Tạo Sheet mới trong Shared Drive: "QuayVideo_Metadata"
2. Tab đầu tiên đổi tên: "DuLieu"
3. Row 1 (header 12 cột A:L):
   ID | Mã vận đơn | ĐVVC | Loại biên bản | Mã nhân viên | Thời gian tạo | Thời lượng (s) | Dung lượng (bytes) | Drive File ID | Tên file | Link xem | Trạng thái
4. Freeze row 1
5. Share cho Service Account (Editor)
6. Ghi nhớ Sheet ID (trong URL: /spreadsheets/d/<SHEET_ID>/...)
```

> [!TIP]
> Hướng dẫn thiết lập chi tiết từng bước bằng hình ảnh và lệnh copy JSON: xem [`12-huong-dan-ket-noi-google-drive-sheet.md`](file:///d:/TOOL%20AI/TOOL_QUAYVIDEO/docs/12-huong-dan-ket-noi-google-drive-sheet.md).

---

## 4. Cloudflare Setup (Step-by-Step)

### Bước 1: Cài Wrangler CLI

```bash
npm install -g wrangler
wrangler login
```

### Bước 2: Tạo D1 Database

```bash
npx wrangler d1 create quayvideo-db
# → Ghi lại database_id, điền vào wrangler.toml
```

### Bước 3: Chạy Migration

```bash
# Local (development)
npx wrangler d1 migrations apply quayvideo-db --local

# Production
npx wrangler d1 migrations apply quayvideo-db --remote
```

### Bước 4: Đặt Secrets

```bash
# JWT secret key
npx wrangler secret put JWT_SECRET

# Google Service Account (paste toàn bộ JSON)
npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON
```

### Bước 5: Deploy Backend

```bash
cd backend
npx wrangler deploy
# → URL: https://quayvideo-api.<account>.workers.dev
```

### Bước 6: Deploy Frontend (Cloudflare Pages)

```bash
# Option A: Từ Git (khuyến nghị — auto deploy khi push)
# 1. Push code lên GitHub/GitLab
# 2. Cloudflare Dashboard → Pages → Create → Connect to Git
# 3. Build command: npm run build
# 4. Build output: dist
# 5. Root directory: frontend

# Option B: Direct upload
cd frontend
npm run build
npx wrangler pages deploy dist --project-name=quayvideo
```

---

## 5. Development Local

### 5.1 Setup lần đầu

```bash
# Clone repo
git clone <repo_url>

# Backend
cd backend
npm install
cp wrangler.toml.example wrangler.toml
# Điền D1 database_id
npx wrangler d1 migrations apply quayvideo-db --local

# Frontend
cd ../frontend
npm install
cp .env.example .env
```

### 5.2 Chạy dev servers

```bash
# Terminal 1: Backend (port 8787)
cd backend
npx wrangler dev

# Terminal 2: Frontend (port 5173)
cd frontend
npm run dev
```

### 5.3 HTTPS cho development (bắt buộc để test camera)

```bash
# Vite hỗ trợ HTTPS dev server với plugin:
npm install -D @vitejs/plugin-basic-ssl

# Hoặc dùng mkcert:
mkcert -install
mkcert localhost 127.0.0.1
# → Thêm cert vào vite.config.ts server.https
```

> [!IMPORTANT]
> `getUserMedia` (camera) **BẮT BUỘC HTTPS** — trừ `localhost`. Nếu test trên điện thoại cùng mạng LAN, phải dùng HTTPS hoặc Chrome flag `#unsafely-treat-insecure-origin-as-secure`.

---

## 6. Repository Structure

```
TOOL_QUAYVIDEO/
├── docs/                     # Tài liệu (bộ 11 file)
├── frontend/                 # React + Vite PWA
│   ├── src/
│   ├── public/
│   ├── index.html
│   ├── vite.config.ts
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── .env.production
│
├── backend/                  # Cloudflare Workers
│   ├── src/
│   │   ├── index.ts          # Entry point, Hono app
│   │   ├── routes/           # Route handlers
│   │   ├── middleware/       # Auth, CORS, rate-limit
│   │   ├── services/        # Google Drive, Sheets integration
│   │   └── utils/           # JWT, hash, etc.
│   ├── migrations/           # D1 SQL migrations
│   ├── wrangler.toml
│   ├── package.json
│   └── tsconfig.json
│
├── .gitignore
└── README.md
```

---

## 7. `.gitignore`

```gitignore
# Dependencies
node_modules/

# Build
dist/
.wrangler/

# Environment
.env
.env.local
.env.production
.dev.vars

# Google credentials — TUYỆT ĐỐI KHÔNG COMMIT
*-service-account*.json
credentials*.json

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db
```

---

## 8. Custom Domain (tuỳ chọn)

```bash
# Frontend: quayvideo.company.com
# Cloudflare Pages → Custom domains → Add

# Backend API: api-quayvideo.company.com
# Cloudflare Workers → Triggers → Custom Domains → Add
```

Nếu không có domain riêng, dùng subdomain mặc định của Cloudflare (*.pages.dev, *.workers.dev) — vẫn có HTTPS.

---

*Xem tiếp: **10-error-handling.md** (xử lý lỗi chi tiết), **11-ui-design-system.md** (design tokens, wireframes).*
