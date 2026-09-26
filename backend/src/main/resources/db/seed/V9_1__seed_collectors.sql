-- Seed demo (chỉ profile demo): mỗi tổ đã có công ty một người đi thu GIẢ, đăng nhập thu{số tổ} (vd. thu07 ở KV07),
-- mật khẩu giả chung ghi ở docs/demo-accounts.md. Phân tổ cùng hiệu lực với phân công khu vực của công ty.

insert into users (username, full_name, phone, organization, role, company_id, password_hash)
select 'thu' || substring(a.code from 3),
       (array['Nguyễn Thành','Phạm Minh','Võ Thị','Trần Quốc','Lương Thị','Đặng Minh'])[(row_number() over (order by a.code) - 1) % 6 + 1]
         || ' ' || (array['Long','Tuấn','Lan','Huy','Ngọc','Khoa','Phong','Hạnh'])[(row_number() over (order by a.code) - 1) % 8 + 1]
         || ' (người thu ' || a.code || ')',
       '0933' || lpad(substring(a.code from 3), 6, '0'),
       c.name, 'COLLECTOR', c.id,
       '$2a$10$2gNNNvSfsPQSGXK.r0Cpted0JhUz/XNCMWLNVYXNAulubq8mPxaZC'
from area_assignments aa
join areas a on a.id = aa.area_id
join companies c on c.id = aa.company_id
order by a.code;

insert into collector_assignments (collector_id, area_id, company_id, valid_from, valid_to, note)
select u.id, aa.area_id, aa.company_id, aa.valid_from, aa.valid_to, 'Seed: 1 người/tổ'
from area_assignments aa
join areas a on a.id = aa.area_id
join users u on u.username = 'thu' || substring(a.code from 3);
