-- Khiếu nại "đã đóng nhưng chưa được ghi nhận" (đánh giá prototype 8.3).
alter table complaints drop constraint ck_complaints_category;
alter table complaints add constraint ck_complaints_category check (category in
    ('LATE_COLLECTION', 'OVERCHARGE', 'POLLUTION_POINT', 'STAFF_ATTITUDE', 'PAID_NOT_RECORDED', 'OTHER'));
