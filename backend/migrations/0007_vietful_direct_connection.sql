-- ============================================================================
-- 0007_vietful_direct_connection.sql
-- Bảng quản lý Merchant VietFul và Bảng lưu trữ Đơn hàng trực tiếp (Multi-Merchant)
-- Tham chiếu: docs/16-tich-hop-dong-bo-don-hang-vietful.md mục 2.2
-- ============================================================================

-- 1. Bảng cấu hình Merchant kết nối VietFul thật
CREATE TABLE IF NOT EXISTS vietful_merchants (
    id                      TEXT PRIMARY KEY,
    code                    TEXT NOT NULL UNIQUE,
    name                    TEXT NOT NULL,
    realm                   TEXT NOT NULL DEFAULT 'asp',
    auth_url                TEXT NOT NULL DEFAULT 'https://auth.vnfai.com',
    api_url                 TEXT NOT NULL DEFAULT 'https://ext-api.vnfai.com',
    client_id               TEXT NOT NULL,
    client_secret           TEXT NOT NULL,
    warehouse_codes         TEXT NOT NULL DEFAULT '["ZPTDN"]',
    webhook_secret          TEXT,
    is_active               INTEGER NOT NULL DEFAULT 1,
    created_at              TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at              TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_merchants_client_id ON vietful_merchants(client_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_merchants_code ON vietful_merchants(code);

-- 2. Bảng lưu trữ thông tin đơn hàng thật được đồng bộ trực tiếp từ VietFul
CREATE TABLE IF NOT EXISTS order_tracking (
    id                      TEXT PRIMARY KEY,
    bien_ban_id             TEXT REFERENCES bien_ban(id) ON DELETE SET NULL,
    merchant_id             TEXT REFERENCES vietful_merchants(id) ON DELETE SET NULL,
    ma_van_don              TEXT NOT NULL UNIQUE,
    ma_don_hang             TEXT,
    or_id                   INTEGER,
    trang_thai_don          TEXT DEFAULT 'CHO_DONG_GOI',
    trang_thai_dong_hang    TEXT DEFAULT 'da_dong',
    trang_thai_kiem_hoan    TEXT DEFAULT 'khong_ap_dung',
    canh_bao                TEXT DEFAULT 'NONE',
    nha_ban                 TEXT,
    ghi_chu_don             TEXT,
    san_pham_summary        TEXT,
    du_lieu_raw_json        TEXT,
    ngay_tao                TEXT DEFAULT (datetime('now')),
    ngay_cap_nhat           TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ot_ma_van_don ON order_tracking(ma_van_don);
CREATE INDEX IF NOT EXISTS idx_ot_ma_don_hang ON order_tracking(ma_don_hang);
CREATE INDEX IF NOT EXISTS idx_ot_merchant_id ON order_tracking(merchant_id);
CREATE INDEX IF NOT EXISTS idx_ot_canh_bao ON order_tracking(canh_bao);
