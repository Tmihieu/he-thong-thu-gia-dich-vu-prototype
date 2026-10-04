-- Seed demo (chỉ profile demo): 28 ấp thêm mới ở V40_1 chưa có công ty, người thu, lịch thu. Bổ sung đủ để màn hình
-- công ty và người đi thu dùng được trên mọi ấp. Ấp 47 (KV24 cũ) cố ý để trống công ty cho kịch bản §10 bước 2.
--
-- Công ty: chia vòng cho 10 công ty DV02–DV11 theo thứ tự mã ấp, hiệu lực 01/09/2026 – 31/12/2026 như phân công V6_1.
-- DV01 giữ nguyên KV07, KV09 (kịch bản §10 và số liệu kỳ 09/2026 của V22_1 dựa vào đó).
-- Người thu: GIẢ, mỗi ấp một người, đăng nhập thuap{số ấp} (vd. thuap01), mật khẩu giả chung ghi ở docs/demo-accounts.md.
-- (thu01…thu23 của V9_1 giữ nguyên số theo tổ cũ nên không dùng lại được cho ấp mới.)
-- Lịch thu: theo địa bàn, giống V17_1.

insert into area_assignments (area_id, company_id, valid_from, valid_to, note)
select n.id, c.id, date '2026-09-01', date '2026-12-31', 'Seed ấp mới'
from (
    select a.id, row_number() over (order by a.code) as rn
    from areas a
    where a.code <> 'AP47'
      and not exists (select 1 from area_assignments aa where aa.area_id = a.id)
) n
join (
    select id, row_number() over (order by code) as rn from companies where code <> 'DV01'
) c on c.rn = (n.rn - 1) % (select count(*) from companies where code <> 'DV01') + 1;

insert into users (username, full_name, phone, organization, role, company_id, password_hash)
select 'thuap' || substring(a.code from 3),
       (array['Lê Văn','Hoàng Thị','Bùi Quốc','Ngô Thị','Phan Minh','Đỗ Thị'])[(row_number() over (order by a.code) - 1) % 6 + 1]
         || ' ' || (array['Bình','Mai','Đạt','Hương','Sơn','Trang','Vinh','Yến'])[(row_number() over (order by a.code) - 1) % 8 + 1]
         || ' (người thu Ấp ' || ltrim(substring(a.code from 3), '0') || ')',
       '0934' || lpad(substring(a.code from 3), 6, '0'),
       c.name, 'COLLECTOR', c.id,
       '$2a$10$2gNNNvSfsPQSGXK.r0Cpted0JhUz/XNCMWLNVYXNAulubq8mPxaZC'
from area_assignments aa
join areas a on a.id = aa.area_id
join companies c on c.id = aa.company_id
where aa.note = 'Seed ấp mới'
order by a.code;

insert into collector_assignments (collector_id, area_id, company_id, valid_from, valid_to, note)
select u.id, aa.area_id, aa.company_id, aa.valid_from, aa.valid_to, 'Seed: 1 người/ấp'
from area_assignments aa
join areas a on a.id = aa.area_id
join users u on u.username = 'thuap' || substring(a.code from 3)
where aa.note = 'Seed ấp mới';

insert into collection_schedules (area_id, weekday, week_of_month, start_time, end_time, waste_type, note)
select a.id, s.weekday, s.week_of_month, s.start_time, s.end_time, s.waste_type, s.note
from areas a
join districts d on d.id = a.district_id
join (values
    ('DTH', 2, null::integer, time '17:00', time '19:00', 'HOUSEHOLD',            null),
    ('DTH', 4, null,          time '17:00', time '19:00', 'HOUSEHOLD',            null),
    ('DTH', 6, null,          time '17:00', time '19:00', 'HOUSEHOLD_RECYCLABLE', null),
    ('DTH', 7, 1,             time '08:00', time '11:00', 'BULKY',                'Chỉ hộ đã đăng ký'),
    ('TTT', 1, null,          time '18:00', time '20:00', 'HOUSEHOLD',            null),
    ('TTT', 3, null,          time '18:00', time '20:00', 'HOUSEHOLD',            null),
    ('TTT', 5, null,          time '18:00', time '20:00', 'HOUSEHOLD_RECYCLABLE', null),
    ('TTT', 7, 1,             time '08:00', time '11:00', 'BULKY',                'Chỉ hộ đã đăng ký'),
    ('NB',  1, null,          time '06:00', time '08:00', 'HOUSEHOLD',            null),
    ('NB',  3, null,          time '06:00', time '08:00', 'HOUSEHOLD',            null),
    ('NB',  5, null,          time '06:00', time '08:00', 'HOUSEHOLD_RECYCLABLE', null),
    ('NB',  6, 1,             time '07:00', time '10:00', 'BULKY',                'Chỉ hộ đã đăng ký')
) as s (district_code, weekday, week_of_month, start_time, end_time, waste_type, note)
    on s.district_code = d.code
where not exists (select 1 from collection_schedules x where x.area_id = a.id);
