-- T38 · master-data · CollectionSchedule (docs/data-dictionary.md §3.3)
-- Lịch lưu có cấu trúc: thứ ISO (1 = Thứ 2 … 7 = Chủ nhật), tuần trong tháng (null = hằng tuần), khung giờ.
-- Công ty thực hiện không lưu ở đây mà lấy từ area_assignments.

create table collection_schedules (
    id             bigint generated always as identity primary key,
    area_id        bigint       not null references areas (id),
    weekday        integer      not null,
    week_of_month  integer,
    start_time     time         not null,
    end_time       time         not null,
    waste_type     varchar(30)  not null,
    note           varchar(255),

    created_at     timestamptz  not null default now(),
    created_by     bigint references users (id),
    updated_at     timestamptz  not null default now(),
    updated_by     bigint references users (id),
    version        integer      not null default 0,

    constraint ck_collection_schedules_weekday check (weekday between 1 and 7),
    constraint ck_collection_schedules_week_of_month check (week_of_month is null or week_of_month between 1 and 5),
    constraint ck_collection_schedules_time check (end_time > start_time),
    constraint ck_collection_schedules_waste_type check (waste_type in
        ('HOUSEHOLD', 'HOUSEHOLD_RECYCLABLE', 'BULKY'))
);

create index ix_collection_schedules_area on collection_schedules (area_id);
