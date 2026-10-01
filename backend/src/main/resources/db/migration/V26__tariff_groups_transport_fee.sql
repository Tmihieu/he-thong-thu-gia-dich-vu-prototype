-- Biểu giá theo QĐ 65/2026: chủ nguồn thải nhỏ chia 3 bậc theo khối lượng, nhóm đ/kg giữ mã BY_VOLUME,
-- thành phần "xử lý" đổi tên thành "vận chuyển".

alter table tariff_rates rename column processing_fee to transport_fee;
alter table tariff_rates drop constraint ck_tariff_rates_non_negative;
alter table tariff_rates add constraint ck_tariff_rates_non_negative check (collection_fee >= 0 and transport_fee >= 0);
alter table tariff_rates drop constraint ck_tariff_rates_total;
alter table tariff_rates add constraint ck_tariff_rates_total check (monthly_total = collection_fee + transport_fee);
comment on column tariff_rates.transport_fee is 'Số tạm cho tới khi có số chính thức QĐ 65/2026 (G9)';

alter table tariff_rates drop constraint ck_tariff_rates_group;
alter table service_contracts drop constraint ck_service_contracts_group;

-- Nhóm chủ nguồn thải nhỏ cũ chuyển vào bậc thấp nhất; xã chỉnh lại bậc theo khối lượng thực tế.
update tariff_rates set tariff_group = 'SMALL_UP_TO_126' where tariff_group = 'SMALL_GENERATOR';
update service_contracts set tariff_group = 'SMALL_UP_TO_126' where tariff_group = 'SMALL_GENERATOR';
update charges set tariff_group = 'SMALL_UP_TO_126' where tariff_group = 'SMALL_GENERATOR';

-- Hai bậc mới lấy tạm đơn giá của bậc thấp nhất cho biểu giá đã có, để biểu giá vẫn đủ nhóm; xã sửa lại theo QĐ.
insert into tariff_rates (tariff_version_id, tariff_group, collection_fee, transport_fee, monthly_total, unit_label)
select r.tariff_version_id, g.tariff_group, r.collection_fee, r.transport_fee, r.monthly_total, r.unit_label
from tariff_rates r
cross join (values ('SMALL_126_TO_250'), ('SMALL_250_TO_500')) as g (tariff_group)
where r.tariff_group = 'SMALL_UP_TO_126';

alter table tariff_rates add constraint ck_tariff_rates_group check (tariff_group in
    ('HH_UP_TO_2', 'HH_3_PLUS', 'SMALL_UP_TO_126', 'SMALL_126_TO_250', 'SMALL_250_TO_500', 'BY_VOLUME'));
alter table service_contracts add constraint ck_service_contracts_group check (tariff_group in
    ('HH_UP_TO_2', 'HH_3_PLUS', 'SMALL_UP_TO_126', 'SMALL_126_TO_250', 'SMALL_250_TO_500', 'BY_VOLUME'));
