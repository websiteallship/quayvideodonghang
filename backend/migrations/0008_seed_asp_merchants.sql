-- ============================================================================
-- 0008_seed_asp_merchants.sql
-- Thêm thông tin xác thực VietFul API cho 2 nhà bán thuộc realm 'asp'
-- ============================================================================

INSERT INTO vietful_merchants (
    id,
    code,
    name,
    realm,
    auth_url,
    api_url,
    client_id,
    client_secret,
    warehouse_codes,
    is_active
) VALUES 
(
    'merchant_asp_1',
    'ASP_SHOP_1',
    'Nhà bán ASP 1',
    'asp',
    'https://auth.vnfai.com',
    'https://ext-api.vnfai.com',
    '8901911f-ea55-4cd3-85a5-facaf3ece91a',
    '1fbe7cd9-8d00-44a1-b36e-c2708eecf4ea',
    '["ZPTDN"]',
    1
),
(
    'merchant_asp_2',
    'ASP_SHOP_2',
    'Nhà bán ASP 2',
    'asp',
    'https://auth.vnfai.com',
    'https://ext-api.vnfai.com',
    '51c4c858-adfd-4249-b608-0d2db6495f6f',
    'de6efcc1-eac5-48a3-b01e-9c02669674b2',
    '["ZPTDN"]',
    1
)
ON CONFLICT(client_id) DO UPDATE SET
    client_secret = excluded.client_secret,
    code = excluded.code,
    name = excluded.name,
    realm = excluded.realm,
    auth_url = excluded.auth_url,
    api_url = excluded.api_url,
    is_active = 1,
    updated_at = datetime('now');
