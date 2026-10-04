-- Chụp phần thu gom của khoản lúc phát hành (đánh giá 04/10): công ty giữ phần thu gom, chỉ nộp phần vận chuyển.
-- Trước đây phần này tính lại mỗi lần xem từ biểu giá hiện hành nên sửa đơn giá làm đổi số kỳ đã khóa.
alter table charges add column collection_amount bigint not null default 0;
alter table charges add constraint ck_charges_collection_amount check (collection_amount >= 0);

-- Khoản đã có: tính theo tỷ lệ thu gom / tổng của nhóm giá trong biểu giá của kỳ (khoản miễn lấy theo đơn giá × số tháng).
update charges c
set collection_amount = round(case when c.amount > 0 then c.amount else c.unit_price * c.months end::numeric
                              * r.collection_fee / nullif(r.monthly_total, 0))
from collection_periods cp
join tariff_rates r on r.tariff_version_id = cp.tariff_version_id
where cp.id = c.period_id and r.tariff_group = c.tariff_group and r.monthly_total > 0;

comment on column charges.collection_amount is 'Phần thu gom công ty giữ lại, chụp lúc phát hành; phần vận chuyển = amount − collection_amount';
