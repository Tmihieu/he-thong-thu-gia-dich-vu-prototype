-- Seed demo (chỉ profile demo): đơn giá các bậc chủ nguồn thải theo bảng QĐ 65/2026 (thu gom + vận chuyển).
-- Bậc 500 đến dưới 9.000 kg/tháng (BY_VOLUME) tính đ/kg; hiện chưa có tính khoản theo ký nên hợp đồng
-- doanh nghiệp mẫu chuyển sang bậc 250–500 kg (đ/tháng) để vẫn lập được khoản.

update tariff_rates r
set collection_fee = v.collection_fee, transport_fee = v.transport_fee,
    monthly_total = v.collection_fee + v.transport_fee, unit_label = v.unit_label
from tariff_versions tv,
     (values ('SMALL_UP_TO_126',   57000,  23000, 'đ/tháng'),
             ('SMALL_126_TO_250',  85000,  34000, 'đ/tháng'),
             ('SMALL_250_TO_500', 170000,  68000, 'đ/tháng'),
             ('BY_VOLUME',           453,    180, 'đ/kg')) as v (tariff_group, collection_fee, transport_fee, unit_label)
where tv.id = r.tariff_version_id and tv.code in ('BG-65-2026', 'BG-67-2025') and r.tariff_group = v.tariff_group;

update service_contracts c
set tariff_group = 'SMALL_250_TO_500'
from service_subjects s
where s.id = c.subject_id and s.subject_type = 'ENTERPRISE' and c.tariff_group = 'BY_VOLUME';
