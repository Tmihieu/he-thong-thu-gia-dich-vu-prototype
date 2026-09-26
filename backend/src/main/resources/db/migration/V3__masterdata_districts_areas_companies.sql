-- T09 · master-data · District, Area, Company (docs/data-dictionary.md §2.2)
-- Thêm FK users.company_id → companies (đã hẹn ở V1).

create table districts (
    id          bigint generated always as identity primary key,
    code        varchar(10)  not null,
    name        varchar(100) not null,
    note        text,
    sort_order  integer,

    created_at  timestamptz  not null default now(),
    created_by  bigint references users (id),
    updated_at  timestamptz  not null default now(),
    updated_by  bigint references users (id),
    version     integer      not null default 0,

    constraint uq_districts_code unique (code)
);

create table areas (
    id           bigint generated always as identity primary key,
    code         varchar(10)  not null,
    name         varchar(100) not null,
    district_id  bigint       not null references districts (id),
    status       varchar(30)  not null default 'ACTIVE',
    note         text,

    created_at   timestamptz  not null default now(),
    created_by   bigint references users (id),
    updated_at   timestamptz  not null default now(),
    updated_by   bigint references users (id),
    version      integer      not null default 0,

    constraint uq_areas_code unique (code),
    constraint ck_areas_status check (status in ('ACTIVE', 'INACTIVE'))
);

create index ix_areas_district on areas (district_id);

create table companies (
    id                   bigint generated always as identity primary key,
    code                 varchar(10)  not null,
    name                 varchar(200) not null,
    contact_name         varchar(100) not null,
    contact_phone        varchar(15)  not null,
    status               varchar(30)  not null default 'ACTIVE',
    valid_from           date         not null,
    valid_to             date,
    org_type             varchar(30),
    tax_code             varchar(14),
    address              varchar(255),
    email                varchar(100),
    commune_contract_no  varchar(50),
    bank_account         varchar(50),
    bank_name            varchar(100),

    created_at           timestamptz  not null default now(),
    created_by           bigint references users (id),
    updated_at           timestamptz  not null default now(),
    updated_by           bigint references users (id),
    version              integer      not null default 0,

    constraint uq_companies_code unique (code),
    constraint ck_companies_code_format check (code ~ '^DV[0-9]{2}$'),
    constraint ck_companies_phone_digits check (contact_phone ~ '^[0-9]{9,15}$'),
    constraint ck_companies_status check (status in ('ACTIVE', 'INACTIVE')),
    constraint ck_companies_org_type check (org_type is null or org_type in ('COMPANY', 'COOPERATIVE', 'PUBLIC_UNIT')),
    constraint ck_companies_validity check (valid_to is null or valid_to >= valid_from)
);

alter table users
    add constraint fk_users_company foreign key (company_id) references companies (id);

create index ix_users_company on users (company_id);

comment on table districts is 'Ba địa bàn sau sáp nhập của xã Đông Thạnh';
comment on table areas is 'Khu vực / tổ dân phố; công ty phụ trách lấy từ area_assignments';
comment on column companies.valid_from is 'Hiệu lực hợp đồng giữa xã và công ty';
