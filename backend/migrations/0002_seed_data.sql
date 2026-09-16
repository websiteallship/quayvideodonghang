-- ============================================================================
-- 0002_seed_data.sql
-- Seed dữ liệu khởi tạo ban đầu cho Cloudflare D1
-- ============================================================================

-- Tài khoản Quản trị viên (PIN: 0000) và Nhân viên kho test (PIN: 1234)
INSERT OR IGNORE INTO nhan_vien (ma, ten, pin_hash, vai_tro, trang_thai) VALUES
    ('ADMIN', 'Quản trị viên', '$2b$10$SSuFEHGlzwwXGz4pQdb2CeSxD4TF9UJ8xCJlmOC/OJrFCcUmMwR8O', 'admin', 'hoat_dong'),
    ('NV001', 'Nguyễn Văn Kho', '$2b$10$cPLhrUCddL6/nswS5fVoaehPZnkD2XKLisHm4X7swE1IUJQSYlZBW', 'nhan_vien', 'hoat_dong');

-- Cấu hình hệ thống mặc định
INSERT OR IGNORE INTO cau_hinh (khoa, gia_tri) VALUES
    ('drive_folder_id', ''),
    ('sheet_id', ''),
    ('do_phan_giai', '1280x720'),
    ('bitrate_mbps', '2.5'),
    ('auto_scan', 'false'),
    ('quay_lien_tuc', 'false'),
    ('watermark', 'true'),
    ('don_vi_vc_danh_sach', 'GHN,GHTK,J&T,ViettelPost,ShopeeXpress,Khac'),
    ('retention_thang', '6');
