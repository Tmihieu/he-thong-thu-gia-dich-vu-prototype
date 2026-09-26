-- Seed demo (chỉ profile demo): phân công theo prototype (docs/reference/prototype-inventory.md §0),
-- hiệu lực 01/09/2026 – 31/12/2026 như MANAGEMENT_AREAS. KV24 chưa có công ty (§10 bước 2 phân công bằng popup).

insert into area_assignments (area_id, company_id, valid_from, valid_to, note)
select a.id, c.id, date '2026-09-01', date '2026-12-31', 'Seed theo prototype'
from (values
    ('DV01', 'KV07'), ('DV01', 'KV09'),
    ('DV02', 'KV01'), ('DV02', 'KV02'),
    ('DV03', 'KV03'), ('DV03', 'KV13'), ('DV03', 'KV14'),
    ('DV04', 'KV04'), ('DV04', 'KV15'),
    ('DV05', 'KV16'),
    ('DV06', 'KV05'), ('DV06', 'KV06'),
    ('DV07', 'KV12'), ('DV07', 'KV17'), ('DV07', 'KV18'),
    ('DV08', 'KV08'), ('DV08', 'KV19'),
    ('DV09', 'KV20'),
    ('DV10', 'KV10'), ('DV10', 'KV23'),
    ('DV11', 'KV11'), ('DV11', 'KV21'), ('DV11', 'KV22')
) as m (company_code, area_code)
join companies c on c.code = m.company_code
join areas a on a.code = m.area_code;
