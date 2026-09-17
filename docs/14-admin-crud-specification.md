# 14 — ĐẶC TẢ CHI TIẾT CRUD ADMIN: NHÂN VIÊN & CẤU HÌNH HỆ THỐNG

## Mục tiêu

Bổ sung đặc tả chi tiết cho 2 nhóm CRUD Admin đã nêu trong roadmap Step 3.4:
1. **CRUD Nhân viên** (`nhan_vien`): list, create, update, soft-delete, reset PIN
2. **CRUD Cấu hình hệ thống** (`cau_hinh`): get all, update batch, test-drive

Đồng thời làm rõ ranh giới giữa **Settings cục bộ (User/Device)** và **Settings hệ thống (Admin/Global)**.

---

## 1. Phân tách Settings: User vs System

### 1.1 User Settings (Cục bộ — lưu trên thiết bị)

Cấu hình riêng theo **từng thiết bị/trạm kho**, không đồng bộ lên server, lưu hoàn toàn ở `localStorage`/`IndexedDB` trên client.

| Setting | Nơi lưu | Zustand Store | Lý do cục bộ |
|---|---|---|---|
| Camera đã chọn (`deviceId`) | `localStorage` | `useCameraStore` | Mỗi trạm có webcam vật lý riêng |
| Hướng camera (front/back) | Zustand (memory) | `useCameraStore` | Chỉ có nghĩa trên thiết bị hiện tại |
| Override độ phân giải (1080p/720p) | `localStorage` | (mới) `useUserSettingsStore` | Trạm mạng yếu cần hạ thấp hơn mặc định |
| Tên bàn đóng gói / chi nhánh | `localStorage` | `useConfigStore` | Mỗi trạm đặt tên khác nhau |
| Bật/tắt tự động quay sau quét | `localStorage` | (mới) `useUserSettingsStore` | NV có thể muốn bỏ qua confirm |
| Bật/tắt âm thanh bíp | `localStorage` | (mới) `useUserSettingsStore` | Kho yên tĩnh có thể tắt |
| Sidebar collapsed | `localStorage` | `useConfigStore` | Tùy sở thích người dùng |
| Theme (light/dark) | `localStorage` | `useConfigStore` | Tùy sở thích |

### 1.2 System Settings (Toàn cục — lưu trên D1, chỉ Admin sửa)

Cấu hình chung cho **toàn bộ hệ thống**, áp dụng cho tất cả trạm/nhân viên, chỉ Admin có quyền thay đổi.

| Khóa (`cau_hinh.khoa`) | Giá trị mặc định | Mô tả |
|---|---|---|
| `drive_folder_id` | `''` | ID Shared Drive folder gốc |
| `sheet_id` | `''` | ID Google Sheet log metadata |
| `do_phan_giai` | `'1280x720'` | Độ phân giải mặc định hệ thống (User có thể override cục bộ) |
| `bitrate_mbps` | `'2.5'` | Bitrate video mặc định |
| `auto_scan` | `'false'` | Bật/tắt chế độ tự động quay toàn hệ thống |
| `quay_lien_tuc` | `'false'` | Chế độ quay liên tục (không dừng giữa các đơn) |
| `watermark` | `'true'` | Bật/tắt watermark trên video |
| `don_vi_vc_danh_sach` | `'GHN,GHTK,J&T,...'` | Danh sách ĐVVC (dùng comma-separated) |
| `retention_thang` | `'6'` | Thời gian giữ video trên Drive (tháng) |

### 1.3 Quy tắc ưu tiên (Override Hierarchy)

```
User Override (localStorage) > System Default (D1 cau_hinh) > Hardcoded Default
```

Ví dụ: Admin set `do_phan_giai = 1280x720` -> Trạm kho A override lên `1920x1080` vì có webcam tốt và mạng mạnh -> Trạm kho B giữ mặc định 720p.

---

## 2. CRUD Nhân viên (`/api/admin/nhan-vien`)

> Tất cả endpoints yêu cầu: `Authorization: Bearer {token}` + `vai_tro = 'admin'`

### 2.1 Danh sách nhân viên

#### `GET /api/admin/nhan-vien`

