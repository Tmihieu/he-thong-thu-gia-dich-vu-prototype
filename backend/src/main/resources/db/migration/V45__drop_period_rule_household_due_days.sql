-- Kỳ thu chỉ còn một hạn nộp (V42): bỏ hạn hộ đóng khỏi quy tắc tự tạo kỳ.
alter table period_auto_rule drop constraint ck_period_auto_rule_household_days;
alter table period_auto_rule drop column household_due_days;
