-- T13 · master-data · AreaAssignment (docs/data-dictionary.md §2.2)
-- Mỗi khu vực tối đa 1 công ty trong cùng khoảng hiệu lực; đổi công ty tạo bản ghi mới, không xóa bản cũ.

create extension if not exists btree_gist;

create table area_assignments (
    id           bigint generated always as identity primary key,
    area_id      bigint      not null references areas (id),
    company_id   bigint      not null references companies (id),
    valid_from   date        not null,
    valid_to     date,
    note         text,
    decision_no  varchar(50),

    created_at   timestamptz not null default now(),
    created_by   bigint references users (id),
    updated_at   timestamptz not null default now(),
    updated_by   bigint references users (id),
    version      integer     not null default 0,

    constraint ck_area_assignments_validity check (valid_to is null or valid_to >= valid_from),
    constraint ex_area_assignments_overlap exclude using gist (
        area_id with =,
        daterange(valid_from, valid_to, '[]') with &&
    )
);

create index ix_area_assignments_company on area_assignments (company_id);

comment on column area_assignments.valid_to is 'Null = đang hiệu lực không thời hạn; phân công mới tự gán = ngày bắt đầu mới − 1';
