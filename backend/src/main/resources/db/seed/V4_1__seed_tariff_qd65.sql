-- Seed demo (chỉ profile demo). SỐ TẠM, thay khi có số chính thức QĐ 65/2026 (G9).
-- BG-67-2025: hiệu lực và mức hộ gia đình 57.000 + 23.000 theo prototype (data.js tariffVersions);
-- prototype không có nhóm chủ nguồn thải nhỏ / theo khối lượng cho bản này nên tạm dùng lại số tạm của BG-65-2026.

insert into tariff_versions (code, legal_basis, valid_from, valid_to, status, scope_note) values
    ('BG-67-2025', 'QĐ 67/2025/QĐ-UBND', '2025-06-01', '2026-08-31', 'EXPIRED', 'Hóc Môn cũ · dùng cho kỳ 08/2026'),
    ('BG-65-2026', 'QĐ 65/2026/QĐ-UBND', '2026-09-01', '2027-06-30', 'ACTIVE',  'Số tạm, chờ số chính thức (G9)');

insert into tariff_rates (tariff_version_id, tariff_group, collection_fee, processing_fee, monthly_total, unit_label)
select v.id, r.tariff_group, r.collection_fee, r.processing_fee, r.collection_fee + r.processing_fee, r.unit_label
from tariff_versions v
join (values
    ('BG-65-2026', 'HH_UP_TO_2',        29000, 11000, 'đ/hộ/tháng'),
    ('BG-65-2026', 'HH_3_PLUS',         57000, 23000, 'đ/hộ/tháng'),
    ('BG-65-2026', 'SMALL_GENERATOR',  119000,     0, 'đ/tháng'),
    ('BG-65-2026', 'BY_VOLUME',       1266000,     0, 'đ/tháng'),
    ('BG-67-2025', 'HH_UP_TO_2',        57000, 23000, 'đ/hộ/tháng'),
    ('BG-67-2025', 'HH_3_PLUS',         57000, 23000, 'đ/hộ/tháng'),
    ('BG-67-2025', 'SMALL_GENERATOR',  119000,     0, 'đ/tháng'),
    ('BG-67-2025', 'BY_VOLUME',       1266000,     0, 'đ/tháng')
) as r (version_code, tariff_group, collection_fee, processing_fee, unit_label) on r.version_code = v.code;

insert into fee_types (code, name, pricing_mode, default_price) values
    ('ENV',   'Phí vệ sinh môi trường (CTRSH)', 'TARIFF', null),
    ('EXTRA', 'Phụ phí dịch vụ phát sinh',      'FIXED',  50000);
