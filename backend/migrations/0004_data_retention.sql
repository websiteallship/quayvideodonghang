-- ============================================================================
-- 0004_data_retention.sql
-- Cập nhật cơ chế quản lý vòng đời video (Retention & Auto-cleanup)
-- Thêm trạng thái 'da_luu_tru' (Archived) và 'da_xoa' (Deleted) cho bien_ban
-- Thay thế key retention_thang cũ bằng retention_archive_days và retention_delete_days
-- ============================================================================

-- Tắt foreign key check để recreate table an toàn trong SQLite
PRAGMA foreign_keys=OFF;

CREATE TABLE IF NOT EXISTS bien_ban_new (
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
    trang_thai       TEXT NOT NULL DEFAULT 'cho_upload' CHECK(trang_thai IN ('cho_upload', 'dang_upload', 'da_upload', 'loi', 'da_luu_tru', 'da_xoa')),
    drive_file_id    TEXT,
    drive_file_name  TEXT,
    loi_message      TEXT,
    thoi_gian_tao    TEXT NOT NULL DEFAULT (datetime('now')),
    thoi_gian_upload TEXT,
    ngay_cap_nhat    TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO bien_ban_new SELECT * FROM bien_ban;
DROP TABLE IF EXISTS bien_ban;
ALTER TABLE bien_ban_new RENAME TO bien_ban;

CREATE INDEX IF NOT EXISTS idx_bien_ban_ma_van_don ON bien_ban(ma_van_don);
CREATE INDEX IF NOT EXISTS idx_bien_ban_thoi_gian ON bien_ban(thoi_gian_tao);
CREATE INDEX IF NOT EXISTS idx_bien_ban_nhan_vien ON bien_ban(ma_nhan_vien);
CREATE INDEX IF NOT EXISTS idx_bien_ban_trang_thai ON bien_ban(trang_thai);
CREATE INDEX IF NOT EXISTS idx_bien_ban_nv_ngay ON bien_ban(ma_nhan_vien, thoi_gian_tao);

PRAGMA foreign_keys=ON;

-- Seed 2 khóa cấu hình lưu trữ mới (Archive = 30 ngày, Delete = 60 ngày)
INSERT OR IGNORE INTO cau_hinh (khoa, gia_tri) VALUES
    ('retention_archive_days', '30'),
    ('retention_delete_days', '60');
