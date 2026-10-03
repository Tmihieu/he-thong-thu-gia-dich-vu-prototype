-- Góp ý BA 03/10: chủ nguồn thải lớn tính theo kg. Cân tháng đầu để lấy định mức, các tháng sau thu theo định mức đó.
-- Không đặt mặc định: NULL = chưa có định mức, chưa lập được khoản cho hợp đồng nhóm BY_VOLUME.
alter table service_contracts add column quota_kg integer;
alter table service_contracts add constraint ck_service_contracts_quota_kg check (quota_kg is null or quota_kg > 0);
comment on column service_contracts.quota_kg is 'Định mức kg/tháng (nhóm BY_VOLUME): tiền = đơn giá đ/kg × định mức × số tháng';