**Query params (optional):**

| Param | Kiểu | Mô tả |
|---|---|---|
| `trang_thai` | `string` | Lọc: `hoat_dong`, `vo_hieu_hoa`, `da_xoa`. Mặc định: chỉ `hoat_dong` + `vo_hieu_hoa` |
| `search` | `string` | Tìm theo mã hoặc tên (partial match) |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "ma": "NV001",
        "ten": "Trần Thị B",
        "vai_tro": "admin",
        "trang_thai": "hoat_dong",
        "ngay_tao": "2026-09-01T00:00:00Z",
        "ngay_cap_nhat": "2026-09-15T10:30:00Z",
        "so_video_hom_nay": 12,
        "dang_nhap_cuoi": "2026-09-17T08:15:00Z"
      }
    ],
    "total": 5
  }
}
```

**SQL Query:**
```sql
SELECT
  nv.ma, nv.ten, nv.vai_tro, nv.trang_thai,
  nv.ngay_tao, nv.ngay_cap_nhat,
  (SELECT COUNT(*) FROM bien_ban bb
   WHERE bb.ma_nhan_vien = nv.ma
     AND DATE(bb.thoi_gian_tao) = DATE('now')
  ) AS so_video_hom_nay,
  (SELECT MAX(pd.thoi_gian_dang_nhap) FROM phien_dang_nhap pd
   WHERE pd.ma_nhan_vien = nv.ma
  ) AS dang_nhap_cuoi
