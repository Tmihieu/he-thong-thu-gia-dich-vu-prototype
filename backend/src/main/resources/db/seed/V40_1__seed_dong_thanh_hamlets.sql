-- Seed demo (chỉ profile demo): thay 24 "Tổ dân phố" giả của V3_1 bằng 52 ấp thật của xã Đông Thạnh
-- (sau sáp nhập Thới Tam Thôn + Nhị Bình + Đông Thạnh, NQ 1685/NQ-UBTVQH15, hiệu lực 01/7/2025).
-- Ranh giới, tên và số ấp lấy từ OpenStreetMap (© OpenStreetMap contributors, ODbL): relation 21383875–21383913
-- (Ấp 1–39) và 21386184–21386196 (Ấp 40–52). Địa bàn = xã cũ chứa ấp (đối chiếu ranh giới xã cũ trước 01/7/2025):
-- Ấp 1–23 → TTT, Ấp 24–47 → DTH, Ấp 48–52 → NB. Vị trí là điểm nằm sâu nhất bên trong ranh giới ấp.
--
-- 24 tổ cũ được đổi mã/tên sang một ấp cùng xã cũ để giữ nguyên hộ, phân công, người thu, hóa đơn đã seed.
-- Nhị Bình cũ chỉ có 5 ấp nên KV22–24 chuyển sang Ấp 45–47 (DTH); mã hộ cũ (NB-H…) giữ nguyên như mã đã cấp.
-- 28 ấp còn lại thêm mới, chưa có công ty phụ trách.

update districts set note = case code
    when 'DTH' then 'Xã Đông Thạnh cũ: Ấp 24–47'
    when 'TTT' then 'Xã Thới Tam Thôn cũ: Ấp 1–23'
    when 'NB'  then 'Xã Nhị Bình cũ: Ấp 48–52'
end
where code in ('DTH', 'TTT', 'NB');

create temporary table ap_seed (n int, old_code varchar(10), district varchar(10), lat double precision, lon double precision)
    on commit drop;
insert into ap_seed values
    ( 1, null  , 'TTT',  10.874636, 106.613889),
    ( 2, 'KV09', 'TTT',  10.873019, 106.617661),
    ( 3, null  , 'TTT',  10.876833, 106.620025),
    ( 4, 'KV10', 'TTT',  10.879966, 106.612844),
    ( 5, null  , 'TTT',  10.885185, 106.603361),
    ( 6, 'KV11', 'TTT',  10.890769, 106.604071),
    ( 7, null  , 'TTT',  10.892680, 106.600635),
    ( 8, null  , 'TTT',  10.896759, 106.603278),
    ( 9, 'KV12', 'TTT',  10.895852, 106.608272),
    (10, null  , 'TTT',  10.891354, 106.609217),
    (11, 'KV13', 'TTT',  10.887325, 106.608028),
    (12, null  , 'TTT',  10.888319, 106.612239),
    (13, 'KV14', 'TTT',  10.884507, 106.614391),
    (14, null  , 'TTT',  10.883986, 106.618456),
    (15, null  , 'TTT',  10.880375, 106.624176),
    (16, null  , 'TTT',  10.884736, 106.622618),
    (17, null  , 'TTT',  10.888514, 106.622081),
    (18, null  , 'TTT',  10.890032, 106.616663),
    (19, 'KV15', 'TTT',  10.893190, 106.614729),
    (20, null  , 'TTT',  10.895560, 106.619253),
    (21, null  , 'TTT',  10.897658, 106.611250),
    (22, 'KV16', 'TTT',  10.905647, 106.606724),
    (23, null  , 'TTT',  10.906270, 106.615177),
    (24, null  , 'DTH',  10.899373, 106.622735),
    (25, null  , 'DTH',  10.894719, 106.626742),
    (26, null  , 'DTH',  10.889313, 106.626017),
    (27, 'KV01', 'DTH',  10.893989, 106.632431),
    (28, null  , 'DTH',  10.896471, 106.636993),
    (29, 'KV02', 'DTH',  10.899447, 106.631095),
    (30, null  , 'DTH',  10.899838, 106.634667),
    (31, 'KV03', 'DTH',  10.903047, 106.628092),
    (32, null  , 'DTH',  10.911572, 106.626342),
    (33, 'KV04', 'DTH',  10.913002, 106.632644),
    (34, null  , 'DTH',  10.903124, 106.636821),
    (35, 'KV05', 'DTH',  10.904050, 106.639146),
    (36, null  , 'DTH',  10.896507, 106.643751),
    (37, 'KV06', 'DTH',  10.900832, 106.642178),
    (38, null  , 'DTH',  10.905276, 106.641902),
    (39, 'KV07', 'DTH',  10.911775, 106.639976),
    (40, null  , 'DTH',  10.914457, 106.651595),
    (41, null  , 'DTH',  10.910367, 106.647533),
    (42, 'KV08', 'DTH',  10.907176, 106.645986),
    (43, null  , 'DTH',  10.903612, 106.646425),
    (44, null  , 'DTH',  10.900187, 106.647441),
    (45, 'KV22', 'DTH',  10.896735, 106.656345),
    (46, 'KV23', 'DTH',  10.899210, 106.667073),
    (47, 'KV24', 'DTH',  10.909918, 106.652688),
    (48, 'KV17', 'NB' ,  10.917140, 106.659750),
    (49, 'KV18', 'NB' ,  10.913068, 106.670420),
    (50, 'KV19', 'NB' ,  10.916700, 106.680872),
    (51, 'KV20', 'NB' ,  10.906541, 106.681764),
    (52, 'KV21', 'NB' ,  10.908931, 106.687834);

-- Người thu demo của V9_1 mang mã tổ trong tên, vd. "(người thu KV07)".
update users u
set full_name = replace(u.full_name, '(người thu ' || s.old_code || ')', '(người thu Ấp ' || s.n || ')')
from ap_seed s
where s.old_code is not null and u.full_name like '%(người thu ' || s.old_code || ')';

update areas a
set code = 'AP' || lpad(s.n::text, 2, '0'),
    name = 'Ấp ' || s.n,
    district_id = (select id from districts where code = s.district),
    latitude = s.lat,
    longitude = s.lon
from ap_seed s
where a.code = s.old_code;

insert into areas (code, name, district_id, latitude, longitude)
select 'AP' || lpad(s.n::text, 2, '0'), 'Ấp ' || s.n, (select id from districts where code = s.district), s.lat, s.lon
from ap_seed s
where s.old_code is null
  and not exists (select 1 from areas x where x.code = 'AP' || lpad(s.n::text, 2, '0'));
