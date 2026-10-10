-- Điều chỉnh khoản theo biểu giá của kỳ (chọn lại nhóm giá, nhân khẩu / định mức kg), không nhập số tiền tay:
-- lịch sử lưu nhóm giá và số lượng trước / sau. Số lượng = nhân khẩu (nhóm theo nhân khẩu) hoặc kg/tháng (nhóm theo ký).

alter table charge_adjustments add column old_tariff_group varchar(30);
alter table charge_adjustments add column new_tariff_group varchar(30);
alter table charge_adjustments add column old_quantity bigint;
alter table charge_adjustments add column new_quantity bigint;
