-- Seed demo (chỉ profile demo): hồ sơ hộ mẫu dùng đường thật trong danh mục (V49_1) của chính ấp mình, thay cho
-- "đường Mẫu N". Chừa lại để demo màn "Đường chờ xác minh" của quản trị viên:
--   * id % 10 = 0: địa chỉ cũ chưa chuẩn hóa; trong đó id % 30 = 0 ghi đúng tên một đường trong danh mục
--     (nút "Tự khớp" gắn được), còn lại giữ "đường Mẫu N" (không khớp, xử lý tay);
--   * id % 20 = 7: cán bộ ghi "chờ xác minh" một hẻm chưa có trong danh mục, mỗi xã cũ một hẻm (gộp nhóm nhiều hộ).
-- Số nhà bỏ tiền tố "Số " cho giống cách ghi địa chỉ thật.
-- Chỉ sửa hồ sơ mẫu ("đường Mẫu…", chưa gắn đường): hồ sơ cán bộ đã nhập trên DB demo cũ giữ nguyên.

create temporary table area_streets on commit drop as
select sa.area_id, s.id as street_id, s.name,
       row_number() over (partition by sa.area_id order by s.name_key) - 1 as idx,
       count(*) over (partition by sa.area_id) as n
from street_areas sa join streets s on s.id = sa.street_id
where s.kind = 'STREET';

-- Hộ được gắn đường của ấp (chọn theo id cho ổn định giữa các lần dựng).
update service_subjects ss
set street_id = st.street_id,
    street_pending = false,
    house_no = regexp_replace(ss.house_no, '^Số ', ''),
    street = st.name,
    address = coalesce(regexp_replace(ss.house_no, '^Số ', '') || ' ', '') || st.name
from area_streets st
where st.area_id = ss.area_id and st.idx = ss.id % st.n
  and ss.id % 10 <> 0 and ss.id % 20 <> 7
  and ss.street_id is null and ss.street like 'đường Mẫu%';

-- Địa chỉ cũ ghi đúng tên đường (chưa gắn): "Tự khớp" sẽ gắn.
update service_subjects ss
set street = 'đường ' || st.name,
    address = coalesce(ss.house_no || ' ', '') || 'đường ' || st.name
from area_streets st
where st.area_id = ss.area_id and st.idx = ss.id % st.n
  and ss.id % 30 = 0
  and ss.street_id is null and ss.street like 'đường Mẫu%';

-- Chờ xác minh: hẻm chưa có trong danh mục, cùng tên cho mọi hộ của một xã cũ.
update service_subjects ss
set street_pending = true,
    house_no = regexp_replace(ss.house_no, '^Số ', ''),
    street = v.alley,
    address = coalesce(regexp_replace(ss.house_no, '^Số ', '') || ' ', '') || v.alley
from areas a
join districts d on d.id = a.district_id
join (values ('DTH', 'Hẻm 99 Đặng Thúc Vịnh'), ('TTT', 'Hẻm 88 Trịnh Thị Miếng'), ('NB', 'Hẻm 77 Bùi Công Trừng'))
    v (district_code, alley) on v.district_code = d.code
where a.id = ss.area_id and ss.id % 20 = 7
  and ss.street_id is null and ss.street like 'đường Mẫu%';
