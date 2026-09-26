-- T18 · billing · ChargeRequest, Charge (docs/data-dictionary.md §2.3)
-- Phiếu yêu cầu thu chỉ lưu khi phát hành; khoản phải thu chụp công ty theo phân công tại ngày phát hành (G3).

create table charge_requests (
    id                bigint generated always as identity primary key,
    code              varchar(20) not null,
    period_id         bigint      not null references collection_periods (id),
    fee_type_id       bigint      not null references fee_types (id),
    scope_type        varchar(30) not null,
    scope_company_id  bigint references companies (id),
    issue_date        date        not null,
    due_date          date        not null,
    unit_price        bigint,
    note              text,

    created_at        timestamptz not null default now(),
    created_by        bigint references users (id),
    updated_at        timestamptz not null default now(),
    updated_by        bigint references users (id),
    version           integer     not null default 0,

    constraint uq_charge_requests_code unique (code),
    constraint ck_charge_requests_scope check (scope_type in ('ALL', 'AREAS', 'COMPANY')),
    constraint ck_charge_requests_scope_company check ((scope_type = 'COMPANY') = (scope_company_id is not null)),
    constraint ck_charge_requests_price check (unit_price is null or unit_price >= 0)
);

create table charge_request_areas (
    charge_request_id  bigint not null references charge_requests (id),
    area_id            bigint not null references areas (id),
    primary key (charge_request_id, area_id)
);

create table charges (
    id                 bigint generated always as identity primary key,
    code               varchar(30) not null,
    charge_request_id  bigint      not null references charge_requests (id),
    subject_id         bigint      not null references service_subjects (id),
    contract_id        bigint      not null references service_contracts (id),
    period_id          bigint      not null references collection_periods (id),
    fee_type_id        bigint      not null references fee_types (id),
    area_id            bigint      not null references areas (id),
    company_id         bigint      not null references companies (id),
    tariff_group       varchar(30),
    unit_price         bigint      not null,
    months             integer     not null,
    amount             bigint      not null,
    coverage_from      date        not null,
    coverage_to        date        not null,
    due_date           date        not null,
    status             varchar(30) not null,
    paid_at            timestamptz,

    created_at         timestamptz not null default now(),
    created_by         bigint references users (id),
    updated_at         timestamptz not null default now(),
    updated_by         bigint references users (id),
    version            integer     not null default 0,

    constraint uq_charges_code unique (code),
    constraint ck_charges_status check (status in ('UNPAID', 'PAID', 'EXEMPT')),
    constraint ck_charges_money check (unit_price >= 0 and amount >= 0 and months in (1, 3)),
    constraint ck_charges_coverage check (coverage_to >= coverage_from),
    constraint ck_charges_paid_at check ((status = 'PAID') = (paid_at is not null)),
    -- Chặn phát hành trùng: cùng đối tượng, cùng loại phí, khoảng tháng chồng lấn (tháng trong quý và ngược lại, R2).
    constraint ex_charges_overlap exclude using gist (
        subject_id with =,
        fee_type_id with =,
        daterange(coverage_from, coverage_to, '[]') with &&
    )
);

create index ix_charges_period_company on charges (period_id, company_id);
create index ix_charges_area on charges (area_id);
create index ix_charges_request on charges (charge_request_id);
create index ix_charges_status on charges (status);

comment on column charges.company_id is 'Công ty phân công khu vực tại ngày phát hành (G3); sổ công ty–kỳ tính theo cột này';
comment on column charges.amount is 'Không sửa sau khi phát hành; số thực thu nằm ở payments (G4)';
