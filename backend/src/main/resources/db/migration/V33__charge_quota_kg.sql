-- Chụp định mức kg/tháng lên khoản nhóm theo ký để tính lại tiền khi lãnh đạo từ chối miễn giảm (BR-BIL-03, BR-LD-04).
alter table charges add column quota_kg bigint;
update charges set quota_kg = amount / (unit_price * months)
where tariff_group = 'BY_VOLUME' and amount > 0 and unit_price > 0;
