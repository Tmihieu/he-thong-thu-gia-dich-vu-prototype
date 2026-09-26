-- T21 · collection · Payment, CollectionVisit (docs/data-dictionary.md §2.4)
-- Thu một phần được (G4): khoản PAID khi Σ thanh toán = số tiền khoản; thu vượt bị chặn ở service.
-- client_request_id duy nhất để gửi lại không tạo bản ghi thứ hai (SPEC §9.5).

create table payments (
    id                  bigint generated always as identity primary key,
    code                varchar(30)  not null,
    charge_id           bigint       not null references charges (id),
    amount              bigint       not null,
    method              varchar(30)  not null,
    paid_at             timestamptz  not null,
    collector_id        bigint references users (id),
    confirmed_by        bigint references users (id),
    citizen_account_id  bigint,
    bank_ref            varchar(50),
    note                varchar(500),
    client_request_id   varchar(40)  not null,

    created_at          timestamptz  not null default now(),
    created_by          bigint references users (id),
    updated_at          timestamptz  not null default now(),
    updated_by          bigint references users (id),
    version             integer      not null default 0,

    constraint uq_payments_code unique (code),
    constraint uq_payments_client_request unique (client_request_id),
    constraint ck_payments_amount check (amount > 0),
    constraint ck_payments_method check (method in ('CASH', 'TRANSFER', 'APP_SIMULATED')),
    constraint ck_payments_collector check (method = 'APP_SIMULATED' or collector_id is not null)
);

create index ix_payments_charge on payments (charge_id);
create index ix_payments_collector on payments (collector_id, method);

comment on column payments.citizen_account_id is 'Có khi APP_SIMULATED; FK tới citizen_accounts thêm ở V18';

create table collection_visits (
    id                 bigint generated always as identity primary key,
    charge_id          bigint       not null references charges (id),
    result             varchar(30)  not null,
    visited_at         timestamptz  not null,
    revisit_date       date,
    note               varchar(500),
    recorded_by        bigint       not null references users (id),
    client_request_id  varchar(40)  not null,

    created_at         timestamptz  not null default now(),
    created_by         bigint references users (id),
    updated_at         timestamptz  not null default now(),
    updated_by         bigint references users (id),
    version            integer      not null default 0,

    constraint uq_collection_visits_client_request unique (client_request_id),
    constraint ck_collection_visits_result check (result in ('ABSENT', 'APPOINTMENT', 'REFUSED')),
    constraint ck_collection_visits_revisit check (result <> 'APPOINTMENT' or revisit_date is not null)
);

create index ix_collection_visits_charge on collection_visits (charge_id, visited_at);
