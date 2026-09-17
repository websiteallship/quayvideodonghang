-- ============================================================================
-- 0003_warehouse_management.sql
-- Quản lý danh mục kho vận tập trung
-- ============================================================================

CREATE TABLE IF NOT EXISTS kho_hang (
    id            TEXT PRIMARY KEY,
    ten           TEXT NOT NULL,
    dia_chi       TEXT,
    la_mac_dinh   INTEGER NOT NULL DEFAULT 0 CHECK(la_mac_dinh IN (0, 1)),
    trang_thai    TEXT NOT NULL DEFAULT 'hoat_dong' CHECK(trang_thai IN ('hoat_dong', 'ngung_hoat_dong', 'da_xoa')),
    ngay_tao      TEXT NOT NULL DEFAULT (datetime('now')),
    ngay_cap_nhat TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_kho_hang_trang_thai ON kho_hang(trang_thai);
CREATE INDEX IF NOT EXISTS idx_kho_hang_mac_dinh ON kho_hang(la_mac_dinh);

-- Seed dữ liệu mẫu ban đầu
INSERT OR IGNORE INTO kho_hang (id, ten, dia_chi, la_mac_dinh, trang_thai) VALUES
    ('kho-hcm-q7', 'Kho Quận 7 - HCM', '105 Nguyễn Thị Thập, P. Tân Hưng, Quận 7, TP.HCM', 1, 'hoat_dong'),
    ('kho-hcm-tb', 'Kho Tổng Tân Bình', '45 Hoàng Hoa Thám, P. 13, Q. Tân Bình, TP.HCM', 0, 'hoat_dong'),
    ('kho-hn-cg', 'Kho Cầu Giấy - Hà Nội', '88 Duy Tân, P. Dịch Vọng Hậu, Q. Cầu Giấy, Hà Nội', 0, 'hoat_dong');
