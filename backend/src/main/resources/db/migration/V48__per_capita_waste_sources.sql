-- Họp công ty 05/10 (tasks/nhan-khau-tu-can-0610.md): hộ gia đình tính theo nhân khẩu, loại đối tượng đổi thành
-- nguồn thải nhỏ / lớn, nhóm cân có phí xử lý (bảng mục 3 QĐ 65/2026, nhóm 2).

-- Loại đối tượng: hộ kinh doanh / doanh nghiệp → nguồn thải nhỏ, trừ hồ sơ có định mức từ 9.000 kg/tháng → lớn.
alter table service_subjects drop constraint ck_service_subjects_type;
alter table service_subjects drop constraint ck_service_subjects_code_format;
update service_subjects s set subject_type = case
        when exists (select 1 from service_contracts k where k.subject_id = s.id and k.quota_kg >= 9000) then 'LARGE_SOURCE'
        else 'SMALL_SOURCE' end
where subject_type in ('BUSINESS_HOUSEHOLD', 'ENTERPRISE');
alter table service_subjects add constraint ck_service_subjects_type
    check (subject_type in ('HOUSEHOLD', 'SMALL_SOURCE', 'LARGE_SOURCE'));
-- Mã cũ KD / DN giữ nguyên; hồ sơ mới NN (nhỏ) / NL (lớn).
alter table service_subjects add constraint ck_service_subjects_code_format
    check (code ~ '^[A-Z]{2,3}-(H[0-9]{6}|KD[0-9]{5}|DN[0-9]{5}|NN[0-9]{5}|NL[0-9]{5})$');

-- Nhóm giá mới.
alter table tariff_rates drop constraint ck_tariff_rates_group;
alter table service_contracts drop constraint ck_service_contracts_group;
alter table tariff_rates add constraint ck_tariff_rates_group check (tariff_group in ('HH_UP_TO_2', 'HH_3_PLUS',
    'HH_PER_CAPITA', 'SMALL_UP_TO_126', 'SMALL_126_TO_250', 'SMALL_250_TO_500', 'BY_VOLUME', 'FULL_COST_BY_KG'));
alter table service_contracts add constraint ck_service_contracts_group check (tariff_group in ('HH_UP_TO_2', 'HH_3_PLUS',
    'HH_PER_CAPITA', 'SMALL_UP_TO_126', 'SMALL_126_TO_250', 'SMALL_250_TO_500', 'BY_VOLUME', 'FULL_COST_BY_KG'));

-- Phí xử lý (chỉ nhóm cân có; thu về đâu chưa rõ, tạm đi cùng vận chuyển: công ty chỉ giữ phần thu gom).
alter table tariff_rates add column processing_fee bigint not null default 0;
alter table tariff_rates drop constraint ck_tariff_rates_non_negative;
alter table tariff_rates add constraint ck_tariff_rates_non_negative
    check (collection_fee >= 0 and transport_fee >= 0 and processing_fee >= 0);
alter table tariff_rates drop constraint ck_tariff_rates_total;
alter table tariff_rates add constraint ck_tariff_rates_total
    check (monthly_total = collection_fee + transport_fee + processing_fee);

-- Biểu giá đã có thêm nhóm cân: thu gom + vận chuyển như BY_VOLUME, phí xử lý 421 đ/kg (QĐ 65/2026 nhóm 2).
-- Nhóm nhân khẩu không thêm: chưa có đơn giá một người, quản trị viên nhập ở biểu giá mới.
insert into tariff_rates (tariff_version_id, tariff_group, collection_fee, transport_fee, processing_fee, monthly_total, unit_label)
select tariff_version_id, 'FULL_COST_BY_KG', collection_fee, transport_fee, 421, collection_fee + transport_fee + 421, unit_label
from tariff_rates where tariff_group = 'BY_VOLUME';

-- Nguồn thải lớn chỉ cân.
update service_contracts k set tariff_group = 'FULL_COST_BY_KG'
from service_subjects s
where s.id = k.subject_id and s.subject_type = 'LARGE_SOURCE' and k.tariff_group <> 'FULL_COST_BY_KG';

-- Biểu giá bật thu theo nhân khẩu: toàn xã, hoặc các địa bàn trong bảng dưới.
alter table tariff_versions add column per_capita_all boolean not null default false;
create table tariff_version_per_capita_districts (
    tariff_version_id bigint not null references tariff_versions (id) on delete cascade,
    district_id       bigint not null references districts (id),
    primary key (tariff_version_id, district_id)
);

-- Số nhân khẩu chụp trên khoản theo nhân khẩu (cần để tính lại khi bỏ miễn giảm).
alter table charges add column member_count integer;
alter table charges add constraint ck_charges_member_count check (member_count is null or member_count > 0);