FROM nhan_vien nv
WHERE nv.trang_thai IN ('hoat_dong', 'vo_hieu_hoa')
ORDER BY nv.ngay_tao DESC;
```

**Gap so với hiện tại:** Query hiện tại chưa JOIN lấy `so_video_hom_nay` và `dang_nhap_cuoi`, chưa filter `trang_thai`, chưa support `search`.

---

### 2.2 Thêm nhân viên mới

#### `POST /api/admin/nhan-vien`

**Request Body:**
```json
{
  "ma": "NV006",
  "ten": "Lê Văn C",
  "pin": "5678",
  "vai_tro": "nhan_vien"
}
```

**Validation (Zod):**
```typescript
const NhanVienCreateSchema = z.object({
  ma: z.string()
    .min(1, 'Mã nhân viên bắt buộc')
    .max(20, 'Mã tối đa 20 ký tự')
    .regex(/^[A-Za-z0-9_]+$/, 'Chỉ chữ cái, số và gạch dưới')
    .transform(v => v.toUpperCase()),
  ten: z.string().min(1, 'Tên bắt buộc').max(100),
  pin: z.string()
    .length(4, 'PIN phải có đúng 4 chữ số')
    .regex(/^\d+$/, 'PIN chỉ chứa chữ số'),
  vai_tro: z.enum(['admin', 'nhan_vien']).default('nhan_vien')
});
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "ma": "NV006",
    "ten": "Lê Văn C",
    "vai_tro": "nhan_vien",
    "trang_thai": "hoat_dong"
  }
}
```

**Backend:** OK — logic create da du.

---

### 2.3 Cập nhật nhân viên

#### `PUT /api/admin/nhan-vien/:ma`

**Request Body (Partial update — chỉ gửi fields cần sửa):**
```json
{
  "ten": "Lê Văn C (Đã cập nhật)",
  "vai_tro": "admin",
  "trang_thai": "vo_hieu_hoa"
}
```

**Validation (Zod):**
```typescript
const NhanVienUpdateSchema = z.object({
  ten: z.string().min(1).max(100).optional(),
  vai_tro: z.enum(['admin', 'nhan_vien']).optional(),
  trang_thai: z.enum(['hoat_dong', 'vo_hieu_hoa']).optional()
}).refine(
  data => Object.keys(data).length > 0,
  'Phải cập nhật ít nhất 1 trường'
);
```

**Logic Backend:**
1. Validate input bằng Zod.
2. `SELECT ma FROM nhan_vien WHERE ma = ? AND trang_thai != 'da_xoa'` -> 404 nếu không tồn tại.
3. Build dynamic SET clause chỉ với fields được gửi lên.
4. `UPDATE nhan_vien SET ... ngay_cap_nhat = datetime('now') WHERE ma = ?`.
5. Nếu `trang_thai = 'vo_hieu_hoa'` -> Vô hiệu hóa tất cả phiên đăng nhập: `UPDATE phien_dang_nhap SET con_hieu_luc = 0 WHERE ma_nhan_vien = ?`.

**Backend:** CHUA CO. Cần bổ sung route `PUT /api/admin/nhan-vien/:ma`.

---

### 2.4 Soft-Delete nhân viên

#### `DELETE /api/admin/nhan-vien/:ma`

**Logic Backend:**
1. `SELECT ma, vai_tro FROM nhan_vien WHERE ma = ? AND trang_thai != 'da_xoa'` -> 404 nếu không tồn tại.
2. Chặn xóa admin cuối cùng: `SELECT COUNT(*) FROM nhan_vien WHERE vai_tro = 'admin' AND trang_thai = 'hoat_dong'` -> Nếu đang xóa admin và chỉ còn 1 admin -> 400 `LAST_ADMIN`.
3. `UPDATE nhan_vien SET trang_thai = 'da_xoa', ngay_cap_nhat = datetime('now') WHERE ma = ?`.
4. Vô hiệu tất cả phiên: `UPDATE phien_dang_nhap SET con_hieu_luc = 0 WHERE ma_nhan_vien = ?`.

**Response 200:**
```json
{
  "success": true,
  "data": { "ma": "NV006", "trang_thai": "da_xoa" }
}
```

**Response 400 (Admin cuối cùng):**
```json
{
  "success": false,
  "error": { "code": "LAST_ADMIN", "message": "Không thể xóa admin cuối cùng trong hệ thống" }
}
```

**Backend:** CHUA CO. Cần bổ sung route `DELETE /api/admin/nhan-vien/:ma`.

---

### 2.5 Reset PIN nhân viên

#### `PUT /api/admin/nhan-vien/:ma/reset-pin`

**Request Body:**
```json
{ "pin_moi": "9999" }
```

**Validation (Zod):**
```typescript
const ResetPinSchema = z.object({
  pin_moi: z.string()
    .length(4, 'PIN phải có đúng 4 chữ số')
    .regex(/^\d+$/, 'PIN chỉ chứa chữ số')
});
```

**Logic Backend:**
1. Check nhân viên tồn tại và hoạt động.
2. Hash PIN mới bằng bcrypt.
3. `UPDATE nhan_vien SET pin_hash = ?, ngay_cap_nhat = datetime('now') WHERE ma = ?`.
4. Vô hiệu tất cả phiên hiện tại (buộc đăng nhập lại với PIN mới).

**Backend:** CHUA CO. Cần bổ sung route riêng.

---

## 3. CRUD Cấu hình hệ thống (`/api/admin/cau-hinh`)

> Tất cả endpoints yêu cầu: `Authorization: Bearer {token}` + `vai_tro = 'admin'`

### 3.1 Lấy toàn bộ cấu hình

#### `GET /api/admin/cau-hinh`

**Response 200 (nên transform thành object):**
```json
{
  "success": true,
  "data": {
    "drive_folder_id": "1abc...",
    "sheet_id": "1xyz...",
    "do_phan_giai": "1280x720",
    "bitrate_mbps": "2.5",
    "auto_scan": "false",
    "quay_lien_tuc": "false",
    "watermark": "true",
    "don_vi_vc_danh_sach": "GHN,GHTK,J&T,VTP,Ninja Van,Shopee Express,Best Express,Khác",
    "retention_thang": "6"
  }
}
```

**Gap:** Response hiện trả raw array `[{khoa, gia_tri, ngay_cap_nhat}]`, chưa transform thành object.

---

### 3.2 Cập nhật cấu hình (từng key)

#### `PUT /api/admin/cau-hinh`

**Validation nên siết:**
```typescript
const CauHinhUpdateSchema = z.object({
  khoa: z.enum([
    'drive_folder_id', 'sheet_id', 'do_phan_giai', 'bitrate_mbps',
    'auto_scan', 'quay_lien_tuc', 'watermark', 'don_vi_vc_danh_sach', 'retention_thang'
  ]),
  gia_tri: z.string().min(0)
});
```

**Gap:** Zod schema hiện tại quá lỏng (`khoa: z.string()`), rủi ro bảo mật — attacker có thể tạo key tùy ý.

---

### 3.3 Cập nhật batch nhiều cấu hình cùng lúc

#### `PATCH /api/admin/cau-hinh/batch`

> **Endpoint mới** — hiện admin phải gọi PUT nhiều lần cho từng key.

**Request Body:**
```json
{
  "configs": {
    "do_phan_giai": "1920x1080",
    "bitrate_mbps": "3.5",
    "watermark": "true"
  }
}
```

**Backend:** CHUA CO.

---

### 3.4 Test kết nối Google Drive

#### `POST /api/admin/cau-hinh/test-drive`

**Response 200 (Thành công):**
```json
{
  "success": true,
  "data": {
    "ket_noi_ok": true,
    "service_account_email": "sa-drive-uploader@warehouse-system.iam.gserviceaccount.com",
    "loai_drive": "shared_drive",
    "ten_drive": "DongGoi_Videos",
    "dung_luong_da_dung_gb": 420.5,
    "dung_luong_tong_gb": 2048,
    "dung_luong_con_lai_gb": 1627.5,
    "file_test_ok": true
  }
}
```

**Gap:** Route hiện có nhưng chỉ gọi `driveService.testConnection()` — cần bổ sung `storageQuota` và tạo/xóa file test.

---

## 4. Tổng kết Gap Analysis

| Endpoint | Spec | Backend | Status |
|---|---|---|---|
| `GET /api/admin/nhan-vien` | List + search + filter + stats | List cơ bản | ⚠️ Thiếu |
| `POST /api/admin/nhan-vien` | Create + Zod | Da du | ✅ |
| `PUT /api/admin/nhan-vien/:ma` | Partial update | Chua co | ❌ |
| `DELETE /api/admin/nhan-vien/:ma` | Soft-delete + last-admin guard | Chua co | ❌ |
| `PUT .../reset-pin` | Reset PIN + invalidate sessions | Chua co | ❌ |
| `GET /api/admin/cau-hinh` | Get all (object transform) | Raw array | ⚠️ |
| `PUT /api/admin/cau-hinh` | Update 1 key (enum) | Lỏng schema | ⚠️ |
| `PATCH .../cau-hinh/batch` | Batch update | Chua co | ❌ |
| `POST .../test-drive` | Test + quota + file test | Co ban | ⚠️ |

### Zod Schemas cần bổ sung/sửa

| Schema | Trạng thái |
|---|---|
| `NhanVienCreateSchema` | ✅ OK (thêm `.transform(toUpperCase)`) |
| `NhanVienUpdateSchema` | ❌ Cần tạo mới |
| `NhanVienResetPinSchema` | ❌ Cần tạo mới |
| `CauHinhUpdateSchema` | ⚠️ Siết `z.enum(...)` |
| `CauHinhBatchUpdateSchema` | ❌ Cần tạo mới |

---

## 5. Tách Frontend: User Settings vs Admin Settings

### 5.1 Routing đề xuất

| Route | Component | Quyền | Mô tả |
|---|---|---|---|
| `/settings` | `UserSettingsPage` | Tất cả NV | Camera, resolution override, bíp, tên bàn, GPS, PWA info |
| `/admin/settings` | `AdminSettingsPage` | Chỉ Admin | Google Drive, ĐVVC, video mặc định, watermark, retention |
| `/admin/employees` | `AdminEmployeesPage` | Chỉ Admin | CRUD nhân viên, reset PIN |

### 5.2 Navigation

- **Sidebar / Bottom Nav:** "Cài đặt" -> `/settings` (User Settings)
- **Sidebar chỉ hiện với Admin:** "Quản trị" -> sub-menu:
  - "Cấu hình hệ thống" -> `/admin/settings`
  - "Quản lý nhân viên" -> `/admin/employees`

---

*Tài liệu này bổ sung cho: `06-api-backend-specification.md` SS3.5-3.6, `07-database-schema.md` SS2.*
