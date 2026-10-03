-- Xã chốt (03/10): công ty cầm lại phần thu gom, chỉ nộp phần vận chuyển. Phần giữ lại tính thẳng từ biểu giá
-- (collection_fee / monthly_total của từng nhóm) nên không cần cấu hình tỷ lệ riêng cho từng công ty như V27.
alter table companies drop constraint ck_companies_retained_percent;
alter table companies drop column retained_percent;
