-- Seed demo (chỉ profile demo): hộ GIẢ, không có tên/SĐT/địa chỉ thật.
-- 24 tổ × 9 hộ gia đình + hộ kinh doanh ở tổ chia hết cho 3 + doanh nghiệp ở tổ 5, 12, 20 (≈ 227 đối tượng).
-- Số thứ tự hộ = (thứ tự tổ − 1) × 20 + j, nên KV07, j = 8 → DTH-H000128 (DV01 phụ trách).
-- Đủ trường hợp: miễn 100% (tổ chia hết cho 4, j = 9), chưa có hợp đồng (tổ chia hết cho 5, j = 8),
-- đã chấm dứt (tổ chia hết cho 6, j = 7, hợp đồng hết 30/06/2026).

with areas_ordered as (
    select a.id as area_id, d.code as dcode, row_number() over (order by a.code) as i
    from areas a join districts d on d.id = a.district_id
),
households as (
    select ao.area_id, ao.dcode, ao.i, j, (ao.i - 1) * 20 + j as n
    from areas_ordered ao cross join generate_series(1, 9) as j
),
src as (
    select h.dcode || '-H' || lpad(h.n::text, 6, '0') as code,
           'HOUSEHOLD' as subject_type,
           (array['Nguyễn','Trần','Lê','Phạm','Hoàng','Võ','Đặng','Bùi','Đỗ','Huỳnh'])[h.n % 10 + 1] || ' '
             || (array['Văn','Thị','Minh','Thanh','Ngọc'])[h.n % 5 + 1] || ' '
             || (array['An','Bình','Châu','Dũng','Giang','Hà','Khoa','Lan','Mai','Nam','Oanh','Phúc','Quân','Sơn','Tâm','Uyên','Vy','Xuân'])[h.n % 18 + 1]
             as name,
           'Số ' || (h.j * 7 + h.i) || ' đường Mẫu ' || h.i as address,
           h.area_id,
           '0902' || lpad(h.n::text, 6, '0') as phone,
           case when h.i % 6 = 0 and h.j = 7 then 'ENDED' when h.i % 5 = 0 and h.j = 8 then 'PENDING' else 'ACTIVE' end as status,
           case when h.j % 3 = 0 then 2 else 3 + (h.j % 4) end as member_count,
           null::text as representative_name,
           case when (h.j % 3 = 0) then 'HH_UP_TO_2' else 'HH_3_PLUS' end as tariff_group,
           (h.i % 4 = 0 and h.j = 9) as exempt,
           not (h.i % 5 = 0 and h.j = 8) as has_contract,
           case when h.i % 6 = 0 and h.j = 7 then date '2026-06-30' end as valid_to
    from households h
    union all
    select ao.dcode || '-KD' || lpad(ao.i::text, 5, '0'), 'BUSINESS_HOUSEHOLD', 'Cửa hàng tạp hóa Mẫu ' || ao.i,
           'Số ' || (100 + ao.i) || ' đường Mẫu ' || ao.i, ao.area_id, '0911' || lpad(ao.i::text, 6, '0'), 'ACTIVE',
           null, 'Người Đại Diện Mẫu ' || ao.i, 'SMALL_GENERATOR', false, true, null
    from areas_ordered ao where ao.i % 3 = 0
    union all
    select ao.dcode || '-DN' || lpad(ao.i::text, 5, '0'), 'ENTERPRISE', 'Công ty TNHH Mẫu ' || ao.i,
           'Lô ' || ao.i || ' khu công nghiệp Mẫu', ao.area_id, '0922' || lpad(ao.i::text, 6, '0'), 'ACTIVE',
           null, 'Giám Đốc Mẫu ' || ao.i, 'BY_VOLUME', false, true, null
    from areas_ordered ao where ao.i in (5, 12, 20)
),
inserted as (
    insert into service_subjects (code, subject_type, name, address, area_id, phone, status, member_count,
                                  representative_name)
    select code, subject_type, name, address, area_id, phone, status, member_count, representative_name
    from src
    returning id, code
)
insert into service_contracts (contract_no, subject_id, tariff_group, valid_from, valid_to, exempt, exempt_reason)
select 'ĐK-' || split_part(s.code, '-', 1) || '-'
         || lpad((row_number() over (partition by split_part(s.code, '-', 1) order by s.code))::text, 4, '0'),
       ins.id, s.tariff_group, date '2026-01-01', s.valid_to, s.exempt,
       case when s.exempt then 'Hộ nghèo (dữ liệu giả)' end
from src s join inserted ins on ins.code = s.code
where s.has_contract;
