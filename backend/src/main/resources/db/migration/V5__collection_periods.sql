-- T11 · master-data · CollectionPeriod (docs/data-dictionary.md §2.2)
-- Quản trị mở kỳ và bắt đầu thu; cán bộ xã khóa kỳ ở T32 (G1). Kỳ tháng và kỳ quý có thể cùng tồn tại.

create table collection_periods (
    id                 bigint generated always as identity primary key,
    code               varchar(10) not null,
    period_type        varchar(30) not null,
    label              varchar(50) not null,
    start_date         date        not null,
    end_date           date        not null,
    open_date          date        not null,
    due_date           date        not null,
    tariff_version_id  bigint      not null references tariff_versions (id),
    status             varchar(30) not null default 'OPEN',
    locked_at          timestamptz,
    locked_by          bigint references users (id),
    note               text,

    created_at         timestamptz not null default now(),
    created_by         bigint references users (id),
    updated_at         timestamptz not null default now(),
    updated_by         bigint references users (id),
    version            integer     not null default 0,

    constraint uq_collection_periods_code unique (code),
    constraint ck_collection_periods_type check (period_type in ('MONTH', 'QUARTER')),
    constraint ck_collection_periods_code_format check (
        (period_type = 'MONTH' and code ~ '^[0-9]{4}-(0[1-9]|1[0-2])$')
        or (period_type = 'QUARTER' and code ~ '^[0-9]{4}-Q[1-4]$')
    ),
    constraint ck_collection_periods_status check (status in ('OPEN', 'COLLECTING', 'LOCKED')),
    constraint ck_collection_periods_range check (end_date >= start_date),
    constraint ck_collection_periods_due check (due_date >= open_date),
    constraint ck_collection_periods_locked check ((status = 'LOCKED') = (locked_at is not null))
);

create index ix_collection_periods_range on collection_periods (start_date, end_date);

comment on column collection_periods.due_date is 'Hạn công ty nộp xã; hạn hộ đóng nằm ở phiếu YCT (G16)';
