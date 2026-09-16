-- ============================================================================
-- 0001_initial_schema.sql
-- Lược đồ cơ sở dữ liệu Cloudflare D1 (SQLite at Edge)
-- Tham chiếu: docs/07-database-schema.md
-- ============================================================================

-- Bảng nhân viên
CREATE TABLE IF NOT EXISTS nhan_vien (
    ma            TEXT PRIMARY KEY,
    ten           TEXT NOT NULL,
    pin_hash      TEXT NOT NULL,
    vai_tro       TEXT NOT NULL DEFAULT 'nhan_vien' CHECK(vai_tro IN ('admin', 'nhan_vien')),
    trang_thai    TEXT NOT NULL DEFAULT 'hoat_dong' CHECK(trang_thai IN ('hoat_dong', 'vo_hieu_hoa', 'da_xoa')),
    ngay_tao      TEXT NOT NULL DEFAULT (datetime('now')),
    ngay_cap_nhat TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Bảng biên bản quay video
CREATE TABLE IF NOT EXISTS bien_ban (
    id               TEXT PRIMARY KEY,
    ma_van_don       TEXT NOT NULL,
    don_vi_vc        TEXT NOT NULL,
    loai_bien_ban    TEXT NOT NULL CHECK(loai_bien_ban IN ('dong_goi', 'khui_hang')),
    ma_nhan_vien     TEXT NOT NULL REFERENCES nhan_vien(ma),
    thiet_bi         TEXT DEFAULT 'mobile',
    user_agent       TEXT,
    thoi_luong_video INTEGER,
    kich_thuoc_bytes INTEGER,
    mime_type        TEXT DEFAULT 'video/webm',
    trang_thai       TEXT NOT NULL DEFAULT 'cho_upload' CHECK(trang_thai IN ('cho_upload', 'dang_upload', 'da_upload', 'loi')),
    drive_file_id    TEXT,
    drive_file_name  TEXT,
    loi_message      TEXT,
    thoi_gian_tao    TEXT NOT NULL DEFAULT (datetime('now')),
    thoi_gian_upload TEXT,
    ngay_cap_nhat    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Bảng phiên đăng nhập (refresh session)
CREATE TABLE IF NOT EXISTS phien_dang_nhap (
    id                  TEXT PRIMARY KEY,
    ma_nhan_vien        TEXT NOT NULL REFERENCES nhan_vien(ma),
    thiet_bi            TEXT,
    ip_address          TEXT,
    thoi_gian_dang_nhap TEXT NOT NULL DEFAULT (datetime('now')),
    thoi_gian_het_han   TEXT NOT NULL,
    con_hieu_luc        INTEGER NOT NULL DEFAULT 1
);

-- Bảng log quá trình upload video
CREATE TABLE IF NOT EXISTS upload_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    bien_ban_id TEXT NOT NULL REFERENCES bien_ban(id),
    hanh_dong   TEXT NOT NULL CHECK(hanh_dong IN ('init', 'chunk_sent', 'complete', 'error', 'retry')),
    chi_tiet    TEXT,
    thoi_gian   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Bảng cấu hình hệ thống
CREATE TABLE IF NOT EXISTS cau_hinh (
    khoa          TEXT PRIMARY KEY,
    gia_tri       TEXT NOT NULL,
    ngay_cap_nhat TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================================
-- Indexes tối ưu truy vấn
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_bien_ban_ma_van_don ON bien_ban(ma_van_don);
CREATE INDEX IF NOT EXISTS idx_bien_ban_thoi_gian ON bien_ban(thoi_gian_tao);
CREATE INDEX IF NOT EXISTS idx_bien_ban_nhan_vien ON bien_ban(ma_nhan_vien);
CREATE INDEX IF NOT EXISTS idx_bien_ban_trang_thai ON bien_ban(trang_thai);
CREATE INDEX IF NOT EXISTS idx_bien_ban_nv_ngay ON bien_ban(ma_nhan_vien, thoi_gian_tao);
CREATE INDEX IF NOT EXISTS idx_upload_log_bien_ban ON upload_log(bien_ban_id);
CREATE INDEX IF NOT EXISTS idx_phien_active ON phien_dang_nhap(ma_nhan_vien, con_hieu_luc);
