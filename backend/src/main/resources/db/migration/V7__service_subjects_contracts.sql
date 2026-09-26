-- T15 · master-data · ServiceSubject, ServiceContract (docs/data-dictionary.md §2.2)
-- Không tạo cột số định danh chủ hộ (mức "Thật", dữ liệu nhạy cảm; chỉ xin khi xã yêu cầu).

create table service_subjects (
    id                   bigint generated always as identity primary key,
    code                 varchar(20)  not null,
    subject_type         varchar(30)  not null,
    name                 varchar(200) not null,
    address              varchar(255) not null,
    area_id              bigint       not null references areas (id),
    phone                varchar(15),
    status               varchar(30)  not null default 'ACTIVE',
    member_count         integer,
    representative_name  varchar(100),
    tax_code             varchar(14),
    note                 text,

    created_at           timestamptz  not null default now(),
    created_by           bigint references users (id),
    updated_at           timestamptz  not null default now(),
    updated_by           bigint references users (id),
    version              integer      not null default 0,

    constraint uq_service_subjects_code unique (code),
    constraint ck_service_subjects_code_format check (code ~ '^[A-Z]{2,3}-(H[0-9]{6}|KD[0-9]{5}|DN[0-9]{5})$'),
    constraint ck_service_subjects_type check (subject_type in ('HOUSEHOLD', 'BUSINESS_HOUSEHOLD', 'ENTERPRISE')),
    constraint ck_service_subjects_status check (status in ('ACTIVE', 'PENDING', 'ENDED')),
    constraint ck_service_subjects_phone_digits check (phone is null or phone ~ '^[0-9]{9,15}$'),
    constraint ck_service_subjects_members check (member_count is null or member_count > 0)
);

create index ix_service_subjects_area on service_subjects (area_id);
create index ix_service_subjects_phone on service_subjects (phone);

create table service_contracts (
    id                  bigint generated always as identity primary key,
    contract_no         varchar(30)  not null,
    subject_id          bigint       not null references service_subjects (id),
    tariff_group        varchar(30)  not null,
    valid_from          date         not null,
    valid_to            date,
    exempt              boolean      not null default false,
    exempt_reason       varchar(255),
    exempt_decision_no  varchar(50),
    note                text,

    created_at          timestamptz  not null default now(),
    created_by          bigint references users (id),
    updated_at          timestamptz  not null default now(),
    updated_by          bigint references users (id),
    version             integer      not null default 0,

    constraint uq_service_contracts_no unique (contract_no),
    constraint ck_service_contracts_group check (tariff_group in ('HH_UP_TO_2', 'HH_3_PLUS', 'SMALL_GENERATOR', 'BY_VOLUME')),
    constraint ck_service_contracts_validity check (valid_to is null or valid_to >= valid_from),
    constraint ck_service_contracts_exempt_reason check (not exempt or coalesce(trim(exempt_reason), '') <> ''),
    -- Mỗi đối tượng tối đa 1 hợp đồng hiệu lực tại một thời điểm.
    constraint ex_service_contracts_overlap exclude using gist (
        subject_id with =,
        daterange(valid_from, valid_to, '[]') with &&
    )
);

comment on column service_contracts.contract_no is 'Số đăng ký tự sinh ĐK-{mã địa bàn}-{nnnn}, đếm theo địa bàn (D10)';
