-- Góp ý BA 03/10: công ty giữ lại một tỷ lệ trên số phải thu, phần còn lại mới phải nộp về xã.
-- Không đặt mặc định: NULL = xã chưa cấu hình, hệ thống coi như công ty không giữ lại (phải nộp = phải thu).
alter table companies add column retained_percent numeric(5, 2);
alter table companies add constraint ck_companies_retained_percent
    check (retained_percent is null or (retained_percent >= 0 and retained_percent <= 100));
comment on column companies.retained_percent is 'Tỷ lệ % công ty giữ lại trên số phải thu (thu gom, vận chuyển); NULL = chưa cấu hình';
