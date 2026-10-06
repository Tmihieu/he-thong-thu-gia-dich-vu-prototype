-- Góp ý BA 05/10 (UC-12, UC-14, UC-18, UC-23, UC-30, UC-33): bỏ phân tổ người đi thu, lịch thu gom, vị trí khu vực.
-- Người đi thu thu mọi hộ có khoản của công ty; payments.collector_id vẫn ghi ai đã thu tiền mặt.
drop table collector_assignments;
drop table collection_schedules;
alter table areas
    drop constraint ck_areas_location,
    drop column latitude,
    drop column longitude;
