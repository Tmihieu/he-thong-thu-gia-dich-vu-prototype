-- Góp ý BA 05/10: kỳ chỉ còn một hạn nộp (collection_periods.due_date); bỏ hạn hộ đóng riêng của phiếu YCT và khoản.
alter table charges drop column due_date;
alter table charge_requests drop column due_date;
