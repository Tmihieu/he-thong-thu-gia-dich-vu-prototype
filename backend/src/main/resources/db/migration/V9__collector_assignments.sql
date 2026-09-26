-- T20 · collection · CollectorAssignment (docs/data-dictionary.md §2.4)
-- Schema nhiều–nhiều (O4). "Mỗi tổ tối đa 1 người đang hiệu lực" kiểm ở service, không đặt ở CSDL.

create table collector_assignments (
    id            bigint generated always as identity primary key,
    collector_id  bigint      not null references users (id),
    area_id       bigint      not null references areas (id),
    company_id    bigint      not null references companies (id),
    valid_from    date        not null,
    valid_to      date,
    note          text,

    created_at    timestamptz not null default now(),
    created_by    bigint references users (id),
    updated_at    timestamptz not null default now(),
    updated_by    bigint references users (id),
    version       integer     not null default 0,

    constraint ck_collector_assignments_validity check (valid_to is null or valid_to >= valid_from),
    -- Không trùng lặp cùng người, cùng tổ, chồng hiệu lực.
    constraint ex_collector_assignments_overlap exclude using gist (
        collector_id with =,
        area_id with =,
        daterange(valid_from, valid_to, '[]') with &&
    )
);

create index ix_collector_assignments_area on collector_assignments (area_id);
create index ix_collector_assignments_company on collector_assignments (company_id);
