-- Seed demo (chỉ profile demo). Dữ liệu giả; tên công ty theo prototype (docs/reference/prototype-inventory.md §0).
-- Tổ → địa bàn là seed tạm (D2): KV01–08 → DTH, KV09–16 → TTT, KV17–24 → NB; dữ liệu thật xin xã (X2).

insert into districts (code, name, note, sort_order) values
    ('DTH', 'Đông Thạnh',    'Ánh xạ từ xã Đông Thạnh cũ',    1),
    ('TTT', 'Thới Tam Thôn', 'Ánh xạ từ xã Thới Tam Thôn cũ', 2),
    ('NB',  'Nhị Bình',      'Ánh xạ từ xã Nhị Bình cũ',      3);

insert into areas (code, name, district_id)
select 'KV' || lpad(n::text, 2, '0'),
       'Tổ dân phố ' || lpad(n::text, 2, '0'),
       (select id from districts where code = case when n <= 8 then 'DTH' when n <= 16 then 'TTT' else 'NB' end)
from generate_series(1, 24) as n;

insert into companies (code, name, contact_name, contact_phone, valid_from, valid_to, org_type) values
    ('DV01', 'Công ty MTĐT Đông Thạnh',            'Trần Hoàng Phúc',  '0900000001', '2026-01-01', '2026-12-31', 'COMPANY'),
    ('DV02', 'HTX Môi trường An Phú',              'Ngô Thị Thanh',    '0900000002', '2026-01-01', '2026-12-31', 'COOPERATIVE'),
    ('DV03', 'Công ty Dịch vụ Hóc Môn',            'Lê Minh Hải',      '0900000003', '2026-01-01', '2026-12-31', 'COMPANY'),
    ('DV04', 'HTX Xanh Nhị Bình',                  'Phạm Văn Tâm',     '0900000004', '2026-01-01', '2026-12-31', 'COOPERATIVE'),
    ('DV05', 'Công ty Môi trường Tân Tiến',        'Võ Thanh Bình',    '0900000005', '2026-01-01', '2026-12-31', 'COMPANY'),
    ('DV06', 'Công ty Công ích Thành Phát',        'Nguyễn Quốc Dũng', '0900000006', '2026-01-01', '2026-12-31', 'COMPANY'),
    ('DV07', 'Công ty Xanh Sài Gòn',               'Trương Thị Mỹ',    '0900000007', '2026-01-01', '2026-12-31', 'COMPANY'),
    ('DV08', 'HTX Dịch vụ Phú Thành',              'Đỗ Quốc Việt',     '0900000008', '2026-01-01', '2026-12-31', 'COOPERATIVE'),
    ('DV09', 'Công ty Môi trường Minh Tâm',        'Mai Thị Thu',      '0900000009', '2026-01-01', '2026-12-31', 'COMPANY'),
    ('DV10', 'HTX Thu gom Hòa Bình',               'Lý Thành Công',    '0900000010', '2026-01-01', '2026-12-31', 'COOPERATIVE'),
    ('DV11', 'Trung tâm Cung ứng dịch vụ công xã', 'Dương Văn Phú',    '0900000011', '2026-01-01', '2026-12-31', 'PUBLIC_UNIT');
