-- ============================================================================
-- 0007_bien_ban_kho_hang.sql
-- Thêm cột kho_hang_id vào bảng bien_ban để liên kết video với kho hàng
-- ============================================================================

ALTER TABLE bien_ban ADD COLUMN kho_hang_id TEXT REFERENCES kho_hang(id);
CREATE INDEX IF NOT EXISTS idx_bien_ban_kho_hang ON bien_ban(kho_hang_id);

-- Gán kho mặc định cho toàn bộ video đã tạo trước khi có trường kho_hang_id
UPDATE bien_ban 
SET kho_hang_id = (SELECT id FROM kho_hang WHERE la_mac_dinh = 1 AND trang_thai = 'hoat_dong' LIMIT 1)
WHERE kho_hang_id IS NULL;
