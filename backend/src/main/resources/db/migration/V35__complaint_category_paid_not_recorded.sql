-- Khiếu nại "đã đóng nhưng chưa được ghi nhận" (đánh giá prototype 8.3), thêm vào danh sách loại sau V32 (FACILITY, COLLECTION_REQUEST).
alter table complaints drop constraint ck_complaints_category;
alter table complaints add constraint ck_complaints_category check (category in
    ('LATE_COLLECTION', 'OVERCHARGE', 'POLLUTION_POINT', 'STAFF_ATTITUDE', 'FACILITY', 'COLLECTION_REQUEST',
     'PAID_NOT_RECORDED', 'OTHER'));
