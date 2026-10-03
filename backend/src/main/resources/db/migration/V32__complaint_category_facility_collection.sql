-- BR-CMP-05: thêm loại khiếu nại "cơ sở vật chất" và "đề nghị thu gom".
alter table complaints drop constraint ck_complaints_category;
alter table complaints add constraint ck_complaints_category check (category in
    ('LATE_COLLECTION', 'OVERCHARGE', 'POLLUTION_POINT', 'STAFF_ATTITUDE', 'FACILITY', 'COLLECTION_REQUEST', 'OTHER'));
