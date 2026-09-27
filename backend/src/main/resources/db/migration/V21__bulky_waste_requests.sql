-- T45 · citizen-app · BulkyWasteRequest (docs/data-dictionary.md §3.4)
-- Phí công ty báo KHÔNG sinh Charge, không nộp về xã (O5, G13). Công ty phụ trách chụp theo phân công khu vực lúc đăng ký.

create table bulky_waste_requests (
    id                  bigint generated always as identity primary key,
    code                varchar(20)  not null,
    citizen_account_id  bigint       not null references citizen_accounts (id),
    subject_id          bigint       not null references service_subjects (id),
    item_type           varchar(30)  not null,
    item_description    varchar(255),
    quantity            integer      not null,
    address             varchar(255) not null,
    preferred_date      date         not null,
    preferred_slot      varchar(20),
    photo_urls          text,
    company_id          bigint       not null references companies (id),
    quoted_fee          bigint,
    quoted_at           timestamptz,
    scheduled_date      date,
    status              varchar(20)  not null default 'PENDING',
    collected_at        timestamptz,
    cancel_reason       varchar(255),

    created_at          timestamptz  not null default now(),
    created_by          bigint references users (id),
    updated_at          timestamptz  not null default now(),
    updated_by          bigint references users (id),
    version             integer      not null default 0,

    constraint uq_bulky_waste_requests_code unique (code),
    constraint ck_bulky_waste_requests_item_type check (item_type in
        ('MATTRESS', 'FURNITURE', 'LARGE_APPLIANCE', 'DEBRIS')),
    constraint ck_bulky_waste_requests_quantity check (quantity >= 1),
    constraint ck_bulky_waste_requests_slot check (preferred_slot is null or preferred_slot in ('MORNING', 'AFTERNOON')),
    constraint ck_bulky_waste_requests_status check (status in ('PENDING', 'QUOTED', 'COLLECTED', 'CANCELLED')),
    constraint ck_bulky_waste_requests_fee check (quoted_fee is null or quoted_fee > 0),
    constraint ck_bulky_waste_requests_quoted check (
        status not in ('QUOTED', 'COLLECTED') or (quoted_fee is not null and quoted_at is not null)),
    constraint ck_bulky_waste_requests_cancelled check (
        (status = 'CANCELLED') = (coalesce(trim(cancel_reason), '') <> ''))
);

create index ix_bulky_waste_requests_citizen on bulky_waste_requests (citizen_account_id);
create index ix_bulky_waste_requests_company_status on bulky_waste_requests (company_id, status);
